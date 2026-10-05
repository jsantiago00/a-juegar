// Pantalla del Ahorcado: primero cada uno elige la palabra del otro; después adivinan los dos a la vez.
import { MAX_ERRORES, ABC, MIN_LARGO, MAX_LARGO, limpiar, objetivo, adivinadas } from './reglas.js';
import { esc } from '../shared/salas.js';
import { animaciones } from '../shared/efectos.js';

// Chat de sala para chicanear mientras adivinan
export const chat = true;

let ctx, $, clave = '', erroresVistos = null;
const anim = animaciones(500);
export function reiniciar() { clave = ''; erroresVistos = null; }

export function sonido(a, e, ctx) {
  const yo = ctx.miAsiento;
  if (a.fase !== e.fase) return 'entrar';
  if (e.letras[yo] !== a.letras[yo]) {
    if (e.fin[yo] === 2) return 'no';
    return objetivo(e, yo).includes(e.letras[yo].slice(-1)) ? 'punto' : 'muro';
  }
  if (e.palabras.join() !== a.palabras.join()) return 'tick';
  return null;               // lo que hace el rival no suena (solo se ve)
}
// No hay turnos: el cartel de arriba dice en qué andás vos
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento, rival = ctx.nombre(1 - yo);
  if (yo < 0) return '';
  if (e.fase === 'palabras') return e.palabras[yo] ? `⏳ Esperando a ${rival}` : '✍️ Elegí una palabra';
  return e.fin[yo] ? `⏳ Esperando a ${rival}` : '🔤 ¡Adiviná!';
}

// El muñeco: cada error suma una parte. cara: 'normal' | 'nervioso' | 'feliz' | 'ahorcado'
function horca(errores, cara, nuevas) {
  const parte = (k, svg) => (errores > k ? (nuevas.includes(k) ? anim.envolver('p' + k, svg) : svg) : '');
  const ojos = cara === 'ahorcado'
    ? '<path d="M121 58l6 6M127 58l-6 6M133 58l6 6M139 58l-6 6" stroke="#2a1d4f" stroke-width="3" stroke-linecap="round"/>'
    : '<circle cx="124" cy="61" r="3" fill="#2a1d4f"/><circle cx="136" cy="61" r="3" fill="#2a1d4f"/>';
  const boca = {feliz: '<path d="M122 69q8 9 16 0" stroke="#2a1d4f" stroke-width="3" fill="none" stroke-linecap="round"/>',
                nervioso: '<ellipse cx="130" cy="71" rx="4" ry="5" fill="#2a1d4f"/>',
                ahorcado: '<path d="M123 72q7-5 14 0" stroke="#2a1d4f" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M131 73q2 7 6 5" fill="#ff6b81"/>',
                normal: '<path d="M124 71q6 3 12 0" stroke="#2a1d4f" stroke-width="3" fill="none" stroke-linecap="round"/>'}[cara];
  const cuerpo = 'stroke="#fff8ea" stroke-width="7" stroke-linecap="round"';
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <g stroke="#e09a55" stroke-width="9" stroke-linecap="round" fill="none"><path d="M18 188h104M44 188V18h88M44 52l34-34"/></g>
    <path d="M130 18v24" stroke="#c9bdf2" stroke-width="4" stroke-linecap="round"/>
    ${parte(1, `<path d="M130 80v46" ${cuerpo}/>`)}
    ${parte(2, `<path d="M130 92l-22 20" ${cuerpo}/>`)}
    ${parte(3, `<path d="M130 92l22 20" ${cuerpo}/>`)}
    ${parte(4, `<path d="M130 126l-18 32" ${cuerpo}/>`)}
    ${parte(5, `<path d="M130 126l18 32" ${cuerpo}/>`)}
    ${parte(0, `<g><circle cx="130" cy="62" r="18" fill="#ffd23f" stroke="#2a1d4f" stroke-width="4"/>${ojos}${boca}</g>`)}
  </svg>`;
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `
    <div class="ah-panel" id="ahPanel"></div>
    <div class="ah-juego" id="ahJuego" hidden>
      <div class="ah-dibujo" id="ahDibujo"></div>
      <div class="ah-palabra" id="ahPalabra"></div>
      <p class="ah-msg" id="ahMsg"></p>
      <div class="ah-teclado" id="ahTeclado">${[...ABC].map(L => `<button data-l="${L}">${L}</button>`).join('')}</div>
      <div class="ah-rival" id="ahRival"></div>
    </div>`;
  $('ahTeclado').addEventListener('click', ev => { const b = ev.target.closest('[data-l]'); if (b && !b.disabled) probar(b.dataset.l); });
  $('ahPanel').addEventListener('click', ev => { if (ev.target.closest('[data-a="enviar"]')) enviarPalabra(); });
  $('ahPanel').addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id === 'ahTxt') enviarPalabra(); });
  $('ahPanel').addEventListener('input', ev => {
    if (ev.target.id !== 'ahTxt') return;
    const w = limpiar(ev.target.value);
    $('ahCuenta').textContent = w ? `${w.length} letras: ${w}` : '';
  });
  // En la compu también se puede jugar con el teclado (salvo que estés escribiendo en algún campo)
  addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.target.closest?.('input, textarea')) return;
    const L = limpiar(ev.key);
    if (L.length === 1 && ev.key.length === 1) { const b = $('ahTeclado').querySelector(`[data-l="${L}"]`); if (b && !b.disabled) probar(L); }
  });
}

function probar(L) { ctx.jugarLibre({tipo: 'letra', letra: L}); }
async function enviarPalabra() {
  const w = limpiar($('ahTxt').value);
  if (w.length < MIN_LARGO || w.length > MAX_LARGO) { ctx.sonar('error'); ctx.aviso(`Tiene que tener de ${MIN_LARGO} a ${MAX_LARGO} letras`); return; }
  ctx.sonar('tap');
  if (!(await ctx.jugarLibre({tipo: 'palabra', palabra: w}))) ctx.aviso('No se pudo mandar, probá de nuevo');
}

export function dibujar(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  const otro = 1 - yo, rival = esc(ctx.nombre(otro)), termino = e.ganador !== -1;
  const jugando = e.fase === 'jugar';

  // Panel de arriba (elegir palabra / esperar): se rearma solo si cambia la situación
  const k = [e.fase, e.palabras[yo] ? 1 : 0, e.palabras[otro] ? 1 : 0, ctx.listos].join('|');
  if (k !== clave) {
    clave = k;
    $('ahPanel').hidden = jugando;
    if (!jugando) $('ahPanel').innerHTML = !e.palabras[yo]
      ? `<h3>✍️ Elegí una palabra para ${rival}</h3>
         <p class="note">De ${MIN_LARGO} a ${MAX_LARGO} letras, sin espacios. Las tildes no cuentan.</p>
         <div class="row"><input id="ahTxt" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Ej: MATE">
         <button class="main" data-a="enviar">Listo</button></div><p class="note" id="ahCuenta"></p>`
      : `<h3>Tu palabra para ${rival}: <span class="ah-secreta">${esc(e.palabras[yo])}</span> ✔</h3>
         <p class="note">${e.palabras[otro] ? '' : `Esperando que ${rival} elija la tuya…`}</p>`;
  }
  $('ahJuego').hidden = !jugando;
  if (!jugando) return e.palabras[yo] ? '' : `Escribí una palabra para que adivine ${rival}`;

  // Muñeco: anima las partes nuevas
  const err = e.errores[yo], nuevas = [];
  if (erroresVistos !== null) for (let p = erroresVistos; p < err; p++) { nuevas.push(p); anim.marcar('p' + p); }
  erroresVistos = err;
  const cara = e.fin[yo] === 2 ? 'ahorcado' : e.fin[yo] === 1 ? 'feliz' : err >= 4 ? 'nervioso' : 'normal';
  $('ahDibujo').innerHTML = horca(err, cara, [...Array(err).keys()]);

  // Palabra: las adivinadas a la vista; al terminar, las que faltaban en rojo
  const w = objetivo(e, yo), mias = e.letras[yo];
  $('ahPalabra').innerHTML = [...w].map(ch => mias.includes(ch) ? `<span class="ok">${ch}</span>`
    : (e.fin[yo] ? `<span class="falto">${ch}</span>` : '<span></span>')).join('');

  $('ahTeclado').querySelectorAll('[data-l]').forEach(b => {
    const L = b.dataset.l, usada = mias.includes(L);
    b.className = usada ? (w.includes(L) ? 'ok' : 'mal') : '';
    b.disabled = usada || !!e.fin[yo];
  });

  const quedan = MAX_ERRORES - err;
  $('ahMsg').innerHTML = e.fin[yo] === 1 ? `🎉 ¡La adivinaste con <b>${err}</b> ${err === 1 ? 'error' : 'errores'}!`
    : e.fin[yo] === 2 ? '💀 ¡Te ahorcaron!'
    : `Te ${quedan === 1 ? 'queda <b>1</b> error' : `quedan <b>${quedan}</b> errores`}`;

  // Cómo viene el otro (sin mostrar sus letras)
  const errR = e.errores[otro], marcas = '❌'.repeat(errR) + '○'.repeat(MAX_ERRORES - errR);
  const estadoR = e.fin[otro] === 1 ? '🎉 adivinó' : e.fin[otro] === 2 ? '💀 ahorcado' : `${adivinadas(e, otro)}/${e.palabras[yo].length} letras`;
  $('ahRival').innerHTML = `<b>${rival}</b> <span class="marcas">${marcas}</span> <span class="note">${estadoR}</span>` +
    (termino ? `<p class="note">Tu palabra para ${rival} era <b>${esc(e.palabras[yo])}</b></p>` : '');

  if (e.fin[yo] && !termino) return `Esperando que ${rival} termine…`;
  return e.fin[yo] ? '' : 'Tocá letras (en la compu también podés escribirlas)';
}
