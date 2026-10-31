// Críptico: cada uno escribe una palabra secreta y un críptico (una adivinanza) para descifrarla.
// Después cada uno va descifrando los de los demás a su ritmo (sin esperar a nadie): 3 intentos por palabra.
import { lista, EMPATE } from '../shared/salas.js';

export const INTENTOS = 3;
export const MIN_LARGO = 3, MAX_LARGO = 20, MAX_PISTA = 140;
export const PUNTOS = [10, 6, 3];            // según en qué intento la sacás
export const BONO_PRIMERO = 2, PUNTOS_AUTOR = 3, PUNTOS_AUTOR_TODOS = 1;

export const info = {
  id: 'criptico',
  nombre: 'Críptico',
  desc: 'Cada uno escribe una palabra y su críptico: los demás tienen 3 intentos para adivinarla.',
  min: 2, max: 6,
  soloOnline: true,          // la palabra es secreta: cada uno en su pantalla
  sinTurnos: true,           // todos juegan a la vez
  reglas: [
    `Cada uno escribe una palabra secreta (de ${MIN_LARGO} a ${MAX_LARGO} letras; también vale algo como "dulce de leche") y un críptico para descifrarla: una adivinanza, un juego de palabras…`,
    'Apenas mandás el tuyo ya podés empezar a descifrar los de los demás, cada uno a su ritmo: no hace falta esperar a nadie.',
    `Tenés ${INTENTOS} intentos por palabra. Además del críptico, solo sabés cuántas letras tiene (y de cuántas palabras es).`,
    `Si la sacás en el primer intento sumás ${PUNTOS[0]}, en el segundo ${PUNTOS[1]} y en el tercero ${PUNTOS[2]} (y ${BONO_PRIMERO} más si sos el primero en sacarla).`,
    `El que escribió el críptico suma ${PUNTOS_AUTOR} por cada uno que lo descifra, pero si lo descifran todos, solo ${PUNTOS_AUTOR_TODOS} por cada uno: la gracia es que cueste, pero que se pueda.`,
    'Cuando todos terminaron con todas las palabras, gana quien sumó más puntos. Las tildes, los espacios y las mayúsculas no importan.',
  ],
};

// Mayúsculas, sin tildes (salvo la Ñ) y solo letras
export const limpiar = s => String(s || '').toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ').replace(/[^A-ZÑ]/g, '');

// Sin fases: cada uno escribe lo suyo y descifra los de los demás cuando quiere.
// pal[a], pista[a]: lo que escribió a (pal, limpia, para comparar; vista, como la escribió).
// intentos[p][a]: lo que arriesgó p en la palabra de a.
// fin[p][a]: 0 jugando, 1 la sacó, 2 se quedó sin intentos. pr[p][a]: lo que sumó p con la palabra de a
// (si p === a, lo que sumó como autor). cerrada[a]: ya la terminaron todos (y el autor cobró).
const matriz = (n, f) => Array.from({length: n}, () => Array.from({length: n}, f));
export function nuevoJuego(n) {
  return {n, opciones: {}, pid: Math.random().toString(36).slice(2, 8),
          pal: Array(n).fill(''), vista: Array(n).fill(''), pista: Array(n).fill(''),
          intentos: matriz(n, () => []), fin: matriz(n, () => 0), pr: matriz(n, () => 0), cerrada: Array(n).fill(0),
          puntos: Array(n).fill(0), turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.opciones = e.opciones || {};
  // Por posición (no con lista()): si Firebase guarda solo algunos, no se tienen que correr
  const de = (x, f) => Array.from({length: e.n}, (_, i) => f((x || {})[i]));
  e.pal = de(e.pal, x => limpiar(x));
  e.pista = de(e.pista, x => String(x || ''));
  e.vista = e.pal.map((w, i) => String((e.vista || {})[i] || w));
  e.intentos = de(e.intentos, fila => de(fila, x => lista(x).map(String)));
  for (const k of ['fin', 'pr']) e[k] = de(e[k], fila => de(fila, x => +x || 0));
  for (const k of ['cerrada', 'puntos']) e[k] = de(e[k], x => +x || 0);
  e.pid = String(e.pid || '');
  e.ultima = e.ultima || '';
  return e;
}
const todos = e => Array.from({length: e.n}, (_, i) => i);
export const descifran = (e, a) => todos(e).filter(p => p !== a);
// Las palabras de los demás en el orden en que te tocan (empezando por el de al lado)
export const ordenDe = (e, yo) => todos(e).map(k => (yo + 1 + k) % e.n).filter(a => a !== yo);
// La próxima que tenés para descifrar (-1 si no hay ninguna lista todavía)
export const siguiente = (e, yo) => ordenDe(e, yo).find(a => e.pal[a] && !e.fin[yo][a]) ?? -1;
export const hechas = (e, p) => ordenDe(e, p).filter(a => e.fin[p][a]).length;
export const terminoTodo = (e, p) => !!e.pal[p] && hechas(e, p) === e.n - 1;

export function detalle(e, i) {
  const pts = `${e.puntos[i]} pts`;
  if (e.ganador !== -1) return pts;
  if (!e.pal[i]) return `${pts} · escribiendo…`;
  return `${pts} · 🧩 ${hechas(e, i)}/${e.n - 1}${terminoTodo(e, i) ? ' ✔' : ''}`;
}

// No hay jugadas por turno: todo pasa por libre()
export const aplicar = () => null;

// Cuando todos terminaron la palabra de a, el autor cobra lo suyo
function cerrar(e, a) {
  const los = descifran(e, a);
  if (e.cerrada[a] || los.some(p => !e.fin[p][a])) return;
  const ok = los.filter(p => e.fin[p][a] === 1).length;
  e.cerrada[a] = 1;
  e.pr[a][a] = ok * (ok === los.length ? PUNTOS_AUTOR_TODOS : PUNTOS_AUTOR);
  e.puntos[a] += e.pr[a][a];
}
function terminar(e, nombre) {
  if (!e.cerrada.every(Boolean)) return;
  const max = Math.max(...e.puntos), top = e.puntos.map((x, p) => (x === max ? p : -1)).filter(p => p >= 0);
  e.ganador = top.length === 1 ? top[0] : EMPATE;
  e.ultima = `Puntos: ${e.puntos.map((x, p) => `${nombre(p)} ${x}`).join(' · ')}`;
}

// {tipo:'escribir', palabra, pista}   {tipo:'arriesgar', a, texto}
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  switch (j.tipo) {
    case 'escribir': {
      const w = limpiar(j.palabra), pista = String(j.pista || '').trim().slice(0, MAX_PISTA);
      if (e.pal[yo] || w.length < MIN_LARGO || w.length > MAX_LARGO || pista.length < 3) return null;
      if (limpiar(pista).includes(w)) return null;                // el críptico no puede tener la palabra
      e.pal[yo] = w; e.pista[yo] = pista;
      e.vista[yo] = String(j.palabra).trim().replace(/\s+/g, ' ').toUpperCase().slice(0, 30);
      e.ultima = `${nombre(yo)} ya escribió su críptico`;
      return e;
    }
    case 'arriesgar': {
      const a = +j.a, w = limpiar(j.texto);
      if (!(a >= 0 && a < e.n) || a === yo || !e.pal[yo] || !e.pal[a] || e.fin[yo][a]) return null;
      const mios = e.intentos[yo][a];
      if (!w || mios.map(limpiar).includes(w)) return null;
      mios.push(String(j.texto).trim().slice(0, MAX_LARGO + 10));
      if (w === e.pal[a]) {
        const primero = !descifran(e, a).some(p => e.fin[p][a] === 1);
        e.fin[yo][a] = 1;
        e.pr[yo][a] = PUNTOS[mios.length - 1] + (primero ? BONO_PRIMERO : 0);
        e.puntos[yo] += e.pr[yo][a];
        e.ultima = `¡${nombre(yo)} sacó la de ${nombre(a)}!`;
      } else if (mios.length >= INTENTOS) {
        e.fin[yo][a] = 2;
        e.ultima = `${nombre(yo)} no pudo con la de ${nombre(a)}`;
      }
      cerrar(e, a);
      terminar(e, nombre);
      return e;
    }
  }
  return null;
}
