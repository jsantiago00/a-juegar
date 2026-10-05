// Dibujamiento: teléfono descompuesto con dibujos. Cada uno escribe una frase, el siguiente la dibuja,
// el siguiente escribe qué cree que es ese dibujo, y así. Al final se ve la película de cada cadena.
// La cadena c la arranca el jugador c; en la ronda r la tiene el jugador (c + r) % n.
// Rondas pares: escribir (r = 0, la frase; después, describir el dibujo anterior). Impares: dibujar.
// Los textos van en el estado; los dibujos, en extra/dib/<pid>/<c>_<r> (ver shared/lienzo.js).
import { lista, EMPATE } from '../shared/salas.js';

export const RITMOS = {normal: {frase: 60, escribir: 45, dibujar: 90}, tranqui: {frase: 90, escribir: 75, dibujar: 150}};
export const GRACIA = 6000;                  // después del reloj, cuánto se espera a los que no entregaron
export const FRASES = ['Un perro manejando un colectivo', 'La abuela haciendo parkour', 'Un mate con anteojos de sol',
  'Messi comiendo un choripán', 'Un dinosaurio en la pileta', 'El Obelisco con frío', 'Un gato astronauta',
  'Una vaca andando en bicicleta', 'Un pingüino de vacaciones en la playa', 'Un robot regando las plantas',
  'Una empanada enamorada', 'Un fantasma con miedo', 'El sol tomando helado', 'Un pulpo tocando la batería',
  'Una jirafa en un ascensor', 'Un tiburón dentista', 'Un caracol súper veloz', 'Un rey sin corona buscándola',
  'Una sirena en el subte', 'Un cohete hecho de queso', 'Un perro paseando a su dueño', 'Un árbol con bigote',
  'Una nube llorando de risa', 'Un payaso serio en una reunión', 'Una tortuga ganando una carrera',
  'Un unicornio en el supermercado', 'Un mago que se olvidó el truco', 'Un oso haciendo un asado'];

export const info = {
  id: 'dibujamiento',
  nombre: 'Dibujamiento',
  desc: 'Teléfono descompuesto con dibujos: escribí, dibujá, adiviná… y mirá la película del final.',
  min: 2, max: 6,
  soloOnline: true,          // cada uno en su pantalla, sin ver lo de los demás
  sinTurnos: true,           // todos juegan a la vez
  sinGanador: true,          // no gana nadie: lo divertido es la película
  reglas: [
    'Cada uno escribe una frase (algo divertido de dibujar).',
    'Las frases pasan al de al lado, que la tiene que dibujar. Ese dibujo pasa al siguiente, que escribe qué cree que es.',
    'Y así: escribir, dibujar, escribir… hasta que cada cadena pasó por todos. Nadie ve lo que hicieron los demás.',
    'Cada paso tiene reloj: si se acaba, se manda lo que tengas.',
    'Al final viene la película: se ve cada cadena desde la frase original, con los dibujos dibujándose de nuevo. ¡Mirá cómo se fue deformando!',
  ],
};

export const tipoRonda = r => (r % 2 ? 'dibujar' : 'escribir');
export const cadenaDe = (e, p, r = e.ronda) => ((p - r) % e.n + e.n) % e.n;      // la cadena que tiene p en la ronda r
export const autor = (e, c, r) => (c + r) % e.n;                                  // quién hizo el paso r de la cadena c
export const segundos = (e, r = e.ronda) => {
  const t = RITMOS[e.opciones.ritmo] || RITMOS.normal;
  return r === 0 ? t.frase : tipoRonda(r) === 'dibujar' ? t.dibujar : t.escribir;
};
export const rutaDibujo = (e, c, r) => `dib/${e.pid}/${c}_${r}`;

export function nuevoJuego(n, op) {
  const ritmo = op && RITMOS[op.ritmo] ? op.ritmo : 'normal';
  return {n, opciones: {ritmo}, pid: Math.random().toString(36).slice(2, 9), fase: 'jugar', ronda: 0, pasos: n, hasta: 0,
          textos: Array.from({length: n}, () => Array(n).fill('')), listos: Array(n).fill(0), ver: {c: 0, k: 1},
          turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.opciones = e.opciones || {ritmo: 'normal'};
  e.textos = Array.from({length: e.n}, (_, c) => { const t = (e.textos || {})[c] || {}; return Array.from({length: e.n}, (_, r) => String(t[r] || '')); });
  e.listos = Array.from({length: e.n}, (_, p) => +((e.listos || {})[p]) || 0);
  e.ver = e.ver ? {c: +e.ver.c || 0, k: +e.ver.k || 1} : {c: 0, k: 1};
  e.hasta = +e.hasta || 0; e.ronda = +e.ronda || 0; e.pasos = +e.pasos || e.n;
  e.ultima = e.ultima || '';
  return e;
}
export const detalle = (e, i) => (e.fase === 'jugar' ? (e.listos[i] ? 'listo ✔' : tipoRonda(e.ronda) === 'dibujar' ? 'dibujando…' : 'escribiendo…')
  : e.ver.c === i && e.ganador === -1 ? '🎬 su cadena' : '');

// No hay jugadas por turno: todo pasa por libre()
export const aplicar = () => null;

function avanzar(e, t) {
  e.ronda++;
  e.listos.fill(0);
  if (e.ronda >= e.pasos) { e.fase = 'pelicula'; e.hasta = 0; e.ver = {c: 0, k: 1}; e.ultima = '🎬 ¡Llegó la película!'; return; }
  e.hasta = t + segundos(e) * 1000;
  e.ultima = `Ronda ${e.ronda + 1} de ${e.pasos}`;
}

// {tipo:'reloj', t}: arranca el reloj de la primera ronda   {tipo:'entregar', texto, t}: terminé mi paso
// {tipo:'forzar', t}: seguir sin los que no entregaron      {tipo:'ver', c, k}: pasar al siguiente paso de la película
export function libre(e, j, yo) {
  const t = +j.t || 0;
  switch (j.tipo) {
    case 'reloj':
      if (e.fase !== 'jugar' || e.hasta || !t) return null;
      e.hasta = t + segundos(e) * 1000;
      return e;
    case 'entregar': {
      if (e.fase !== 'jugar' || e.listos[yo]) return null;
      if (tipoRonda(e.ronda) === 'escribir') e.textos[cadenaDe(e, yo)][e.ronda] = String(j.texto || '').trim().slice(0, 80);
      e.listos[yo] = 1;
      if (e.listos.every(Boolean)) avanzar(e, t || Date.now());
      return e;
    }
    case 'forzar':
      if (e.fase !== 'jugar' || !e.hasta || t < e.hasta + GRACIA) return null;
      avanzar(e, t);
      return e;
    case 'ver': {
      if (e.fase !== 'pelicula' || e.ganador !== -1 || +j.c !== e.ver.c || +j.k !== e.ver.k) return null;
      if (e.ver.k < e.pasos) e.ver.k++;
      else if (e.ver.c < e.n - 1) e.ver = {c: e.ver.c + 1, k: 1};
      else { e.ganador = EMPATE; e.ultima = '¡Fin de la película!'; }
      return e;
    }
  }
  return null;
}
