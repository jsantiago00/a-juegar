// =====================================================================
//  Cuatro en línea: tablero de 7 columnas × 6 filas; cada ficha cae hasta lo más bajo de su columna.
//  Las celdas van en un string (fila 0 = arriba): '.' vacía, '0' o '1' la ficha de cada uno.
// =====================================================================
import { EMPATE } from '../shared/salas.js';

export const COLS = 7, FILAS = 6, VACIO = '.';
export const info = {
  id: 'cuatro-en-linea',       // = nombre de la carpeta
  nombre: 'Cuatro en línea',
  desc: 'Tirá fichas por arriba y armá una línea de cuatro antes que el otro.',
  min: 2, max: 2,
  reglas: [
    'Por turnos, cada uno elige una columna y su ficha cae hasta lo más bajo que pueda.',
    'Gana el primero que junta cuatro fichas suyas en línea: acostadas, paradas o en diagonal.',
    'Si se llena el tablero y nadie lo logró, es empate.',
  ],
};

export function nuevoJuego(n) {
  return {n, celdas: VACIO.repeat(COLS * FILAS), ult: -1, linea: '', turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  if (typeof e.celdas !== 'string' || e.celdas.length !== COLS * FILAS) e.celdas = VACIO.repeat(COLS * FILAS);
  e.ult = e.ult == null ? -1 : +e.ult;
  e.linea = String(e.linea || '');
  e.ultima = e.ultima || '';
  return e;
}

// La fila donde caería una ficha en la columna c (-1 si está llena)
export function fila(e, c) {
  for (let f = FILAS - 1; f >= 0; f--) if (e.celdas[f * COLS + c] === VACIO) return f;
  return -1;
}
// Si la ficha de (f, c) armó cuatro o más en línea, devuelve esas celdas
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
function lineaDesde(celdas, f, c) {
  const p = celdas[f * COLS + c];
  for (const [df, dc] of DIRS) {
    const L = [f * COLS + c];
    for (const s of [1, -1]) {
      let ff = f + df * s, cc = c + dc * s;
      while (ff >= 0 && ff < FILAS && cc >= 0 && cc < COLS && celdas[ff * COLS + cc] === p) { L.push(ff * COLS + cc); ff += df * s; cc += dc * s; }
    }
    if (L.length >= 4) return L;
  }
  return null;
}

// Jugada: {col}
export function aplicar(e, j, nombre) {
  const p = e.turno, c = +j.col;
  if (!(c >= 0 && c < COLS)) return null;
  const f = fila(e, c);
  if (f < 0) return null;
  const k = f * COLS + c;
  e.celdas = e.celdas.slice(0, k) + p + e.celdas.slice(k + 1);
  e.ult = k;
  e.ultima = `${nombre(p)} tiró en la columna ${c + 1}`;
  const L = lineaDesde(e.celdas, f, c);
  if (L) { e.ganador = p; e.linea = L.join(','); e.ultima = `¡${nombre(p)} hizo cuatro en línea!`; }
  else if (!e.celdas.includes(VACIO)) { e.ganador = EMPATE; e.ultima = 'Se llenó el tablero'; }
  else e.turno = 1 - p;
  return e;
}
