// Pantalla de Ordenados: el tema y tu número, después escribir tu pista, ordenar entre todos y ver cómo salió.
import { RONDAS, MAX_PISTA, temaDe, ordenDe, enOrden } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, menuEl = null, clave = '';

export function menu(el) {
  menuEl = el;
  el.innerHTML = `<div class="pills" role="radiogroup" aria-label="Rondas">${RONDAS.map(r =>
    `<label><input type="radio" name="orRondas" value="${r}"${r === 3 ? ' checked' : ''}><span>${r}</span></label>`).join('')}
    <span class="note">rondas</span></div>`;
}
export function opciones() {
  const r = menuEl && menuEl.querySelector('input[name="orRondas"]:checked');
  return {rondas: r ? +r.value : 3};
}
export function reiniciar() { clave = ''; }

export function sonido(a, e) {
  if (a.fase !== e.fase) return e.fase === 'ver' ? 'si' : e.fase === 'ordenar' ? 'basta' : 'cambiar';
  if (e.orden !== a.orden) return 'mover';
  if (e.pistas.join('|') !== a.pistas.join('|') || e.listos.join() !== a.listos.join()) return 'tick';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (e.fase === 'pistas') return e.pistas[yo] ? '⏳ Esperando las pistas' : '✍️ ¡Escribí tu pista!';
  if (e.fase === 'ordenar') return '↕️ ¡A ordenar entre todos!';
  return '🔢 ¡Se dan vuelta los números!';
}
export function textoFin(ctx) {
  const e = ctx.estado, r = e.total ? e.bien / e.total : 0;
  return {emoji: r >= .9 ? '🏆' : r >= .6 ? '🎉' : '😅', txt: `¡Ordenaron ${e.bien} de ${e.total}!`};
}
export function resumenFin(ctx) {
  const e = ctx.estado;
  return `Entre todos, en ${e.opciones.rondas} rondas. Última ronda: ${e.bienRonda} de ${e.n}.`;
}

const quien = i => `<span class="dot" style="background:${ctx.color(i)}"></span>${esc(ctx.nombre(i))}`;

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `<div class="or-tema" id="orTema"></div><div class="or-panel" id="orPanel"></div>`;
  ctx.tablero.addEventListener('click', ev => {
    const b = ev.target.closest('[data-a]');
    if (!b || b.disabled) return;
    const e = ctx.estado, a = b.dataset.a;
    if (a === 'pista') mandar();
    if (a === 'subir' || a === 'bajar') {
      const p = +b.dataset.p, pos = ordenDe(e).indexOf(p);
      ctx.jugarLibre({tipo: 'mover', p, a: pos + (a === 'subir' ? -1 : 1)});
    }
    if (a === 'listo') ctx.jugarLibre({tipo: 'listo', si: !e.listos[ctx.miAsiento]});
    if (a === 'seguir') ctx.jugarLibre({tipo: 'seguir'});
  });
  ctx.tablero.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id === 'orTxt') mandar(); });
}
async function mandar() {
  const t = $('orTxt')?.value.trim();
  if (!t) { ctx.aviso('Escribí tu pista'); ctx.sonar('error'); return; }
  if (/\d/.test(t)) { ctx.aviso('¡Sin números! Describilo con palabras'); ctx.sonar('error'); return; }
  await ctx.jugarLibre({tipo: 'pista', texto: t});
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0 || !ctx.listos) { $('orTema').innerHTML = '<p class="note">Cuando estén todos, sale el primer tema.</p>'; $('orPanel').innerHTML = ''; return ''; }
  const [tema, bajo, alto] = temaDe(e);

  $('orTema').innerHTML = `<p class="note">Ronda ${e.ronda} de ${e.opciones.rondas}</p><h3>${esc(tema)}</h3>
    <div class="or-escala"><span><b>1</b> ${esc(bajo)}</span><span class="or-flecha"></span><span><b>100</b> ${esc(alto)}</span></div>
    ${e.fase !== 'ver' ? `<p class="or-mio">Tu número: <b>${e.nums[yo]}</b></p>` : ''}`;

  // El panel se rearma solo si cambia algo (así no se borra lo que estás escribiendo)
  const hay = e.pistas.filter(Boolean).length;
  const k = [e.ronda, e.fase, e.pistas[yo] ? 1 : 0, e.orden, e.listos.join(), e.ganador].join('|');
  if (k === clave) { if ($('orCuenta')) $('orCuenta').textContent = `${hay} de ${e.n}`; return pista(e, yo); }
  clave = k;

  if (e.fase === 'pistas') {
    $('orPanel').innerHTML = e.pistas[yo]
      ? `<p>Tu pista: <b>“${esc(e.pistas[yo])}”</b></p><p class="note">Esperando a los demás: ya van <span id="orCuenta">${hay} de ${e.n}</span>.</p>`
      : `<p>Escribí algo del tema que vaya con tu <b>${e.nums[yo]}</b>: cuanto más cerca del 1, más “${esc(bajo)}”; cuanto más cerca del 100, más “${esc(alto)}”.</p>
         <div class="row"><input id="orTxt" maxlength="${MAX_PISTA}" autocomplete="off" placeholder="Tu pista (sin números)">
         <button class="main" data-a="pista">Mandar</button></div><p class="note">Ya escribieron <span id="orCuenta">${hay} de ${e.n}</span>.</p>`;
    if (!e.pistas[yo] && (!document.activeElement || document.activeElement === document.body)) $('orTxt')?.focus();
    return pista(e, yo);
  }

  const ord = ordenDe(e), ver = e.fase === 'ver', bien = ver ? enOrden(e) : null;
  const listos = e.listos.filter(Boolean).length;
  const filas = ord.map((p, pos) => `<li class="${p === yo ? 'mia' : ''} ${ver ? (bien.has(p) ? 'bien' : 'mal') : ''}" style="--c:${ctx.color(p)}">
      ${ver ? `<span class="or-num">${e.nums[p]}</span>` : `<span class="or-pos">${pos + 1}</span>`}
      <span class="or-txt">“${esc(e.pistas[p])}”<small>${quien(p)}${p === yo ? ' (vos)' : ''}</small></span>
      ${ver ? `<span class="or-marca">${bien.has(p) ? '✔' : '✘'}</span>`
        : `<span class="or-mover"><button class="chico" data-a="subir" data-p="${p}" ${pos === 0 ? 'disabled' : ''} aria-label="Subir">▲</button>
           <button class="chico" data-a="bajar" data-p="${p}" ${pos === ord.length - 1 ? 'disabled' : ''} aria-label="Bajar">▼</button></span>`}
    </li>`).join('');
  $('orPanel').innerHTML = `<p class="or-punta">⬆ 1 · ${esc(bajo)}</p><ol class="or-lista">${filas}</ol><p class="or-punta">⬇ 100 · ${esc(alto)}</p>` + (ver
    ? `<p class="or-resultado">Quedaron <b>${e.bienRonda}</b> de ${e.n} en orden${e.bienRonda === e.n ? ' 🎉' : ''}</p>
       <p class="note">Van ${e.bien} de ${e.total} entre todos.</p>
       ${e.ganador === -1 ? '<button class="main grande" data-a="seguir">Siguiente ronda</button>' : ''}`
    : `<button class="${e.listos[yo] ? '' : 'main '}grande or-listo" data-a="listo">${e.listos[yo] ? '✋ Esperá, no estoy de acuerdo' : '👍 ¡Estoy de acuerdo!'}</button>
       <p class="note">De acuerdo: ${listos} de ${e.n}. Si alguien mueve una pista, hay que volver a confirmar.</p>`);
  return pista(e, yo);
}

function pista(e, yo) {
  if (e.fase === 'pistas') return e.pistas[yo] ? 'Mientras tanto, pensá dónde va a ir la tuya' : '';
  if (e.fase === 'ordenar') return 'Movelas con ▲▼ y hablen: ¿la de quién es más alta?';
  return '';
}
