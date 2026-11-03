// =====================================================================
//  CUENTAS (nick + contraseña) Y VICTORIAS SINCRONIZADAS
//  Usa Firebase Authentication con "Correo/contraseña": el nick se convierte en un correo
//  interno (nick@<authDomain>), así la contraseña nunca queda en la base de datos.
//  Hay que activarlo una vez en la consola: Authentication → Sign-in method → Correo/contraseña.
//
//  Datos: usuarios/<uid> = { nick, creada, g: ganadas, j: jugadas, ult: última partida anotada,
//                           juegos: { <juego>: { g, j } } }
//  (las reglas dejan leer a todos y escribir solo a uno mismo; ver database.rules.json)
//  El SDK de Auth se carga solo si hace falta (entrar, crear cuenta o si ya tenías la sesión abierta).
// =====================================================================
import { FIREBASE_CONFIG } from './firebase.js';

export const FB_VER = '10.12.2';
const MARCA = 'minijuegos-cuenta';     // nick de la sesión abierta en este dispositivo (para no cargar Auth si no hay)
const leer = k => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch {} };

export const cuentaGuardada = () => leer(MARCA) || '';
export const nickValido = n => /^[a-zA-Z0-9_]{3,14}$/.test(n);
const correo = nick => `${nick.toLowerCase()}@${FIREBASE_CONFIG.authDomain}`;

let cargando = null;
function cargar() {
  if (cargando) return cargando;
  cargando = (async () => {
    if (!FIREBASE_CONFIG) throw new Error('Falta la config de Firebase en shared/firebase.js');
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    const [appM, authM, dbM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-database.js')]);
    const app = appM.getApps().length ? appM.getApp() : appM.initializeApp(FIREBASE_CONFIG);
    const auth = authM.getAuth(app);
    await auth.authStateReady();       // espera a recuperar la sesión guardada
    return {auth, authM, db: dbM.getDatabase(app), dbM};
  })();
  cargando.catch(() => { cargando = null; });
  return cargando;
}

const ERRORES = {
  'auth/email-already-in-use': 'Ese nick ya existe. Si es tuyo, tocá Entrar.',
  'auth/invalid-credential': 'Nick o contraseña incorrectos',
  'auth/wrong-password': 'Nick o contraseña incorrectos',
  'auth/user-not-found': 'No existe ese nick. Podés crear la cuenta.',
  'auth/invalid-email': 'El nick solo puede tener letras, números y _',
  'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres',
  'auth/too-many-requests': 'Demasiados intentos: esperá un ratito',
  'auth/network-request-failed': 'Sin conexión',
  'auth/operation-not-allowed': 'Falta activar Correo/contraseña en Firebase Authentication',
  'auth/configuration-not-found': 'Falta activar Authentication en Firebase (Correo/contraseña)',
};
const traducir = e => new Error(ERRORES[e && e.code] || (e && e.message) || 'Algo salió mal');

function chequear(nick, pass) {
  if (!nickValido(nick)) throw new Error('El nick va de 3 a 14 letras, números o _');
  if (!pass || pass.length < 6) throw new Error('La contraseña tiene que tener al menos 6 caracteres');
}

// Devuelve el nick con el que quedaste adentro
export async function crearCuenta(nick, pass) {
  chequear(nick, pass);
  const {auth, authM, db, dbM} = await cargar();
  let cred;
  try { cred = await authM.createUserWithEmailAndPassword(auth, correo(nick), pass); } catch (e) { throw traducir(e); }
  await dbM.set(dbM.ref(db, 'usuarios/' + cred.user.uid), {nick, creada: Date.now(), g: 0, j: 0});
  guardar(MARCA, nick);
  return nick;
}
export async function entrar(nick, pass) {
  chequear(nick, pass);
  const {auth, authM, db, dbM} = await cargar();
  let cred;
  try { cred = await authM.signInWithEmailAndPassword(auth, correo(nick), pass); } catch (e) { throw traducir(e); }
  const v = (await dbM.get(dbM.ref(db, `usuarios/${cred.user.uid}/nick`))).val();
  const n = v || nick;
  if (!v) await dbM.update(dbM.ref(db, 'usuarios/' + cred.user.uid), {nick: n, creada: Date.now()});
  guardar(MARCA, n);
  return n;
}
export async function salirCuenta() {
  guardar(MARCA, '');
  try { const {auth, authM} = await cargar(); await authM.signOut(auth); } catch {}
}

// Tus datos (null si no hay sesión)
export async function misDatos() {
  if (!cuentaGuardada()) return null;
  const {auth, db, dbM} = await cargar();
  if (!auth.currentUser) { guardar(MARCA, ''); return null; }   // la sesión venció
  const v = (await dbM.get(dbM.ref(db, 'usuarios/' + auth.currentUser.uid))).val() || {};
  return {nick: v.nick || cuentaGuardada(), g: +v.g || 0, j: +v.j || 0, juegos: v.juegos || {}};
}

// Anota una partida terminada (una sola vez por partida, aunque se llame varias veces o desde varios dispositivos).
// resultado: 'gane' | 'perdi' | 'nada' (empate o juegos sin ganador: suma jugada, no victoria)
export async function anotarPartida(juegoId, pid, resultado) {
  if (!cuentaGuardada() || !pid) return;
  try {
    const {auth, db, dbM} = await cargar();
    if (!auth.currentUser) return;
    await dbM.runTransaction(dbM.ref(db, 'usuarios/' + auth.currentUser.uid), u => {
      u = u || {nick: cuentaGuardada(), creada: Date.now()};
      if (u.ult === pid) return;                     // ya estaba anotada
      const gane = resultado === 'gane' ? 1 : 0;
      const juegos = u.juegos || {}, x = juegos[juegoId] || {};
      juegos[juegoId] = {g: (+x.g || 0) + gane, j: (+x.j || 0) + 1};
      return {...u, juegos, ult: pid, g: (+u.g || 0) + gane, j: (+u.j || 0) + 1};
    });
  } catch {}
}
