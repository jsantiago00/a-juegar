// Juegardium: puntos y cajas. Trazás líneas; si cerrás una caja, es tuya y seguís.
import { lista, EMPATE } from '../shared/salas.js';

export const info = {
  id: 'juegardium',
  nombre: 'Juegardium',
  desc: 'Uní puntos, cerrá cajas y quedate con el tablero.',
  min: 2, max: 4,
  reglas: [
    'En tu turno trazás una línea entre dos puntos vecinos.',
    'Si con esa línea cerrás una caja, es tuya y volvés a jugar.',
    'Cuando no quedan cajas, gana quien tenga más.',
    'Tablero de 5×5 cajas para 2 jugadores y de 6×6 para 3 o 4.',
  ],
};

// h: (S+1) filas de S líneas horizontales, índice r*S+c
// v: S filas de S+1 líneas verticales, índice r*(S+1)+c
export function nuevoJuego(n) {
  const S = n <= 2 ? 5 : 6;
  return {n, S, h: Array((S + 1) * S).fill(-1), v: Array(S * (S + 1)).fill(-1),
          cajas: Array(S * S).fill(-1), turno: 0, ganador: -1, ultima: '', ult: null};
}
export function normalizar(e) {
  e.S = +e.S;
  e.h = lista(e.h).map(Number);
  e.v = lista(e.v).map(Number);
  e.cajas = lista(e.cajas).map(Number);
  e.ultima = e.ultima || '';
  e.ult = e.ult || null;
  return e;
}
export const puntos = (e, i) => e.cajas.filter(x => x === i).length;
export const detalle = (e, i) => { const k = puntos(e, i); return `${k} ${k === 1 ? "caja" : "cajas"}`; };

function lados(e, r, c) {
  const S = e.S;
  return [e.h[r * S + c], e.h[(r + 1) * S + c], e.v[r * (S + 1) + c], e.v[r * (S + 1) + c + 1]];
}

// Jugada: {o:'h'|'v', i}
export function aplicar(e, j, nombre) {
  const p = e.turno, S = e.S;
  const arr = j.o === 'h' ? e.h : j.o === 'v' ? e.v : null;
  if (!arr || !(j.i >= 0 && j.i < arr.length) || arr[j.i] !== -1) return null;
  arr[j.i] = p;
  e.ult = {o: j.o, i: j.i};

  const vecinas = [];
  if (j.o === 'h') {
    const r = Math.floor(j.i / S), c = j.i % S;
    if (r > 0) vecinas.push([r - 1, c]);
    if (r < S) vecinas.push([r, c]);
  } else {
    const r = Math.floor(j.i / (S + 1)), c = j.i % (S + 1);
    if (c > 0) vecinas.push([r, c - 1]);
    if (c < S) vecinas.push([r, c]);
  }
  let cerradas = 0;
  for (const [r, c] of vecinas) {
    if (e.cajas[r * S + c] === -1 && lados(e, r, c).every(x => x !== -1)) { e.cajas[r * S + c] = p; cerradas++; }
  }

  if (e.cajas.every(x => x !== -1)) {
    const tot = Array.from({length: e.n}, (_, i) => puntos(e, i));
    const max = Math.max(...tot), top = tot.flatMap((t, i) => (t === max ? [i] : []));
    e.ganador = top.length === 1 ? top[0] : EMPATE;
    e.ultima = `Tablero completo: ${max} cajas para ${top.map(nombre).join(' y ')}`;
    return e;
  }
  if (cerradas) e.ultima = `${nombre(p)} cerró ${cerradas === 1 ? 'una caja' : cerradas + ' cajas'} y sigue`;
  else { e.ultima = `${nombre(p)} trazó una línea`; e.turno = (p + 1) % e.n; }
  return e;
}
