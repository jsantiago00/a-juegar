// Reglas de Al Centro: funciones puras, no tocan la pantalla ni Firebase.
import { lista } from '../shared/salas.js';

export const info = {
  id: 'al-centro',            // = nombre de la carpeta
  nombre: 'Al Centro',
  desc: 'Llevá tu bolita a f6 antes que nadie. Cada turno: moverte un casillero o poner un muro.',
  min: 2, max: 4,
  reglas: [
    'Tablero de 11×11. La meta es f6.',
    'En tu turno movés tu bolita 1 casillero (arriba, abajo, izquierda o derecha) o ponés un muro.',
    'Los muros van en las ranuras entre casillas y miden 3 casilleros.',
    'No se pueden superponer ni cruzar, y nunca pueden dejar a alguien sin camino a la meta.',
    'Muros por jugador: 5 (4 jugadores), 7 (3) o 10 (2).',
    'No podés pararte donde hay otra bolita.',
  ],
};

export const N = 11, META = [5, 5], COLS = 'abcdefghijk';
const INICIOS = {2: [[1,5],[9,5]], 3: [[1,5],[5,1],[9,5]], 4: [[1,5],[5,1],[9,5],[5,9]]}; // b6, f2, j6, f10
const MUROS = {2: 10, 3: 7, 4: 5};
const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
export const casilla = (c, r) => COLS[c] + (r + 1);

export function nuevoJuego(n) {
  return {n, pos: INICIOS[n].map(p => [...p]), muros: [], quedan: Array(n).fill(MUROS[n]),
          turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.muros = lista(e.muros);
  e.pos = lista(e.pos).map(p => [+p[0], +p[1]]);
  e.quedan = lista(e.quedan).map(Number);
  e.ultima = e.ultima || '';
  return e;
}
export const detalle = (e, i) => `${e.quedan[i]} muros`;

// Muro 'h': ranura debajo de la fila r, cubre columnas c..c+2
// Muro 'v': ranura a la derecha de la columna c, cubre filas r..r+2
function bloqueado(muros, c, r, dc, dr) {
  for (const w of muros) {
    if (w.o === 'h' && dc === 0) { const f = dr === 1 ? r : r - 1; if (w.r === f && c >= w.c && c <= w.c + 2) return true; }
    if (w.o === 'v' && dr === 0) { const k = dc === 1 ? c : c - 1; if (w.c === k && r >= w.r && r <= w.r + 2) return true; }
  }
  return false;
}
function pasos(muros, c, r) {
  const out = [];
  for (const [dc, dr] of DIRS) {
    const nc = c + dc, nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= N || nr >= N) continue;
    if (!bloqueado(muros, c, r, dc, dr)) out.push([nc, nr]);
  }
  return out;
}
function llega(muros, [c, r]) {   // BFS hasta la meta
  const vistos = new Set([c + ',' + r]), q = [[c, r]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === META[0] && y === META[1]) return true;
    for (const [a, b] of pasos(muros, x, y)) {
      const k = a + ',' + b;
      if (!vistos.has(k)) { vistos.add(k); q.push([a, b]); }
    }
  }
  return false;
}
export function movidas(e, p) {
  const [c, r] = e.pos[p];
  return pasos(e.muros, c, r).filter(([a, b]) => !e.pos.some(([x, y], i) => i !== p && x === a && y === b));
}
export function problemaMuro(e, w, nombre = i => 'Jugador ' + (i + 1)) {
  const fuera = w.o === 'h' ? (w.c < 0 || w.c > 8 || w.r < 0 || w.r > 9) : (w.c < 0 || w.c > 9 || w.r < 0 || w.r > 8);
  if (fuera) return 'Ese muro se sale del tablero';
  for (const o of e.muros) {
    if (o.o === w.o) {
      if (w.o === 'h' && o.r === w.r && Math.abs(o.c - w.c) < 3) return 'Se superpone con otro muro';
      if (w.o === 'v' && o.c === w.c && Math.abs(o.r - w.r) < 3) return 'Se superpone con otro muro';
    } else {
      const h = w.o === 'h' ? w : o, v = w.o === 'h' ? o : w;
      if ((v.c === h.c || v.c === h.c + 1) && (h.r === v.r || h.r === v.r + 1)) return 'Se cruza con otro muro';
    }
  }
  const nuevos = [...e.muros, w];
  for (let i = 0; i < e.n; i++) if (!llega(nuevos, e.pos[i])) return `Dejaría a ${nombre(i)} sin camino`;
  return '';
}

// Jugadas: {tipo:'mover', a:[c,r]} | {tipo:'muro', o, c, r} | {tipo:'pasar'}
export function aplicar(e, j, nombre) {
  const p = e.turno;
  const pasarTurno = () => { e.turno = (p + 1) % e.n; };
  if (j.tipo === 'mover') {
    const [c, r] = j.a;
    if (!movidas(e, p).some(([a, b]) => a === c && b === r)) return null;
    e.pos[p] = [c, r];
    e.ultima = `${nombre(p)} fue a ${casilla(c, r)}`;
    if (c === META[0] && r === META[1]) e.ganador = p; else pasarTurno();
    return e;
  }
  if (j.tipo === 'muro') {
    const w = {o: j.o, c: j.c, r: j.r};
    if (e.quedan[p] <= 0 || problemaMuro(e, w, nombre)) return null;
    e.muros.push({...w, p});
    e.quedan[p]--;
    e.ultima = `${nombre(p)} puso un muro`;
    pasarTurno();
    return e;
  }
  if (j.tipo === 'pasar') {
    if (movidas(e, p).length || e.quedan[p] > 0) return null;
    e.ultima = `${nombre(p)} pasó`;
    pasarTurno();
    return e;
  }
  return null;
}
