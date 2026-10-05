// Ta-te-ti²: nueve ta-te-tis adentro de uno grande.
import { lista, EMPATE } from '../shared/salas.js';

export const info = {
  id: 'tateti-cuadrado',
  nombre: 'Ta-te-ti²',
  desc: 'Nueve ta-te-tis adentro de uno. Donde jugás decide dónde juega el otro.',
  min: 2, max: 2,
  reglas: [
    'El tablero grande tiene 9 tableritos de ta-te-ti.',
    'La casilla donde jugás manda al rival al tablerito de esa misma posición.',
    'Si ese tablerito ya está ganado o lleno, el rival juega donde quiera.',
    'Ganar un tablerito es marcar esa casilla del tablero grande.',
    'Gana quien hace tres en línea en el tablero grande.',
  ],
};

const LINEAS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const gano = (arr, p) => LINEAS.some(l => l.every(k => arr[k] === p));

// celdas: 81, índice tablerito*9 + casilla. chicos: -1 libre, 0/1 ganado, -2 lleno sin ganador.
// activo: tablerito obligatorio, o -1 si es libre.
export function nuevoJuego(n) {
  return {n, celdas: Array(81).fill(-1), chicos: Array(9).fill(-1), activo: -1,
          turno: 0, ganador: -1, ultima: '', ult: -1};
}
export function normalizar(e) {
  e.celdas = lista(e.celdas).map(Number);
  e.chicos = lista(e.chicos).map(Number);
  e.activo = +e.activo;
  e.ult = e.ult == null ? -1 : +e.ult;
  e.ultima = e.ultima || '';
  return e;
}
export const detalle = (e, i) => (i === 0 ? 'X' : 'O');
export const sePuede = (e, b) => e.chicos[b] === -1 && (e.activo === -1 || e.activo === b);

// Jugada: {b: tablerito, k: casilla}
export function aplicar(e, j, nombre) {
  const p = e.turno, {b, k} = j;
  if (!(b >= 0 && b < 9 && k >= 0 && k < 9) || !sePuede(e, b) || e.celdas[b * 9 + k] !== -1) return null;
  e.celdas[b * 9 + k] = p;
  e.ult = b * 9 + k;
  const chico = e.celdas.slice(b * 9, b * 9 + 9);
  let gane = false;
  if (gano(chico, p)) { e.chicos[b] = p; gane = true; }
  else if (chico.every(x => x !== -1)) e.chicos[b] = EMPATE;
  e.ultima = gane ? `${nombre(p)} ganó un tablerito` : `${nombre(p)} jugó`;

  if (gano(e.chicos, p)) { e.ganador = p; return e; }
  if (e.chicos.every(x => x !== -1)) { e.ganador = EMPATE; return e; }
  e.activo = e.chicos[k] === -1 ? k : -1;
  e.turno = (p + 1) % e.n;
  return e;
}
