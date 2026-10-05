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
//   info.soloOnline: true oculta el modo local (juegos con información secreta)
//
//  Convenciones del estado: { n, turno, ganador, ultima, ...lo que quieras }
//   ganador: -1 en juego, 0..n-1 ganó ese jugador, -2 empate
// =====================================================================
import { FIREBASE_CONFIG } from './firebase.js';
import { JUEGOS } from './juegos.js';
import { ICONOS } from './iconos.js';
import { sonar, confeti, botonesSonido, animar } from './efectos.js';

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
  let cod;
  for (let i = 0; i < 6; i++) {
    cod = codigo();
    if (!(await buscarSala(cod))) break;
  }
  await fb.set(fb.ref(fb.db, `juegos/${reglas.info.id}/salas/${cod}`),
               {n, creada: Date.now(), seats: {0: {id: miId, name: nombre}}, game: reglas.nuevoJuego(n, opciones)});
  return cod;
}

// Botones para elegir cuántos juegan
export function selectorJugadores(info, nombre) {
  if (info.min === info.max) return `<p class="note">${info.min} jugadores</p>`;
  const ns = Array.from({length: info.max - info.min + 1}, (_, k) => info.min + k);
  return `<div class="pills" role="radiogroup" aria-label="Cantidad de jugadores">${ns.map(n =>
    `<label><input type="radio" name="${nombre}" value="${n}"${n === info.min ? ' checked' : ''}><span>${n}</span></label>`).join('')}
    <span class="note">jugadores</span></div>`;
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
    <div class="modos">
      <section class="tarjeta" id="secLocal"${info.soloOnline ? ' hidden' : ''}>
        <h2>🏠 En este dispositivo</h2>
        <p class="note">Se van pasando la pantalla por turnos.</p>
        ${selectorJugadores(info, 'locN')}
        <button class="main grande" id="bLocal">Empezar</button>
      </section>
      <section class="tarjeta" id="secOnline">
        <h2>🌎 Online con amigos</h2>
        <div class="row"><input id="nombre" placeholder="Tu nombre" maxlength="14" autocomplete="off"></div>
        <div id="menuExtra"></div>
        ${selectorJugadores(info, 'onN')}
        <button class="main grande" id="bCrear">Crear sala</button>
        <div class="separador"><span>o si tenés un código</span></div>
        <form class="row" id="fUnirme">
          <input id="codigo" class="code" placeholder="ABCD" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false">
          <button id="bUnirme">Unirme</button>
        </form>
        <p class="note" id="fbNote" hidden>Para jugar online falta pegar la config en <code>shared/firebase.js</code>.</p>
      </section>
    </div>
    <details class="tarjeta reglas"><summary>📖 Cómo se juega</summary><ul>${info.reglas.map(r => `<li>${esc(r)}</li>`).join('')}</ul></details>
  </div>
  <div id="play" hidden>
    <div class="top"><button id="bSalir" class="chico">← Salir</button><div id="status"></div><button class="icono b-sonido"></button></div>
    <section class="tarjeta destacada espera" id="espera" hidden>
      <p>Pasales este código</p>
      <div class="cod-grande" id="espCod"></div>
      <div class="row centro"><button class="main" id="bCompartir">Compartir link</button><button id="bCopiar">Copiar código</button></div>
      <p class="note" id="espTxt"></p>
    </section>
    <div id="roomBar" hidden>Sala <b id="salaCod"></b><button class="chico" id="bInvitar">Invitar</button></div>
    <div id="players"></div>
    <div id="hint"></div>
    <div id="tablero"></div>
    <div id="controles"></div>
    <div class="controles"><button class="main" id="bRevancha" hidden>Revancha</button></div>
    <div id="fin" hidden>
      <div class="fin-caja">
        <div class="fin-emoji" id="finEmoji"></div>
        <h2 id="finTxt"></h2>
        <p id="finSub"></p>
        <div class="row centro"><button class="main grande" id="bRevancha2">Revancha</button><button id="bVerTablero">Ver tablero</button></div>
      </div>
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
  const puedoJugar = () => {
    const e = st.estado;
    return !!e && e.ganador === EN_JUEGO && listos() && (!st.online || st.asiento === e.turno);
  };

  async function jugar(jugada) {
    if (!puedoJugar()) return false;
    if (!st.online) {
      const nx = reglas.aplicar(clone(st.estado), jugada, nombre);
      if (!nx) { aviso('Esa jugada no vale'); sonar('error'); return false; }
      const antes = st.estado;
      st.estado = nx; efectos(antes, nx); render(); return true;
    }
    try {
      const res = await fb.runTransaction(fb.ref(fb.db, ruta() + '/game'), cur => {
        if (cur === null) return cur;                         // Firebase reintenta con el dato real
        reglas.normalizar(cur);
        if (cur.turno !== st.asiento || cur.ganador !== EN_JUEGO) return;  // aborta
        return reglas.aplicar(cur, jugada, nombre) || undefined;
      });
      if (!res.committed) { aviso('Esa jugada no vale'); sonar('error'); return false; }
      return true;
    } catch (e) { aviso('Error de conexión: ' + e.message); return false; }
  }

  // Lo que recibe el juego para dibujar y jugar
  const ctx = {
    get estado() { return st.estado; },
    get online() { return st.online; },
    get miAsiento() { return st.asiento; },
    get listos() { return listos(); },
    puedoJugar, jugar, nombre, aviso, sonar, animar,
    color: i => COLORES[i],
    tablero: $('tablero'),
    controles: $('controles'),
    refrescar: () => render(),
  };

  // Sonidos y festejo cuando cambia el estado (jugada propia, del rival o revancha)
  function efectos(antes, e, salaAntes) {
    if (st.online && salaAntes && contar(st.sala) > contar(salaAntes)) {
      sonar('entrar');
      aviso(listos() ? '¡Están todos! A jugar' : 'Se sumó alguien');
    }
    if (!antes || !e || JSON.stringify(antes) === JSON.stringify(e)) return;
    if (antes.ganador !== EN_JUEGO && e.ganador === EN_JUEGO) { sonar('entrar'); return; }   // revancha
    const s = juego.sonido ? juego.sonido(antes, e, ctx) : 'colocar';
    if (s) sonar(s, antes.turno);
    if (antes.ganador === EN_JUEGO && e.ganador !== EN_JUEGO) {
      setTimeout(() => {
        if (e.ganador === EMPATE) sonar('empate');
        else if (!st.online || e.ganador === st.asiento) { sonar('ganar'); confeti(COLORES); }
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
    if (st.pantalla !== 'play') return;
    $('salaCod').textContent = st.cod;

    const e = st.estado;
    const esperando = st.online && !!st.sala && !listos() && (!e || e.ganador === EN_JUEGO);
    $('espera').hidden = !esperando;
    $('roomBar').hidden = !st.online || esperando;
    if (esperando) {
      if ($('espCod').dataset.cod !== st.cod) {
        $('espCod').dataset.cod = st.cod;
        $('espCod').innerHTML = [...st.cod].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');
      }
      $('espTxt').textContent = `Esperando jugadores (${sentados()}/${st.sala.n})…`;
    }
    if (!e) { $('status').textContent = 'Conectando…'; $('hint').textContent = ''; $('players').innerHTML = ''; return; }

    const dot = i => `<span class="dot" style="background:${COLORES[i]}"></span>`;
    const miTurno = st.online && e.ganador === EN_JUEGO && listos() && st.asiento === e.turno;
    let status;
    if (e.ganador >= 0) status = `${dot(e.ganador)}¡Ganó ${esc(nombre(e.ganador))}!`;
    else if (e.ganador === EMPATE) status = 'Empate';
    else if (!listos()) status = 'Esperando…';
    else status = dot(e.turno) + (miTurno ? '¡Tu turno!' : 'Turno de ' + esc(nombre(e.turno)));
    $('status').innerHTML = status;
    $('status').classList.toggle('mi-turno', miTurno);
    $('status').style.setProperty('--c', e.ganador === EN_JUEGO && listos() ? COLORES[e.turno] : 'transparent');

    $('players').innerHTML = Array.from({length: e.n}, (_, i) => {
      const extra = reglas.detalle ? reglas.detalle(e, i) : '';
      const vacio = st.online && !asientoDe(i);
      return `<div class="chip${i === e.turno && e.ganador === EN_JUEGO ? ' turn' : ''}${vacio ? ' vacio' : ''}" style="--c:${COLORES[i]}">${dot(i)}` +
             `${vacio ? 'Libre' : esc(nombre(i))}${st.online && i === st.asiento ? ' (vos)' : ''}` +
             `${extra ? `<span class="w">${esc(extra)}</span>` : ''}</div>`;
    }).join('');

    const pista = juego.dibujar(ctx);
    $('hint').textContent = esperando ? '' : (pista || e.ultima || '');
    $('bRevancha').hidden = e.ganador === EN_JUEGO;

    const termino = e.ganador !== EN_JUEGO;
    if (!termino) st.finVisto = false;
    const mostrarFin = termino && !st.finVisto;
    if (mostrarFin && $('fin').hidden) {
      let emoji, txt;
      if (e.ganador === EMPATE) { emoji = '🤝'; txt = '¡Empate!'; }
      else if (!st.online) { emoji = '🏆'; txt = `¡Ganó ${esc(nombre(e.ganador))}!`; }
      else if (e.ganador === st.asiento) { emoji = '🏆'; txt = '¡Ganaste!'; }
      else { emoji = '😵'; txt = `Ganó ${esc(nombre(e.ganador))}`; }
      $('finEmoji').textContent = emoji;
      $('finTxt').innerHTML = (e.ganador >= 0 ? dot(e.ganador) : '') + txt;
      $('finSub').textContent = e.ultima || '';
    }
    $('fin').hidden = !mostrarFin;
  }

  function entrarSala(cod, asiento) {
    Object.assign(st, {online: true, cod, asiento, pantalla: 'play', estado: null, sala: null, finVisto: false});
    juego.reiniciar?.();
    sonar('entrar');
    $('secInvitado').hidden = true;
    st.cortar = fb.onValue(fb.ref(fb.db, ruta()), snap => {
      const v = snap.val();
      if (!v) { aviso('La sala ya no existe'); return; }
      const antes = st.estado, salaAntes = st.sala;
      st.sala = v;
      st.estado = reglas.normalizar(v.game);
      efectos(antes, st.estado, salaAntes);
      render();
    });
    try { history.replaceState(null, '', '?sala=' + cod); } catch {}
    render();
  }
  function miNombre() {
    const n = $('nombre').value.trim() || 'Jugador';
    guardarNombre(n);
    return n;
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
  $('bLocal').onclick = () => {
    Object.assign(st, {online: false, estado: reglas.nuevoJuego(jugadoresElegidos(info, 'locN'), juego.opciones?.()), pantalla: 'play', finVisto: false});
    juego.reiniciar?.(); render();
  };
  $('bCrear').onclick = async () => {
    const name = miNombre();
    $('bCrear').disabled = true;
    try {
      const cod = await crearSala({reglas, n: jugadoresElegidos(info, 'onN'), opciones: juego.opciones?.(), nombre: name});
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
  $('bSalir').onclick = () => {
    sonar('tap');
    if (st.cortar) { st.cortar(); st.cortar = null; }
    Object.assign(st, {pantalla: 'menu', online: false, estado: null, sala: null, cod: '', asiento: -1});
    juego.reiniciar?.();
    try { history.replaceState(null, '', location.pathname); } catch {}
    render();
  };
  async function revancha() {
    sonar('tap');
    juego.reiniciar?.();
    if (!st.online) { const antes = st.estado; st.estado = reglas.nuevoJuego(st.estado.n, st.estado.opciones); efectos(antes, st.estado); render(); return; }
    try { await fb.set(fb.ref(fb.db, ruta() + '/game'), reglas.nuevoJuego(st.sala.n, st.estado.opciones)); } catch (e) { aviso(e.message); }
  }
  $('bRevancha').onclick = $('bRevancha2').onclick = revancha;
  $('bVerTablero').onclick = () => { sonar('tap'); st.finVisto = true; render(); };
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
  botonesSonido();
  $('nombre').value = nombreGuardado();
  juego.menu?.($('menuExtra'));
  juego.iniciar(ctx);
  render();

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
