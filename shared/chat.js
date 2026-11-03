// =====================================================================
//  CHAT DE SALA: botón flotante 💬 + panel con burbujas y reacciones rápidas.
//  Solo dibuja; quien lo usa le pasa enviar(texto) y le avisa los mensajes
//  con actualizar(chat, miId). Los mensajes viven en juegos/<id>/salas/<código>/chat.
// =====================================================================
import { sonar } from './efectos.js';

const RAPIDOS = ['😂', '🤔', '😱', '👍', '🙈', '🔥'];
const esc = s => String(s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
const soloEmoji = t => /^[\p{Extended_Pictographic}‍️\s]{1,12}$/u.test(t);
const ESPERA_EMOJI = 3000;   // entre emoji y emoji (los rápidos o escritos solos), para que no se llene de spam
const BORRADOR = 'minijuegos-chat-borrador';

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
  let abierto = false, ultima = null, primera = true, noLeidos = 0, dibujado = '', yo = '', ultimoEmoji = 0, frenoEmoji = 0;

  // Lo que vas escribiendo queda guardado: si el celu recarga la página (al volver de otra app,
  // al mudarse de juego, etc.) o se cierra el panel, el texto sigue ahí.
  try { $('chatTxt').value = sessionStorage.getItem(BORRADOR) || ''; } catch {}
  const guardarBorrador = () => { try { sessionStorage.setItem(BORRADOR, $('chatTxt').value); } catch {} };
  $('chatTxt').addEventListener('input', guardarBorrador);

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

  // El teclado del celu tapa parte de la pantalla. Mientras escribís, el panel se acomoda en la parte
  // que queda visible (visualViewport): arriba del teclado y con el campo a la vista. Los navegadores
  // avisan tarde o a los saltos mientras sube el teclado, así que además medimos varias veces.
  const vv = window.visualViewport;
  function ajustar() {
    const c = $('chat');
    c.style.setProperty('--arriba', (vv ? vv.offsetTop : 0) + 'px');
    c.style.setProperty('--visible', (vv ? vv.height : innerHeight) + 'px');
    c.classList.toggle('apretado', (vv ? vv.height : innerHeight) < 360);   // celu acostado + teclado: no entra todo
    if (abierto) alFondo();
  }
  let medir = 0;
  function seguirTeclado() {
    clearInterval(medir);
    let veces = 0;
    ajustar();
    medir = setInterval(() => { ajustar(); if (++veces > 12) clearInterval(medir); }, 80);
  }
  vv?.addEventListener('resize', ajustar);
  vv?.addEventListener('scroll', ajustar);
  addEventListener('resize', ajustar);
  $('chatTxt').addEventListener('focus', () => { document.body.classList.add('chat-escribiendo'); seguirTeclado(); });
  // Tocar ➤ o un emoji no le saca el foco al campo: el teclado sigue abierto y el panel no salta bajo el dedo
  const quedarse = ev => { if (document.activeElement === $('chatTxt')) ev.preventDefault(); };
  raiz.querySelectorAll('.chat-form button, .chat-rapidos button').forEach(b => {
    b.addEventListener('pointerdown', quedarse);
    b.addEventListener('mousedown', quedarse);
  });
  $('chatTxt').addEventListener('blur', () => { document.body.classList.remove('chat-escribiendo'); seguirTeclado(); });
  // Los emojis tienen freno: mientras corre, los botones rápidos quedan apagados
  function frenarEmojis() {
    ultimoEmoji = Date.now();
    const rap = raiz.querySelector('.chat-rapidos');
    rap.querySelectorAll('button').forEach(b => { b.disabled = true; });
    clearTimeout(frenoEmoji);
    frenoEmoji = setTimeout(() => {
      rap.querySelectorAll('button').forEach(b => { b.disabled = false; });
    }, ESPERA_EMOJI);
  }
  // Devuelve true si salió (si no, lo escrito se queda en el campo)
  async function mandar(texto) {
    const t = texto.trim();
    if (!t) return false;
    const emoji = soloEmoji(t);
    if (emoji && Date.now() - ultimoEmoji < ESPERA_EMOJI) { sonar('error'); aviso('Pará un poco con los emojis 😅'); return false; }
    if (emoji) frenarEmojis();
    sonar('enviar');
    try { await enviar(t); return true; } catch (e) { aviso('No se pudo mandar: ' + e.message); return false; }
  }

  $('bChat').onclick = () => { sonar('tap'); abrir(!abierto); };
  $('bChatCerrar').onclick = () => { sonar('tap'); abrir(false); };
  $('fChat').onsubmit = async ev => {
    ev.preventDefault();
    const campo = $('chatTxt'), t = campo.value;
    if (!t.trim() || (soloEmoji(t.trim()) && Date.now() - ultimoEmoji < ESPERA_EMOJI)) { mandar(t); return; }
    campo.value = ''; guardarBorrador();
    if (!(await mandar(t)) && !campo.value) { campo.value = t; guardarBorrador(); }   // si falló, te lo devolvemos
  };
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
