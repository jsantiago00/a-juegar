// =====================================================================
//  MOTOR COMPARTIDO DE SALAS
//  Se encarga de todo lo que no es el juego en sí: menú, modo local,
//  salas online con código, turnos, invitar, revancha.
//
//  Cada juego le pasa dos módulos:
//   - reglas: info, nuevoJuego(n), normalizar(estado), aplicar(estado, jugada, nombre),
//             detalle(estado, i) [opcional]
//   - juego:  iniciar(ctx), dibujar(ctx) -> texto de ayuda, reiniciar() [opcional]
//             menu(el) y opciones() [opcionales]: controles extra en el menú (ej. elegir mazo);
//             lo que devuelva opciones() llega como nuevoJuego(n, opciones). Guardalo en
//             estado.opciones para que la revancha lo reuse.
//   info.soloOnline: true oculta el modo local (juegos con información secreta)
//
//  Convenciones del estado: { n, turno, ganador, ultima, ...lo que quieras }
//   ganador: -1 en juego, 0..n-1 ganó ese jugador, -2 empate
// =====================================================================
import { FIREBASE_CONFIG } from './firebase.js';

const FB_VER = '10.12.2';
export const COLORES = ['#e8505b', '#3fa7e0', '#f4c430', '#5cc480'];
export const NOMBRES = ['Rojo', 'Azul', 'Amarillo', 'Verde'];
export const EN_JUEGO = -1, EMPATE = -2;

// Firebase borra arrays vacíos y a veces devuelve objetos: usá esto en normalizar()
export const lista = x => (x ? Object.values(x) : []);
export const esc = s => String(s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
const clone = o => JSON.parse(JSON.stringify(o));

// ---------- Firebase (se carga solo si jugás online) ----------
let fb = null;
export async function conectar() { return initFb(); }
async function initFb() {
  if (fb) return fb;
  if (!FIREBASE_CONFIG) throw new Error('Falta la config de Firebase en shared/firebase.js');
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
  const [appM, dbM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-database.js')]);
  const app = appM.initializeApp(FIREBASE_CONFIG);
  fb = {db: dbM.getDatabase(app), ref: dbM.ref, get: dbM.get, set: dbM.set,
        onValue: dbM.onValue, runTransaction: dbM.runTransaction};
  return fb;
}

const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const leer = k => { try { return localStorage.getItem(k); } catch { return null; } };
const miId = (() => {
  let v = leer('minijuegos-id');
  if (!v) { v = Math.random().toString(36).slice(2, 10); guardar('minijuegos-id', v); }
  return v;
})();

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

// =====================================================================
export function montar({ reglas, juego }) {
  const {info} = reglas;
  document.title = info.nombre;
  const opciones = Array.from({length: info.max - info.min + 1}, (_, k) => info.min + k);
  const selector = id => opciones.length > 1
    ? `<label for="${id}">Jugadores</label><select id="${id}">${opciones.map(n => `<option${n === info.max ? ' selected' : ''}>${n}</option>`).join('')}</select>`
    : `<label>${info.min} jugadores</label>`;

  document.getElementById('app').innerHTML = `
  <div id="menu">
    <a href="../">Volver a los juegos</a>
    <h1>${esc(info.nombre)}</h1>
    <p class="sub">${esc(info.desc)}</p>
    <section id="secLocal"${info.soloOnline ? ' hidden' : ''}>
      <h2>Jugar en este dispositivo</h2>
      <div class="row">${selector('locN')}<button class="main" id="bLocal">Empezar partida</button></div>
    </section>
    <section>
      <h2>Jugar online</h2>
      <div class="row"><input id="nombre" placeholder="Tu nombre" maxlength="14" autocomplete="off"></div>
      <div id="menuExtra"></div>
      <div class="row">${selector('onN')}<button class="main" id="bCrear">Crear sala</button></div>
      <div class="row">
        <input id="codigo" class="code" placeholder="CÓDIGO" maxlength="4" autocomplete="off">
        <button id="bUnirme">Unirme</button>
      </div>
      <p class="note" id="fbNote" hidden>Para jugar online falta pegar la config en <code>shared/firebase.js</code>.</p>
    </section>
    <section>
      <details><summary>Reglas</summary><ul>${info.reglas.map(r => `<li>${esc(r)}</li>`).join('')}</ul></details>
    </section>
  </div>
  <div id="play" hidden>
    <div class="top"><div id="status"></div><button id="bSalir">Salir</button></div>
    <div id="roomBar" hidden>Sala <b id="salaCod"></b><button id="bInvitar">Invitar</button></div>
    <div id="hint"></div>
    <div id="players"></div>
    <div id="tablero"></div>
    <div id="controles"></div>
    <div class="controles"><button class="main" id="bRevancha" hidden>Revancha</button></div>
  </div>`;

  const $ = id => document.getElementById(id);
  const st = {pantalla: 'menu', online: false, estado: null, cod: '', asiento: -1, sala: null, cortar: null};
  const ruta = () => `juegos/${info.id}/salas/${st.cod}`;
  const cantidad = id => (opciones.length > 1 ? +$(id).value : info.min);

  const asientoDe = i => (st.sala && st.sala.seats ? st.sala.seats[i] || null : null);
  const nombre = i => { if (st.online) { const s = asientoDe(i); if (s && s.name) return s.name; } return NOMBRES[i]; };
  const sentados = () => { let k = 0; if (st.sala) for (let i = 0; i < st.sala.n; i++) if (asientoDe(i)) k++; return k; };
  const listos = () => !st.online || (!!st.sala && sentados() === st.sala.n);
  const puedoJugar = () => {
    const e = st.estado;
    return !!e && e.ganador === EN_JUEGO && listos() && (!st.online || st.asiento === e.turno);
  };

  async function jugar(jugada) {
    if (!puedoJugar()) return false;
    if (!st.online) {
      const nx = reglas.aplicar(clone(st.estado), jugada, nombre);
      if (!nx) { aviso('Esa jugada no vale'); return false; }
      st.estado = nx; render(); return true;
    }
    try {
      const res = await fb.runTransaction(fb.ref(fb.db, ruta() + '/game'), cur => {
        if (cur === null) return cur;                         // Firebase reintenta con el dato real
        reglas.normalizar(cur);
        if (cur.turno !== st.asiento || cur.ganador !== EN_JUEGO) return;  // aborta
        return reglas.aplicar(cur, jugada, nombre) || undefined;
      });
      if (!res.committed) { aviso('Esa jugada no vale'); return false; }
      return true;
    } catch (e) { aviso('Error de conexión: ' + e.message); return false; }
  }

  // Lo que recibe el juego para dibujar y jugar
  const ctx = {
    get estado() { return st.estado; },
    get online() { return st.online; },
    get miAsiento() { return st.asiento; },
    get listos() { return listos(); },
    puedoJugar, jugar, nombre, aviso,
    color: i => COLORES[i],
    tablero: $('tablero'),
    controles: $('controles'),
    refrescar: () => render(),
  };

  function render() {
    $('menu').hidden = st.pantalla !== 'menu';
    $('play').hidden = st.pantalla !== 'play';
    $('fbNote').hidden = !!FIREBASE_CONFIG;
    if (st.pantalla !== 'play') return;
    $('roomBar').hidden = !st.online;
    $('salaCod').textContent = st.cod;

    const e = st.estado;
    if (!e) { $('status').textContent = 'Conectando…'; $('hint').textContent = ''; $('players').innerHTML = ''; return; }

    const dot = i => `<span class="dot" style="background:${COLORES[i]}"></span>`;
    let status;
    if (e.ganador >= 0) status = `${dot(e.ganador)}¡Ganó ${esc(nombre(e.ganador))}!`;
    else if (e.ganador === EMPATE) status = 'Empate';
    else if (!listos()) status = `Esperando jugadores (${sentados()}/${st.sala.n})`;
    else status = dot(e.turno) + (st.online && st.asiento === e.turno ? 'Tu turno' : 'Turno de ' + esc(nombre(e.turno)));
    $('status').innerHTML = status;

    $('players').innerHTML = Array.from({length: e.n}, (_, i) => {
      const extra = reglas.detalle ? reglas.detalle(e, i) : '';
      return `<div class="chip${i === e.turno && e.ganador === EN_JUEGO ? ' turn' : ''}">${dot(i)}${esc(nombre(i))}` +
             `${st.online && i === st.asiento ? ' (vos)' : ''}${extra ? `<span class="w">${esc(extra)}</span>` : ''}</div>`;
    }).join('');

    const pista = juego.dibujar(ctx);
    $('hint').textContent = (!listos() && e.ganador === EN_JUEGO) ? 'Tocá Invitar y mandales el link.' : (pista || e.ultima || '');
    $('bRevancha').hidden = e.ganador === EN_JUEGO;
  }

  function entrarSala(cod, asiento) {
    Object.assign(st, {online: true, cod, asiento, pantalla: 'play', estado: null, sala: null});
    juego.reiniciar?.();
    st.cortar = fb.onValue(fb.ref(fb.db, ruta()), snap => {
      const v = snap.val();
      if (!v) { aviso('La sala ya no existe'); return; }
      st.sala = v;
      st.estado = reglas.normalizar(v.game);
      render();
    });
    try { history.replaceState(null, '', '?sala=' + cod); } catch {}
    render();
  }
  function miNombre() {
    const n = $('nombre').value.trim() || 'Jugador';
    guardar('minijuegos-nombre', n);
    return n;
  }

  // ---------- Botones del menú ----------
  $('bLocal').onclick = () => {
    Object.assign(st, {online: false, estado: reglas.nuevoJuego(cantidad('locN'), juego.opciones?.()), pantalla: 'play'});
    juego.reiniciar?.(); render();
  };
  $('bCrear').onclick = async () => {
    const name = miNombre(), n = cantidad('onN');
    try {
      await initFb();
      let cod;
      for (let i = 0; i < 6; i++) {
        cod = codigo();
        if (!(await fb.get(fb.ref(fb.db, `juegos/${info.id}/salas/${cod}`))).exists()) break;
      }
      await fb.set(fb.ref(fb.db, `juegos/${info.id}/salas/${cod}`),
                   {n, creada: Date.now(), seats: {0: {id: miId, name}}, game: reglas.nuevoJuego(n, juego.opciones?.())});
      entrarSala(cod, 0);
    } catch (e) { aviso(e.message); }
  };
  $('bUnirme').onclick = async () => {
    const cod = $('codigo').value.trim().toUpperCase();
    if (cod.length !== 4) { aviso('El código tiene 4 letras'); return; }
    const name = miNombre();
    try {
      await initFb();
      const base = `juegos/${info.id}/salas/${cod}`;
      const snap = await fb.get(fb.ref(fb.db, base));
      if (!snap.exists()) { aviso('No existe la sala ' + cod); return; }
      const n = snap.val().n;
      let asiento = -1;
      const res = await fb.runTransaction(fb.ref(fb.db, base + '/seats'), seats => {
        if (seats === null) return seats;
        asiento = -1;
        for (let i = 0; i < n; i++) if (seats[i] && seats[i].id === miId) { asiento = i; seats[i].name = name; return seats; }
        for (let i = 0; i < n; i++) if (!seats[i]) { seats[i] = {id: miId, name}; asiento = i; return seats; }
        return; // llena
      });
      if (!res.committed || asiento < 0) { aviso('La sala está llena'); return; }
      entrarSala(cod, asiento);
    } catch (e) { aviso(e.message); }
  };

  // ---------- Botones de la partida ----------
  $('bSalir').onclick = () => {
    if (st.cortar) { st.cortar(); st.cortar = null; }
    Object.assign(st, {pantalla: 'menu', online: false, estado: null, sala: null, cod: '', asiento: -1});
    juego.reiniciar?.();
    try { history.replaceState(null, '', location.pathname); } catch {}
    render();
  };
  $('bRevancha').onclick = async () => {
    juego.reiniciar?.();
    if (!st.online) { st.estado = reglas.nuevoJuego(st.estado.n, st.estado.opciones); render(); return; }
    try { await fb.set(fb.ref(fb.db, ruta() + '/game'), reglas.nuevoJuego(st.sala.n, st.estado.opciones)); } catch (e) { aviso(e.message); }
  };
  $('bInvitar').onclick = async () => {
    const url = location.origin + location.pathname + '?sala=' + st.cod;
    try {
      if (navigator.share) await navigator.share({title: info.nombre, text: `Sumate a mi partida (sala ${st.cod})`, url});
      else { await navigator.clipboard.writeText(url); aviso('Link copiado'); }
    } catch { aviso('Código de sala: ' + st.cod); }
  };

  // ---------- Arranque ----------
  $('nombre').value = leer('minijuegos-nombre') || '';
  const sala = new URLSearchParams(location.search).get('sala');
  if (sala) $('codigo').value = sala.toUpperCase();
  juego.menu?.($('menuExtra'));
  juego.iniciar(ctx);
  render();
}
