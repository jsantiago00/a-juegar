// =====================================================================
//  CHAT DE SALA: botón flotante 💬 + panel con burbujas y reacciones rápidas.
//  Solo dibuja; quien lo usa le pasa enviar(texto) y le avisa los mensajes
//  con actualizar(chat, miId). Los mensajes viven en juegos/<id>/salas/<código>/chat.
// =====================================================================
import { sonar } from './efectos.js';

const RAPIDOS = ['😂', '🤔', '😱', '👍', '🙈', '🔥'];
const esc = s => String(s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
const soloEmoji = t => /^[\p{Extended_Pictographic}‍️\s]{1,12}$/u.test(t);

export function crearChat(raiz, {enviar, colorDe, aviso}) {
  raiz.insertAdjacentHTML('beforeend', `
    <button class="chat-boton" id="bChat" aria-label="Abrir chat" aria-expanded="false" hidden>💬<span class="chat-badge" id="chatBadge" hidden></span></button>
    <section class="chat" id="chat" aria-label="Chat de la sala" hidden>
      <div class="chat-top"><b>💬 Chat de la sala</b><button class="icono" id="bChatCerrar" aria-label="Cerrar chat">✕</button></div>
      <div class="chat-msgs" id="chatMsgs" aria-live="polite"></div>
      <div class="chat-rapidos">${RAPIDOS.map(e => `<button type="button" data-e="${e}" aria-label="Mandar ${e}">${e}</button>`).join('')}</div>
      <form class="chat-form" id="fChat">
        <input id="chatTxt" maxlength="200" placeholder="Escribí algo…" autocomplete="off" aria-label="Mensaje">
        <button class="main" aria-label="Enviar">➤</button>
      </form>
    </section>`);
  const $ = id => raiz.querySelector('#' + id);
  let abierto = false, ultima = null, primera = true, noLeidos = 0, dibujado = '', yo = '';

  function badge() {
    $('chatBadge').hidden = !noLeidos;
    $('chatBadge').textContent = noLeidos > 9 ? '9+' : noLeidos;
  }
  const alFondo = () => { const m = $('chatMsgs'); m.scrollTop = m.scrollHeight; };
  // Solo con mouse enfocamos el campo al abrir: en el celu eso despliega el teclado y tapa todo
  const conMouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  function abrir(v) {
    abierto = v;
    $('chat').hidden = !v;
    $('bChat').setAttribute('aria-expanded', String(v));
    document.body.classList.toggle('chat-abierto', v);
    if (v) { noLeidos = 0; badge(); ajustar(); alFondo(); if (conMouse) $('chatTxt').focus({preventScroll: true}); }
  }

  // El teclado del celu se dibuja encima de la página sin achicarla: con visualViewport
  // medimos cuánto tapa y subimos el panel para que quede justo arriba del teclado.
  const vv = window.visualViewport;
  function ajustar() {
    if (!vv) return;
    const teclado = Math.max(0, innerHeight - vv.height - vv.offsetTop);
    $('chat').style.setProperty('--teclado', teclado + 'px');
    $('chat').style.setProperty('--visible', vv.height + 'px');
    if (abierto) alFondo();
  }
  vv?.addEventListener('resize', ajustar);
  vv?.addEventListener('scroll', ajustar);
  async function mandar(texto) {
    const t = texto.trim();
    if (!t) return;
    sonar('enviar');
    try { await enviar(t); } catch (e) { aviso('No se pudo mandar: ' + e.message); }
  }

  $('bChat').onclick = () => { sonar('tap'); abrir(!abierto); };
  $('bChatCerrar').onclick = () => { sonar('tap'); abrir(false); };
  $('fChat').onsubmit = ev => { ev.preventDefault(); const t = $('chatTxt').value; $('chatTxt').value = ''; mandar(t); };
  raiz.querySelector('.chat-rapidos').addEventListener('click', ev => { const b = ev.target.closest('[data-e]'); if (b) mandar(b.dataset.e); });
  addEventListener('keydown', ev => { if (ev.key === 'Escape' && abierto) abrir(false); });

  function dibujar(msgs) {
    const clave = msgs.length + ':' + (msgs.at(-1)?.k || '');
    if (clave === dibujado) return;
    dibujado = clave;
    const m = $('chatMsgs');
    const cerca = m.scrollHeight - m.scrollTop - m.clientHeight < 60;
    m.innerHTML = msgs.length
      ? msgs.map(x => {
          const mio = x.id === yo, emoji = soloEmoji(x.t) ? ' emoji' : '';
          return mio ? `<div class="msg mio${emoji}"><p>${esc(x.t)}</p></div>`
                     : `<div class="msg${emoji}" style="--c:${colorDe(x.id)}"><b>${esc(x.n)}</b><p>${esc(x.t)}</p></div>`;
        }).join('')
      : '<p class="chat-vacio">Todavía no hay mensajes. ¡Saludá! 👋</p>';
    if (cerca || abierto) alFondo();
  }

  return {
    mostrar(v) { $('bChat').hidden = !v; if (!v && abierto) abrir(false); },
    // chat: objeto {clavePush: {id, n, t, ts}} tal como viene de Firebase
    actualizar(chat, miId) {
      yo = miId;
      const msgs = Object.entries(chat || {}).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => ({k, ...v}));
      dibujar(msgs);
      const ult = msgs.length ? msgs.at(-1).k : null;
      if (primera) { primera = false; ultima = ult; return; }   // lo viejo no avisa
      const nuevos = msgs.filter(x => ultima === null || x.k > ultima);
      ultima = ult;
      const ajenos = nuevos.filter(x => x.id !== miId);
      if (!ajenos.length) return;
      sonar('chat');
      if (!abierto) {
        noLeidos += ajenos.length; badge();
        const x = ajenos.at(-1);
        aviso(`💬 ${x.n}: ${x.t.length > 40 ? x.t.slice(0, 40) + '…' : x.t}`);
      }
    },
    reiniciar() { primera = true; ultima = null; noLeidos = 0; dibujado = ''; badge(); abrir(false); $('chatMsgs').innerHTML = ''; },
  };
}
