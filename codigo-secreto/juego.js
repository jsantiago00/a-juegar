// Pantalla de Código secreto: primero cada uno esconde el código del otro; después prueban por turnos.
// Mientras juega el otro, podés ir armando tu próximo intento (se manda cuando te toca).
import { LARGO, MODOS, COLORES, PERDIDO, simbolos, esColores, comparar, objetivo, intentosDe } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, menuEl = null;
let entrada = [], cursor = 0;     // lo que estás armando (código o intento) y en qué casillero va el próximo
let clave = '', teclas = '', verMio = false;
// Tus marcas en el teclado (las ponés vos, a mano): símbolo -> 'no' (tachado) o 'duda'
let marcas = {}, tachando = false, pidMarcas = null;
export function reiniciar() { entrada = Array(LARGO).fill(null); cursor = 0; clave = ''; verMio = false; marcas = {}; tachando = false; pidMarcas = null; }
reiniciar();

// ---------- Menú: números o colores ----------
export function menu(el) {
  menuEl = el;
  el.innerHTML = `<div class="pills cs-modos" role="radiogroup" aria-label="Modo">${Object.entries(MODOS).map(([id, m], k) =>
    `<label><input type="radio" name="csModo" value="${id}"${k === 0 ? ' checked' : ''}><span>${m.emoji} ${m.nombre}</span></label>`).join('')}</div>`;
}
export function opciones() {
  const r = menuEl && menuEl.querySelector('input[name="csModo"]:checked');
  return {modo: r ? r.value : 'numeros'};
}

export function sonido(a, e, ctx) {
  const yo = ctx.miAsiento;
  if (a.fase !== e.fase) return 'entrar';
  if (e.intentos[yo] !== a.intentos[yo]) return e.fin[yo] === 1 ? 'punto' : intentosDe(e, yo).at(-1) === PERDIDO ? null : 'colocar';
  if (e.intentos[1 - yo] !== a.intentos[1 - yo]) return e.fin[1 - yo] === 1 ? 'no' : 'tick';   // jugó el otro: te toca
  if (e.codigos.join() !== a.codigos.join()) return 'tick';
  return null;
}
// Mientras esconden, el cartel de arriba dice en qué andás vos; después, el de siempre (de quién es el turno)
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento, rival = ctx.nombre(1 - yo);
  if (yo < 0 || e.fase !== 'codigos') return '';
  return e.codigos[yo] ? `⏳ Esperando a ${rival}` : '🔒 Escondé tu código';
}

// Un casillero: el número o la bolita del color
function ficha(e, ch, extra = '') {
  if (ch == null) return `<span class="cs-f vacia${extra}"></span>`;
  if (esColores(e)) { const c = COLORES[+ch]; return `<span class="cs-f bola${extra}" style="--c:${c.c}" title="${c.nombre}"></span>`; }
  return `<span class="cs-f num${extra}">${ch}</span>`;
}
const fichas = (e, cod) => `<span class="cs-cod">${[...cod].map(ch => ficha(e, ch)).join('')}</span>`;
const oculto = () => `<span class="cs-cod">${'<span class="cs-f tapada">?</span>'.repeat(LARGO)}</span>`;
function resultado(r) {
  // Con íconos y palabras (no bolitas) para que en Colores no se confundan con los colores del código
  return `<span class="cs-res"><span class="bien">✔ ${r.bien} bien</span>` +
         `<span class="errado">⚠ ${r.errado} ${r.errado === 1 ? 'errado' : 'errados'}</span></span>`;
}
function historial(e, lista, codigo) {
  return lista.map((cod, k) => `<li><span class="nro">${k + 1}</span>${cod === PERDIDO
    ? '<span class="note">⏱️ Se pasó el tiempo</span>' : fichas(e, cod) + resultado(comparar(cod, codigo))}</li>`).reverse().join('');
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `
    <div class="cs-panel" id="csArriba"></div>
    <div class="cs-panel" id="csArmar">
      <div class="cs-slots" id="csSlots"></div>
      <div class="cs-herr" id="csHerr"><button class="chico cs-tachar" id="csTachar"></button><span class="note" id="csTacharTxt"></span></div>
      <div class="cs-teclado" id="csTeclado"></div>
      <div class="row cs-acciones"><button id="csBorrar">⌫ Borrar</button><button class="main" id="csOk"></button></div>
    </div>
    <div id="csMios"></div>
    <div class="cs-rival" id="csRival"></div>`;
  $('csSlots').addEventListener('click', ev => { const s = ev.target.closest('[data-k]'); if (s) { cursor = +s.dataset.k; pintarEntrada(); } });
  $('csTeclado').addEventListener('click', ev => { const b = ev.target.closest('[data-s]'); if (b) (tachando ? marcar : poner)(b.dataset.s); });
  $('csTachar').onclick = () => { tachando = !tachando; ctx.sonar('tap'); pintarMarcas(); };
  $('csBorrar').onclick = borrar;
  $('csOk').onclick = enviar;
  ctx.tablero.addEventListener('click', ev => {
    if (ev.target.closest('[data-a="ver"]')) { verMio = !verMio; clave = ''; ctx.refrescar(); }
    if (ev.target.closest('[data-a="rendirse"]') && confirm('¿Seguro que te rendís? Gana el otro.')) ctx.jugarLibre({tipo: 'rendirse'});
  });
  // En la compu también se juega con el teclado: números (en Colores, del 1 al 6), ⌫, ← →, Enter
  addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.target.closest?.('input, textarea') || $('csArmar').hidden) return;
    const e = ctx.estado;
    if (!e) return;
    if (/^[0-9]$/.test(ev.key)) {
      const s = esColores(e) ? +ev.key - 1 : +ev.key;
      if (s >= 0 && s < simbolos(e)) poner(String(s));
    } else if (ev.key === 'Backspace') borrar();
    else if (ev.key === 'ArrowLeft') { cursor = Math.max(0, cursor - 1); pintarEntrada(); }
    else if (ev.key === 'ArrowRight') { cursor = Math.min(LARGO - 1, cursor + 1); pintarEntrada(); }
    else if (ev.key === 'Enter') enviar();
    else return;
    ev.preventDefault();
  });
}

function poner(s) {
  entrada[cursor] = s;
  ctx.sonar('tap');
  // Va al próximo casillero vacío (si no hay, al siguiente)
  const vacio = [...Array(LARGO).keys()].map(k => (cursor + 1 + k) % LARGO).find(k => entrada[k] == null);
  cursor = vacio ?? Math.min(cursor + 1, LARGO - 1);
  pintarEntrada();
}
function borrar() {
  if (entrada[cursor] == null && cursor > 0) cursor--;
  entrada[cursor] = null;
  pintarEntrada();
}
async function enviar() {
  const e = ctx.estado;
  if (entrada.some(x => x == null)) { ctx.sonar('error'); ctx.aviso(`Completá los ${LARGO} casilleros`); return; }
  const cod = entrada.join('');
  if (e.fase === 'jugar' && e.turno !== ctx.miAsiento) { ctx.sonar('error'); ctx.aviso(`Esperá tu turno: está jugando ${ctx.nombre(e.turno)}`); return; }
  const ok = e.fase === 'codigos' ? await ctx.jugarLibre({tipo: 'codigo', codigo: cod}) : await ctx.jugar({tipo: 'intento', codigo: cod});
  if (ok) { entrada = Array(LARGO).fill(null); cursor = 0; pintarEntrada(); }
  else if (e.fase === 'codigos') ctx.aviso('No se pudo mandar, probá de nuevo');
}

// Tachar: cada toque pasa de sin marca a ✕ (no va), a ? (duda) y de vuelta a sin marca
const claveMarcas = () => `cs-marcas-${pidMarcas}`;
function marcar(s) {
  marcas[s] = marcas[s] === 'no' ? 'duda' : marcas[s] === 'duda' ? undefined : 'no';
  if (!marcas[s]) delete marcas[s];
  try { sessionStorage.setItem(claveMarcas(), JSON.stringify(marcas)); } catch {}
  ctx.sonar('tick');
  pintarMarcas();
}
function pintarMarcas() {
  $('csTeclado').classList.toggle('tachando', tachando);
  $('csTeclado').querySelectorAll('[data-s]').forEach(b => {
    if (marcas[b.dataset.s]) b.dataset.marca = marcas[b.dataset.s]; else delete b.dataset.marca;
  });
  $('csTachar').classList.toggle('on', tachando);
  $('csTachar').textContent = tachando ? '✔ Listo' : '✏️ Tachar';
  $('csTacharTxt').textContent = tachando ? 'Tocá para marcar: ✕ no va → ? duda → sin marca'
    : Object.keys(marcas).length ? '' : 'Marcá los que creés que no van';
}

function pintarEntrada() {
  const e = ctx.estado;
  $('csSlots').innerHTML = entrada.map((ch, k) =>
    `<button class="cs-slot${k === cursor ? ' cursor' : ''}" data-k="${k}" aria-label="Casillero ${k + 1}">${ficha(e, ch)}</button>`).join('');
}
function armarTeclado(e) {
  const t = `${e.opciones.modo}`;
  if (t === teclas) return;
  const cambio = teclas !== '';                 // cambió de Números a Colores (o al revés), no la primera vez
  teclas = t;
  const n = simbolos(e);
  $('csTeclado').className = 'cs-teclado ' + (esColores(e) ? 'colores' : 'numeros');
  $('csTeclado').innerHTML = Array.from({length: n}, (_, s) => esColores(e)
    ? `<button data-s="${s}" style="--c:${COLORES[s].c}" aria-label="${COLORES[s].nombre}"><span class="bola-t"></span><small>${COLORES[s].nombre}</small></button>`
    : `<button data-s="${s}">${s}</button>`).join('');
  // Si cambió el modo, lo que estaba escrito (y lo marcado) ya no sirve
  entrada = Array(LARGO).fill(null); cursor = 0;
  if (cambio) { marcas = {}; try { sessionStorage.removeItem(claveMarcas()); } catch {} }
}

export function dibujar(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  const otro = 1 - yo, rival = esc(ctx.nombre(otro)), termino = e.ganador !== -1;
  const jugando = e.fase === 'jugar', mio = e.codigos[yo];
  // Partida nueva: marcas nuevas (si recargaste la página, vuelven las que tenías)
  if (pidMarcas !== e.pid) {
    pidMarcas = e.pid; tachando = false;
    try { marcas = JSON.parse(sessionStorage.getItem(claveMarcas())) || {}; } catch { marcas = {}; }
  }
  armarTeclado(e);

  // Si empezó otra partida (revancha) o cambió la fase, se limpia lo escrito
  const k = [e.opciones.modo, e.fase, mio ? 1 : 0, e.codigos[otro] ? 1 : 0, verMio, termino].join('|');
  if (k !== clave) {
    if (clave.split('|').slice(0, 3).join('|') !== k.split('|').slice(0, 3).join('|')) { entrada = Array(LARGO).fill(null); cursor = 0; }
    clave = k;
    const modo = MODOS[e.opciones.modo] || MODOS.numeros;
    const tuyo = mio ? `<span class="cs-tuyo">Tu código para ${rival}: ${verMio || termino ? fichas(e, mio) : oculto()}
      ${termino ? '' : `<button class="icono cs-ver" data-a="ver" title="${verMio ? 'Tapar' : 'Ver'}">${verMio ? '🙈' : '👁'}</button>`}</span>` : '';
    $('csArriba').innerHTML = !mio
      ? `<h3>🔒 Escondé tu código para ${rival}</h3>
         <p class="note">${modo.emoji} ${modo.nombre}: elegí ${LARGO} ${esColores(e) ? 'colores' : 'números del 0 al 9'}. Se pueden repetir.</p>`
      : !jugando ? `${tuyo}<p class="note">Esperando que ${rival} esconda el tuyo…</p>`
      : tuyo + (termino ? `<p class="note">El de ${rival} era ${fichas(e, objetivo(e, yo))}</p>` : '');
  }

  const armando = !termino && (e.fase === 'codigos' ? !mio : !e.fin[yo]);
  $('csArmar').hidden = !armando;
  if (armando) {
    const espero = jugando && e.turno !== yo;
    $('csOk').textContent = e.fase === 'codigos' ? '🔒 Esconder' : espero ? `⏳ Turno de ${ctx.nombre(otro)}` : '🔍 Probar';
    $('csOk').disabled = espero;
    $('csHerr').hidden = !jugando;              // tachar sirve para adivinar, no para esconder el tuyo
    if (!jugando) tachando = false;
    pintarEntrada();
    pintarMarcas();
  }

  if (!jugando) { $('csMios').innerHTML = ''; $('csRival').innerHTML = ''; return mio ? '' : `Armá el código que va a tener que descifrar ${rival}`; }

  // Mis intentos (el último arriba)
  const mios = intentosDe(e, yo), objetivoMio = objetivo(e, yo);
  $('csMios').innerHTML = `<div class="cs-panel">
      <div class="cs-titulo"><h3>Tus intentos <span class="note">(${mios.length})</span></h3>
        ${!e.fin[yo] && !termino ? '<button class="cs-rendirse" data-a="rendirse">🏳️ Me rindo</button>' : ''}</div>
      <p class="note cs-ley">✔ bien: en su lugar · ⚠ errados: van, pero en otro lugar</p>
      ${mios.length ? `<ol class="cs-hist">${historial(e, mios, objetivoMio)}</ol>` : '<p class="note">Todavía no probaste ninguno.</p>'}
      ${e.fin[yo] === 1 ? `<p class="cs-msg">🎉 ¡Lo descifraste en <b>${mios.length}</b> ${mios.length === 1 ? 'intento' : 'intentos'}!</p>`
        : e.fin[yo] === 2 ? '<p class="cs-msg">🏳️ Te rendiste</p>' : ''}
    </div>`;

  // Cómo viene el otro: sus intentos son contra TU código, así que verlos no regala nada
  const suyos = intentosDe(e, otro);
  const estadoR = e.fin[otro] === 1 ? '🎉 lo descifró' : e.fin[otro] === 2 ? '🏳️ se rindió' : 'probando…';
  $('csRival').innerHTML = `<details${termino ? ' open' : ''}><summary><b>${rival}</b> · ${suyos.length} ${suyos.length === 1 ? 'intento' : 'intentos'} · <span class="note">${estadoR}</span></summary>
      ${suyos.length ? `<ol class="cs-hist chico">${historial(e, suyos, mio)}</ol>` : '<p class="note">Todavía no probó ninguno.</p>'}</details>`;

  if (e.fin[yo] && !termino) return `¡Lo sacaste! ${rival} tiene un último intento para empatar…`;
  if (armando && e.turno !== yo) return `Mientras ${rival} juega, andá armando tu próximo intento`;
  return armando ? (esColores(e) ? 'Tocá los colores (en la compu, del 1 al 6) y después Probar' : 'Escribí 4 números y tocá Probar') : '';
}
