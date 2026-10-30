// Críptico: un ahorcado con adivinanzas, de a varios. Cada uno escribe una palabra secreta y una pista
// (una adivinanza o un críptico). Después, una por una, los demás la descifran a la vez, cada uno con su ahorcado.
import { lista, EMPATE } from '../shared/salas.js';

export const MAX_ERRORES = 6, ABC = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
export const MIN_LARGO = 3, MAX_LARGO = 14, MAX_PISTA = 140;
export const ERROR_ARRIESGAR = 2;           // arriesgar la palabra entera y errarle cuesta 2 errores
export const PUNTOS_AUTOR = 3, PUNTOS_AUTOR_TODOS = 1, BONO_PRIMERO = 2;

export const info = {
  id: 'criptico',
  nombre: 'Críptico',
  desc: 'Un ahorcado con adivinanzas: cada uno escribe una palabra y su pista, y los demás la descifran.',
  min: 2, max: 6,
  soloOnline: true,          // la palabra es secreta: cada uno en su pantalla
  sinTurnos: true,           // todos descifran a la vez
  reglas: [
    `Cada uno escribe una palabra secreta (de ${MIN_LARGO} a ${MAX_LARGO} letras) y una pista para descifrarla: una adivinanza, un críptico, un juego de palabras…`,
    'Después se juegan de a una: sale la pista y todos los demás la descifran a la vez, cada uno con su ahorcado.',
    `Tocás letras: si no está, es un error. Con ${MAX_ERRORES} errores te ahorcan. También podés arriesgar la palabra entera (si le errás, son ${ERROR_ARRIESGAR} errores).`,
    `Si la descifrás sumás 3 puntos más 1 por cada error que te sobró (y ${BONO_PRIMERO} más si sos el primero).`,
    `El que escribió la pista suma ${PUNTOS_AUTOR} por cada uno que la descifra, pero si la descifran todos, solo ${PUNTOS_AUTOR_TODOS} por cada uno: la gracia es que sea difícil, pero no imposible.`,
    'Cuando se jugaron todas las palabras, gana quien sumó más puntos. Las tildes no cuentan (la Á es A), pero la Ñ es una letra aparte.',
  ],
};

// Mayúsculas, sin tildes (salvo la Ñ) y solo letras
export const limpiar = s => String(s || '').toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ').replace(/[^A-ZÑ]/g, '');

// fase: 'escribir' (todos a la vez) -> 'adivinar' (la palabra de orden[ronda]) -> 'ver' (resultado) -> 'adivinar' de la siguiente…
// pal[p], pista[p]: lo que escribió p. letras/errores/fin/t: de cada uno en la palabra de ahora
// (fin: 0 jugando, 1 la descifró, 2 ahorcado, 3 es el autor). pr: puntos de la ronda.
const vacios = n => ({letras: Array(n).fill(''), errores: Array(n).fill(0), fin: Array(n).fill(0), t: Array(n).fill(0), pr: Array(n).fill(0)});
export function nuevoJuego(n, op, quien = 0) {
  return {n, opciones: {}, fase: 'escribir', pal: Array(n).fill(''), pista: Array(n).fill(''),
          orden: Array.from({length: n}, (_, k) => (quien + k) % n), ronda: 0, ...vacios(n),
          puntos: Array(n).fill(0), turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.opciones = e.opciones || {};
  // Por posición (no con lista()): si Firebase guarda solo algunos, no se tienen que correr
  const de = (x, f) => Array.from({length: e.n}, (_, i) => f((x || {})[i]));
  e.pal = de(e.pal, x => limpiar(x));
  e.pista = de(e.pista, x => String(x || ''));
  e.letras = de(e.letras, x => String(x || ''));
  for (const k of ['errores', 'fin', 't', 'pr', 'puntos']) e[k] = de(e[k], x => +x || 0);
  e.orden = lista(e.orden).map(Number);
  e.ronda = +e.ronda || 0;
  e.ultima = e.ultima || '';
  return e;
}
export const autor = e => e.orden[e.ronda];
export const descifran = e => Array.from({length: e.n}, (_, i) => i).filter(i => i !== autor(e));
export const adivinadas = (e, p) => [...e.pal[autor(e)]].filter(ch => e.letras[p].includes(ch)).length;
export function detalle(e, i) {
  const pts = `${e.puntos[i]} pts`;
  if (e.fase === 'escribir') return `${pts} · ${e.pal[i] ? 'lista ✔' : 'escribiendo…'}`;
  if (e.ganador !== -1) return pts;
  if (e.fin[i] === 3) return `${pts} · ✍️ es la suya`;
  return `${pts} · ${e.fin[i] === 1 ? '🎉' : e.fin[i] === 2 ? '💀' : `${e.errores[i]}/${MAX_ERRORES} ❌`}`;
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
  for (const p of ok) e.pr[p] = 3 + (MAX_ERRORES - e.errores[p]) + (p === primero ? BONO_PRIMERO : 0);
  e.pr[a] = ok.length * (ok.length === los.length ? PUNTOS_AUTOR_TODOS : PUNTOS_AUTOR);
  e.pr.forEach((x, p) => { e.puntos[p] += x; });
  e.fase = 'ver';
  e.ultima = `Era ${e.pal[a]}: ${ok.length ? `la ${ok.length === 1 ? 'descifró' : 'descifraron'} ${ok.map(nombre).join(', ')}` : 'nadie la descifró'}`;
}
const terminar = (e, p, como, t) => { e.fin[p] = como; e.t[p] = +t || Date.now(); };

// {tipo:'escribir', palabra, pista}   {tipo:'letra', letra, t}   {tipo:'arriesgar', texto, t}   {tipo:'seguir', ronda}
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  switch (j.tipo) {
    case 'escribir': {
      const w = limpiar(j.palabra), pista = String(j.pista || '').trim().slice(0, MAX_PISTA);
      if (e.fase !== 'escribir' || e.pal[yo] || w.length < MIN_LARGO || w.length > MAX_LARGO || pista.length < 3) return null;
      if (limpiar(pista).includes(w)) return null;                // la pista no puede tener la palabra
      e.pal[yo] = w; e.pista[yo] = pista;
      if (e.pal.every(Boolean)) { empezarRonda(e); e.ultima = '¡A descifrar!'; }
      return e;
    }
    case 'letra': {
      const L = limpiar(j.letra);
      if (e.fase !== 'adivinar' || e.fin[yo] || L.length !== 1 || e.letras[yo].includes(L)) return null;
      e.letras[yo] += L;
      const w = e.pal[autor(e)];
      if (w.includes(L)) { if ([...w].every(ch => e.letras[yo].includes(ch))) { terminar(e, yo, 1, j.t); e.ultima = `¡${nombre(yo)} la descifró!`; } }
      else if (++e.errores[yo] >= MAX_ERRORES) { terminar(e, yo, 2, j.t); e.ultima = `¡Ahorcaron a ${nombre(yo)}!`; }
      cerrarRonda(e, nombre);
      return e;
    }
    case 'arriesgar': {
      const w = limpiar(j.texto), obj = e.pal[autor(e)];
      if (e.fase !== 'adivinar' || e.fin[yo] || !w) return null;
      if (w === obj) {
        e.letras[yo] += [...new Set(obj)].filter(ch => !e.letras[yo].includes(ch)).join('');
        terminar(e, yo, 1, j.t); e.ultima = `¡${nombre(yo)} arriesgó y la descifró!`;
      } else {
        e.errores[yo] = Math.min(MAX_ERRORES, e.errores[yo] + ERROR_ARRIESGAR);
        if (e.errores[yo] >= MAX_ERRORES) { terminar(e, yo, 2, j.t); e.ultima = `¡Ahorcaron a ${nombre(yo)}!`; }
      }
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
