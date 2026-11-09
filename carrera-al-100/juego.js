// Pantalla de Carrera al 100: arriba el dado (en tu turno: tirar y después elegir ×1 o ×10)
// y abajo la carrera: cuánto lleva cada uno, sus tiradas y qué tan cerca está del 100.
import { TIROS, META, tiros, total, distancia, quedan, masCerca } from './reglas.js';
import { esc } from '../shared/salas.js';

const ESCALA = 150;          // la pista va de 0 a 150 (el 100 queda a dos tercios)
let ctx, $;
let vistoDado = '';          // la última tirada que ya se mostró (para animar solo las nuevas)
let pidVisto = null;
let anim = null;             // el dado rodando
let popVisto = '';           // la jugada que ya hizo saltar el dado y la casilla nueva (para no repetirlo en cada dibujo)

function cortar() { if (anim) { clearTimeout(anim); anim = null; } }
export function reiniciar() { cortar(); vistoDado = ''; pidVisto = null; popVisto = ''; }

// Una cara de dado con sus puntitos (v = 0: dado sin tirar)
const PUNTOS = {1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]]};
const cara = (v, cls = '') => `<svg class="ca-dado ${cls}" viewBox="0 0 100 100" aria-label="${v || 'sin tirar'}"><rect x="4" y="4" width="92" height="92" rx="20"/>${
  v ? PUNTOS[v].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9.5"/>`).join('') : '<text x="50" y="68" text-anchor="middle">?</text>'}</svg>`;
const quien = i => `<span class="dot" style="background:${ctx.color(i)}"></span><b>${esc(ctx.nombre(i))}</b>`;
const lejos = t => (t === META ? '¡justo 100!' : t < META ? `le faltan ${META - t}` : `se pasó por ${t - META}`);

export function sonido(a, e) {
  if (e.dado && !a.dado) return null;                       // el dado suena mientras rueda
  if (e.tiros.join() !== a.tiros.join()) {
    const p = a.turno, t = tiros(e, p);
    return t[t.length - 1] >= 10 ? 'linea' : 'colocar';
  }
  return null;
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `<div class="ca-panel ca-mesa" id="caMesa"></div><ol class="ca-carrera" id="caCarrera"></ol>`;
  ctx.tablero.addEventListener('click', ev => {
    const b = ev.target.closest('[data-a]');
    if (!b || b.disabled || anim || !ctx.puedoJugar()) return;
    if (b.dataset.a === 'tirar') ctx.jugar({tipo: 'tirar'});
    else if (b.dataset.a === 'elegir') ctx.jugar({tipo: 'elegir', x: +b.dataset.x});
  });
}

// El dado rueda un rato mostrando caras al azar y después cae en la que salió
function rodar() {
  let k = 0;
  const pasos = 9;
  const paso = () => {
    const d = document.querySelector('#caMesa .ca-dado-lugar');
    if (k < pasos) {
      if (d) d.innerHTML = cara(1 + Math.floor(Math.random() * 6), 'rodando');
      ctx.sonar('tick');
      k++;
      anim = setTimeout(paso, 55 + k * 9);
    } else { anim = null; ctx.sonar('colocar'); ctx.refrescar(); }
  };
  paso();
}

function pintarMesa(e, rodando, pop = false) {
  const p = e.turno, termino = e.ganador !== -1, puedo = ctx.puedoJugar() && !rodando;
  $('caMesa').hidden = termino;                 // al terminar alcanza con la carrera
  if (termino) return;
  const mio = !ctx.online || ctx.miAsiento === p;
  const cab = `<p class="ca-cab">${ctx.online && mio ? '<b>Tu tirada</b>' : quien(p)} · tirada ${TIROS - quedan(e, p) + 1} de ${TIROS}</p>`;
  let acciones = '';
  if (!rodando && puedo) {
    if (!e.dado) acciones = '<button class="main grande ca-tirar" data-a="tirar">🎲 Tirar el dado</button>';
    else {
      const t = total(e, p);
      acciones = `<div class="ca-opciones">${[1, 10].map(x => {
        const s = e.dado * x, nuevo = t + s;
        return `<button class="ca-op${x === 10 ? ' diez' : ''}" data-a="elegir" data-x="${x}">
          <span class="ca-op-suma">+${s}</span><span class="ca-op-txt">${x === 10 ? `${e.dado} × 10` : `el ${e.dado}`}</span>
          <span class="ca-op-res">quedás en <b>${nuevo}</b><small>${lejos(nuevo)}</small></span></button>`;
      }).join('')}</div>`;
    }
  } else if (!rodando && e.dado) acciones = `<p class="note ca-espera">Está eligiendo: ¿+${e.dado} o +${e.dado * 10}?</p>`;
  $('caMesa').innerHTML = `${cab}<div class="ca-dado-lugar">${cara(rodando ? 1 + Math.floor(Math.random() * 6) : e.dado, rodando ? 'rodando' : e.dado ? (pop ? 'cayo' : '') : 'vacio')}</div>${acciones}`;
}

function pintarCarrera(e, pop = false) {
  const termino = e.ganador !== -1, gan = termino ? masCerca(e) : [];
  const metaPct = META / ESCALA * 100;
  const ultimo = termino ? e.turno : (e.turno - 1 + e.n) % e.n;    // el último que sumó
  $('caCarrera').innerHTML = Array.from({length: e.n}, (_, i) => {
    const t = total(e, i), ts = tiros(e, i), ancho = Math.min(t, ESCALA) / ESCALA * 100;
    const turno = !termino && e.turno === i, gana = gan.includes(i);
    const casillas = Array.from({length: TIROS}, (_, k) => k < ts.length
      ? `<span class="ca-tiro${ts[k] >= 10 ? ' diez' : ''}${pop && i === ultimo && k === ts.length - 1 ? ' nuevo' : ''}">${ts[k]}</span>`
      : `<span class="ca-tiro libre${turno && k === ts.length ? ' ahora' : ''}"></span>`).join('');
    return `<li class="ca-fila${turno ? ' turno' : ''}${gana ? ' gana' : ''}" style="--c:${ctx.color(i)}">
      <div class="ca-fila-cab">${quien(i)}${ctx.online && i === ctx.miAsiento ? ' <span class="note">(vos)</span>' : ''}${gana ? ' 🏆' : ''}
        <span class="ca-total"><b>${t}</b><small>${lejos(t)}</small></span></div>
      <div class="ca-pista" style="--meta:${metaPct}%"><i style="width:${ancho}%"></i><span class="ca-bandera">🏁</span></div>
      <div class="ca-tiros">${casillas}</div></li>`;
  }).join('');
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado;
  if (pidVisto !== e.pid) { cortar(); vistoDado = ''; pidVisto = e.pid; }
  const firma = `${e.pid}|${e.tiros.join(';')}|${e.dado}`;
  // Una tirada nueva: que ruede (si la partida recién se abre con el dado ya tirado, se muestra quieto)
  if (e.dado && firma !== vistoDado && !anim) {
    const primera = vistoDado === '';
    vistoDado = firma;
    if (!primera) { pintarMesa(e, true); pintarCarrera(e); rodar(); return ''; }
  }
  if (!e.dado) vistoDado = firma;
  if (anim) { pintarCarrera(e); return ''; }
  const pop = popVisto !== '' && popVisto !== firma;
  popVisto = firma;
  pintarCarrera(e, pop);
  pintarMesa(e, false, pop);

  if (e.ganador !== -1 || !ctx.puedoJugar()) return '';
  const pre = ctx.online ? '' : `${ctx.nombre(e.turno)}: `;
  if (!e.dado) return `${pre}tirá el dado`;
  return `${pre}¿sumás ${e.dado} o ${e.dado * 10}? ${quedan(e, e.turno) === 1 ? 'Es tu última tirada' : `Después de esta te quedan ${quedan(e, e.turno) - 1}`}`;
}

export function resumenFin(c) {
  const e = c.estado;
  return Array.from({length: e.n}, (_, i) => i).sort((a, b) => distancia(e, a) - distancia(e, b))
    .map(i => `${c.nombre(i)} ${total(e, i)}`).join(' · ');
}
