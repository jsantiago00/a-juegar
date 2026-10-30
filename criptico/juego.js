// Pantalla del Críptico: primero cada uno escribe su palabra y su críptico; después, palabra por palabra,
// el críptico arriba, tus intentos y cómo vienen los demás.
import { INTENTOS, MIN_LARGO, MAX_LARGO, MAX_PISTA, limpiar, autor, descifran } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, clave = '', claveJuego = '';
export function reiniciar() { clave = ''; claveJuego = ''; }

export function sonido(a, e, ctx) {
  const yo = ctx.miAsiento;
  if (a.fase !== e.fase || a.ronda !== e.ronda) return e.fase === 'ver' ? 'pasar' : 'entrar';
  if (e.fase === 'adivinar' && e.intentos[yo].length !== a.intentos[yo].length) return e.fin[yo] === 1 ? 'punto' : e.fin[yo] === 2 ? 'perder' : 'no';
  if (e.pal.join() !== a.pal.join() || e.fin.join() !== a.fin.join()) return 'tick';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (e.fase === 'escribir') return e.pal[yo] ? '⏳ Esperando a los demás' : '✍️ Escribí tu críptico';
  if (e.fase === 'ver') return '👀 ¡Era…!';
  if (autor(e) === yo) return '👀 Están con la tuya';
  return e.fin[yo] ? '⏳ Esperando a los demás' : '🧩 ¡Descifralo!';
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `<div class="cr-panel" id="crPanel"></div><div id="crJuego" hidden></div>`;
  $('crPanel').addEventListener('click', ev => {
    if (ev.target.closest('[data-a="enviar"]')) enviar();
    if (ev.target.closest('[data-a="seguir"]')) { ctx.sonar('tap'); ctx.jugarLibre({tipo: 'seguir', ronda: ctx.estado.ronda}); }
  });
  $('crPanel').addEventListener('input', ev => {
    if (ev.target.id === 'crPistaTxt') $('crLargo').textContent = `${ev.target.value.length}/${MAX_PISTA}`;
  });
  $('crJuego').addEventListener('submit', ev => { ev.preventDefault(); arriesgar(); });
}

async function arriesgar() {
  const inp = $('crIntento'), txt = inp.value.trim(), e = ctx.estado, yo = ctx.miAsiento;
  if (!limpiar(txt)) return;
  if (e.intentos[yo].map(limpiar).includes(limpiar(txt))) { ctx.sonar('error'); ctx.aviso('Esa ya la probaste'); return; }
  inp.value = '';
  if (!(await ctx.jugarLibre({tipo: 'arriesgar', texto: txt, t: ctx.ahora()}))) ctx.aviso('No se pudo mandar, probá de nuevo');
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

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  const termino = e.ganador !== -1, escribiendo = e.fase === 'escribir';
  const a = escribiendo ? -1 : autor(e), soyAutor = a === yo;

  // ---------- Panel: escribir / esperar / resultado de la palabra ----------
  const faltan = e.pal.map((w, p) => (w ? -1 : p)).filter(p => p >= 0);
  const k = [e.fase, e.ronda, e.pal[yo] ? 1 : 0, faltan.join(), ctx.listos, termino].join('|');
  if (k !== clave) {
    clave = k;
    let h = '';
    if (escribiendo) h = !e.pal[yo]
      ? `<h3>✍️ Tu palabra y su críptico</h3>
         <p class="note">La palabra es secreta. El críptico lo ven todos: una adivinanza, un juego de palabras…
           Que cueste, pero que se pueda: los demás tienen ${INTENTOS} intentos y ninguna otra pista.</p>
         <div class="row"><input id="crTxt" maxlength="30" autocomplete="off" spellcheck="false" placeholder="Palabra secreta (ej: mate)"></div>
         <textarea id="crPistaTxt" maxlength="${MAX_PISTA}" rows="3" placeholder="Críptico (ej: Va de mano en mano, pero siempre vuelve a la misma boca)"></textarea>
         <div class="row cr-enviar"><span class="note" id="crLargo">0/${MAX_PISTA}</span><button class="main" data-a="enviar">Listo</button></div>`
      : `<h3>Tu palabra: <span class="cr-secreta">${esc(e.vista[yo])}</span> ✔</h3><p class="cr-tu-pista">“${esc(e.pista[yo])}”</p>
         <p class="note">${faltan.length ? `Esperando a ${faltan.map(p => esc(ctx.nombre(p))).join(', ')}…` : ''}</p>`;
    else if (e.fase === 'ver') {
      const los = descifran(e);
      h = `<p class="note">Palabra ${e.ronda + 1} de ${e.orden.length} · de ${quien(ctx, a)}</p>
        <p class="cr-tu-pista">“${esc(e.pista[a])}”</p>
        <h3>Era <span class="cr-secreta">${esc(e.vista[a])}</span></h3>
        <ul class="cr-res">${[...los, a].map(p => `<li>${quien(ctx, p)} <span class="note">${p === a ? 'la escribió'
          : `${e.fin[p] === 1 ? `🎉 en el intento ${e.intentos[p].length}` : '😵 no la sacó'}${
            e.intentos[p].length > (e.fin[p] === 1 ? 1 : 0) ? ` · ${tachados(e.intentos[p].slice(0, e.fin[p] === 1 ? -1 : undefined))}` : ''}`}</span><b>+${e.pr[p]}</b></li>`).join('')}</ul>
        ${termino ? '' : `<button class="main grande" data-a="seguir">${e.ronda + 1 >= e.orden.length ? '🏆 Ver quién ganó' : 'Siguiente palabra ➜'}</button>`}`;
    }
    $('crPanel').innerHTML = h;
    $('crPanel').hidden = !h;
    $('crTxt')?.focus();
  }
  const jugando = e.fase === 'adivinar';
  $('crJuego').hidden = !jugando;
  if (escribiendo) return e.pal[yo] ? '' : 'Escribí una palabra y un críptico para que la adivinen los demás';
  if (!jugando) return '';

  // ---------- Adivinar: el críptico, tus intentos y cómo vienen los demás (sin ver lo que arriesgan) ----------
  const mios = e.intentos[yo], quedan = INTENTOS - mios.length;
  const kj = [e.ronda, mios.length, e.fin.join(), e.intentos.map(x => x.length).join()].join('|');
  if (kj === claveJuego) return soyAutor ? 'Mirá cómo les va con tu críptico…' : '';
  claveJuego = kj;
  const escribiendoAhora = $('crIntento')?.value || '';
  const otros = descifran(e).filter(p => p !== yo).map(p => {
    const n = e.intentos[p].length, como = e.fin[p] === 1 ? `🎉 la sacó en el intento ${n}` : e.fin[p] === 2 ? '😵 sin intentos' : `${'❌'.repeat(n)}${'○'.repeat(INTENTOS - n)}`;
    return `<div class="cr-otro">${quien(ctx, p)} <span class="note">${como}</span></div>`;
  }).join('');
  let mio = '';
  if (soyAutor) mio = `<p class="cr-autor">Es tu palabra: <span class="cr-secreta">${esc(e.vista[a])}</span></p>`;
  else if (e.fin[yo] === 1) mio = `<p class="cr-msg">🎉 ¡La sacaste en el intento ${mios.length}!</p>`;
  else if (e.fin[yo] === 2) mio = `<p class="cr-msg">😵 Te quedaste sin intentos${mios.length ? `: ${tachados(mios)}` : ''}</p>`;
  else mio = `<form class="row cr-arriesgar"><input id="crIntento" maxlength="30" autocomplete="off" spellcheck="false" placeholder="¿Qué palabra es?" aria-label="Tu respuesta">
      <button class="main">Arriesgar</button></form>
      <p class="cr-msg">${quedan === 1 ? '¡Te queda <b>1</b> intento!' : `Te quedan <b>${quedan}</b> intentos`}${mios.length ? ` · ${tachados(mios)}` : ''}</p>`;
  $('crJuego').innerHTML = `<div class="cr-pista"><p class="note">Palabra ${e.ronda + 1} de ${e.orden.length} · el críptico de ${quien(ctx, a)}</p>
      <p class="cr-tu-pista">“${esc(e.pista[a])}”</p></div>${mio}<div class="cr-otros">${otros}</div>`;
  if ($('crIntento')) { $('crIntento').value = escribiendoAhora; $('crIntento').focus(); }
  return soyAutor ? 'Mirá cómo les va con tu críptico…' : '';
}

export function resumenFin(ctx) { return ctx.estado.ultima; }
