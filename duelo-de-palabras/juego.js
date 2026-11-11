// Pantalla de Duelo de palabras: primero cada uno esconde la palabra del otro; después prueban por turnos.
// El teclado se va pintando con lo que ya sabés de cada letra. Mientras juega el otro, podés ir escribiendo.
import { LARGOS, PERDIDO, largo, limpiar, comparar, objetivo, intentosDe } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, menuEl = null;
let clave = '', verMio = false;
// Lo que estás armando: una letra por casilla. Las fijas (🔒) quedan puestas de un intento al otro
let celdas = [], fijas = [], foco = -1;
const escrito = () => celdas.join('');
const llena = () => celdas.length > 0 && celdas.every(Boolean);
const donde = () => (foco >= 0 && !celdas[foco] ? foco : celdas.indexOf(''));   // casilla donde cae la próxima letra
function vaciar(todo) {
  celdas = celdas.map((ch, k) => (!todo && fijas[k] ? ch : ''));
  if (todo) fijas = fijas.map(() => false);
  foco = -1;
}
const TECLAS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];

// Diccionario: solo valen palabras que existen (la secreta y los intentos). Se baja la lista del largo que se juega
// (palabras-4/5/6.txt, sacadas de an-array-of-spanish-words, licencia MIT). Si no se puede bajar, no se traba el juego.
const dics = {}, listos = {};
function diccionario(l) {
  dics[l] ??= fetch(new URL(`./palabras-${l}.txt`, import.meta.url))
    .then(r => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
    .then(t => (listos[l] = new Set(t.split(/\r?\n/))))
    .catch(() => { delete dics[l]; return null; });
  return dics[l];
}
// true: existe · false: no existe · null: todavía no sé (no bajó la lista)
const existe = w => (listos[w.length] ? listos[w.length].has(w) : null);
export function reiniciar() { celdas = []; fijas = []; foco = -1; clave = ''; verMio = false; }

// ---------- Menú: de cuántas letras ----------
export function menu(el) {
  menuEl = el;
  el.innerHTML = `<div class="pills" role="radiogroup" aria-label="Letras">${LARGOS.map(n =>
    `<label><input type="radio" name="dpLargo" value="${n}"${n === 5 ? ' checked' : ''}><span>${n}</span></label>`).join('')}
    <span class="note">letras</span></div>`;
}
export function opciones() {
  const r = menuEl && menuEl.querySelector('input[name="dpLargo"]:checked');
  return {largo: r ? +r.value : 5};
}

export function sonido(a, e, ctx) {
  const yo = ctx.miAsiento;
  if (a.fase !== e.fase) return 'entrar';
  if (e.intentos[yo] !== a.intentos[yo]) return e.fin[yo] === 1 ? 'punto' : intentosDe(e, yo).at(-1) === PERDIDO ? null : 'colocar';
  if (e.intentos[1 - yo] !== a.intentos[1 - yo]) return e.fin[1 - yo] === 1 ? 'no' : 'tick';
  if (e.palabras.join() !== a.palabras.join()) return 'tick';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0 || e.fase !== 'palabras') return '';
  return e.palabras[yo] ? `⏳ Esperando a ${ctx.nombre(1 - yo)}` : '🔒 Escondé tu palabra';
}

const letras = (w, res = '') => `<span class="dp-pal">${[...w].map((ch, k) => `<span class="dp-l ${res[k] || ''}">${ch}</span>`).join('')}</span>`;
const tapada = n => `<span class="dp-pal">${'<span class="dp-l tap">?</span>'.repeat(n)}</span>`;
function historial(lista, palabra) {
  return lista.map((w, k) => `<li><span class="nro">${k + 1}</span>${w === PERDIDO
    ? '<span class="note">⏱️ Se pasó el tiempo</span>' : letras(w, comparar(w, palabra))}</li>`).reverse().join('');
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `
    <div class="dp-col dp-col-armar">
    <div class="dp-panel" id="dpArriba"></div>
    <div class="dp-panel" id="dpArmar">
      <div class="dp-slots" id="dpSlots"></div>
      <p class="note dp-tip" id="dpTip" hidden>Tocá una letra para fijarla 🔒 · tocala de nuevo para sacarla</p>
      <p class="dp-noexiste" id="dpNoExiste" hidden>Esa palabra no está en el diccionario</p>
      <div class="dp-teclado" id="dpTeclado">${TECLAS.map((fila, f) => `<div>${[...fila].map(ch => `<button data-t="${ch}">${ch}</button>`).join('')}${
        f === 2 ? '<button data-t="⌫" class="dp-borrar" aria-label="Borrar">⌫</button>' : ''}</div>`).join('')}</div>
      <button class="main grande dp-ok" id="dpOk"></button>
    </div>
    </div>
    <div class="dp-col dp-col-hist">
    <div id="dpMios"></div>
    <div class="dp-rival" id="dpRival"></div>
    </div>`;
  $('dpTeclado').addEventListener('click', ev => {
    const b = ev.target.closest('[data-t]');
    if (!b) return;
    if (b.dataset.t === '⌫') borrar(); else poner(b.dataset.t);
  });
  $('dpSlots').addEventListener('click', ev => {
    const c = ev.target.closest('[data-k]');
    if (c) fijar(+c.dataset.k);
  });
  $('dpOk').onclick = enviar;
  ctx.tablero.addEventListener('click', ev => {
    if (ev.target.closest('[data-a="ver"]')) { verMio = !verMio; clave = ''; ctx.refrescar(); }
    if (ev.target.closest('[data-a="rendirse"]') && confirm('¿Seguro que te rendís? Gana el otro.')) ctx.jugarLibre({tipo: 'rendirse'});
  });
  // En la compu también se escribe con el teclado
  addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.target.closest?.('input, textarea') || $('dpArmar').hidden) return;
    if (/^[a-zñáéíóúü]$/i.test(ev.key)) poner(limpiar(ev.key));
    else if (ev.key === 'Backspace') borrar();
    else if (ev.key === 'Enter') enviar();
    else return;
    ev.preventDefault();
  });
}

function poner(ch) {
  const e = ctx.estado, k = donde();
  if (!e || !ch || k < 0) return;
  celdas[k] = ch; foco = -1;
  ctx.sonar('tap');
  pintarEntrada();
}
// Borra la última letra que no esté fija
function borrar() {
  for (let k = celdas.length - 1; k >= 0; k--) if (celdas[k] && !fijas[k]) { celdas[k] = ''; break; }
  foco = -1;
  pintarEntrada();
}
// Las letras que ya te salieron verdes, cada una en su lugar
function verdes(e, yo) {
  const pal = objetivo(e, yo), v = [];
  for (const w of intentosDe(e, yo)) if (w !== PERDIDO) [...w].forEach((ch, k) => { if (ch === pal[k]) v[k] = ch; });
  return v;
}
// Tocar una casilla: con letra, la fija (o la suelta si ya estaba fija); vacía, pone la verde que ya sabés
// o, si no hay, lleva ahí el cursor para escribir la letra en ese lugar
function fijar(k) {
  const e = ctx.estado;
  if (!e || e.fase !== 'jugar') return;
  if (fijas[k]) { fijas[k] = false; celdas[k] = ''; }
  else {
    const ch = celdas[k] || verdes(e, ctx.miAsiento)[k];
    if (ch) { celdas[k] = ch; fijas[k] = true; if (foco === k) foco = -1; }
    else foco = k;
  }
  ctx.sonar('tap');
  pintarEntrada();
}
async function enviar() {
  const e = ctx.estado, l = largo(e);
  if (!llena()) { ctx.sonar('error'); ctx.aviso(`Tiene que tener ${l} letras`); return; }
  const w = escrito();
  await diccionario(l);
  if (existe(w) === false) {
    ctx.sonar('error'); ctx.animar($('dpSlots'), 'sacudir');
    ctx.aviso(`“${w}” no está en el diccionario: probá con otra palabra`);
    return;
  }
  if (e.fase === 'jugar' && e.turno !== ctx.miAsiento) { ctx.sonar('error'); ctx.aviso(`Esperá tu turno: está jugando ${ctx.nombre(e.turno)}`); return; }
  // Se limpia antes de mandar (las fijas quedan), así lo que escribas mientras viaja no se pierde; si no se pudo, vuelve
  vaciar(); pintarEntrada();
  const ok = e.fase === 'palabras' ? await ctx.jugarLibre({tipo: 'palabra', palabra: w}) : await ctx.jugar({tipo: 'intento', palabra: w});
  if (!ok) {
    if (w.length === celdas.length && !celdas.some((ch, k) => ch && !fijas[k])) { celdas = [...w]; pintarEntrada(); }
    if (e.fase === 'palabras') ctx.aviso('No se pudo mandar, probá de nuevo');
  }
}

function pintarEntrada() {
  const e = ctx.estado, cur = donde();
  const mal = llena() && existe(escrito()) === false;    // completa y no existe: en rojo
  $('dpSlots').innerHTML = celdas.map((ch, k) =>
    `<span class="dp-l grande${k === cur ? ' cursor' : ''}${fijas[k] ? ' fija' : ''}${mal ? ' mal' : ''}" data-k="${k}"${
      fijas[k] ? ' title="Letra fija: tocá para sacarla"' : ''}>${ch}</span>`).join('');
  $('dpTip').hidden = e.fase !== 'jugar';
  $('dpNoExiste').hidden = !mal;
}
// Lo que sabés de cada letra por tus intentos: verde le gana a amarilla y amarilla a gris
function pintarTeclado(e, yo) {
  const sabe = {}, orden = {g: 1, a: 2, v: 3};
  const pal = objetivo(e, yo);
  if (e.fase === 'jugar' && pal) for (const w of intentosDe(e, yo)) {
    if (w === PERDIDO) continue;
    const r = comparar(w, pal);
    [...w].forEach((ch, k) => { if (!sabe[ch] || orden[r[k]] > orden[sabe[ch]]) sabe[ch] = r[k]; });
  }
  $('dpTeclado').querySelectorAll('[data-t]').forEach(b => { b.className = b.dataset.t === '⌫' ? 'dp-borrar' : (sabe[b.dataset.t] || ''); });
}

export function dibujar(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  const otro = 1 - yo, rival = esc(ctx.nombre(otro)), termino = e.ganador !== -1, l = largo(e);
  const jugando = e.fase === 'jugar', mia = e.palabras[yo];
  if (celdas.length !== l) { celdas = Array(l).fill(''); fijas = Array(l).fill(false); foco = -1; }
  if (!listos[l]) diccionario(l).then(d => { if (d) pintarEntrada(); });   // se baja mientras escribís

  // Si empezó otra partida o cambió la fase, se limpia lo escrito
  const k = [l, e.fase, mia ? 1 : 0, e.palabras[otro] ? 1 : 0, verMio, termino].join('|');
  if (k !== clave) {
    if (clave.split('|').slice(0, 3).join('|') !== k.split('|').slice(0, 3).join('|')) vaciar(true);
    clave = k;
    const tuya = mia ? `<span class="dp-tuya">Tu palabra para ${rival}: ${verMio || termino ? letras(mia) : tapada(l)}
      ${termino ? '' : `<button class="icono dp-ver" data-a="ver" title="${verMio ? 'Tapar' : 'Ver'}">${verMio ? '🙈' : '👁'}</button>`}</span>` : '';
    $('dpArriba').innerHTML = !mia
      ? `<h3>🔒 Escondé una palabra para ${rival}</h3><p class="note">De ${l} letras y que exista: se revisa con un diccionario. Las tildes no cuentan.</p>`
      : !jugando ? `${tuya}<p class="note">Esperando que ${rival} esconda la tuya…</p>`
      : tuya + (termino ? `<p class="note">La de ${rival} era ${letras(objetivo(e, yo))}</p>` : '');
  }

  const armando = !termino && (e.fase === 'palabras' ? !mia : !e.fin[yo]);
  $('dpArmar').hidden = !armando;
  if (armando) {
    const espero = jugando && e.turno !== yo;
    $('dpOk').textContent = e.fase === 'palabras' ? '🔒 Esconder' : espero ? `⏳ Turno de ${ctx.nombre(otro)}` : '🔍 Probar';
    $('dpOk').disabled = espero;
    pintarEntrada();
    pintarTeclado(e, yo);
  }

  if (!jugando) { $('dpMios').innerHTML = ''; $('dpRival').innerHTML = ''; return mia ? '' : `Escribí la palabra que va a tener que descubrir ${rival}`; }

  const mios = intentosDe(e, yo), objetivoMio = objetivo(e, yo);
  $('dpMios').innerHTML = `<div class="dp-panel">
      <div class="dp-titulo"><h3>Tus intentos <span class="note">(${mios.length})</span></h3>
        ${!e.fin[yo] && !termino ? '<button class="dp-rendirse" data-a="rendirse">🏳️ Me rindo</button>' : ''}</div>
      <p class="note dp-ley"><span class="dp-l mini v"></span> en su lugar · <span class="dp-l mini a"></span> está, pero en otro lugar · <span class="dp-l mini g"></span> no está</p>
      ${mios.length ? `<ol class="dp-hist">${historial(mios, objetivoMio)}</ol>` : '<p class="note">Todavía no probaste ninguna.</p>'}
      ${e.fin[yo] === 1 ? `<p class="dp-msg">🎉 ¡La descubriste en <b>${mios.length}</b> ${mios.length === 1 ? 'intento' : 'intentos'}!</p>`
        : e.fin[yo] === 2 ? '<p class="dp-msg">🏳️ Te rendiste</p>' : ''}
    </div>`;

  // Cómo viene el otro: prueba contra TU palabra, así que verlo no regala nada
  const suyos = intentosDe(e, otro);
  const estadoR = e.fin[otro] === 1 ? '🎉 la descubrió' : e.fin[otro] === 2 ? '🏳️ se rindió' : 'probando…';
  $('dpRival').innerHTML = `<details${termino ? ' open' : ''}><summary><b>${rival}</b> · ${suyos.length} ${suyos.length === 1 ? 'intento' : 'intentos'} · <span class="note">${estadoR}</span></summary>
      ${suyos.length ? `<ol class="dp-hist chico">${historial(suyos, mia)}</ol>` : '<p class="note">Todavía no probó ninguna.</p>'}</details>`;

  if (e.fin[yo] && !termino) return `¡La sacaste! ${rival} tiene un último intento para empatar…`;
  if (armando && e.turno !== yo) return `Mientras ${rival} juega, andá pensando tu próxima palabra`;
  return armando ? `Escribí una palabra de ${l} letras y tocá Probar` : '';
}
