// =====================================================================
//  PLANTILLA: copiá la carpeta ta-te-ti/ para arrancar un juego nuevo.
//  Este archivo tiene SOLO las reglas: funciones puras, sin pantalla ni Firebase.
// =====================================================================
import { lista, EMPATE } from '../shared/salas.js';

export const info = {
  id: 'ta-te-ti',              // tiene que ser igual al nombre de la carpeta
  nombre: 'Ta-te-ti',
  desc: 'Tres en línea gana.',
  min: 2, max: 2,              // cantidad de jugadores permitida
  reglas: ['Por turnos, cada uno marca una casilla.', 'Gana quien hace tres en línea.'],
};

// Estado inicial. Siempre incluí n, turno, ganador (-1) y ultima.
export function nuevoJuego(n) {
  return {n, celdas: Array(9).fill(-1), turno: 0, ganador: -1, ultima: ''};
}

// Firebase puede devolver arrays como objetos o borrarlos si están vacíos.
export function normalizar(e) {
  e.celdas = lista(e.celdas).map(Number);
  e.ultima = e.ultima || '';
  return e;
}

// (Opcional) texto chiquito al lado del nombre de cada jugador
export const detalle = (e, i) => (i === 0 ? 'X' : 'O');

const LINEAS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

// Recibe el estado, la jugada y nombre(i). Devuelve el estado nuevo, o null si no vale.
export function aplicar(e, jugada, nombre) {
  const p = e.turno, i = jugada.celda;
  if (!(i >= 0 && i < 9) || e.celdas[i] !== -1) return null;
  e.celdas[i] = p;
  e.ultima = `${nombre(p)} marcó`;
  if (LINEAS.some(l => l.every(k => e.celdas[k] === p))) e.ganador = p;
  else if (e.celdas.every(v => v !== -1)) e.ganador = EMPATE;
  else e.turno = (p + 1) % e.n;
  return e;
}
