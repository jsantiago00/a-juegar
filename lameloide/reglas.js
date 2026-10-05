// Lameloide: Hex. Rojo une arriba con abajo, Azul une izquierda con derecha.
import { lista } from '../shared/salas.js';

export const N = 11, COLS = 'abcdefghijk';
export const info = {
  id: 'lameloide',
  nombre: 'Lameloide',
  desc: 'Uní tus dos bordes con un camino de hexágonos antes que el otro.',
  min: 2, max: 2,
  reglas: [
    'Rojo tiene que unir el borde de arriba con el de abajo; Azul, el de la izquierda con el de la derecha.',
    'Por turnos, cada uno pinta un hexágono libre.',
    'Cada hexágono toca a 6 vecinos: el camino puede doblar para cualquier lado.',
    'Como empezar tiene ventaja, en su primer turno Azul puede cambiar: se queda con la ficha de Rojo (reflejada) en vez de jugar.',
    'No hay empates: siempre alguien termina conectando.',
  ],
};

// Vecinos en el rombo. El orden coincide con los lados del hexágono (ver juego.js).
export const VECINOS = [[-1,0],[-1,1],[0,1],[1,0],[1,-1],[0,-1]];
export const casilla = i => COLS[i % N] + (Math.floor(i / N) + 1);

export function nuevoJuego(n) {
  return {n, celdas: Array(N * N).fill(-1), jugadas: 0, turno: 0, ganador: -1, ultima: '', ult: -1};
}
export function normalizar(e) {
  e.celdas = lista(e.celdas).map(Number);
  e.jugadas = +e.jugadas || 0;
  e.ult = e.ult == null ? -1 : +e.ult;
  e.ultima = e.ultima || '';
  return e;
}
export const detalle = (e, i) => (i === 0 ? 'arriba ↕ abajo' : 'izquierda ↔ derecha');
export const puedeCambiar = e => e.jugadas === 1 && e.turno === 1 && e.ganador === -1;

function conecta(e, p) {
  const q = [], vistos = new Set();
  for (let k = 0; k < N; k++) {
    const i = p === 0 ? k : k * N;                 // fila de arriba o columna izquierda
    if (e.celdas[i] === p) { q.push(i); vistos.add(i); }
  }
  while (q.length) {
    const i = q.shift(), r = Math.floor(i / N), c = i % N;
    if ((p === 0 && r === N - 1) || (p === 1 && c === N - 1)) return true;
    for (const [dr, dc] of VECINOS) {
      const nr = r + dr, nc = c + dc, j = nr * N + nc;
      if (nr < 0 || nc < 0 || nr >= N || nc >= N || vistos.has(j) || e.celdas[j] !== p) continue;
      vistos.add(j); q.push(j);
    }
  }
  return false;
}

// Jugadas: {i: índice de celda} | {tipo:'cambiar'}
export function aplicar(e, j, nombre) {
  const p = e.turno;
  if (j.tipo === 'cambiar') {
    if (!puedeCambiar(e)) return null;
    const i = e.celdas.indexOf(0), r = Math.floor(i / N), c = i % N;
    e.celdas[i] = -1;
    e.celdas[c * N + r] = 1;                       // reflejada sobre la diagonal
    e.ult = c * N + r; e.jugadas++;
    e.ultima = `${nombre(1)} cambió y se quedó con la ficha`;
    e.turno = 0;
    return e;
  }
  const i = j.i;
  if (!(i >= 0 && i < N * N) || e.celdas[i] !== -1) return null;
  e.celdas[i] = p; e.ult = i; e.jugadas++;
  e.ultima = `${nombre(p)} jugó en ${casilla(i)}`;
  if (conecta(e, p)) e.ganador = p; else e.turno = (p + 1) % e.n;
  return e;
}
