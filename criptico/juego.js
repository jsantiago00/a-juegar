// Pantalla del Críptico: primero cada uno escribe su palabra y su pista; después, palabra por palabra,
// la pista arriba, tu ahorcado y cómo vienen los demás.
import { MAX_ERRORES, ABC, MIN_LARGO, MAX_LARGO, MAX_PISTA, ERROR_ARRIESGAR, limpiar, autor, descifran, adivinadas } from './reglas.js';
import { esc } from '../shared/salas.js';
import { animaciones } from '../shared/efectos.js';
import { horca } from '../ahorcado/juego.js';

let ctx, $, clave = '', erroresVistos = null, rondaVista = -1;
const anim = animaciones(500);
export function reiniciar() { clave = ''; erroresVistos = null; rondaVista = -1; }

export function sonido(a, e, ctx) {
  const yo = ctx.miAsiento;
  if (a.fase !== e.fase || a.ronda !== e.ronda) return e.fase === 'ver' ? 'pasar' : 'entrar';
  if (e.fase === 'adivinar' && e.letras[yo] !== a.letras[yo]) {
    if (e.fin[yo] === 2) return 'no';
    if (e.fin[yo] === 1) return 'punto';
    return e.pal[autor(e)].includes(e.letras[yo].slice(-1)) ? 'punto' : 'muro';
  }
  if (e.fase === 'adivinar' && e.errores[yo] !== a.errores[yo]) return e.fin[yo] === 2 ? 'no' : 'muro';   // arriesgó mal
  if (e.pal.join() !== a.pal.join() || e.fin.join() !== a.fin.join()) return 'tick';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (e.fase === 'escribir') return e.pal[yo] ? '⏳ Esperando a los demás' : '✍️ Escribí tu críptico';
  if (e.fase === 'ver') return '👀 ¡Era…!';
  if (autor(e) === yo) return '👀 Están con la tuya';
  return e.fin[yo] ? '⏳ Esperando a los demás' : '🔤 ¡Descifrala!';
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `
    <div class="cr-panel" id="crPanel"></div>
    <div id="crJuego" hidden>
      <div class="cr-pista" id="crPista"></div>
      <div id="crMio">
        <div class="ah-dibujo" id="crDibujo"></div>
        <div class="ah-palabra" id="crPalabra"></div>
        <p class="ah-msg" id="crMsg"></p>
        <div class="ah-teclado" id="crTeclado">${[...ABC].map(L => `<button data-l="${L}">${L}</button>`).join('')}</div>
        <form class="row cr-arriesgar" id="crArriesgar"><input id="crEntera" maxlength="20" autocomplete="off" autocapitalize="characters"
          spellcheck="false" placeholder="¿La sabés? Escribila entera" aria-label="Arriesgar la palabra entera">
          <button>Arriesgar</button></form>
      </div>
      <div class="cr-otros" id="crOtros"></div>
    </div>`;
  $('crTeclado').addEventListener('click', ev => { const b = ev.target.closest('[data-l]'); if (b && !b.disabled) probar(b.dataset.l); });
  $('crArriesgar').addEventListener('submit', async ev => {
    ev.preventDefault();
    const w = limpiar($('crEntera').value);
    if (!w) return;
    if (!confirm(`¿Arriesgás ${w}? Si le errás, son ${ERROR_ARRIESGAR} errores.`)) return;
    $('crEntera').value = '';
    await ctx.jugarLibre({tipo: 'arriesgar', texto: w, t: ctx.ahora()});
  });
  $('crPanel').addEventListener('click', ev => {
    if (ev.target.closest('[data-a="enviar"]')) enviar();
    if (ev.target.closest('[data-a="seguir"]')) { ctx.sonar('tap'); ctx.jugarLibre({tipo: 'seguir', ronda: ctx.estado.ronda}); }
  });
  $('crPanel').addEventListener('input', ev => {
    if (ev.target.id === 'crTxt') { const w = limpiar(ev.target.value); $('crCuenta').textContent = w ? `${w.length} letras: ${w}` : ''; }
    if (ev.target.id === 'crPistaTxt') $('crLargo').textContent = `${ev.target.value.length}/${MAX_PISTA}`;
  });
  // En la compu también se puede jugar con el teclado (salvo que estés escribiendo en algún campo)
  addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.target.closest?.('input, textarea') || $('crJuego').hidden) return;
    const L = limpiar(ev.key);
    if (L.length === 1 && ev.key.length === 1) { const b = $('crTeclado').querySelector(`[data-l="${L}"]`); if (b && !b.disabled) probar(L); }
  });
}

function probar(L) { ctx.jugarLibre({tipo: 'letra', letra: L, t: ctx.ahora()}); }
async function enviar() {
  const w = limpiar($('crTxt').value), pista = $('crPistaTxt').value.trim();
  if (w.length < MIN_LARGO || w.length > MAX_LARGO) { ctx.sonar('error'); ctx.aviso(`La palabra tiene que tener de ${MIN_LARGO} a ${MAX_LARGO} letras`); return; }
  if (pista.length < 3) { ctx.sonar('error'); ctx.aviso('Escribí la pista'); return; }
  if (limpiar(pista).includes(w)) { ctx.sonar('error'); ctx.aviso('¡La pista no puede tener la palabra!'); return; }
  ctx.sonar('tap');
  if (!(await ctx.jugarLibre({tipo: 'escribir', palabra: w, pista}))) ctx.aviso('No se pudo mandar, probá de nuevo');
}

const quien = (ctx, p) => `<span class="dot" style="background:${ctx.color(p)}"></span><b>${esc(ctx.nombre(p))}</b>`;

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
      ? `<h3>✍️ Tu palabra y su pista</h3>
         <p class="note">La palabra es secreta (de ${MIN_LARGO} a ${MAX_LARGO} letras, sin espacios). La pista la ven todos:
           una adivinanza, un críptico, un juego de palabras… Que cueste, pero que se pueda.</p>
         <div class="row"><input id="crTxt" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Palabra (ej: MATE)"></div>
         <p class="note" id="crCuenta"></p>
         <textarea id="crPistaTxt" maxlength="${MAX_PISTA}" rows="3" placeholder="Pista (ej: Va de mano en mano, pero siempre vuelve a la misma boca: la bombilla)"></textarea>
         <div class="row cr-enviar"><span class="note" id="crLargo">0/${MAX_PISTA}</span><button class="main" data-a="enviar">Listo</button></div>`
      : `<h3>Tu palabra: <span class="ah-secreta">${esc(e.pal[yo])}</span> ✔</h3><p class="cr-tu-pista">“${esc(e.pista[yo])}”</p>
         <p class="note">${faltan.length ? `Esperando a ${faltan.map(p => esc(ctx.nombre(p))).join(', ')}…` : ''}</p>`;
    else if (e.fase === 'ver') {
      const los = descifran(e);
      h = `<p class="note">Palabra ${e.ronda + 1} de ${e.orden.length} · de ${quien(ctx, a)}</p>
        <p class="cr-tu-pista">“${esc(e.pista[a])}”</p>
        <h3>Era <span class="ah-secreta">${esc(e.pal[a])}</span></h3>
        <ul class="cr-res">${[...los, a].map(p => `<li>${quien(ctx, p)} <span class="note">${p === a ? 'la escribió'
          : e.fin[p] === 1 ? `la descifró (${e.errores[p]} ❌)` : 'ahorcado 💀'}</span><b>+${e.pr[p]}</b></li>`).join('')}</ul>
        ${termino ? '' : `<button class="main grande" data-a="seguir">${e.ronda + 1 >= e.orden.length ? '🏆 Ver quién ganó' : 'Siguiente palabra ➜'}</button>`}`;
    }
    $('crPanel').innerHTML = h;
    $('crPanel').hidden = !h;
    $('crTxt')?.focus();
  }
  const jugando = e.fase === 'adivinar';
  $('crJuego').hidden = !jugando;
  if (escribiendo) return e.pal[yo] ? '' : 'Escribí una palabra y una pista para que la descifren los demás';
  if (!jugando) return '';

  if (rondaVista !== e.ronda) { rondaVista = e.ronda; erroresVistos = null; $('crEntera').value = ''; }
  $('crPista').innerHTML = `<p class="note">Palabra ${e.ronda + 1} de ${e.orden.length} · la escribió ${quien(ctx, a)}</p>
    <p class="cr-tu-pista">“${esc(e.pista[a])}”</p><p class="note">${e.pal[a].length} letras</p>`;

  // ---------- Tu ahorcado (si no es tu palabra) ----------
  $('crMio').hidden = soyAutor;
  if (!soyAutor) {
    const err = e.errores[yo];
    if (erroresVistos !== null) for (let p = erroresVistos; p < err; p++) anim.marcar('p' + p);
    erroresVistos = err;
    const cara = e.fin[yo] === 2 ? 'ahorcado' : e.fin[yo] === 1 ? 'feliz' : err >= 4 ? 'nervioso' : 'normal';
    $('crDibujo').innerHTML = horca(err, cara, [...Array(err).keys()], anim);
    const w = e.pal[a], mias = e.letras[yo];
    $('crPalabra').innerHTML = [...w].map(ch => (mias.includes(ch) ? `<span class="ok">${ch}</span>`
      : e.fin[yo] ? `<span class="falto">${ch}</span>` : '<span></span>')).join('');
    $('crTeclado').querySelectorAll('[data-l]').forEach(b => {
      const L = b.dataset.l, usada = mias.includes(L);
      b.className = usada ? (w.includes(L) ? 'ok' : 'mal') : '';
      b.disabled = usada || !!e.fin[yo];
    });
    $('crArriesgar').hidden = !!e.fin[yo];
    const quedan = MAX_ERRORES - err;
    $('crMsg').innerHTML = e.fin[yo] === 1 ? `🎉 ¡La descifraste con <b>${err}</b> ${err === 1 ? 'error' : 'errores'}!`
      : e.fin[yo] === 2 ? '💀 ¡Te ahorcaron!'
      : `Te ${quedan === 1 ? 'queda <b>1</b> error' : `quedan <b>${quedan}</b> errores`}`;
  }

  // ---------- Cómo vienen los demás (sin mostrar sus letras) ----------
  $('crOtros').innerHTML = (soyAutor ? `<h3>Tu palabra: <span class="ah-secreta">${esc(e.pal[a])}</span></h3>` : '') +
    descifran(e).filter(p => p !== yo).map(p => {
      const marcas = '❌'.repeat(e.errores[p]) + '○'.repeat(MAX_ERRORES - e.errores[p]);
      const como = e.fin[p] === 1 ? '🎉 la descifró' : e.fin[p] === 2 ? '💀 ahorcado' : `${adivinadas(e, p)}/${e.pal[a].length} letras`;
      return `<div class="cr-otro">${quien(ctx, p)} <span class="marcas">${marcas}</span> <span class="note">${como}</span></div>`;
    }).join('');

  if (soyAutor) return 'Mirá cómo les va con tu pista…';
  if (e.fin[yo]) return 'Esperando a los demás…';
  return 'Tocá letras (en la compu también podés escribirlas)';
}

export function resumenFin(ctx) { return ctx.estado.ultima; }
