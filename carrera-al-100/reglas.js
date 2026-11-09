// =====================================================================
//  Carrera al 100: por turnos, cada uno tira un dado y elige si suma lo que salió o diez veces eso
//  (un 4 suma 4 o 40). Después de 5 tiradas cada uno, gana quien quedó más cerca del 100 (pasarse también cuenta:
//  lo que vale es la distancia).
//  tiros[i]: lo que fue sumando cada uno, como texto ('4,30,2'); dado: lo que salió y falta elegir (0 = falta tirar).
// =====================================================================
import { EMPATE } from '../shared/salas.js';

export const TIROS = 5, META = 100;

export const info = {
  id: 'carrera-al-100',        // = nombre de la carpeta
  nombre: 'Carrera al 100',
  desc: 'Tirá el dado: ¿sumás lo que sale o diez veces eso?',
  min: 2, max: 6,
  reloj: 30,                   // para tirar y elegir (se puede cambiar o sacar al armar la sala)
  reglas: [
    'Por turnos, cada uno tira un dado.',
    'Con lo que sale, elegís: sumar ese número o diez veces ese número (si sale 4, sumás 4 o 40). Una vez elegido, no se cambia.',
    `Cada uno tira ${TIROS} veces.`,
    `Gana quien termina más cerca del ${META}. Pasarse también cuenta: 104 está igual de cerca que 96.`,
    '⏱️ Con reloj, si no jugás a tiempo se tira el dado solo (si no lo tiraste) y se suma lo que salió, sin multiplicar.',
  ],
};

export const tiros = (e, i) => (e.tiros[i] ? e.tiros[i].split(',').map(Number) : []);
export const total = (e, i) => tiros(e, i).reduce((s, x) => s + x, 0);
export const distancia = (e, i) => Math.abs(META - total(e, i));
export const quedan = (e, i) => TIROS - tiros(e, i).length;

export function nuevoJuego(n, op, quien = 0) {
  return {n, tiros: Array(n).fill(''), dado: 0, turno: quien, empieza: quien, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.tiros = Array.from({length: e.n}, (_, i) => String((e.tiros || {})[i] || ''));
  e.dado = +e.dado || 0;
  e.ultima = e.ultima || '';
  return e;
}
export const detalle = (e, i) => `${total(e, i)} · ${tiros(e, i).length}/${TIROS}`;

// Los que quedaron más cerca (pueden ser varios)
export function masCerca(e) {
  const d = Array.from({length: e.n}, (_, i) => distancia(e, i)), min = Math.min(...d);
  return d.map((x, i) => (x === min ? i : -1)).filter(i => i >= 0);
}
export const ganadores = e => (e.ganador >= 0 ? masCerca(e) : []);

// Por turno: {tipo:'tirar'}   {tipo:'elegir', x: 1 | 10}
export function aplicar(e, j, nombre) {
  const p = e.turno;
  if (quedan(e, p) <= 0) return null;
  if (j.tipo === 'tirar') {
    if (e.dado) return null;
    e.dado = 1 + Math.floor(Math.random() * 6);
    e.ultima = `${nombre(p)} sacó un ${e.dado}`;
    return e;
  }
  if (j.tipo === 'elegir') {
    const x = +j.x;
    if (!e.dado || (x !== 1 && x !== 10)) return null;
    return sumar(e, p, x, `${nombre(p)} sumó ${e.dado * x}`, nombre);
  }
  return null;
}

// Reloj: si se te acaba el tiempo, se tira el dado solo (si no lo tiraste) y se suma lo que salió, sin multiplicar
export function sinTiempo(e, nombre) {
  const p = e.turno;
  if (quedan(e, p) <= 0) return null;
  if (!e.dado) e.dado = 1 + Math.floor(Math.random() * 6);
  return sumar(e, p, 1, `⏱️ ${nombre(p)} no llegó a tiempo: salió un ${e.dado} y sumó ${e.dado}`, nombre);
}

// Anota lo que salió (× 1 o × 10) y pasa el turno; si ya tiraron todos, termina
function sumar(e, p, x, texto, nombre) {
  e.tiros[p] = (e.tiros[p] ? e.tiros[p] + ',' : '') + e.dado * x;
  e.dado = 0;
  e.ultima = `${texto} y va ${total(e, p)}`;
  if (e.tiros.every((_, i) => quedan(e, i) === 0)) {
    const gan = masCerca(e);
    e.ganador = gan.length === e.n ? EMPATE : gan[0];
    e.ultima = Array.from({length: e.n}, (_, i) => i).sort((a, b) => distancia(e, a) - distancia(e, b))
      .map(i => `${nombre(i)} ${total(e, i)}`).join(' · ');
  } else e.turno = (p + 1) % e.n;
  return e;
}
