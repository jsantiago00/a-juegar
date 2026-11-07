// Pantalla de Duelo de palabras: primero cada uno esconde la palabra del otro; después prueban por turnos.
// El teclado se va pintando con lo que ya sabés de cada letra. Mientras juega el otro, podés ir escribiendo.
import { LARGOS, PERDIDO, largo, limpiar, comparar, objetivo, intentosDe } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, menuEl = null;
let escrito = '', clave = '', verMio = false;
const TECLAS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];
export function reiniciar() { escrito = ''; clave = ''; verMio = false; }

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
    <div class="dp-panel" id="dpArriba"></div>
    <div class="dp-panel" id="dpArmar">
      <div class="dp-slots" id="dpSlots"></div>
      <div class="dp-teclado" id="dpTeclado">${TECLAS.map((fila, f) => `<div>${[...fila].map(ch => `<button data-t="${ch}">${ch}</button>`).join('')}${
        f === 2 ? '<button data-t="⌫" class="dp-borrar" aria-label="Borrar">⌫</button>' : ''}</div>`).join('')}</div>
      <button class="main grande dp-ok" id="dpOk"></button>
    </div>
    <div id="dpMios"></div>
    <div class="dp-rival" id="dpRival"></div>`;
  $('dpTeclado').addEventListener('click', ev => {
    const b = ev.target.closest('[data-t]');
    if (!b) return;
    if (b.dataset.t === '⌫') borrar(); else poner(b.dataset.t);
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
  const e = ctx.estado;
  if (!e || !ch || escrito.length >= largo(e)) return;
  escrito += ch;
  ctx.sonar('tap');
  pintarEntrada();
}
function borrar() { escrito = escrito.slice(0, -1); pintarEntrada(); }
async function enviar() {
  const e = ctx.estado, l = largo(e);
  if (escrito.length !== l) { ctx.sonar('error'); ctx.aviso(`Tiene que tener ${l} letras`); return; }
  if (e.fase === 'jugar' && e.turno !== ctx.miAsiento) { ctx.sonar('error'); ctx.aviso(`Esperá tu turno: está jugando ${ctx.nombre(e.turno)}`); return; }
  // Se limpia antes de mandar, así lo que escribas mientras viaja no se pierde; si no se pudo, vuelve
  const w = escrito;
  escrito = ''; pintarEntrada();
  const ok = e.fase === 'palabras' ? await ctx.jugarLibre({tipo: 'palabra', palabra: w}) : await ctx.jugar({tipo: 'intento', palabra: w});
  if (!ok) {
    if (!escrito) { escrito = w; pintarEntrada(); }
    if (e.fase === 'palabras') ctx.aviso('No se pudo mandar, probá de nuevo');
  }
}

function pintarEntrada() {
  const e = ctx.estado, l = largo(e);
  $('dpSlots').innerHTML = Array.from({length: l}, (_, k) =>
    `<span class="dp-l grande${k === escrito.length ? ' cursor' : ''}">${escrito[k] || ''}</span>`).join('');
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
  if (escrito.length > l) escrito = escrito.slice(0, l);

  // Si empezó otra partida o cambió la fase, se limpia lo escrito
  const k = [l, e.fase, mia ? 1 : 0, e.palabras[otro] ? 1 : 0, verMio, termino].join('|');
  if (k !== clave) {
    if (clave.split('|').slice(0, 3).join('|') !== k.split('|').slice(0, 3).join('|')) escrito = '';
    clave = k;
    const tuya = mia ? `<span class="dp-tuya">Tu palabra para ${rival}: ${verMio || termino ? letras(mia) : tapada(l)}
      ${termino ? '' : `<button class="icono dp-ver" data-a="ver" title="${verMio ? 'Tapar' : 'Ver'}">${verMio ? '🙈' : '👁'}</button>`}</span>` : '';
    $('dpArriba').innerHTML = !mia
      ? `<h3>🔒 Escondé una palabra para ${rival}</h3><p class="note">De ${l} letras, que exista de verdad (sin nombres propios). Las tildes no cuentan.</p>`
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
