// Pantalla de Dados mentirosos: tus dados (los demás están tapados), la apuesta que hay en la mesa,
// y en tu turno: subir la apuesta o dudar. Cuando alguien duda, se ven los dados de todos.
import { textoApuesta, total, cuenta, sube, minCara, apuestas, siguiente } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, menuEl = null, selC = 1, selV = 2, claveSel = '';

// ---------- Menú: comodines ----------
export function menu(el) {
  menuEl = el;
  el.innerHTML = `<label class="opcion-check"><input type="checkbox" id="dmComodines"> Los unos son comodines
    <span class="note">(cuentan como cualquier número)</span></label>`;
}
export function opciones() {
  const x = menuEl && menuEl.querySelector('#dmComodines');
  return {comodines: !!(x && x.checked)};
}
export function reiniciar() { claveSel = ''; }

export function sonido(a, e) {
  if (a.fase !== e.fase) return e.fase === 'ver' ? 'canto' : 'carta';
  if (e.hist !== a.hist) return 'colocar';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (e.fase === 'ver') return '🎲 ¡Se levantan los vasos!';
  if (!e.cant[yo]) return '👀 Quedaste afuera';
  return '';
}

// Una cara de dado con sus puntitos
const PUNTOS = {1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]]};
export const cara = (v, cls = '') => `<svg class="dm-dado ${cls}" viewBox="0 0 100 100" aria-label="${v}"><rect x="4" y="4" width="92" height="92" rx="20"/>${
  (PUNTOS[v] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9.5"/>`).join('')}</svg>`;
const tapado = '<span class="dm-tapado">?</span>';
const quien = i => `<span class="dot" style="background:${ctx.color(i)}"></span><b>${esc(ctx.nombre(i))}</b>`;

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `<div class="dm-panel" id="dmMios"></div><div class="dm-panel dm-mesa" id="dmMesa"></div>
    <div class="dm-panel" id="dmAccion"></div><div class="dm-panel" id="dmVer"></div>`;
  ctx.tablero.addEventListener('click', ev => {
    const b = ev.target.closest('[data-a]');
    if (!b || b.disabled) return;
    const e = ctx.estado, a = b.dataset.a;
    if (a === 'menos') selC = Math.max(1, selC - 1);
    else if (a === 'mas') selC = Math.min(total(e), selC + 1);
    else if (a === 'cara') selV = +b.dataset.v;
    else if (a === 'apostar') { ctx.jugar({tipo: 'apostar', c: selC, v: selV}); return; }
    else if (a === 'dudo') { ctx.jugar({tipo: 'dudo'}); return; }
    else if (a === 'seguir') { ctx.jugarLibre({tipo: 'seguir'}); return; }
    ctx.sonar('tick'); ctx.refrescar();
  });
}

// La apuesta más chica que sube la de la mesa
function minimo(e) {
  const m = minCara(e);
  if (!e.ap.c) return {c: Math.max(1, Math.round(total(e) / 6)), v: m};
  if (e.ap.v < 6) return {c: e.ap.c, v: Math.max(m, e.ap.v + 1)};
  return {c: e.ap.c + 1, v: m};
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0 || !ctx.listos) { ['dmMios', 'dmMesa', 'dmAccion', 'dmVer'].forEach(id => { $(id).hidden = true; }); return ''; }
  const viendo = e.fase === 'ver', termino = e.ganador !== -1;

  // ---------- Tus dados ----------
  $('dmMios').hidden = false;
  const mios = e.dados[yo];
  $('dmMios').innerHTML = e.cant[yo] || viendo
    ? `<h3>Tus dados</h3><div class="dm-dados">${[...mios].map(d => cara(+d)).join('') || '<span class="note">Ya no te quedan dados</span>'}</div>
       <p class="note">En la mesa hay <b>${e.dados.join('').length}</b> dados en total${e.opciones.comodines ? ' · los unos son comodines' : ''}.</p>`
    : '<h3>Quedaste afuera</h3><p class="note">Te quedaste sin dados. Mirá cómo sigue la partida.</p>';

  // ---------- La mesa: la apuesta y las de esta ronda ----------
  $('dmMesa').hidden = viendo;
  if (!viendo) {
    const hist = apuestas(e);
    $('dmMesa').innerHTML = (e.ap.c
      ? `<p class="note">Apuesta en la mesa</p><div class="dm-apuesta">${quien(e.ap.p)} dice: <span class="dm-grande">hay ${e.ap.c} × ${cara(e.ap.v, 'chico')}</span></div>`
      : `<p class="note">Ronda ${e.ronda}</p><div class="dm-apuesta">Todavía nadie apostó. Arranca ${quien(e.turno)}.</div>`) +
      (hist.length > 1 ? `<ul class="dm-hist">${hist.slice(0, -1).reverse().map(x =>
        `<li>${quien(x.p)} · ${textoApuesta(x.c, x.v)}</li>`).join('')}</ul>` : '') +
      `<div class="dm-vasos">${e.cant.map((k, i) => k ? `<span class="dm-vaso" style="--c:${ctx.color(i)}">${esc(ctx.nombre(i))}
        <span>${tapado.repeat(k)}</span></span>` : '').join('')}</div>`;
  }

  // ---------- Tu turno: subir o dudar ----------
  const miTurno = !viendo && !termino && e.turno === yo && e.cant[yo] > 0;
  $('dmAccion').hidden = !miTurno;
  if (miTurno) {
    const k = `${e.ronda}|${e.hist}`;
    if (k !== claveSel) { claveSel = k; ({c: selC, v: selV} = minimo(e)); }
    selC = Math.min(Math.max(1, selC), total(e));
    const vale = sube(e, selC, selV), puedeDudar = e.ap.c > 0 && e.ap.p !== yo;
    $('dmAccion').innerHTML = `<h3>¿Cuántos hay en toda la mesa?</h3>
      <div class="dm-elegir">
        <div class="dm-cant"><button data-a="menos" aria-label="Menos">−</button><b>${selC}</b><button data-a="mas" aria-label="Más">+</button></div>
        <div class="dm-caras">${[1, 2, 3, 4, 5, 6].map(v => `<button data-a="cara" data-v="${v}" class="${v === selV ? 'on' : ''}"
          ${v < minCara(e) ? 'disabled' : ''} aria-label="${v}">${cara(v)}</button>`).join('')}</div>
      </div>
      <div class="dm-botones">
        <button class="main grande" data-a="apostar" ${vale ? '' : 'disabled'}>Apostar: hay ${textoApuesta(selC, selV)}</button>
        ${puedeDudar ? `<button class="grande dm-dudo" data-a="dudo">🤨 ¡Dudo!</button>` : ''}
      </div>
      ${vale ? '' : `<p class="note">Tiene que subir: más de ${e.ap.c} dados, o ${e.ap.c} de un número más alto que el ${e.ap.v}.</p>`}`;
  }

  // ---------- Se levantan los vasos ----------
  $('dmVer').hidden = !viendo;
  if (viendo && e.res) {
    const r = e.res, cuentan = d => +d === r.v || (e.opciones.comodines && d === '1');
    $('dmVer').innerHTML = `<p class="dm-veredicto">${quien(r.d)} dudó de ${quien(r.a)}: “hay ${textoApuesta(r.c, r.v)}”</p>
      <p class="dm-grande dm-habia">Había <b>${r.hay}</b> ${cara(r.v, 'chico')}</p>
      <p class="dm-perdio">${r.hay >= r.c ? 'Había suficientes' : 'No alcanzaban'}: pierde un dado ${quien(r.perd)}${e.cant[r.perd] ? '' : ' y queda afuera'}</p>
      <ul class="dm-todos">${e.dados.map((ds, i) => ds ? `<li>${quien(i)} <span class="dm-dados chicos">${[...ds].map(d =>
        cara(+d, cuentan(d) ? 'cuenta' : 'no')).join('')}</span></li>` : '').join('')}</ul>
      ${termino ? '' : `<button class="main grande" data-a="seguir">🎲 Otra ronda (empieza ${esc(ctx.nombre(e.turno))})</button>`}`;
  }

  if (viendo || termino) return '';
  if (!e.cant[yo]) return '';
  if (e.turno === yo) return e.ap.c ? 'Subí la apuesta o decí ¡Dudo!' : 'Arrancás vos: hacé la primera apuesta';
  return `Está pensando ${ctx.nombre(e.turno)}… el que sigue es ${ctx.nombre(siguiente(e, e.turno))}`;
}
