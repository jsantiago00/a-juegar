// Pantalla del Críptico: primero escribís tu palabra y tu críptico; después vas descifrando los de los demás
// a tu ritmo, de a uno (sin esperar a que terminen los otros).
// Cada parte se vuelve a dibujar solo cuando cambia lo suyo, así no se pierde lo que estás escribiendo.
import { INTENTOS, MIN_LARGO, MAX_LARGO, MAX_PISTA, limpiar, descifran, ordenDe, siguiente, hechas, terminoTodo } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, pid = '', actual = -1;
const claves = {};
export function reiniciar() { pid = ''; actual = -1; for (const k in claves) delete claves[k]; }

export function sonido(a, e, ctx) {
  const yo = ctx.miAsiento;
  if (yo < 0 || a.pid !== e.pid) return 'entrar';
  for (let x = 0; x < e.n; x++) {
    if (e.intentos[yo][x].length !== a.intentos[yo][x].length) return e.fin[yo][x] === 1 ? 'punto' : e.fin[yo][x] === 2 ? 'perder' : 'no';
  }
  if (e.pal.join() !== a.pal.join() || JSON.stringify(e.fin) !== JSON.stringify(a.fin)) return 'tick';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (!e.pal[yo]) return '✍️ Escribí tu críptico';
  if (actual >= 0 && e.fin[yo][actual]) return '👀 ¡Era…!';
  if (siguiente(e, yo) >= 0) return '🧩 ¡Descifralo!';
  return terminoTodo(e, yo) ? '⏳ Esperando a los demás' : '⏳ Esperando cripticos';
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `<div class="cr-panel" id="crEscribir" hidden></div><div id="crJuego"></div>
    <div class="cr-otros" id="crOtros"></div><div class="cr-panel" id="crMio" hidden></div><div id="crFinal" hidden></div>`;
  $('crEscribir').addEventListener('click', ev => { if (ev.target.closest('[data-a="enviar"]')) enviar(); });
  $('crEscribir').addEventListener('input', ev => {
    if (ev.target.id === 'crPistaTxt') $('crLargo').textContent = `${ev.target.value.length}/${MAX_PISTA}`;
  });
  $('crJuego').addEventListener('submit', ev => { ev.preventDefault(); arriesgar(); });
  $('crJuego').addEventListener('click', ev => {
    if (ev.target.closest('[data-a="seguir"]')) { ctx.sonar('tap'); actual = -1; ctx.refrescar(); }
  });
}

async function arriesgar() {
  const inp = $('crIntento'), txt = inp.value.trim(), e = ctx.estado, yo = ctx.miAsiento, a = actual;
  if (!limpiar(txt) || a < 0) return;
  if (e.intentos[yo][a].map(limpiar).includes(limpiar(txt))) { ctx.sonar('error'); ctx.aviso('Esa ya la probaste'); return; }
  inp.value = '';
  if (!(await ctx.jugarLibre({tipo: 'arriesgar', a, texto: txt}))) { inp.value ||= txt; ctx.aviso('No se pudo mandar, probá de nuevo'); }
}
async function enviar() {
  const txt = $('crTxt').value.trim(), w = limpiar(txt), pista = $('crPistaTxt').value.trim();
  if (w.length < MIN_LARGO || w.length > MAX_LARGO) { ctx.sonar('error'); ctx.aviso(`La palabra tiene que tener de ${MIN_LARGO} a ${MAX_LARGO} letras`); return; }
  if (pista.length < 3) { ctx.sonar('error'); ctx.aviso('Escribí el críptico'); return; }
  if (limpiar(pista).includes(w)) { ctx.sonar('error'); ctx.aviso('¡El críptico no puede tener la palabra!'); return; }
  ctx.sonar('tap');
  if (!(await ctx.jugarLibre({tipo: 'escribir', palabra: txt, pista}))) ctx.aviso('No se pudo mandar, probá de nuevo');
}

const quien = (ctx, p) => `<span class="dot" style="background:${ctx.color(p)}"></span><b>${esc(ctx.nombre(p))}</b>`;
const tachados = xs => xs.map(x => `<s>${esc(x)}</s>`).join(' ');
const nadieEscribiendo = () => !document.activeElement || document.activeElement === document.body;

// Cambia el contenido de una parte solo si cambió su clave (si no, quedan intactos los campos y el foco)
function poner(id, k, html) {
  if (claves[id] === k) return false;
  claves[id] = k;
  $(id).innerHTML = html;
  $(id).hidden = !html;
  return true;
}
// Cómo le fue a p con la palabra de a
function resultado(e, p, a) {
  const xs = e.intentos[p][a], ok = e.fin[p][a] === 1, malos = ok ? xs.slice(0, -1) : xs;
  return `${ok ? `🎉 en el intento ${xs.length}` : '😵 no la sacó'}${malos.length ? ` · ${tachados(malos)}` : ''}`;
}
// Cuántas letras tiene (y, si son varias palabras, de cuántas es cada una): ej. "14 letras · 5 + 2 + 5"
function letras(e, a) {
  const partes = e.vista[a].split(' ').map(limpiar).filter(Boolean), total = e.pal[a].length;
  const rayas = partes.map(w => `<span>${'_'.repeat(w.length)}</span>`).join('');
  return `<p class="cr-letras" aria-label="${total} letras"><span class="cr-rayas">${rayas}</span>
    <span class="note">${total} letras${partes.length > 1 ? ` · ${partes.map(w => w.length).join(' + ')}` : ''}</span></p>`;
}
const progreso = (e, p, a) => {
  const n = e.intentos[p][a].length;
  return e.fin[p][a] === 1 ? `🎉 la sacó en el intento ${n}` : e.fin[p][a] === 2 ? '😵 sin intentos' : `${'❌'.repeat(n)}${'○'.repeat(INTENTOS - n)}`;
};

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (e.pid !== pid) { reiniciar(); pid = e.pid; }       // partida nueva (revancha)
  const termino = e.ganador !== -1, escribi = !!e.pal[yo];

  // ---------- Fin: todas las palabras con cómo le fue a cada uno ----------
  if (termino) {
    for (const id of ['crEscribir', 'crJuego', 'crOtros', 'crMio']) poner(id, '', '');
    poner('crFinal', 'fin|' + JSON.stringify(e.fin), ordenDe(e, yo).concat(yo).map(a => `<div class="cr-panel">
        <p class="note">El críptico de ${quien(ctx, a)}</p><p class="cr-tu-pista">“${esc(e.pista[a])}”</p>
        <h3>Era <span class="cr-secreta">${esc(e.vista[a])}</span></h3>
        <ul class="cr-res">${descifran(e, a).map(p => `<li>${quien(ctx, p)} <span class="note">${resultado(e, p, a)}</span><b>+${e.pr[p][a]}</b></li>`).join('')}
          <li>${quien(ctx, a)} <span class="note">la escribió</span><b>+${e.pr[a][a]}</b></li></ul></div>`).join(''));
    return '';
  }
  poner('crFinal', '', '');

  // ---------- Escribir tu palabra (se dibuja una sola vez: lo que escribís no se toca) ----------
  if (poner('crEscribir', escribi ? '' : 'escribir', escribi ? '' : `<h3>✍️ Tu palabra y su críptico</h3>
      <p class="note">La palabra es secreta. El críptico lo ven todos: una adivinanza, un juego de palabras…
        Que cueste, pero que se pueda: los demás tienen ${INTENTOS} intentos y solo van a saber cuántas letras tiene.</p>
      <div class="row"><input id="crTxt" maxlength="30" autocomplete="off" spellcheck="false" placeholder="Palabra secreta (ej: mate)"></div>
      <textarea id="crPistaTxt" maxlength="${MAX_PISTA}" rows="3" placeholder="Críptico (ej: Va de mano en mano, pero siempre vuelve a la misma boca)"></textarea>
      <div class="row cr-enviar"><span class="note" id="crLargo">0/${MAX_PISTA}</span><button class="main" data-a="enviar">Listo</button></div>`)
    && !escribi && nadieEscribiendo()) $('crTxt').focus();

  // ---------- Tu palabra y cómo les va a los demás con ella ----------
  poner('crMio', escribi ? 'mio|' + JSON.stringify(descifran(e, yo).map(p => [e.pal[p] ? 1 : 0, e.intentos[p][yo].length, e.fin[p][yo]])) : '',
    escribi ? `<h3>Tu palabra: <span class="cr-secreta">${esc(e.vista[yo])}</span></h3><p class="cr-tu-pista">“${esc(e.pista[yo])}”</p>
      <div class="cr-otros">${descifran(e, yo).map(p => `<div class="cr-otro">${quien(ctx, p)} <span class="note">${
        e.pal[p] ? progreso(e, p, yo) : 'todavía escribiendo el suyo…'}</span></div>`).join('')}</div>` : '');

  if (!escribi) {
    poner('crJuego', '', ''); poner('crOtros', '', '');
    return 'Escribí una palabra y un críptico para que la adivinen los demás';
  }

  // ---------- Descifrar: la que te toca (o la que acabás de terminar, hasta que toques Siguiente) ----------
  if (actual < 0 || (!e.fin[yo][actual] && !e.pal[actual])) actual = siguiente(e, yo);
  const a = actual;
  if (a < 0) {
    const faltan = ordenDe(e, yo).filter(x => !e.pal[x]);
    poner('crJuego', 'espera|' + faltan.join(), `<p class="cr-msg">${faltan.length
      ? `⏳ Esperando que ${faltan.map(p => `<b>${esc(ctx.nombre(p))}</b>`).join(', ')} ${faltan.length > 1 ? 'escriban sus cripticos' : 'escriba su críptico'}…`
      : '✔ ¡Terminaste todos! Esperando a los demás…'}</p>`);
    poner('crOtros', '', '');
    return `Llevás ${hechas(e, yo)} de ${e.n - 1}`;
  }
  const mios = e.intentos[yo][a], quedan = INTENTOS - mios.length, fin = e.fin[yo][a];
  const cab = `<div class="cr-pista"><p class="note">${hechas(e, yo) + (fin ? 0 : 1)} de ${e.n - 1} · el críptico de ${quien(ctx, a)}</p>
      <p class="cr-tu-pista">“${esc(e.pista[a])}”</p>${letras(e, a)}</div>`;
  let h;
  if (fin) {
    const hay = siguiente(e, yo) >= 0;
    h = `${cab}<p class="cr-msg">${fin === 1 ? `🎉 ¡La sacaste en el intento ${mios.length}! <b>+${e.pr[yo][a]}</b>` : `😵 Te quedaste sin intentos: ${tachados(mios)}`}</p>
      <h3 class="cr-msg">Era <span class="cr-secreta">${esc(e.vista[a])}</span></h3>
      <button class="main grande" data-a="seguir">${hay ? 'Siguiente críptico ➜' : 'Listo ✔'}</button>`;
  } else h = `${cab}<form class="row cr-arriesgar"><input id="crIntento" maxlength="30" autocomplete="off" spellcheck="false" placeholder="¿Qué palabra es?" aria-label="Tu respuesta">
      <button class="main">Arriesgar</button></form>
      <p class="cr-msg">${quedan === 1 ? '¡Te queda <b>1</b> intento!' : `Te quedan <b>${quedan}</b> intentos`}${mios.length ? ` · ${tachados(mios)}` : ''}</p>`;
  const antes = $('crIntento'), escrito = antes?.value || '', tenia = !!antes && document.activeElement === antes;
  if (poner('crJuego', ['juego', a, mios.length, fin].join('|'), h) && $('crIntento')) {
    $('crIntento').value = escrito;
    if (tenia || nadieEscribiendo()) $('crIntento').focus();
  }
  // Cómo vienen los demás con esta palabra (sin ver lo que arriesgan)
  const otros = descifran(e, a).filter(p => p !== yo && e.pal[p]);
  poner('crOtros', 'otros|' + a + '|' + JSON.stringify(otros.map(p => [e.intentos[p][a].length, e.fin[p][a]])),
    otros.map(p => `<div class="cr-otro">${quien(ctx, p)} <span class="note">${progreso(e, p, a)}</span></div>`).join(''));
  return '';
}

export function resumenFin(ctx) { return ctx.estado.ultima; }
