// Hundiste mi acorazado: batalla naval. Cada uno esconde su flota y tira al mar del otro.
import { lista } from '../shared/salas.js';

export const N = 10, COLS = 'ABCDEFGHIJ';
export const BARCOS = [
  {nombre: 'portaaviones', l: 5},
  {nombre: 'acorazado', l: 4},
  {nombre: 'crucero', l: 3},
  {nombre: 'submarino', l: 3},
  {nombre: 'destructor', l: 2},
];
export const info = {
  id: 'acorazado',             // = nombre de la carpeta
  nombre: 'Hundiste mi acorazado',
  desc: 'Batalla naval: escondé tu flota y hundí la del otro.',
  min: 2, max: 2,
  soloOnline: true,            // la flota es secreta: cada uno en su pantalla
  reglas: [
    'Cada uno ubica en secreto sus 5 barcos en un mar de 10×10: portaaviones (5), acorazado (4), crucero (3), submarino (3) y destructor (2).',
    'Los barcos van en línea recta (horizontal o vertical) y no se pueden pisar.',
    'Por turnos, tirás a una casilla del mar del otro: es agua o tocado.',
    'Si le pegás, seguís tirando. Cuando tocás todas las casillas de un barco, lo hundiste.',
    'Gana quien hunde toda la flota del otro.',
  ],
};

export const casilla = i => COLS[i % N] + (Math.floor(i / N) + 1);
// Casillas que ocupa un barco {f, c, o, l}: o = 'h' (horizontal) o 'v' (vertical)
export const celdasDe = b => Array.from({length: b.l}, (_, k) => (b.o === 'h' ? b.f * N + b.c + k : (b.f + k) * N + b.c));

export function flotaValida(flota) {
  if (!Array.isArray(flota) || flota.length !== BARCOS.length) return false;
  const usadas = new Set();
  for (let k = 0; k < BARCOS.length; k++) {
    const b = flota[k];
    if (!b || b.l !== BARCOS[k].l || (b.o !== 'h' && b.o !== 'v') || !Number.isInteger(b.f) || !Number.isInteger(b.c)) return false;
    const finF = b.o === 'v' ? b.f + b.l - 1 : b.f, finC = b.o === 'h' ? b.c + b.l - 1 : b.c;
    if (b.f < 0 || b.c < 0 || finF >= N || finC >= N) return false;
    for (const i of celdasDe(b)) { if (usadas.has(i)) return false; usadas.add(i); }
  }
  return true;
}
export function flotaAlAzar(azar = Math.random) {
  for (;;) {
    const flota = BARCOS.map(({l}) => {
      const o = azar() < .5 ? 'h' : 'v';
      return {l, o, f: Math.floor(azar() * (o === 'v' ? N - l + 1 : N)), c: Math.floor(azar() * (o === 'h' ? N - l + 1 : N))};
    });
    if (flotaValida(flota)) return flota;
  }
}
const limpia = f => lista(f).map(b => ({l: +b.l, o: b.o, f: +b.f, c: +b.c}));

// fase: 'armar' (cada uno acomoda su flota y aprieta Listo) -> 'disparo' (por turnos)
// tiros[p][i]: lo que tiró p al mar del otro. 0 nada, 1 agua, 2 tocado.
export function nuevoJuego(n) {
  return {n, fase: 'armar', flotas: [flotaAlAzar(), flotaAlAzar()], listos: [0, 0],
          tiros: [Array(N * N).fill(0), Array(N * N).fill(0)], turno: 0, ganador: -1, ultima: '', ult: null};
}
export function normalizar(e) {
  const f = e.flotas || {}, t = e.tiros || {}, l = e.listos || {};
  e.flotas = [0, 1].map(i => limpia(f[i]));
  e.tiros = [0, 1].map(i => { const a = lista(t[i]).map(Number); return a.length === N * N ? a : Array(N * N).fill(0); });
  e.listos = [0, 1].map(i => +l[i] || 0);
  e.ult = e.ult ? {p: +e.ult.p, i: +e.ult.i, r: e.ult.r, barco: e.ult.barco || ''} : null;
  e.ultima = e.ultima || '';
  return e;
}

// ¿Qué barco de p está en la casilla i? (índice en la flota, o -1)
export const barcoEn = (e, p, i) => e.flotas[p].findIndex(b => celdasDe(b).includes(i));
// ¿Ya hundieron el barco k de p? (todas sus casillas tocadas por el otro)
export const hundido = (e, p, k) => celdasDe(e.flotas[p][k]).every(i => e.tiros[1 - p][i] === 2);
export const aFlote = (e, p) => e.flotas[p].filter((_, k) => !hundido(e, p, k)).length;
export const detalle = (e, i) => (e.fase === 'armar' ? (e.listos[i] ? 'listo ✔' : 'armando…') : `${aFlote(e, i)} a flote`);

// Jugadas por turno: {tipo:'tiro', i}
export function aplicar(e, j, nombre) {
  const p = e.turno, otro = 1 - p, i = j.i;
  if (e.fase !== 'disparo' || j.tipo !== 'tiro' || !(i >= 0 && i < N * N) || e.tiros[p][i] !== 0) return null;
  const k = barcoEn(e, otro, i);
  if (k < 0) {
    e.tiros[p][i] = 1;
    e.ult = {p, i, r: 'agua', barco: ''};
    e.ultima = `${nombre(p)} tiró a ${casilla(i)}: ¡agua!`;
    e.turno = otro;
    return e;
  }
  e.tiros[p][i] = 2;
  if (hundido(e, otro, k)) {
    const barco = BARCOS[k].nombre;
    e.ult = {p, i, r: 'hundido', barco};
    e.ultima = `¡${nombre(p)} hundió el ${barco} de ${nombre(otro)}!`;
    if (aFlote(e, otro) === 0) e.ganador = p;
  } else {
    e.ult = {p, i, r: 'tocado', barco: ''};
    e.ultima = `${nombre(p)} tiró a ${casilla(i)}: ¡tocado! Sigue tirando`;
  }
  return e;                      // si pegó, sigue tirando el mismo
}

// Jugadas libres (cada uno con lo suyo, sin turno), solo mientras se arma:
//  {tipo:'flota', flota}: acomodar los barcos   {tipo:'listo'}: confirmar la flota
export function libre(e, j, yo) {
  if (e.fase !== 'armar' || e.listos[yo]) return null;
  if (j.tipo === 'flota') {
    const flota = limpia(j.flota);
    if (!flotaValida(flota)) return null;
    e.flotas[yo] = flota;
    return e;
  }
  if (j.tipo === 'listo') {
    e.listos[yo] = 1;
    if (e.listos[0] && e.listos[1]) { e.fase = 'disparo'; e.ultima = '¡Flotas listas! A disparar'; }   // tira primero el sorteado (turno)
    return e;
  }
  return null;
}
