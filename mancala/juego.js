// Pantalla de Mancala: tus hoyos abajo (online, siempre los tuyos; en este celu, los del primero),
// tu granero a la derecha y los del otro arriba, para que la siembra vaya siempre hacia la derecha.
// Cada jugada se ve sembrando: las semillas salen del hoyo y caen de a una en los que siguen.
import { HOYOS, granero, hoyoAbs } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, tab;
let visto = null;        // los hoyos que se están mostrando
let firmaVista = '';     // la última jugada que ya se mostró
let pidVisto = null;     // la partida (para no animar al arrancar una revancha)
let anim = null;         // la siembra en curso
// Lugar de cada semilla dentro del hoyo (espiral, en % del hoyo)
const POS = Array.from({length: 14}, (_, i) => {
  const r = i ? 8 + 9.5 * Math.sqrt(i) : 0, a = i * 2.4;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
});

function cortar() { if (anim) { clearTimeout(anim); anim = null; } }
export function reiniciar() { cortar(); visto = null; firmaVista = ''; pidVisto = null; }

export function iniciar(c) {
  ctx = c;
  ctx.tablero.innerHTML = `<div class="mc-nombres" id="mcArriba"></div><div class="mc" id="mcTab"></div>
    <div class="mc-nombres" id="mcAbajo"></div><p class="note mc-sentido">↻ Las semillas avanzan de a una: abajo hacia la derecha, arriba hacia la izquierda.</p>`;
  tab = document.getElementById('mcTab');
  tab.addEventListener('click', ev => {
    const b = ev.target.closest('[data-k]');
    if (b && !b.disabled && !anim && ctx.puedoJugar()) ctx.jugar({hoyo: +b.dataset.k});
  });
}

export function sonido(a, e) {
  if (e.robo >= 0) return 'punto';
  if (e.turno === a.turno && e.ganador === -1) return 'linea';   // terminó en su granero: vuelve a jugar
  return null;                                                    // las semillas suenan al caer
}

const firma = e => `${e.pid}|${e.desde}|${e.hasta}|${e.hoyos.join(',')}`;
const semillas = n => POS.slice(0, Math.min(n, POS.length)).map(([x, y]) => `<i style="left:${x}%;top:${y}%"></i>`).join('');

// Arma el tablero con los hoyos h. o.fin: es el estado final (se puede tocar);
// si no, o.desde es el hoyo que se vació, o.cae donde cayó la última semilla y o.mano las que quedan por sembrar.
function pintar(h, o) {
  const e = ctx.estado, puedo = o.fin && ctx.puedoJugar();
  const abajo = ctx.online && ctx.miAsiento >= 0 ? ctx.miAsiento : 0, arriba = 1 - abajo;
  const desde = o.fin ? e.desde : o.desde;
  const celda = (p, k, fila) => {
    const i = hoyoAbs(p, k), n = h[i], toca = puedo && e.turno === p && n > 0;
    const cls = ['mc-hoyo', toca ? 'toca' : '', i === desde ? 'desde' : '', i === o.cae ? 'cae' : '',
      o.fin && i === e.hasta ? 'ult' : '', o.fin && i === e.robo ? 'robado' : ''].join(' ');
    const num = !o.fin && i === desde && o.mano ? `✋${o.mano}` : n;
    return `<div class="mc-celda ${fila}" style="--c:${ctx.color(p)}"><b class="mc-num${i === o.cae ? ' cae' : ''}">${num}</b>
      <button class="${cls}" ${toca ? `data-k="${k}"` : 'disabled'} aria-label="${n} ${n === 1 ? 'semilla' : 'semillas'}">${semillas(n)}</button></div>`;
  };
  const gran = p => {
    const i = granero(p);
    return `<div class="mc-gran${i === o.cae ? ' cae' : ''}${o.fin && i === e.hasta ? ' ult' : ''}" style="--c:${ctx.color(p)}">
      <b>${h[i]}</b><small>granero</small></div>`;
  };
  // Arriba, los hoyos del otro de derecha a izquierda (así la vuelta sigue hacia la izquierda por arriba)
  tab.innerHTML = gran(arriba) +
    Array.from({length: HOYOS}, (_, col) => celda(arriba, HOYOS - 1 - col, 'arriba')).join('') +
    gran(abajo) +
    Array.from({length: HOYOS}, (_, col) => celda(abajo, col, 'abajo')).join('');
  const nom = p => `<span class="dot" style="background:${ctx.color(p)}"></span><b>${esc(ctx.nombre(p))}</b>`;
  document.getElementById('mcArriba').innerHTML = `${nom(arriba)}<span>hoyos de arriba · granero a la izquierda</span>`;
  document.getElementById('mcAbajo').innerHTML = `${nom(abajo)}${ctx.online ? ' (vos)' : ''}<span>hoyos de abajo · granero a la derecha</span>`;
}

// La siembra, de a una semilla, desde cómo estaba el tablero (prev) hasta el estado nuevo (e)
function sembrar(prev, e) {
  const p = e.desde <= 5 ? 0 : 1, ajeno = granero(1 - p);
  const h = [...prev];
  let s = h[e.desde], i = e.desde;
  h[e.desde] = 0;
  const pasos = [];
  while (s > 0) { i = (i + 1) % 14; if (i === ajeno) continue; pasos.push(i); s--; }
  const ms = Math.max(120, Math.min(280, 2600 / pasos.length));
  const final = [...e.hoyos];
  let k = 0;
  const terminar = () => { anim = null; visto = final; ctx.refrescar(); };
  const paso = () => {
    if (k < pasos.length) {
      const j = pasos[k++];
      h[j]++;
      ctx.sonar('tick');
      pintar(h, {desde: e.desde, cae: j, mano: pasos.length - k});
      anim = setTimeout(paso, ms);
    } else if (h.join() !== final.join()) {
      // Robo (o se terminó y cada uno guarda lo suyo): se ve después de una pausa
      anim = setTimeout(() => { pintar(final, {fin: true}); anim = setTimeout(terminar, 450); }, 380);
    } else terminar();
  };
  pintar(h, {desde: e.desde, mano: pasos.length});
  anim = setTimeout(paso, 320);
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado;
  if (pidVisto !== e.pid) { cortar(); visto = null; firmaVista = ''; pidVisto = e.pid; }
  if (anim) return '';                       // está sembrando: al terminar se dibuja lo último
  const f = firma(e);
  if (f !== firmaVista) {
    firmaVista = f;
    if (visto && e.desde >= 0 && visto[e.desde] > 0 && visto.join() !== e.hoyos.join()) { sembrar(visto, e); return ''; }
  }
  visto = [...e.hoyos];
  pintar(visto, {fin: true});

  if (!ctx.puedoJugar()) return '';
  const abajo = ctx.online && ctx.miAsiento >= 0 ? ctx.miAsiento : 0;
  if (ctx.online) return 'Tocá un hoyo tuyo (abajo) con semillas';
  return `${ctx.nombre(e.turno)}: tocá un hoyo de ${e.turno === abajo ? 'abajo' : 'arriba'}`;
}
