// =====================================================================
//  Mancala (Kalah): 6 hoyos por lado y un granero para cada uno.
//  hoyos[0..5] son del jugador 0 y hoyos[6] su granero; hoyos[7..12] del jugador 1 y hoyos[13] el suyo.
//  Se siembra en sentido antihorario (para cada uno, hacia su derecha) salteando el granero del otro.
// =====================================================================
import { EMPATE } from '../shared/salas.js';

export const HOYOS = 6, SEMILLAS = 4;
export const granero = p => (p === 0 ? 6 : 13);
export const hoyoAbs = (p, k) => (p === 0 ? k : 7 + k);         // k = 0..5, de izquierda a derecha para ese jugador
export const esMio = (p, i) => (p === 0 ? i >= 0 && i <= 5 : i >= 7 && i <= 12);
export const enfrente = i => 12 - i;

export const info = {
  id: 'mancala',               // = nombre de la carpeta
  nombre: 'Mancala',
  desc: 'Sembrá semillas, robale al otro y llená tu granero.',
  min: 2, max: 2,
  reglas: [
    `Cada uno tiene ${HOYOS} hoyos de su lado y un granero a su derecha. Arrancan con ${SEMILLAS} semillas en cada hoyo.`,
    'En tu turno elegís un hoyo tuyo: sacás todas sus semillas y las vas dejando de a una en los hoyos que siguen, hacia la derecha y dando la vuelta (en tu granero sí, en el del otro no).',
    'Si la última semilla cae en tu granero, volvés a jugar.',
    'Si la última cae en un hoyo tuyo que estaba vacío y enfrente hay semillas, te llevás esa y las de enfrente a tu granero.',
    'Cuando a alguien no le quedan semillas en sus hoyos, termina: cada uno guarda en su granero lo que le quedó. Gana quien tiene más.',
  ],
};

export function nuevoJuego(n) {
  const h = Array(14).fill(SEMILLAS);
  h[6] = 0; h[13] = 0;
  return {n, hoyos: h, desde: -1, hasta: -1, robo: -1, turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.hoyos = Array.from({length: 14}, (_, i) => +((e.hoyos || {})[i]) || 0);
  for (const k of ['desde', 'hasta', 'robo']) e[k] = e[k] == null ? -1 : +e[k];
  e.ultima = e.ultima || '';
  return e;
}
export const detalle = (e, i) => `${e.hoyos[granero(i)]} en el granero`;

const ladoVacio = (h, p) => Array.from({length: HOYOS}, (_, k) => h[hoyoAbs(p, k)]).every(x => x === 0);
const semillas = x => `${x} ${x === 1 ? 'semilla' : 'semillas'}`;

// Jugada: {hoyo: 0..5} (del que tiene el turno, de izquierda a derecha)
export function aplicar(e, j, nombre) {
  const p = e.turno, k = +j.hoyo;
  if (!(Number.isInteger(k) && k >= 0 && k < HOYOS)) return null;
  const h = e.hoyos, a = hoyoAbs(p, k);
  let s = h[a];
  if (!s) return null;
  h[a] = 0;
  let i = a;
  const ajeno = granero(1 - p);
  while (s > 0) {
    i = (i + 1) % 14;
    if (i === ajeno) continue;
    h[i]++; s--;
  }
  e.desde = a; e.hasta = i; e.robo = -1;
  let otraVez = false;
  e.ultima = `${nombre(p)} sembró`;
  if (i === granero(p)) {
    otraVez = true;
    e.ultima = `${nombre(p)} terminó en su granero: ¡vuelve a jugar!`;
  } else if (esMio(p, i) && h[i] === 1 && h[enfrente(i)] > 0) {
    const robadas = h[enfrente(i)];
    h[granero(p)] += robadas + 1;
    h[i] = 0; h[enfrente(i)] = 0;
    e.robo = enfrente(i);
    e.ultima = `¡${nombre(p)} se llevó ${semillas(robadas)} de ${nombre(1 - p)}!`;
  }
  if (ladoVacio(h, 0) || ladoVacio(h, 1)) {
    for (const q of [0, 1]) for (let x = 0; x < HOYOS; x++) { const b = hoyoAbs(q, x); h[granero(q)] += h[b]; h[b] = 0; }
    const a0 = h[granero(0)], a1 = h[granero(1)];
    e.ganador = a0 === a1 ? EMPATE : a0 > a1 ? 0 : 1;
    e.ultima = `Terminó: ${nombre(0)} ${a0} · ${nombre(1)} ${a1}`;
  } else if (!otraVez) e.turno = 1 - p;
  return e;
}
