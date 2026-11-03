// =====================================================================
//  MOTOR COMPARTIDO DE SALAS
//  Se encarga de todo lo que no es el juego en sí: menú, modo local,
//  salas online con código, turnos, invitar, revancha, sonidos y festejo.
//
//  Cada juego le pasa dos módulos:
//   - reglas: info, nuevoJuego(n), normalizar(estado), aplicar(estado, jugada, nombre),
//             detalle(estado, i) [opcional]
//   - juego:  iniciar(ctx), dibujar(ctx) -> texto de ayuda, reiniciar() [opcional]
//             menu(el) y opciones() [opcionales]: controles extra en el menú (ej. elegir mazo);
//             lo que devuelva opciones() llega como nuevoJuego(n, opciones). Guardalo en
//             estado.opciones para que la revancha lo reuse.
//             sonido(antes, despues, ctx) [opcional]: nombre del sonido de esa jugada
//             (ver shared/efectos.js); null = silencio. Si no está, suena 'colocar'.
//             Online siempre hay chat de sala (ver shared/chat.js); chat = false lo apaga.
//             estado(ctx) [opcional]: texto propio para el cartel de arriba (ej. "Armá tu flota");
//             si devuelve vacío, se muestra el de siempre ("¡Tu turno!", "Turno de…").
//             resumenFin(ctx) [opcional]: texto chico del cartel de fin (si no, la última jugada).
//   reglas.libre(estado, jugada, yo, nombre) [opcional]: jugadas que no dependen del turno y solo tocan
//             lo tuyo (ej. bajar cartas); el juego las manda con ctx.jugarLibre(jugada).
//   info.soloOnline: true oculta el modo local (juegos con información secreta)
//   info.sinTurnos: true si todos juegan a la vez (no se sortea ni se anuncia quién empieza)
//   info.cantidades: [2, 4, 6] si no vale cualquier cantidad entre min y max
//   info.reloj: 60 si el juego tiene reloj por turno (los segundos que vienen elegidos; se puede poner sin reloj).
//             El motor guarda los segundos en estado.opciones.reloj y la hora límite en estado.limite; el reloj vuelve
//             a arrancar con cada jugada y cuando cambia el turno. Si se acaba, el motor llama
//             reglas.sinTiempo(estado, nombre) (lo que pasa: perder el turno, tirar solo…; null = nada) y
//             reglas.conReloj(estado) [opcional] dice si en ese momento corre el reloj (ej. solo al preguntar).
//   info.sinGanador: true si al final no gana nadie (ej. Dibujamiento): el juego termina con ganador = EMPATE
//             y el cartel de fin usa juego.textoFin(ctx) ({emoji, txt}).
//   reglas.ganadores(estado) [opcional]: todos los asientos que ganaron (juegos por equipos)
//   info.equipos: 2 si se juega en equipos según el asiento (equipo = asiento % 2). Con más de 2 jugadores,
//             mientras nadie jugó se muestra el panel de equipos: cambiarse de equipo o armarlos al azar
//             (mueve los asientos y vuelve a repartir con partidaNueva).
//   Quién empieza se sortea: nuevoJuego(n, opciones, quien) recibe el sorteado y después el motor
//             pone turno = empieza = quien (el juego puede leer estado.empieza).
//   Datos extra de la sala (ej. los trazos de Pinturillo, que no conviene meter en el estado):
//             ctx.extra (lo que hay en juegos/<id>/salas/<código>/extra), ctx.guardarExtra(ruta, valor),
//             ctx.sumarExtra(ruta, valor) (push) y ctx.cambiarExtra({ruta: valor, ...}). ctx.ahora() = hora del servidor.
//
//  Convenciones del estado: { n, turno, ganador, ultima, ...lo que quieras }
//   ganador: -1 en juego, 0..n-1 ganó ese jugador, -2 empate
// =====================================================================
import { FIREBASE_CONFIG } from './firebase.js';
import { JUEGOS } from './juegos.js';
import { ICONOS } from './iconos.js';
import { sonar, confeti, botonesSonido, animar } from './efectos.js';
import { crearChat } from './chat.js';

// App instalable (PWA): el service worker está en la raíz (sw.js) y lo registra cualquier página
if ('serviceWorker' in navigator) navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => {});

const FB_VER = '10.12.2';
export const COLORES = ['#e8505b', '#3fa7e0', '#f4c430', '#5cc480', '#b07cff', '#ff8c42', '#ff6fb5', '#2ec4b6'];
export const NOMBRES = ['Rojo', 'Azul', 'Amarillo', 'Verde', 'Violeta', 'Naranja', 'Rosa', 'Turquesa'];
export const EN_JUEGO = -1, EMPATE = -2;

// Firebase borra arrays vacíos y a veces devuelve objetos: usá esto en normalizar()
export const lista = x => (x ? Object.values(x) : []);
export const esc = s => String(s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
const clone = o => JSON.parse(JSON.stringify(o));

// ---------- Firebase (se carga solo si jugás online) ----------
let fb = null, desfase = 0;
// Hora del servidor (para relojes compartidos: cada celu puede tener la hora un poco corrida)
export const ahora = () => Date.now() + desfase;
export async function conectar() { return initFb(); }
async function initFb() {
  if (fb) return fb;
  if (!FIREBASE_CONFIG) throw new Error('Falta la config de Firebase en shared/firebase.js');
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
  const [appM, dbM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-database.js')]);
  const app = appM.initializeApp(FIREBASE_CONFIG);
  fb = {db: dbM.getDatabase(app), ref: dbM.ref, get: dbM.get, set: dbM.set, push: dbM.push, update: dbM.update,
        onValue: dbM.onValue, runTransaction: dbM.runTransaction};
  try { fb.onValue(fb.ref(fb.db, '.info/serverTimeOffset'), s => { desfase = +s.val() || 0; }); } catch {}
  return fb;
}

const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const leer = k => { try { return localStorage.getItem(k); } catch { return null; } };
const miId = (() => {
  let v = leer('minijuegos-id');
  if (!v) { v = Math.random().toString(36).slice(2, 10); guardar('minijuegos-id', v); }
  return v;
})();
// ---------- Cuántas veces jugaste cada juego (en este dispositivo) ----------
// {id: {n: partidas, t: última vez}}. Sirve para mostrar primero los que más jugás.
export function jugadas() { try { return JSON.parse(leer('minijuegos-jugadas')) || {}; } catch { return {}; } }
export function registrarPartida(id) {
  const j = jugadas(), x = j[id] || {n: 0, t: 0};
  j[id] = {n: x.n + 1, t: Date.now()};
  guardar('minijuegos-jugadas', JSON.stringify(j));
}
// Más jugados primero; empate: el último que jugaste; los que nunca jugaste, en el orden de siempre
export function ordenarJuegos(lista) {
  const j = jugadas(), n = id => (j[id] ? j[id].n : 0), t = id => (j[id] ? j[id].t : 0);
  return lista.map((g, i) => ({g, i})).sort((a, b) => n(b.g.id) - n(a.g.id) || t(b.g.id) - t(a.g.id) || a.i - b.i).map(x => x.g);
}

export const nombreGuardado = () => leer('minijuegos-nombre') || '';
export const guardarNombre = n => guardar('minijuegos-nombre', n);

let toastT;
export function aviso(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}
function codigo() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({length: 4}, () => A[Math.floor(Math.random() * A.length)]).join('');
}
export const datosJuego = id => JUEGOS.find(j => j.id === id) || {id, color: '#5cc3f5'};
export const iconoJuego = id => ICONOS[id] || '';
// Reglas "rapidito": los pasos cortos de juegos.js (o las primeras reglas, si no hay resumen)
export function rapidito(id, reglasLargas = []) {
  const pasos = datosJuego(id).resumen || reglasLargas.slice(0, 3);
  return `<ol class="rapidito">${pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>`;
}
// "Así se juega" plegable: abierto solo la primera vez que ves el juego en este dispositivo; después, cerrado
// (se abre tocándolo). Al armarlo ya cuenta como visto.
export function comoSeJuega(id, reglasLargas, {titulo = '⚡ Así se juega', clase = ''} = {}) {
  const clave = 'como-visto-' + id, abierto = !leer(clave);
  guardar(clave, '1');
  return `<details class="como-plegable ${clase}"${abierto ? ' open' : ''}><summary>${titulo}</summary>${rapidito(id, reglasLargas)}</details>`;
}

// ---------- Reloj por turno (juegos con info.reloj) ----------
export const RELOJES = [0, 30, 60, 120];
const textoReloj = s => (!s ? 'Sin' : s < 60 ? s + 's' : s / 60 + 'm');
export function selectorReloj(info, nombre, elegido = info.reloj) {
  if (!info.reloj) return '';
  return `<div class="pills reloj-pills" role="radiogroup" aria-label="Tiempo por turno">${RELOJES.map(s =>
    `<label><input type="radio" name="${nombre}" value="${s}"${s === elegido ? ' checked' : ''}><span>${textoReloj(s)}</span></label>`).join('')}
    <span class="note">⏱️ por turno</span></div>`;
}
export function relojElegido(info, nombre) {
  const r = document.querySelector(`input[name="${nombre}"]:checked`);
  return r ? +r.value : info.reloj || 0;
}
// Suma el reloj elegido a las opciones del juego
export const conReloj = (opciones, info, nombre) => (info.reloj ? {...(opciones || {}), reloj: relojElegido(info, nombre)} : opciones);

// Partida nueva con quién empieza sorteado (salvo en los juegos sin turnos)
export function partidaNueva(reglas, n, opciones) {
  const quien = Math.floor(Math.random() * n);
  const e = reglas.nuevoJuego(n, opciones, quien);
  if (!reglas.info.sinTurnos) { e.turno = quien; e.empieza = quien; }
  if (reglas.info.reloj) {
    const s = opciones && RELOJES.includes(+opciones.reloj) ? +opciones.reloj : reglas.info.reloj;
    e.opciones = {...(e.opciones || {}), reloj: s};
    e.limite = 0;                      // arranca cuando están todos
  }
  return e;
}

// ---------- Salas sin pantalla (las usa también la portada) ----------
// Busca el código en todos los juegos; si hay más de uno, gana la sala más nueva.
export async function buscarSala(cod) {
  await initFb();
  const hallados = await Promise.all(JUEGOS.map(async j => {
    const s = await fb.get(fb.ref(fb.db, `juegos/${j.id}/salas/${cod}`));
    return s.exists() ? {id: j.id, creada: +s.val().creada || 0} : null;
  }));
  return hallados.filter(Boolean).sort((a, b) => b.creada - a.creada)[0] || null;
}
// Crea la sala y te sienta en el asiento 0. Devuelve el código.
export async function crearSala({reglas, n, opciones, nombre}) {
  await initFb();
  limpiarSalas();                      // de paso, se borran las abandonadas
  let cod;
  for (let i = 0; i < 6; i++) {
    cod = codigo();
    if (!(await buscarSala(cod))) break;
  }
  await fb.set(fb.ref(fb.db, `juegos/${reglas.info.id}/salas/${cod}`),
               {n, creada: Date.now(), dueno: miId, seats: {0: {id: miId, name: nombre}}, game: partidaNueva(reglas, n, opciones)});
  marcarActividad(reglas.info.id, cod, true);
  return cod;
}

// ---------- Salas abandonadas ----------
// Cada sala anota su última actividad en actividad/<juego>/<código> (crear, entrar, jugar, chatear).
// Las que pasan VIDA_SALA sin movimiento se borran solas: lo hace cualquiera que abra la portada
// o cree una sala (como mucho una vez por hora en cada dispositivo).
export const VIDA_SALA = 24 * 60 * 60 * 1000;
const marcas = new Map();
export function marcarActividad(juegoId, cod, ya = false) {
  if (!fb || !cod) return;
  const k = `${juegoId}/${cod}`, ahora = Date.now();
  if (!ya && ahora - (marcas.get(k) || 0) < 60000) return;      // a lo sumo una vez por minuto
  marcas.set(k, ahora);
  fb.set(fb.ref(fb.db, `actividad/${k}`), ahora).catch(() => {});
}
export async function limpiarSalas() {
  try {
    if (Date.now() - (+leer('minijuegos-limpieza') || 0) < 60 * 60 * 1000) return 0;
    guardar('minijuegos-limpieza', String(Date.now()));
    await initFb();
    const act = (await fb.get(fb.ref(fb.db, 'actividad'))).val() || {}, limite = Date.now() - VIDA_SALA, borrar = {};
    for (const [g, salas] of Object.entries(act))
      for (const [c, t] of Object.entries(salas || {}))
        if (+t < limite) { borrar[`juegos/${g}/salas/${c}`] = null; borrar[`actividad/${g}/${c}`] = null; }
    if (Object.keys(borrar).length) await fb.update(fb.ref(fb.db), borrar);
    return Object.keys(borrar).length / 2;
  } catch { return 0; }
}

// Cantidades de jugadores permitidas
export const cantidades = info => info.cantidades || Array.from({length: info.max - info.min + 1}, (_, k) => info.min + k);
// Botones para elegir cuántos juegan
export function selectorJugadores(info, nombre) {
  if (info.min === info.max) return `<p class="note">${info.min} jugadores</p>`;
  const ns = cantidades(info);
  return `<div class="pills" role="radiogroup" aria-label="Cantidad de jugadores">${ns.map(n =>
    `<label><input type="radio" name="${nombre}" value="${n}"${n === info.min ? ' checked' : ''}><span>${n}</span></label>`).join('')}
    <span class="note">jugadores</span></div>`;
}
// Los dos caminos para jugar, siempre juntos: online (sala con código) u offline (esta pantalla)
export function botonesJugar(info) {
  return `<div class="jugar-botones">
    <button class="main grande" id="bCrear">🌎 Crear sala online</button>
    ${info.soloOnline ? '<p class="note">Este juego es solo online: cada uno necesita su pantalla.</p>'
      : `<button class="grande offline" id="bLocal">📱 Jugar offline</button>
         <p class="note">Offline: se van pasando esta pantalla por turnos.</p>`}
  </div>`;
}
export function jugadoresElegidos(info, nombre) {
  const r = document.querySelector(`input[name="${nombre}"]:checked`);
  return r ? +r.value : info.min;
}

// =====================================================================
export function montar({ reglas, juego }) {
  const {info} = reglas;
  const dj = datosJuego(info.id);
  document.title = info.nombre;

  document.getElementById('app').innerHTML = `
  <div id="menu">
    <div class="barra"><a class="volver" href="../">← Todos los juegos</a><button class="icono b-sonido"></button></div>
    <div class="hero">
      <span class="ico" style="--c:${dj.color}">${iconoJuego(info.id)}</span>
      <div><h1>${esc(info.nombre)}</h1><p class="sub">${esc(info.desc)}</p></div>
    </div>
    <section class="tarjeta destacada" id="secInvitado" hidden>
      <h2>Te invitaron a la sala <span class="cod-chico" id="invCod"></span></h2>
      <div class="row"><input id="nombreInv" placeholder="Tu nombre" maxlength="14" autocomplete="off">
        <button class="main" id="bEntrarInv">¡Entrar!</button></div>
    </section>
    ${comoSeJuega(info.id, info.reglas, {clase: 'tarjeta como'})}
    <section class="tarjeta armar">
      <h2>🎮 Armá la partida</h2>
      ${selectorJugadores(info, 'cantN')}
      ${selectorReloj(info, 'relojN')}
      <div id="menuExtra"></div>
      <div class="row"><input id="nombre" placeholder="Tu nombre" maxlength="14" autocomplete="off" aria-label="Tu nombre"></div>
      ${botonesJugar(info)}
      <p class="note" id="fbNote" hidden>Para jugar online falta pegar la config en <code>shared/firebase.js</code>.</p>
      <div class="separador"><span>o si tenés un código</span></div>
      <form class="row" id="fUnirme">
        <input id="codigo" class="code" placeholder="ABCD" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false">
        <button id="bUnirme">Unirme</button>
      </form>
    </section>
    <details class="tarjeta reglas"><summary>📖 Reglas completas</summary><ul>${info.reglas.map(r => `<li>${esc(r)}</li>`).join('')}</ul></details>
  </div>
  <div id="play" hidden>
    <div class="top"><button id="bSalir" class="chico">← Salir</button><div id="status"></div><button class="icono b-sonido"></button></div>
    <section class="tarjeta destacada espera" id="espera" hidden>
      <p>Pasales este código</p>
      <div class="cod-grande" id="espCod"></div>
      <div class="row centro"><button class="main" id="bCompartir">Compartir link</button><button id="bCopiar">Copiar código</button></div>
      <p class="note" id="espTxt"></p>
      <button class="chico" id="bCambiarEspera">🎮 Cambiar el juego o cuántos juegan</button>
      <details class="como-plegable espera-reglas"><summary>Mientras tanto, así se juega</summary>${rapidito(info.id, info.reglas)}</details>
    </section>
    <section class="tarjeta equipos-caja" id="equipos" hidden></section>
    <div id="roomBar" hidden>Sala <b id="salaCod"></b><button class="chico" id="bInvitar">Invitar</button><button class="chico" id="bOtroJuego">🎮 Otro juego o cantidad</button></div>
    <div id="players"></div>
    <div id="reloj" hidden></div>
    <div id="hint"></div>
    <div id="tablero"></div>
    <div id="controles"></div>
    <div class="controles"><button class="main" id="bRevancha" hidden>Revancha</button><button class="chico" id="bAyuda">📖 Cómo se juega</button></div>
    <div id="ayuda" class="capa" hidden>
      <div class="fin-caja">
        <span class="ico" style="--c:${dj.color}">${iconoJuego(info.id)}</span>
        <h2>Así se juega</h2>
        ${rapidito(info.id, info.reglas)}
        <button class="main grande" id="bAyudaOk">¡Entendido!</button>
      </div>
    </div>
    <div id="fin" hidden>
      <div class="fin-caja">
        <div class="fin-emoji" id="finEmoji"></div>
        <h2 id="finTxt"></h2>
        <p id="finSub"></p>
        <div class="row centro"><button class="main grande" id="bRevancha2">Revancha</button><button id="bVerTablero">Ver tablero</button></div>
        <button class="chico otro-juego" id="bOtroJuego2">🎮 Jugar a otra cosa</button>
      </div>
    </div>
    <div id="cambiar" class="capa" hidden>
      <div class="fin-caja cambiar-caja">
        <h2>🎮 ¿A qué jugamos ahora?</h2>
        <p>Se mudan todos los de la sala, con el mismo código. También podés cambiar cuántos juegan.</p>
        <div class="cambiar-lista" id="cambiarLista"></div>
        <div class="cambiar-opc" id="cambiarOpc" hidden>
          <div class="cambiar-elegido" id="cambiarElegido"></div>
          <div id="cambiarCant"></div>
          <div id="cambiarQuienes"></div>
          <div id="cambiarReloj"></div>
          <div id="cambiarExtra"></div>
          <button class="main grande" id="bCambiarSi">¡Vamos!</button>
          <button class="chico" id="bCambiarVolver">← Elegir otro juego</button>
        </div>
        <button id="bCambiarNo">Cancelar</button>
      </div>
    </div>
    <div id="renombrar" class="capa" hidden>
      <form class="fin-caja" id="fRenombrar">
        <div class="fin-emoji">✏️</div>
        <h2>¿Cómo te llamás?</h2>
        <p>Así te ven los demás en la sala.</p>
        <div class="row centro"><input id="nombreNuevo" placeholder="Tu nombre" maxlength="14" autocomplete="off" aria-label="Tu nombre"></div>
        <div class="row centro"><button class="main grande" id="bRenombrarSi">Listo</button><button type="button" id="bRenombrarNo">Cancelar</button></div>
      </form>
    </div>
    <div id="echar" class="capa" hidden>
      <div class="fin-caja">
        <div class="fin-emoji">👋</div>
        <h2 id="echarTxt"></h2>
        <p id="echarSub"></p>
        <div class="echar-botones">
          <button class="main grande" id="bEcharAchicar"></button>
          <button class="grande" id="bEcharLibre">Sacar y dejar el lugar libre</button>
          <button class="chico" id="bEcharNo">Cancelar</button>
        </div>
      </div>
    </div>
    <div id="mudanza" class="capa" hidden>
      <div class="fin-caja"><div class="fin-emoji">🎮</div><h2 id="mudanzaTxt"></h2><p>Llevando a todos a la sala nueva…</p></div>
    </div>
  </div>`;

  const $ = id => document.getElementById(id);
  const st = {pantalla: 'menu', online: false, estado: null, cod: '', asiento: -1, sala: null, cortar: null, finVisto: false};
  const ruta = () => `juegos/${info.id}/salas/${st.cod}`;

  const asientoDe = i => (st.sala && st.sala.seats ? st.sala.seats[i] || null : null);
  const nombre = i => { if (st.online) { const s = asientoDe(i); if (s && s.name) return s.name; } return NOMBRES[i]; };
  const contar = sala => { let k = 0; if (sala && sala.seats) for (let i = 0; i < sala.n; i++) if (sala.seats[i]) k++; return k; };
  const sentados = () => contar(st.sala);
  const listos = () => !st.online || (!!st.sala && sentados() === st.sala.n);
  // Quien creó la sala (en las salas viejas, el del asiento 0)
  const duenoId = () => (st.sala ? st.sala.dueno || (st.sala.seats && st.sala.seats[0] ? st.sala.seats[0].id : '') : '');
  const soyDueno = () => st.online && !!st.sala && duenoId() === miId;
  const asientosDe = sala => Array.from({length: sala.n}, (_, i) => (sala.seats || {})[i] || null);
  const puedoJugar = () => {
    const e = st.estado;
    return !!e && e.ganador === EN_JUEGO && listos() && (!st.online || st.asiento === e.turno);
  };

  // ---------- Chat de sala (si el juego lo pide) ----------
  const MAX_CHAT = 80;
  const chat = juego.chat !== false ? crearChat($('play'), {
    async enviar(t) {
      if (!st.online) return;
      const s = asientoDe(st.asiento);
      await fb.push(fb.ref(fb.db, ruta() + '/chat'), {id: miId, n: (s && s.name) || nombreGuardado() || 'Jugador', t: t.slice(0, 200), ts: Date.now()});
      marcarActividad(info.id, st.cod);
      // Para que la sala no crezca sin fin, se borran los mensajes más viejos
      const claves = Object.keys((st.sala && st.sala.chat) || {}).sort();
      if (claves.length > MAX_CHAT) {
        const viejos = {};
        claves.slice(0, claves.length - MAX_CHAT + 20).forEach(k => { viejos[k] = null; });
        fb.update(fb.ref(fb.db, ruta() + '/chat'), viejos).catch(() => {});
      }
    },
    colorDe(id) {
      if (st.sala && st.sala.seats) for (let i = 0; i < st.sala.n; i++) if (st.sala.seats[i] && st.sala.seats[i].id === id) return COLORES[i];
      return '#9a8fb8';
    },
    aviso,
  }) : null;

  // ---------- Reloj por turno ----------
  const segReloj = e => (info.reloj && e && e.opciones ? +e.opciones.reloj || 0 : 0);
  const relojCorre = e => !!e && segReloj(e) > 0 && e.ganador === EN_JUEGO && (!reglas.conReloj || !!reglas.conReloj(e));
  const firmaReloj = e => `${e.turno}|${relojCorre(e)}`;
  // Después de una jugada el reloj arranca de nuevo; después de una jugada libre, solo si cambió el turno
  function reponerReloj(nx, firma = null) {
    if (segReloj(nx) && (firma === null || firmaReloj(nx) !== firma)) nx.limite = ahora() + segReloj(nx) * 1000;
    return nx;
  }

  async function jugar(jugada) {
    if (!puedoJugar()) return false;
    if (!st.online) {
      const nx = reglas.aplicar(clone(st.estado), jugada, nombre);
      if (!nx) { aviso('Esa jugada no vale'); sonar('error'); return false; }
      reponerReloj(nx);
      const antes = st.estado;
      st.estado = nx; efectos(antes, nx); render(); return true;
    }
    try {
      const res = await fb.runTransaction(fb.ref(fb.db, ruta() + '/game'), cur => {
        if (cur === null) return cur;                         // Firebase reintenta con el dato real
        reglas.normalizar(cur);
        if (cur.turno !== st.asiento || cur.ganador !== EN_JUEGO) return;  // aborta
        const nx = reglas.aplicar(cur, jugada, nombre);
        return nx ? reponerReloj(nx) : undefined;
      });
      if (!res.committed) { aviso('Esa jugada no vale'); sonar('error'); return false; }
      marcarActividad(info.id, st.cod);
      return true;
    } catch (e) { aviso('Error de conexión: ' + e.message); return false; }
  }

  // Jugadas libres: cualquiera, en cualquier momento de la partida, sobre lo suyo
  async function jugarLibre(jugada) {
    const e = st.estado;
    if (!reglas.libre || !e || e.ganador !== EN_JUEGO) return false;
    if (!st.online) {
      const nx = reglas.libre(clone(e), jugada, e.turno, nombre);
      if (!nx) return false;
      reponerReloj(nx, firmaReloj(e));
      st.estado = nx; efectos(e, nx); render(); return true;
    }
    try {
      const res = await fb.runTransaction(fb.ref(fb.db, ruta() + '/game'), cur => {
        if (cur === null) return cur;
        reglas.normalizar(cur);
        if (cur.ganador !== EN_JUEGO) return;
        const firma = firmaReloj(cur), nx = reglas.libre(cur, jugada, st.asiento, nombre);
        return nx ? reponerReloj(nx, firma) : undefined;
      });
      if (res.committed) marcarActividad(info.id, st.cod);
      return res.committed;
    } catch (err) { aviso('Error de conexión: ' + err.message); return false; }
  }

  // Muestra cuánto queda, avisa los últimos 10 segundos y, si se acaba, aplica reglas.sinTiempo.
  // Online lo intenta cualquiera (la transacción hace que pase una sola vez); los demás esperan un poquito
  // para que normalmente lo haga el celu del que tenía el turno.
  let ticReloj = -1, vencido = 0, arrancando = 0;
  function tic() {
    const e = st.estado, el = $('reloj');
    if (st.pantalla !== 'play' || !relojCorre(e) || !listos() || (st.online && !st.sala)) { el.hidden = true; return; }
    if (!e.limite) { el.hidden = true; arrancarReloj(); return; }
    const falta = e.limite - ahora(), queda = Math.max(0, Math.ceil(falta / 1000));
    const mio = !st.online || st.asiento === e.turno;
    el.hidden = false;
    el.innerHTML = `⏱️ ${Math.floor(queda / 60)}:${String(queda % 60).padStart(2, '0')}` +
      (st.online && !mio && e.turno >= 0 ? ` <small>${esc(nombre(e.turno))}</small>` : '');
    el.classList.toggle('apurado', queda <= 10);
    el.classList.toggle('mio', mio);
    if (mio && queda <= 10 && queda > 0 && queda !== ticReloj) { ticReloj = queda; sonar('reloj'); }
    if (falta <= (mio ? 0 : -1500) && vencido !== e.limite) { vencido = e.limite; vencer(e.limite); }
  }
  async function arrancarReloj() {
    if (!st.online) { st.estado.limite = ahora() + segReloj(st.estado) * 1000; return; }
    if (Date.now() < arrancando) return;
    arrancando = Date.now() + 3000;
    try {
      await fb.runTransaction(fb.ref(fb.db, ruta() + '/game'), cur => {
        if (cur === null) return cur;
        if (+cur.limite || cur.ganador !== EN_JUEGO) return;
        cur.limite = ahora() + segReloj(cur) * 1000;
        return cur;
      });
    } catch {}
  }
  function sinTiempo(cur, lim) {
    if (cur.ganador !== EN_JUEGO || +cur.limite !== lim || ahora() < lim || !relojCorre(cur) || !reglas.sinTiempo) return null;
    const p = cur.turno, k = (cur.vencio ? +cur.vencio.k || 0 : 0) + 1;
    const nx = reglas.sinTiempo(cur, nombre);
    if (!nx) return null;
    nx.limite = ahora() + segReloj(nx) * 1000;
    nx.vencio = {p, k};
    return nx;
  }
  async function vencer(lim) {
    if (!st.online) {
      const antes = st.estado, nx = sinTiempo(clone(antes), lim);
      if (nx) { st.estado = nx; efectos(antes, nx); render(); }
      return;
    }
    try {
      await fb.runTransaction(fb.ref(fb.db, ruta() + '/game'), cur => {
        if (cur === null) return cur;
        return sinTiempo(reglas.normalizar(cur), lim) || undefined;
      });
    } catch {}
  }
  setInterval(tic, 250);

  // Lo que recibe el juego para dibujar y jugar
  const ctx = {
    get estado() { return st.estado; },
    get online() { return st.online; },
    get miAsiento() { return st.asiento; },
    get listos() { return listos(); },
    puedoJugar, jugar, jugarLibre, nombre, aviso, sonar, animar, ahora,
    color: i => COLORES[i],
    get extra() { return (st.sala && st.sala.extra) || {}; },
    guardarExtra: (r, v) => (st.online ? fb.set(fb.ref(fb.db, `${ruta()}/extra/${r}`), v) : Promise.resolve()),
    sumarExtra: (r, v) => (st.online ? fb.push(fb.ref(fb.db, `${ruta()}/extra/${r}`), v) : Promise.resolve()),
    cambiarExtra: obj => (st.online ? fb.update(fb.ref(fb.db, `${ruta()}/extra`), obj) : Promise.resolve()),
    tablero: $('tablero'),
    controles: $('controles'),
    refrescar: () => render(),
  };

  // Quién ganó (en los juegos por equipos pueden ser varios)
  const ganadores = e => (reglas.ganadores ? reglas.ganadores(e) : e.ganador >= 0 ? [e.ganador] : []);
  const nombresGan = e => ganadores(e).map(i => esc(nombre(i))).join(' y ');

  // Quién empieza (sorteado): se avisa al arrancar, mientras nadie jugó todavía
  const sinJugar = e => !!e && e.ganador === EN_JUEGO && !e.ultima;
  function quienEmpieza(e) {
    if (info.sinTurnos || !e || e.empieza == null) return '';
    return st.online && e.empieza === st.asiento ? '🎲 ¡Te tocó empezar!' : `🎲 Empieza ${nombre(e.empieza)}`;
  }

  // Sonidos y festejo cuando cambia el estado (jugada propia, del rival o revancha)
  function efectos(antes, e, salaAntes) {
    if (st.online && salaAntes && contar(st.sala) > contar(salaAntes)) {
      sonar('entrar');
      aviso(!listos() ? 'Se sumó alguien' : sinJugar(e) && quienEmpieza(e) ? `¡Están todos! ${quienEmpieza(e)}` : '¡Están todos! A jugar');
    } else if (st.online && !antes && e && listos() && sinJugar(e) && quienEmpieza(e)) aviso(quienEmpieza(e));   // recién entrás
    if (st.online && salaAntes && st.sala) {                // alguien ya no está (lo sacaron o quedó afuera)
      const ids = Object.values(st.sala.seats || {}).map(x => x && x.id);
      const fueron = Object.values(salaAntes.seats || {}).filter(x => x && !ids.includes(x.id));
      if (fueron.length) aviso(`${fueron.map(x => x.name).join(' y ')} ya no ${fueron.length > 1 ? 'están' : 'está'} en la sala`);
    }
    if (!antes || !e || JSON.stringify(antes) === JSON.stringify(e)) return;
    if (e.vencio && (!antes.vencio || antes.vencio.k !== e.vencio.k)) {
      sonar('no');
      aviso(st.online && e.vencio.p === st.asiento ? '⏱️ ¡Se te acabó el tiempo!' : `⏱️ Se le acabó el tiempo a ${nombre(e.vencio.p)}`);
    }
    // Se volvió a repartir antes de jugar (ej. cambiaron los equipos): quién empieza puede ser otro
    if (antes.ganador === EN_JUEGO && sinJugar(e) && antes.empieza !== e.empieza && listos() && quienEmpieza(e)) aviso(quienEmpieza(e));
    if (antes.ganador !== EN_JUEGO && e.ganador === EN_JUEGO) {    // revancha
      sonar('entrar'); registrarPartida(info.id);
      if (listos() && quienEmpieza(e)) aviso(quienEmpieza(e));
      return;
    }
    const s = juego.sonido ? juego.sonido(antes, e, ctx) : 'colocar';
    if (s) sonar(s, antes.turno);
    if (antes.ganador === EN_JUEGO && e.ganador !== EN_JUEGO) {
      setTimeout(() => {
        if (info.sinGanador) { sonar('ganar'); confeti(COLORES); }
        else if (e.ganador === EMPATE) sonar('empate');
        else if (!st.online || ganadores(e).includes(st.asiento)) { sonar('ganar'); confeti(COLORES); }
        else sonar('perder');
      }, 260);
      return;
    }
    if (st.online && e.turno === st.asiento && antes.turno !== st.asiento) {
      setTimeout(() => sonar('turno'), 240);
      try { if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(40); } catch {}
    }
  }

  function render() {
    $('menu').hidden = st.pantalla !== 'menu';
    $('play').hidden = st.pantalla !== 'play';
    $('fbNote').hidden = !!FIREBASE_CONFIG;
    chat?.mostrar(st.pantalla === 'play' && st.online);
    if (st.pantalla !== 'play') return;
    $('salaCod').textContent = st.cod;

    const e = st.estado;
    const esperando = st.online && !!st.sala && !listos() && (!e || e.ganador === EN_JUEGO);
    $('espera').hidden = !esperando;
    $('roomBar').hidden = !st.online || esperando;
    pintarEquipos(e);
    if (esperando) {
      if ($('espCod').dataset.cod !== st.cod) {
        $('espCod').dataset.cod = st.cod;
        $('espCod').innerHTML = [...st.cod].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');
      }
      $('espTxt').textContent = `Esperando jugadores (${sentados()}/${st.sala.n})…`;
    }
    if (!e) { $('status').textContent = 'Conectando…'; $('hint').textContent = ''; $('players').innerHTML = ''; return; }

    const dot = i => `<span class="dot" style="background:${COLORES[i]}"></span>`;
    const propio = e.ganador === EN_JUEGO && listos() && juego.estado ? juego.estado(ctx) : '';
    const miTurno = !propio && st.online && e.ganador === EN_JUEGO && listos() && st.asiento === e.turno;
    let status;
    if (info.sinGanador && e.ganador !== EN_JUEGO) status = '¡Terminó!';
    else if (e.ganador >= 0) status = `${dot(e.ganador)}¡${ganadores(e).length > 1 ? 'Ganaron' : 'Ganó'} ${nombresGan(e)}!`;
    else if (e.ganador === EMPATE) status = 'Empate';
    else if (!listos()) status = 'Esperando…';
    else if (propio) status = esc(propio);
    else status = dot(e.turno) + (miTurno ? '¡Tu turno!' : 'Turno de ' + esc(nombre(e.turno)));
    $('status').innerHTML = status;
    $('status').classList.toggle('mi-turno', miTurno);
    $('status').style.setProperty('--c', e.ganador === EN_JUEGO && listos() && !propio && e.turno >= 0 ? COLORES[e.turno] : 'transparent');

    // Quien creó la sala (👑) puede sacar a los demás con la ✕
    const dueno = duenoId(), mando = soyDueno();
    $('players').innerHTML = Array.from({length: e.n}, (_, i) => {
      const extra = reglas.detalle ? reglas.detalle(e, i) : '';
      const s = st.online ? asientoDe(i) : null, vacio = st.online && !s;
      return `<div class="chip${i === e.turno && e.ganador === EN_JUEGO ? ' turn' : ''}${vacio ? ' vacio' : ''}" style="--c:${COLORES[i]}">${dot(i)}` +
             `${vacio ? 'Libre' : esc(nombre(i))}${st.online && i === st.asiento ? ' (vos)' : ''}${s && s.id === dueno ? ' 👑' : ''}` +
             `${s && i === st.asiento ? '<button class="renombrar" data-renombrar title="Cambiar tu nombre" aria-label="Cambiar tu nombre">✏️</button>' : ''}` +
             `${extra ? `<span class="w">${esc(extra)}</span>` : ''}` +
             `${mando && s && i !== st.asiento ? `<button class="echar" data-echar="${i}" title="Sacar de la sala" aria-label="Sacar a ${esc(s.name)} de la sala">✕</button>` : ''}</div>`;
    }).join('');

    const pista = juego.dibujar(ctx);
    $('hint').textContent = esperando ? '' : (pista || e.ultima || (listos() && sinJugar(e) ? quienEmpieza(e) : ''));
    $('bRevancha').hidden = e.ganador === EN_JUEGO;
    $('bOtroJuego2').hidden = !st.online;

    const termino = e.ganador !== EN_JUEGO;
    if (!termino) st.finVisto = false;
    const mostrarFin = termino && !st.finVisto;
    if (mostrarFin && $('fin').hidden) {
      let emoji, txt;
      const varios = ganadores(e).length > 1;
      if (info.sinGanador) ({emoji, txt} = juego.textoFin?.(ctx) || {emoji: '🎉', txt: '¡Terminó!'});
      else if (e.ganador === EMPATE) { emoji = '🤝'; txt = '¡Empate!'; }
      else if (!st.online) { emoji = '🏆'; txt = `¡${varios ? 'Ganaron' : 'Ganó'} ${nombresGan(e)}!`; }
      else if (ganadores(e).includes(st.asiento)) { emoji = '🏆'; txt = varios ? `¡Ganaron! (${nombresGan(e)})` : '¡Ganaste!'; }
      else { emoji = '😵'; txt = `${varios ? 'Ganaron' : 'Ganó'} ${nombresGan(e)}`; }
      $('finEmoji').textContent = emoji;
      $('finTxt').innerHTML = (e.ganador >= 0 && !info.sinGanador ? dot(e.ganador) : '') + txt;   // los nombres ya vienen escapados (textoFin también devuelve HTML seguro)
      $('finSub').textContent = juego.resumenFin?.(ctx) || e.ultima || '';
    }
    $('fin').hidden = !mostrarFin;
  }

  function entrarSala(cod, asiento) {
    Object.assign(st, {online: true, cod, asiento, pantalla: 'play', estado: null, sala: null, finVisto: false});
    juego.reiniciar?.();
    chat?.reiniciar();
    sonar('entrar');
    marcarActividad(info.id, cod, true);
    $('secInvitado').hidden = true;
    // Cuenta como partida jugada (una vez por sala: recargar la página no suma)
    const contada = `minijuegos-contada-${info.id}-${cod}`;
    try { if (!sessionStorage.getItem(contada)) { sessionStorage.setItem(contada, '1'); registrarPartida(info.id); } } catch { registrarPartida(info.id); }
    // Si te sumaste a la sala de otro y nunca viste este juego, te mostramos las reglas rapidito
    if (asiento > 0 && !leer('reglas-vistas-' + info.id)) $('ayuda').hidden = false;
    st.cortar = fb.onValue(fb.ref(fb.db, ruta()), snap => {
      const v = snap.val();
      if (!v) { aviso('La sala ya no existe'); return; }
      const antes = st.estado, salaAntes = st.sala;
      // Si te sacaron (o quedaste afuera de la partida nueva), volvés al menú
      const fuera = v.siguiente && lista(v.siguiente.fuera).includes(miId);
      const estoy = Object.values(v.seats || {}).some(x => x && x.id === miId);
      if (fuera || (!estoy && !v.siguiente)) {
        salir();
        aviso(fuera ? `${v.siguiente.por} armó una partida de ${v.siguiente.n} y quedaste afuera` : 'Te sacaron de la sala');
        sonar('pasar');
        return;
      }
      st.sala = v;
      for (let i = 0; i < v.n; i++) if (v.seats && v.seats[i] && v.seats[i].id === miId) st.asiento = i;
      st.estado = reglas.normalizar(v.game);
      efectos(antes, st.estado, salaAntes);
      // Entraste sin nombre ("Jugador"): te lo pedimos ahí mismo (si no estás viendo las reglas)
      if (!salaAntes && asientoDe(st.asiento)?.name === 'Jugador' && $('ayuda').hidden) setTimeout(abrirRenombrar, 300);
      chat?.actualizar(v.chat, miId);
      if (v.siguiente && !st.mudando) {        // alguien eligió otro juego: nos mudamos todos
        st.mudando = true;
        $('cambiar').hidden = true;
        $('mudanzaTxt').textContent = `${v.siguiente.por} eligió ${datosJuego(v.siguiente.juego).nombre || 'otro juego'}`;
        $('mudanza').hidden = false;
        sonar('entrar');
        setTimeout(() => { location.href = `../${v.siguiente.juego}/?sala=${st.cod}`; }, 1500);
      }
      render();
    });
    try { history.replaceState(null, '', '?sala=' + cod); } catch {}
    render();
  }
  // Sin nombre entrás como "Jugador", pero eso no se guarda: así no queda pegado para las próximas salas
  function miNombre() {
    const n = $('nombre').value.trim();
    if (n) guardarNombre(n);
    return n || 'Jugador';
  }

  async function unirme(cod, name) {
    if (cod.length !== 4) { aviso('El código tiene 4 letras'); sonar('error'); animar($('codigo'), 'sacudir'); return false; }
    try {
      await initFb();
      const base = `juegos/${info.id}/salas/${cod}`;
      const snap = await fb.get(fb.ref(fb.db, base));
      if (!snap.exists()) {
        const otra = await buscarSala(cod);          // ¿es una sala de otro juego?
        if (otra) { location.href = `../${otra.id}/?sala=${cod}`; return true; }
        aviso('No existe la sala ' + cod); sonar('error'); animar($('codigo'), 'sacudir');
        return false;
      }
      const n = snap.val().n;
      let asiento = -1;
      const res = await fb.runTransaction(fb.ref(fb.db, base + '/seats'), seats => {
        if (seats === null) return seats;
        asiento = -1;
        for (let i = 0; i < n; i++) if (seats[i] && seats[i].id === miId) { asiento = i; seats[i].name = name; return seats; }
        for (let i = 0; i < n; i++) if (!seats[i]) { seats[i] = {id: miId, name}; asiento = i; return seats; }
        return; // llena
      });
      if (!res.committed || asiento < 0) { aviso('La sala está llena'); sonar('error'); return false; }
      entrarSala(cod, asiento);
      return true;
    } catch (e) { aviso(e.message); return false; }
  }

  // ---------- Botones del menú ----------
  $('menu').addEventListener('click', ev => { if (ev.target.closest('button')) sonar('tap'); });
  $('menu').addEventListener('change', ev => { if (ev.target.matches('.pills input')) sonar('tick'); });
  function jugarOffline(n) {
    if (info.soloOnline) return;
    Object.assign(st, {online: false, estado: partidaNueva(reglas, n, conReloj(juego.opciones?.(), info, 'relojN')), pantalla: 'play', finVisto: false});
    registrarPartida(info.id);
    juego.reiniciar?.(); render();
    if (quienEmpieza(st.estado)) aviso(quienEmpieza(st.estado));
  }
  if ($('bLocal')) $('bLocal').onclick = () => jugarOffline(jugadoresElegidos(info, 'cantN'));
  $('bCrear').onclick = async () => {
    const name = miNombre();
    $('bCrear').disabled = true;
    try {
      const cod = await crearSala({reglas, n: jugadoresElegidos(info, 'cantN'), opciones: conReloj(juego.opciones?.(), info, 'relojN'), nombre: name});
      entrarSala(cod, 0);
    } catch (e) { aviso(e.message); }
    $('bCrear').disabled = false;
  };
  $('codigo').addEventListener('input', () => { $('codigo').value = $('codigo').value.toUpperCase().replace(/[^A-Z]/g, ''); });
  $('fUnirme').onsubmit = ev => { ev.preventDefault(); unirme($('codigo').value.trim().toUpperCase(), miNombre()); };
  $('bEntrarInv').onclick = async () => {
    const name = $('nombreInv').value.trim();
    if (!name) { aviso('Poné tu nombre'); animar($('nombreInv'), 'sacudir'); $('nombreInv').focus(); return; }
    guardarNombre(name); $('nombre').value = name;
    $('bEntrarInv').disabled = true;
    if (!(await unirme($('invCod').textContent, name))) $('bEntrarInv').disabled = false;
  };
  $('nombreInv').addEventListener('keydown', ev => { if (ev.key === 'Enter') $('bEntrarInv').click(); });

  // ---------- Botones de la partida ----------
  $('bSalir').onclick = () => { sonar('tap'); salir(); };
  function salir() {
    if (st.cortar) { st.cortar(); st.cortar = null; }
    ['cambiar', 'echar', 'mudanza', 'renombrar'].forEach(id => { $(id).hidden = true; });
    cerrarCambiar();
    Object.assign(st, {pantalla: 'menu', online: false, estado: null, sala: null, cod: '', asiento: -1});
    juego.reiniciar?.();
    chat?.reiniciar();
    try { history.replaceState(null, '', location.pathname); } catch {}
    render();
  }
  async function revancha() {
    sonar('tap');
    juego.reiniciar?.();
    if (!st.online) { const antes = st.estado; st.estado = partidaNueva(reglas, st.estado.n, st.estado.opciones); efectos(antes, st.estado); render(); return; }
    try { await fb.set(fb.ref(fb.db, ruta() + '/game'), partidaNueva(reglas, st.sala.n, st.estado.opciones)); marcarActividad(info.id, st.cod, true); } catch (e) { aviso(e.message); }
  }
  $('bRevancha').onclick = $('bRevancha2').onclick = revancha;
  $('bVerTablero').onclick = () => { sonar('tap'); st.finVisto = true; render(); };
  // ---------- Equipos: cambiarse o armarlos al azar (solo antes de que alguien juegue) ----------
  const equipoDe = i => i % info.equipos;
  const conEquipos = e => !!info.equipos && st.online && !!st.sala && st.sala.n > 2 && !!e && e.ganador === EN_JUEGO && !e.ultima;
  function pintarEquipos(e) {
    const caja = $('equipos');
    caja.hidden = !conEquipos(e);
    if (caja.hidden) return;
    const n = st.sala.n, yo = st.asiento;
    const html = `<h2>👥 Equipos</h2><div class="equipos">${Array.from({length: info.equipos}, (_, q) => `<div class="equipo${equipoDe(yo) === q ? ' mio' : ''}">
      <b>Equipo ${q + 1}</b>${Array.from({length: n}, (_, i) => i).filter(i => equipoDe(i) === q).map(i => {
        const s = asientoDe(i);
        if (i === yo) return `<div class="lugar"><span class="dot" style="background:${COLORES[i]}"></span>${esc(s.name)} (vos)</div>`;
        if (!s) return `<button class="lugar libre" data-sentar="${i}">${equipoDe(yo) === q ? 'libre' : '＋ Pasarme acá'}</button>`;
        return `<div class="lugar"><span class="dot" style="background:${COLORES[i]}"></span>${esc(s.name)}${
          equipoDe(yo) !== q ? `<button class="chico" data-cambiar="${i}" title="Cambiar de lugar con ${esc(s.name)}">⇄</button>` : ''}</div>`;
      }).join('')}</div>`).join('')}</div>
      <div class="row centro"><button id="bEqAzar">🎲 Equipos al azar</button></div>
      <p class="note">Se puede cambiar hasta que alguien juegue. Cada cambio vuelve a repartir.</p>`;
    if (caja.dataset.k !== html) { caja.dataset.k = html; caja.innerHTML = html; }
  }
  // Mueve los asientos (si todavía no se jugó nada) y arranca la partida de nuevo
  async function moverAsientos(cambio) {
    try {
      const res = await fb.runTransaction(fb.ref(fb.db, ruta()), sala => {
        if (!sala) return sala;
        const g = reglas.normalizar(sala.game);
        if (g.ganador !== EN_JUEGO || g.ultima) return;          // ya empezaron: no se toca
        const seats = Array.from({length: sala.n}, (_, i) => (sala.seats || {})[i] || null);
        const nuevos = cambio(seats);
        if (!nuevos) return;
        sala.seats = Object.fromEntries(nuevos.map((s, i) => [i, s]).filter(([, s]) => s));
        sala.game = partidaNueva(reglas, sala.n, g.opciones);
        return sala;
      });
      if (!res.committed) aviso('Ya no se puede cambiar: la partida empezó');
      else sonar('cambiar');
    } catch (err) { aviso('Error de conexión: ' + err.message); }
  }
  const miLugar = seats => seats.findIndex(s => s && s.id === miId);
  $('equipos').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.sentar) moverAsientos(seats => {
      const de = miLugar(seats), a = +b.dataset.sentar;
      if (de < 0 || seats[a]) return null;
      seats[a] = seats[de]; seats[de] = null;
      return seats;
    });
    if (b.dataset.cambiar) moverAsientos(seats => {
      const de = miLugar(seats), a = +b.dataset.cambiar;
      if (de < 0 || !seats[a]) return null;
      [seats[a], seats[de]] = [seats[de], seats[a]];
      return seats;
    });
    if (b.id === 'bEqAzar') moverAsientos(seats => {
      for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
      return seats;
    });
  });

  // ---------- Cambiar de juego (o de cantidad) sin perder la sala ----------
  // Otro juego: se crea su sala con el mismo código, los mismos asientos y el chat, y se deja "siguiente"
  // en esta: todos los que la están mirando se mudan solos (ver entrarSala).
  // El mismo juego: se cambia la cantidad y se arranca de nuevo en la misma sala.
  // Achicar la sala con gente adentro (dejar a alguno afuera) solo lo puede hacer quien la creó.
  const reglasDe = id => (id === info.id ? Promise.resolve(reglas) : import(new URL(`../${id}/reglas.js`, import.meta.url).href));
  const juegoDe = id => (id === info.id ? Promise.resolve(juego) : import(new URL(`../${id}/juego.js`, import.meta.url).href));
  let cambiarA = null;   // {id, juego, info} del juego elegido
  async function abrirCambiar() {
    sonar('tap');
    if (!st.online || !st.sala) return;
    cambiarA = null;
    $('cambiarLista').hidden = false; $('cambiarOpc').hidden = true;
    const hay = sentados(), mando = soyDueno();
    const todos = [datosJuego(info.id), ...ordenarJuegos(JUEGOS.filter(j => j.id !== info.id))];
    const infos = await Promise.all(todos.map(j => reglasDe(j.id).then(m => m.info).catch(() => null)));
    $('cambiarLista').innerHTML = todos.map((j, k) => {
      const inf = infos[k], va = !!inf && (mando || cantidades(inf).some(c => c >= hay));
      return `<button data-id="${j.id}" style="--c:${j.color}"${va ? '' : ' disabled'}><span class="ico">${iconoJuego(j.id)}</span>` +
             `${esc(j.nombre || info.nombre)}<small>${j.id === info.id ? 'este mismo · ' : ''}${esc(j.jugadores || '')}</small></button>`;
    }).join('');
    $('cambiar').hidden = false;
  }
  function cerrarCambiar() {
    $('cambiar').hidden = true;
    $('cambiarExtra').innerHTML = '';
    if (juego.menu && !$('menuExtra').innerHTML) juego.menu($('menuExtra'));   // si se usó el menú de este mismo juego
  }
  // Opciones antes de mudarse: cuántos juegan, quiénes (si no entran todos), el reloj y las del juego (ej. el mazo)
  async function elegirJuego(id) {
    const [mod, {info: inf}] = await Promise.all([juegoDe(id), reglasDe(id)]);
    cambiarA = {id, juego: mod, info: inf};
    const j = datosJuego(id), hay = sentados(), mando = soyDueno(), ns = cantidades(inf);
    $('cambiarElegido').innerHTML = `<span class="ico" style="--c:${j.color}">${iconoJuego(id)}</span><b>${esc(inf.nombre)}</b>`;
    // Cantidad: la de ahora si se puede; si no, la más cercana que alcance para todos
    const def = ns.includes(hay) ? hay : ns.find(c => c >= hay) || ns[ns.length - 1];
    $('cambiarCant').innerHTML = `<p class="note">¿Cuántos juegan? (ahora hay ${hay} en la sala)</p>` + (ns.length === 1 ? `<p><b>${ns[0]} jugadores</b></p>`
      : `<div class="pills" role="radiogroup" aria-label="Cantidad de jugadores">${ns.map(c =>
          `<label><input type="radio" name="cantC" value="${c}"${c === def ? ' checked' : ''}${c < hay && !mando ? ' disabled' : ''}><span>${c}</span></label>`).join('')}</div>`) +
      (!mando && ns.some(c => c < hay) ? '<p class="note">Para dejar a alguien afuera lo tiene que elegir quien creó la sala 👑.</p>' : '');
    pintarQuienes();
    const relojAhora = id === info.id && st.estado && st.estado.opciones && st.estado.opciones.reloj != null ? +st.estado.opciones.reloj : inf.reloj;
    $('cambiarReloj').innerHTML = selectorReloj(inf, 'relojC', relojAhora);
    $('cambiarExtra').innerHTML = '';
    if (mod.menu) {
      if (id === info.id) $('menuExtra').innerHTML = '';   // que no haya dos menús iguales a la vez
      mod.menu($('cambiarExtra'));
    }
    $('cambiarLista').hidden = true; $('cambiarOpc').hidden = false; $('bCambiarSi').disabled = false;
  }
  const cantCambiar = () => {
    const r = document.querySelector('input[name="cantC"]:checked');
    return r ? +r.value : cantidades(cambiarA.info)[0];
  };
  // Si no entran todos, quien creó la sala elige quiénes juegan (de entrada, los primeros y vos)
  function pintarQuienes() {
    const n = cantCambiar(), gente = asientosDe(st.sala).filter(Boolean);
    if (gente.length <= n) { $('cambiarQuienes').innerHTML = ''; return; }
    $('cambiarQuienes').innerHTML = `<p class="note">Entran ${n}: elegí quiénes juegan (los demás salen de la sala).</p>
      <div class="fichas">${gente.map((x, k) => `<label><input type="checkbox" value="${esc(x.id)}"${k < n || x.id === miId ? ' checked' : ''}${
        x.id === miId ? ' disabled' : ''}><span>${esc(x.name)}${x.id === miId ? ' (vos)' : ''}</span></label>`).join('')}</div>`;
    const marcados = [...$('cambiarQuienes').querySelectorAll('input:checked')];
    if (marcados.length > n) marcados.filter(i => !i.disabled).pop().checked = false;
  }
  $('cambiarCant').addEventListener('change', () => { sonar('tick'); pintarQuienes(); });
  $('cambiarQuienes').addEventListener('change', ev => {
    const n = cantCambiar(), marcados = $('cambiarQuienes').querySelectorAll('input:checked');
    if (marcados.length > n) { ev.target.checked = false; aviso(`Entran ${n}: sacá a otro primero`); }
  });
  async function mudar() {
    const {id, juego: mod, info: inf} = cambiarA, n = cantCambiar();
    const gente = asientosDe(st.sala).filter(Boolean);
    const quedan = gente.length <= n ? gente.map(x => x.id)
      : [...$('cambiarQuienes').querySelectorAll('input:checked')].map(i => i.value);
    if (quedan.length > n) { aviso(`Entran ${n}`); return; }
    if (quedan.length < gente.length && !soyDueno()) { aviso('Solo quien creó la sala puede dejar gente afuera'); return; }
    const opciones = conReloj(mod.menu ? mod.opciones?.() : undefined, inf, 'relojC');
    const seats = Object.fromEntries(gente.filter(x => quedan.includes(x.id)).map((x, i) => [i, x]));
    const fuera = gente.map(x => x.id).filter(x => !quedan.includes(x));
    const dueno = quedan.includes(duenoId()) ? duenoId() : miId;
    $('cambiarLista').querySelectorAll('button').forEach(b => { b.disabled = true; });
    $('bCambiarSi').disabled = true;
    try {
      const otras = await reglasDe(id);
      const yo = asientoDe(st.asiento);
      if (id === info.id) {
        await fb.update(fb.ref(fb.db, ruta()), {n, dueno, seats, game: partidaNueva(otras, n, opciones)});
        marcarActividad(info.id, st.cod, true);
        juego.reiniciar?.();
        sonar('entrar');
        cerrarCambiar();
        return;
      }
      await fb.set(fb.ref(fb.db, `juegos/${id}/salas/${st.cod}`),
                   {n, creada: Date.now(), dueno, seats, game: partidaNueva(otras, n, opciones), ...(st.sala.chat ? {chat: st.sala.chat} : {})});
      marcarActividad(id, st.cod, true);
      await fb.set(fb.ref(fb.db, ruta() + '/siguiente'), {juego: id, n, por: (yo && yo.name) || 'Alguien', t: Date.now(), ...(fuera.length ? {fuera} : {})});
    } catch (e) { aviso('No se pudo cambiar: ' + e.message); cerrarCambiar(); }
  }
  $('bOtroJuego').onclick = $('bOtroJuego2').onclick = $('bCambiarEspera').onclick = abrirCambiar;
  $('bCambiarNo').onclick = () => { sonar('tap'); cerrarCambiar(); };
  $('bCambiarVolver').onclick = () => {
    $('cambiarExtra').innerHTML = '';
    if (juego.menu && !$('menuExtra').innerHTML) juego.menu($('menuExtra'));
    abrirCambiar();
  };
  $('cambiarLista').addEventListener('click', ev => {
    const b = ev.target.closest('[data-id]');
    if (b && !b.disabled) { sonar('tap'); elegirJuego(b.dataset.id).catch(e => aviso('No se pudo abrir: ' + e.message)); }
  });
  $('bCambiarSi').onclick = () => { if (cambiarA) { sonar('tap'); mudar(); } };

  // ---------- Cambiar tu nombre en plena partida (tocando ✏️ en tu chip) ----------
  function abrirRenombrar() {
    const s = st.online && asientoDe(st.asiento);
    if (!s) return;
    $('nombreNuevo').value = s.name === 'Jugador' ? '' : s.name || '';
    $('renombrar').hidden = false;
    $('nombreNuevo').focus();
  }
  $('players').addEventListener('click', ev => {
    if (!ev.target.closest('[data-renombrar]')) return;
    sonar('tap'); abrirRenombrar();
  });
  $('bRenombrarNo').onclick = () => { sonar('tap'); $('renombrar').hidden = true; };
  $('fRenombrar').onsubmit = async ev => {
    ev.preventDefault();
    const n = $('nombreNuevo').value.trim();
    if (!n) { aviso('Poné tu nombre'); animar($('nombreNuevo'), 'sacudir'); return; }
    const s = asientoDe(st.asiento);
    if (!st.online || !s || s.id !== miId) { $('renombrar').hidden = true; return; }
    $('bRenombrarSi').disabled = true;
    try {
      await fb.set(fb.ref(fb.db, `${ruta()}/seats/${st.asiento}/name`), n);
      guardarNombre(n); $('nombre').value = n;
      sonar('tap'); $('renombrar').hidden = true;
    } catch (e) { aviso(e.message); }
    $('bRenombrarSi').disabled = false;
  };

  // ---------- Sacar a alguien de la sala (solo quien la creó) ----------
  let aEchar = null;   // {i, id, name}
  $('players').addEventListener('click', ev => {
    const b = ev.target.closest('[data-echar]');
    if (!b || !soyDueno()) return;
    sonar('tap');
    const i = +b.dataset.echar, x = asientoDe(i);
    if (!x) return;
    aEchar = {i, id: x.id, name: x.name};
    const n = st.sala.n, puede = cantidades(info).includes(n - 1);
    $('echarTxt').textContent = `¿Sacar a ${x.name}?`;
    $('echarSub').textContent = puede
      ? `Podés seguir de ${n - 1} (arranca una partida nueva) o dejar su lugar libre para que entre otro.`
      : `${info.nombre} no se juega de ${n - 1}: su lugar queda libre para que entre otro (o cambiá la cantidad con 🎮).`;
    $('bEcharAchicar').hidden = !puede;
    $('bEcharAchicar').textContent = `Sacar y seguir de ${n - 1}`;
    $('echar').hidden = false;
  });
  async function echar(achicar) {
    const x = aEchar;
    $('echar').hidden = true;
    if (!x) return;
    try {
      const res = await fb.runTransaction(fb.ref(fb.db, ruta()), sala => {
        if (!sala) return sala;
        const seats = asientosDe(sala);
        if (!seats[x.i] || seats[x.i].id !== x.id) return;          // ya se movió: no se toca
        seats[x.i] = null;
        if (achicar && cantidades(info).includes(sala.n - 1)) {
          const g = reglas.normalizar(sala.game);
          sala.n--;
          sala.seats = Object.fromEntries(seats.filter(Boolean).map((s, i) => [i, s]));
          sala.game = partidaNueva(reglas, sala.n, g.opciones);
        } else sala.seats = Object.fromEntries(seats.map((s, i) => [i, s]).filter(([, s]) => s));
        return sala;
      });
      if (!res.committed) aviso('No se pudo: la sala cambió, probá de nuevo');
      else { sonar('cambiar'); if (achicar) juego.reiniciar?.(); }
    } catch (e) { aviso('Error de conexión: ' + e.message); }
  }
  $('bEcharAchicar').onclick = () => { sonar('tap'); echar(true); };
  $('bEcharLibre').onclick = () => { sonar('tap'); echar(false); };
  $('bEcharNo').onclick = () => { sonar('tap'); $('echar').hidden = true; };

  $('bAyuda').onclick = () => { sonar('tap'); $('ayuda').hidden = false; };
  $('bAyudaOk').onclick = () => { sonar('tap'); $('ayuda').hidden = true; guardar('reglas-vistas-' + info.id, '1'); };
  const linkSala = () => location.origin + location.pathname + '?sala=' + st.cod;
  async function compartir() {
    sonar('tap');
    try {
      if (navigator.share) await navigator.share({title: info.nombre, text: `¡Sumate a mi partida de ${info.nombre}! Sala ${st.cod}`, url: linkSala()});
      else { await navigator.clipboard.writeText(linkSala()); aviso('Link copiado'); }
    } catch (e) { if (e?.name !== 'AbortError') aviso('Código de sala: ' + st.cod); }
  }
  $('bInvitar').onclick = $('bCompartir').onclick = compartir;
  $('bCopiar').onclick = async () => {
    sonar('tap');
    try { await navigator.clipboard.writeText(st.cod); aviso('Código copiado'); } catch { aviso('Código de sala: ' + st.cod); }
  };

  // ---------- Arranque ----------
  if (info.sinGanador) $('bRevancha').textContent = $('bRevancha2').textContent = 'Jugar otra';
  botonesSonido();
  $('nombre').value = nombreGuardado();
  juego.menu?.($('menuExtra'));
  juego.iniciar(ctx);
  render();

  // ?local=N (viene de "Jugar offline" en la portada): arranca directo en esta pantalla (con &reloj=S, ese reloj)
  const local = +new URLSearchParams(location.search).get('local');
  const relojUrl = new URLSearchParams(location.search).get('reloj');
  if (relojUrl != null) { const r = document.querySelector(`input[name="relojN"][value="${+relojUrl}"]`); if (r) r.checked = true; }
  if (local) {
    try { history.replaceState(null, '', location.pathname); } catch {}
    jugarOffline(Math.min(info.max, Math.max(info.min, local)));
  }

  // Link de invitación (?sala=ABCD): si ya sabemos tu nombre entrás directo; si no, te lo pedimos.
  const sala = (new URLSearchParams(location.search).get('sala') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  if (sala) {
    $('codigo').value = sala;
    $('invCod').textContent = sala;
    $('nombreInv').value = nombreGuardado();
    $('secInvitado').hidden = false;
    if (nombreGuardado()) {
      $('bEntrarInv').disabled = true; $('bEntrarInv').textContent = 'Entrando…';
      unirme(sala, nombreGuardado()).then(ok => {
        if (!ok) { $('bEntrarInv').disabled = false; $('bEntrarInv').textContent = '¡Entrar!'; }
      });
    } else $('nombreInv').focus();
  }
}
