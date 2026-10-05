// Pantalla del Truco: marcador, la mesa con las bazas, tus cartas y los botones para cantar.
import { METAS, CANTO_TRUCO, CANTO_ENVIDO, NOMBRE_PALO, num, palo, valor, tanto, puedeEnvido, puedeTruco, puedeSubirTruco,
         envidosPosibles, equipo, companeros } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, menuEl = null;

// ---------- Menú: a cuántos puntos y punta y hacha ----------
export function menu(el) {
  menuEl = el;
  el.innerHTML = `<div class="pills" role="radiogroup" aria-label="Puntos">${METAS.map(m =>
    `<label><input type="radio" name="trMeta" value="${m}"${m === 30 ? ' checked' : ''}><span>${m}</span></label>`).join('')}
    <span class="note">puntos</span></div>
    <label class="opcion-check"><input type="checkbox" id="trPyh" checked> Punta y hacha
      <span class="note">(solo de a 6: de los 5 de las malas a los 10 de las buenas, una mano sí y una no son duelos con el de enfrente)</span></label>`;
}
export function opciones() {
  const r = menuEl && menuEl.querySelector('input[name="trMeta"]:checked');
  const pyh = menuEl && menuEl.querySelector('#trPyh');
  return {meta: r ? +r.value : 30, pyh: pyh ? pyh.checked : true};
}

// ---------- Sonidos y cartel ----------
export function sonido(a, e) {
  if (e.nroMano !== a.nroMano) return 'cambiar';
  const nuevo = e.log.length && e.log[e.log.length - 1] !== a.log[a.log.length - 1] ? e.log[e.log.length - 1] : '';
  if (nuevo.includes('No quiero') || nuevo.includes('no quiso')) return 'no';
  if (nuevo.includes('¡Quiero!')) return 'si';
  if (nuevo.includes('¡')) return 'canto';
  if (e.jugadas.join() !== a.jugadas.join()) return 'carta';
  return null;
}
const nombreCanto = c => (c.tipo === 'truco' ? CANTO_TRUCO[c.nivel] : CANTO_ENVIDO[c.lista[c.lista.length - 1]]);
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0 || e.fase !== 'jugar') return '';
  if (e.canto && e.turno === yo) return `🗣️ ¡Te cantaron ${nombreCanto(e.canto)}!`;
  if (e.canto) return `⏳ Contesta ${ctx.nombre(e.turno)}`;
  if (!e.jug.includes(yo)) return `👀 Duelo ${e.duelo + 1} de 3`;
  return '';
}

// ---------- Cartas españolas ----------
const PALO_SVG = {
  o: '<circle cx="20" cy="20" r="14" fill="#f4c430" stroke="#c9871a" stroke-width="3"/><circle cx="20" cy="20" r="7" fill="none" stroke="#c9871a" stroke-width="2.5"/><circle cx="20" cy="20" r="2" fill="#c9871a"/>',
  c: '<path d="M9 6h22q0 15-11 18Q9 21 9 6z" fill="#e8505b" stroke="#a12a35" stroke-width="2" stroke-linejoin="round"/><rect x="17.5" y="23" width="5" height="8" fill="#f4c430"/><rect x="11" y="30" width="18" height="5" rx="2.5" fill="#f4c430" stroke="#c9871a" stroke-width="1.5"/>',
  e: '<path d="M20 2l4 7v19h-8V9z" fill="#cfe0f2" stroke="#3f6fa0" stroke-width="2" stroke-linejoin="round"/><rect x="9" y="27" width="22" height="5" rx="2.5" fill="#3fa7e0" stroke="#2a5f8f" stroke-width="1.5"/><rect x="17.5" y="32" width="5" height="7" rx="1.5" fill="#8a5a2b"/>',
  b: '<path d="M16.5 38L14 15Q13 3 20 3q7 0 6 12l-2.5 23z" fill="#5cc480" stroke="#2f7a48" stroke-width="2" stroke-linejoin="round"/><circle cx="17.5" cy="15" r="2.2" fill="#2f7a48"/><circle cx="22.5" cy="23" r="2.2" fill="#2f7a48"/><circle cx="18.5" cy="30" r="1.8" fill="#2f7a48"/>',
};
const FIGURA = {10: 'Sota', 11: 'Caballo', 12: 'Rey'};
function carta(c, {data = false, clase = ''} = {}) {
  const n = num(c), p = palo(c);
  const etiqueta = `${FIGURA[n] ? FIGURA[n] + ' (' + n + ')' : n} de ${NOMBRE_PALO[p]}`;
  const cuerpo = `<span class="tr-n">${n}</span><svg viewBox="0 0 40 40" aria-hidden="true">${PALO_SVG[p]}</svg>` +
    `<span class="tr-n abajo">${n}</span>`;
  return data ? `<button class="tr-carta palo-${p} ${clase}" data-c="${c}" aria-label="Tirar el ${etiqueta}">${cuerpo}</button>`
              : `<div class="tr-carta palo-${p} ${clase}" role="img" aria-label="${etiqueta}">${cuerpo}</div>`;
}
const dorso = () => '<div class="tr-carta dorso" aria-hidden="true"></div>';

// Fosforitos: de a 5, como se anotan en la mesa
function porotos(k, meta) {
  const grupos = [];
  for (let i = 0; i < Math.ceil(meta / 5); i++) {
    const v = Math.max(0, Math.min(5, k - i * 5));
    const l = ['M4 4v22', 'M4 4h22', 'M26 4v22', 'M4 26h22', 'M4 4l22 22'].slice(0, v).map(d => `<path d="${d}"/>`).join('');
    grupos.push(`<svg viewBox="0 0 30 30" class="${v ? '' : 'vacio'}">${l || '<path d="M4 4h22v22H4z" class="guia"/>'}</svg>`);
  }
  // A 30 se separan las malas (primeros 15) de las buenas
  return meta === 30 ? `<span>${grupos.slice(0, 3).join('')}</span><span class="tr-buenas">${grupos.slice(3).join('')}</span>` : grupos.join('');
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `
    <div class="tr-marcador" id="trMarcador"></div>
    <div class="tr-rival" id="trRival"></div>
    <div class="tr-mesa" id="trMesa"></div>
    <div class="tr-canto" id="trCanto" hidden></div>
    <div class="tr-mano" id="trMano"></div>
    <div class="tr-botones" id="trBotones"></div>
    <ol class="tr-log" id="trLog"></ol>`;
  $('trMano').addEventListener('click', ev => {
    const b = ev.target.closest('[data-c]');
    if (b && !b.disabled) ctx.jugar({tipo: 'carta', c: b.dataset.c});
  });
  $('trBotones').addEventListener('click', ev => {
    const b = ev.target.closest('[data-j]');
    if (!b || b.disabled) return;
    const j = JSON.parse(b.dataset.j);
    if (j.tipo === 'mazo' && !confirm('¿Te vas al mazo?')) return;
    ctx.jugar(j);
  });
}

const boton = (txt, j, clase = '') => `<button class="${clase}" data-j='${JSON.stringify(j)}'>${txt}</button>`;

// Panel de cada jugador (de a 4 o 6, o mirando un duelo): sus cartas tiradas y las que le quedan
function panel(e, p, yo) {
  const juega = e.jug.includes(p), quedan = juega && p !== yo ? e.cartas[p].length - e.jugadas[p].length : 0;
  const tiradas = e.jugadas[p].map((c, k) => {
    const b = e.bazas[k], max = b === undefined ? 0 : Math.max(...e.jug.map(x => (e.jugadas[x][k] ? valor(e.jugadas[x][k]) : 0)));
    return carta(c, {clase: 'chica' + (b !== undefined && b !== -1 && equipo(p) === b && valor(c) === max ? ' gano' : '')});
  }).join('');
  return `<div class="tr-jug${equipo(p) === equipo(yo) ? ' nos' : ''}${e.turno === p && e.ganador === -1 ? ' turno' : ''}${juega ? '' : ' mira'}" style="--c:${ctx.color(p)}">
    <div class="tr-jug-top"><span class="dot" style="background:${ctx.color(p)}"></span><b>${p === yo ? 'Vos' : esc(ctx.nombre(p))}</b>${e.jug[0] === p ? '<small>mano</small>' : ''}</div>
    <div class="tr-jug-cartas">${tiradas}${Array.from({length: quedan}, () => '<div class="tr-carta dorso chica"></div>').join('')}${juega ? '' : '<small>mira</small>'}</div></div>`;
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  const meta = e.opciones.meta, mio = e.turno === yo && e.ganador === -1 && ctx.listos;
  const nos = equipo(yo), ellos = 1 - nos, juego = e.jug.includes(yo);
  // Uno contra uno (de a 2, o tu duelo del punta y hacha): la mesa de siempre, con tu rival arriba
  const mano1 = e.jug.length === 2 && juego, rv = mano1 ? e.jug.find(p => p !== yo) : -1;
  const colorEq = eq => ctx.color(eq === nos ? yo : e.n === 2 ? 1 - yo : (yo + 1) % e.n);

  const nombres = eq => companeros(e, eq).filter(p => p !== yo).map(p => esc(ctx.nombre(p))).join(', ');
  $('trMarcador').innerHTML = [nos, ellos].map(eq => `<div class="tr-equipo" style="--c:${colorEq(eq)}">
      <b>${e.n === 2 ? (eq === nos ? 'Vos' : esc(ctx.nombre(1 - yo))) : eq === nos ? 'Nosotros' : 'Ellos'}</b><span class="tr-pts">${e.puntos[eq]}</span>
      ${e.n > 2 ? `<small class="tr-nombres">${eq === nos ? 'con ' : ''}${nombres(eq)}</small>` : ''}
      <span class="tr-porotos">${porotos(e.puntos[eq], meta)}</span></div>`).join('') +
    `<span class="tr-meta">a ${meta}${e.jug[0] === yo ? ' · sos mano' : ''}${e.tipo === 'pyh' ? ` · 🪓 punta y hacha, duelo ${e.duelo + 1} de 3` : ''}</span>`;

  $('trRival').hidden = !mano1;
  $('trMesa').classList.toggle('tr-mesa-eq', !mano1);
  if (mano1) {
    $('trRival').innerHTML = Array.from({length: e.cartas[rv].length - e.jugadas[rv].length}, dorso).join('');
    // Una columna por baza (arriba el rival, abajo vos)
    $('trMesa').innerHTML = [0, 1, 2].map(k => {
      const r = e.jugadas[rv][k], m = e.jugadas[yo][k], b = e.bazas[k];
      const marca = b === undefined ? '' : b === -1 ? '<span class="tr-res parda">parda</span>'
        : `<span class="tr-res" style="--c:${colorEq(b)}">${b === nos ? 'tuya' : 'del otro'}</span>`;
      return `<div class="tr-baza">${r ? carta(r, {clase: b === ellos ? 'gano' : ''}) : '<div class="tr-hueco"></div>'}${marca}
        ${m ? carta(m, {clase: b === nos ? 'gano' : ''}) : '<div class="tr-hueco"></div>'}</div>`;
    }).join('');
  } else {
    // En equipo (o mirando un duelo): un panel por jugador, en el orden de la ronda, empezando por el que sigue a vos
    const orden = Array.from({length: e.n}, (_, k) => (yo + 1 + k) % e.n);
    const quien = b => (juego ? (b === nos ? 'nuestra' : 'de ellos') : esc(ctx.nombre(e.jug.find(x => equipo(x) === b))));
    const bazas = e.bazas.map((b, k) => `<span class="tr-res${b === -1 ? ' parda' : ''}" style="--c:${b === -1 ? '#fff' : colorEq(b)}">${k + 1}ª: ${
      b === -1 ? 'parda' : quien(b)}</span>`).join('');
    $('trMesa').innerHTML = `<div class="tr-jugadores n${e.n}">${orden.map(p => panel(e, p, yo)).join('')}</div>` +
      (bazas ? `<div class="tr-bazas">${bazas}</div>` : '');
  }

  // Canto que espera respuesta
  $('trCanto').hidden = !e.canto || e.fase !== 'jugar';
  if (e.canto) $('trCanto').innerHTML = `<span class="dot" style="background:${ctx.color(e.canto.por)}"></span>
    <b>${e.canto.por === yo ? 'Vos' : esc(ctx.nombre(e.canto.por))}:</b> ¡${esc(nombreCanto(e.canto))}!` +
    (e.canto.tipo === 'envido' && e.canto.lista.length > 1 ? ` <span class="note">(${e.canto.lista.map(x => CANTO_ENVIDO[x]).join(' + ')})</span>` : '') +
    (e.turno !== yo ? ` <span class="note">Contesta ${esc(ctx.nombre(e.turno))}</span>` : '');

  // Tus cartas
  const puedoTirar = mio && e.fase === 'jugar' && !e.canto && e.aJugar === yo;
  $('trMano').innerHTML = e.cartas[yo].filter(x => !e.jugadas[yo].includes(x))
    .map(x => carta(x, {data: true, clase: puedoTirar ? 'tirable' : ''})).join('');
  $('trMano').querySelectorAll('button').forEach(b => { b.disabled = !puedoTirar; });

  // Botones según el momento
  let bs = [];
  if (mio && e.fase === 'fin') bs.push(boton(e.proximo === 'duelo' ? '🪓 Siguiente duelo' : '🃏 Repartir', {tipo: 'repartir'}, 'main grande'));
  else if (mio && e.canto) {
    const cto = e.canto;
    bs.push(boton('¡Quiero!', {tipo: 'quiero'}, 'main'), boton('No quiero', {tipo: 'noquiero'}));
    if (puedeSubirTruco(e, yo)) bs.push(boton(`¡Quiero ${CANTO_TRUCO[cto.nivel + 1].toLowerCase()}!`, {tipo: 'truco'}, 'tr-sube'));
    if (cto.tipo === 'truco' && cto.nivel === 2 && puedeEnvido(e, yo))
      bs.push(...['envido', 'real', 'falta'].map(x => boton(CANTO_ENVIDO[x], {tipo: 'envido', cual: x}, 'tr-env')));
    if (cto.tipo === 'envido') bs.push(...envidosPosibles(cto.lista).map(x => boton(CANTO_ENVIDO[x], {tipo: 'envido', cual: x}, 'tr-env')));
  } else if (puedoTirar) {
    if (puedeTruco(e, yo)) bs.push(boton(`¡${CANTO_TRUCO[e.truco.valor + 1]}!`, {tipo: 'truco'}, 'tr-sube'));
    if (puedeEnvido(e, yo)) bs.push(...['envido', 'real', 'falta'].map(x => boton(CANTO_ENVIDO[x], {tipo: 'envido', cual: x}, 'tr-env')));
    bs.push(boton(e.n === 2 || e.tipo === 'pyh' ? 'Me voy al mazo' : 'Nos vamos al mazo', {tipo: 'mazo'}, 'chico tr-mazo'));
  }
  const conTanto = e.fase === 'jugar' && juego && (puedeEnvido(e, yo) || (e.canto && e.canto.tipo === 'envido'));
  $('trBotones').innerHTML = bs.join('') + (conTanto ? `<p class="note tr-tanto">Tenés <b>${tanto(e.cartas[yo])}</b> de tanto</p>` : '');

  $('trLog').innerHTML = e.log.slice(-6).reverse().map(t => `<li>${esc(t)}</li>`).join('');

  if (!ctx.listos || e.ganador !== -1) return '';
  const valeTxt = e.truco.valor > 1 ? ` · la mano vale ${e.truco.valor}` : '';
  if (e.fase === 'fin') return mio ? (e.proximo === 'duelo' ? 'Tocá Siguiente duelo' : 'Tocá Repartir para la mano siguiente')
    : `Esperando que ${ctx.nombre(e.turno)} ${e.proximo === 'duelo' ? 'arranque su duelo' : 'reparta'}…`;
  if (!juego) return `Duelo de ${ctx.nombre(e.jug[0])} contra ${ctx.nombre(e.jug[1])}: vos mirás (tus cartas son para tu duelo)`;
  if (mio && e.canto) return 'Contestá: quiero, no quiero o subí la apuesta' + valeTxt;
  if (puedoTirar) return 'Tocá una carta para tirarla, o cantá' + valeTxt;
  return valeTxt.slice(3);
}
