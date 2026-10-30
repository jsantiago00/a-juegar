// Críptico: cada uno escribe una palabra secreta y un críptico (una adivinanza) para descifrarla.
// Después, de a una, los demás tratan de adivinar la palabra entera a la vez: cada uno tiene 3 intentos.
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
  sinTurnos: true,           // todos adivinan a la vez
  reglas: [
    `Cada uno escribe una palabra secreta (de ${MIN_LARGO} a ${MAX_LARGO} letras; también vale algo como "dulce de leche") y un críptico para descifrarla: una adivinanza, un juego de palabras…`,
    'Después se juegan de a una: sale el críptico y todos los demás tratan de adivinar la palabra entera, a la vez.',
    `Cada uno tiene ${INTENTOS} intentos. No hay más pistas que el críptico.`,
    `Si la sacás en el primer intento sumás ${PUNTOS[0]}, en el segundo ${PUNTOS[1]} y en el tercero ${PUNTOS[2]} (y ${BONO_PRIMERO} más si sos el primero en sacarla).`,
    `El que escribió el críptico suma ${PUNTOS_AUTOR} por cada uno que lo descifra, pero si lo descifran todos, solo ${PUNTOS_AUTOR_TODOS} por cada uno: la gracia es que cueste, pero que se pueda.`,
    'Cuando se jugaron todas las palabras, gana quien sumó más puntos. Las tildes, los espacios y las mayúsculas no importan.',
  ],
};

// Mayúsculas, sin tildes (salvo la Ñ) y solo letras
export const limpiar = s => String(s || '').toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ').replace(/[^A-ZÑ]/g, '');

// fase: 'escribir' (todos a la vez) -> 'adivinar' (la palabra de orden[ronda]) -> 'ver' (resultado) -> 'adivinar' de la siguiente…
// pal[p], pista[p]: lo que escribió p (pal, limpia, para comparar; vista, como la escribió).
// intentos[p]: lo que arriesgó p en la palabra de ahora.
// fin[p]: 0 jugando, 1 la sacó, 2 se quedó sin intentos, 3 es el autor. t[p]: cuándo la sacó. pr: puntos de la ronda.
const vacios = n => ({intentos: Array.from({length: n}, () => []), fin: Array(n).fill(0), t: Array(n).fill(0), pr: Array(n).fill(0)});
export function nuevoJuego(n, op, quien = 0) {
  return {n, opciones: {}, fase: 'escribir', pal: Array(n).fill(''), vista: Array(n).fill(''), pista: Array(n).fill(''),
          orden: Array.from({length: n}, (_, k) => (quien + k) % n), ronda: 0, ...vacios(n),
          puntos: Array(n).fill(0), turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.opciones = e.opciones || {};
  // Por posición (no con lista()): si Firebase guarda solo algunos, no se tienen que correr
  const de = (x, f) => Array.from({length: e.n}, (_, i) => f((x || {})[i]));
  e.pal = de(e.pal, x => limpiar(x));
  e.pista = de(e.pista, x => String(x || ''));
  e.vista = e.pal.map((w, i) => String((e.vista || {})[i] || w));
  e.intentos = de(e.intentos, x => lista(x).map(String));
  for (const k of ['fin', 't', 'pr', 'puntos']) e[k] = de(e[k], x => +x || 0);
  e.orden = lista(e.orden).map(Number);
  e.ronda = +e.ronda || 0;
  e.ultima = e.ultima || '';
  return e;
}
export const autor = e => e.orden[e.ronda];
export const descifran = e => Array.from({length: e.n}, (_, i) => i).filter(i => i !== autor(e));
export function detalle(e, i) {
  const pts = `${e.puntos[i]} pts`;
  if (e.fase === 'escribir') return `${pts} · ${e.pal[i] ? 'lista ✔' : 'escribiendo…'}`;
  if (e.ganador !== -1) return pts;
  if (e.fin[i] === 3) return `${pts} · ✍️ es la suya`;
  return `${pts} · ${e.fin[i] === 1 ? '🎉' : e.fin[i] === 2 ? '😵' : '❌'.repeat(e.intentos[i].length) || '🤔'}`;
}

// No hay jugadas por turno: todo pasa por libre()
export const aplicar = () => null;

function empezarRonda(e) {
  Object.assign(e, vacios(e.n));
  e.fin[autor(e)] = 3;
  e.fase = 'adivinar';
}
// Cuando todos terminaron la palabra de ahora, se reparten los puntos
function cerrarRonda(e, nombre) {
  const a = autor(e), los = descifran(e), ok = los.filter(p => e.fin[p] === 1);
  if (los.some(p => !e.fin[p])) return;
  const primero = ok.length ? ok.reduce((x, y) => (e.t[y] < e.t[x] ? y : x)) : -1;
  for (const p of ok) e.pr[p] = PUNTOS[e.intentos[p].length - 1] + (p === primero ? BONO_PRIMERO : 0);
  e.pr[a] = ok.length * (ok.length === los.length ? PUNTOS_AUTOR_TODOS : PUNTOS_AUTOR);
  e.pr.forEach((x, p) => { e.puntos[p] += x; });
  e.fase = 'ver';
  e.ultima = `Era ${e.vista[a]}: ${ok.length ? `la ${ok.length === 1 ? 'sacó' : 'sacaron'} ${ok.map(nombre).join(', ')}` : 'nadie la sacó'}`;
}

// {tipo:'escribir', palabra, pista}   {tipo:'arriesgar', texto, t}   {tipo:'seguir', ronda}
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  switch (j.tipo) {
    case 'escribir': {
      const w = limpiar(j.palabra), pista = String(j.pista || '').trim().slice(0, MAX_PISTA);
      if (e.fase !== 'escribir' || e.pal[yo] || w.length < MIN_LARGO || w.length > MAX_LARGO || pista.length < 3) return null;
      if (limpiar(pista).includes(w)) return null;                // el críptico no puede tener la palabra
      e.pal[yo] = w; e.pista[yo] = pista;
      e.vista[yo] = String(j.palabra).trim().replace(/\s+/g, ' ').toUpperCase().slice(0, 30);
      if (e.pal.every(Boolean)) { empezarRonda(e); e.ultima = '¡A descifrar!'; }
      return e;
    }
    case 'arriesgar': {
      const w = limpiar(j.texto), obj = e.pal[autor(e)];
      if (e.fase !== 'adivinar' || e.fin[yo] || !w || e.intentos[yo].map(limpiar).includes(w)) return null;
      e.intentos[yo].push(String(j.texto).trim().slice(0, MAX_LARGO + 10));
      if (w === obj) { e.fin[yo] = 1; e.t[yo] = +j.t || Date.now(); e.ultima = `¡${nombre(yo)} la sacó!`; }
      else if (e.intentos[yo].length >= INTENTOS) { e.fin[yo] = 2; e.ultima = `${nombre(yo)} se quedó sin intentos`; }
      cerrarRonda(e, nombre);
      return e;
    }
    case 'seguir': {
      if (e.fase !== 'ver' || +j.ronda !== e.ronda) return null;   // si dos tocan a la vez, avanza una sola
      if (e.ronda + 1 >= e.orden.length) {
        const max = Math.max(...e.puntos), top = e.puntos.map((x, p) => (x === max ? p : -1)).filter(p => p >= 0);
        e.ganador = top.length === 1 ? top[0] : EMPATE;
        e.ultima = `Puntos: ${e.puntos.map((x, p) => `${nombre(p)} ${x}`).join(' · ')}`;
        return e;
      }
      e.ronda++;
      empezarRonda(e);
      e.ultima = `Palabra ${e.ronda + 1} de ${e.orden.length}: la de ${nombre(autor(e))}`;
      return e;
    }
  }
  return null;
}
