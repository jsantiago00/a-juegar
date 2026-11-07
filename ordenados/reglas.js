// =====================================================================
//  Ordenados (cooperativo): sale un tema con dos puntas (ej. comidas: de la más fea a la más rica) y a cada uno
//  le toca un número secreto del 1 al 100. Cada uno escribe algo del tema que vaya con su número y, entre todos,
//  ordenan las pistas de menor a mayor sin decir los números. Cuentan las que quedaron en orden.
//  Fases: 'pistas' (todos escriben a la vez) -> 'ordenar' (todos mueven y confirman) -> 'ver' (se dan vuelta).
// =====================================================================
import { EMPATE } from '../shared/salas.js';

export const RONDAS = [3, 5];
export const MAX_PISTA = 50;
// [tema, punta del 1, punta del 100]
export const TEMAS = [
  ['Comidas', 'la más fea', 'la más rica'],
  ['Superpoderes', 'el más inútil', 'el más útil'],
  ['Animales', 'el más inofensivo', 'el más peligroso'],
  ['Lugares para una primera cita', 'el peor', 'el mejor'],
  ['Cosas para llevar a una isla desierta', 'la más inútil', 'la más útil'],
  ['Películas', 'la más aburrida', 'la más emocionante'],
  ['Canciones para un casamiento', 'la peor', 'la mejor'],
  ['Excusas para llegar tarde', 'la menos creíble', 'la más creíble'],
  ['Trabajos', 'el más aburrido', 'el más divertido'],
  ['Regalos de cumpleaños', 'el peor', 'el mejor'],
  ['Cosas que dan miedo', 'nada de miedo', 'terror total'],
  ['Famosos', 'el menos conocido', 'el más conocido'],
  ['Lugares para vivir', 'el peor', 'el mejor'],
  ['Cosas que se compran', 'baratísima', 'carísima'],
  ['Planes para un domingo', 'el más aburrido', 'el mejor'],
  ['Olores', 'el más feo', 'el más rico'],
  ['Deportes', 'el más tranquilo', 'el más extremo'],
  ['Inventos', 'el menos importante', 'el más importante'],
  ['Cosas', 'livianísima', 'pesadísima'],
  ['Mascotas', 'la peor', 'la mejor'],
  ['Golosinas', 'la peor', 'la mejor'],
  ['Programas de tele', 'el peor', 'el mejor'],
  ['Cosas que te pueden pasar en público', 'nada de vergüenza', 'vergüenza total'],
  ['Ruidos', 'silencio total', 'el más fuerte'],
  ['Cosas que pasan en un asado', 'lo peor', 'lo mejor'],
  ['Vacaciones', 'las peores', 'las mejores'],
  ['Personajes de ficción', 'el más malo', 'el más bueno'],
  ['Cosas', 'irrompible', 'se rompe con mirarla'],
  ['Cosas', 'chiquitita', 'gigante'],
  ['Comidas', 'normalísima', 'rarísima'],
  ['Habilidades', 'la más fácil', 'la más difícil'],
  ['Frases para decir en una entrevista de trabajo', 'la peor', 'la mejor'],
  ['Cosas para hacer un lunes a la mañana', 'la peor', 'la mejor'],
  ['Profesiones', 'la menos peligrosa', 'la más peligrosa'],
  ['Cosas de la infancia', 'la que menos se extraña', 'la que más se extraña'],
];

export const info = {
  id: 'ordenados',             // = nombre de la carpeta
  nombre: 'Ordenados',
  desc: 'Un número secreto, una pista… y entre todos, a ordenarse.',
  min: 3, max: 8,
  soloOnline: true,            // cada uno ve solo su número
  sinTurnos: true,             // todos juegan a la vez
  sinGanador: true,            // es cooperativo: ganan o pierden todos juntos
  reglas: [
    'Sale un tema con dos puntas, por ejemplo "Comidas: 1 = la más fea, 100 = la más rica". A cada uno le toca un número secreto del 1 al 100.',
    'Cada uno escribe algo del tema que vaya con su número: con un 5, algo horrible; con un 95, algo buenísimo. ¡Sin decir el número!',
    'Después, entre todos, ordenan las pistas de la más baja a la más alta (arriba la del 1, abajo la del 100). Cualquiera puede mover cualquier pista: hablen por el chat o en voz alta.',
    'Cuando todos están de acuerdo, se dan vuelta los números: cuentan las pistas que quedaron en orden.',
    'Es cooperativo: al final ven cuántas ordenaron bien entre todos, sumando todas las rondas.',
  ],
};

const mezclar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const numeros = n => mezclar(Array.from({length: 100}, (_, i) => i + 1)).slice(0, n);
export const temaDe = e => TEMAS[+e.temas.split(',')[e.ronda - 1]] || TEMAS[0];
export const ordenDe = e => (e.orden ? e.orden.split(',').map(Number) : []);

// Las pistas que quedaron en orden: la secuencia creciente más larga (las demás estaban fuera de lugar)
export function enOrden(e) {
  const ord = ordenDe(e), v = ord.map(p => e.nums[p]), n = v.length;
  const largo = Array(n).fill(1), prev = Array(n).fill(-1);
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) if (v[j] < v[i] && largo[j] + 1 > largo[i]) { largo[i] = largo[j] + 1; prev[i] = j; }
  let fin = 0;
  for (let i = 1; i < n; i++) if (largo[i] > largo[fin]) fin = i;
  const bien = new Set();
  for (let i = n ? fin : -1; i >= 0; i = prev[i]) bien.add(ord[i]);
  return bien;
}

export function nuevoJuego(n, op) {
  const rondas = RONDAS.includes(+(op && op.rondas)) ? +op.rondas : 3;
  return {n, opciones: {rondas}, temas: mezclar([...TEMAS.keys()]).slice(0, rondas).join(','), ronda: 1,
          nums: numeros(n), pistas: Array(n).fill(''), orden: '', listos: Array(n).fill(0), fase: 'pistas',
          bien: 0, total: 0, bienRonda: 0, turno: -1, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  const de = (x, f) => Array.from({length: e.n}, (_, i) => f((x || {})[i]));
  e.opciones = e.opciones || {rondas: 3};
  e.temas = String(e.temas || '0');
  e.ronda = +e.ronda || 1;
  e.nums = de(e.nums, x => +x || 0);
  e.pistas = de(e.pistas, x => String(x || ''));
  e.listos = de(e.listos, x => +x || 0);
  e.orden = String(e.orden || '');
  for (const k of ['bien', 'total', 'bienRonda']) e[k] = +e[k] || 0;
  e.turno = -1;
  e.ultima = e.ultima || '';
  return e;
}
export function detalle(e, i) {
  if (e.fase === 'pistas') return e.pistas[i] ? '✔' : '✍️';
  if (e.fase === 'ordenar') return e.listos[i] ? '👍' : '';
  return '';
}

function revelar(e) {
  const bien = enOrden(e).size;
  e.bienRonda = bien; e.bien += bien; e.total += e.n;
  e.fase = 'ver';
  e.ultima = `Quedaron ${bien} de ${e.n} en orden`;
  if (e.ronda >= e.opciones.rondas) e.ganador = EMPATE;     // terminó (es cooperativo: no gana nadie en particular)
}

// Todo es a la vez: {tipo:'pista', texto}  {tipo:'mover', p, a}  {tipo:'listo', si}  {tipo:'seguir'}
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  switch (j.tipo) {
    case 'pista': {
      const t = String(j.texto || '').trim().slice(0, MAX_PISTA);
      if (e.fase !== 'pistas' || e.pistas[yo] || !t) return null;
      e.pistas[yo] = t;
      e.ultima = `${nombre(yo)} ya escribió su pista`;
      if (e.pistas.every(Boolean)) {
        e.fase = 'ordenar';
        e.orden = mezclar(Array.from({length: e.n}, (_, i) => i)).join(',');
        e.listos = Array(e.n).fill(0);
        e.ultima = '¡Ya están todas! A ordenarlas';
      }
      return e;
    }
    case 'mover': {
      const ord = ordenDe(e), p = +j.p, a = +j.a, desde = ord.indexOf(p);
      if (e.fase !== 'ordenar' || desde < 0 || !(a >= 0 && a < e.n) || a === desde) return null;
      ord.splice(desde, 1); ord.splice(a, 0, p);
      e.orden = ord.join(',');
      e.listos = Array(e.n).fill(0);            // cambió el orden: todos tienen que volver a confirmar
      e.ultima = `${nombre(yo)} movió la pista de ${nombre(p)}`;
      return e;
    }
    case 'listo': {
      if (e.fase !== 'ordenar') return null;
      e.listos[yo] = j.si ? 1 : 0;
      if (e.listos.every(Boolean)) revelar(e);
      return e;
    }
    case 'seguir': {
      if (e.fase !== 'ver' || e.ganador !== -1) return null;
      e.ronda++;
      e.nums = numeros(e.n); e.pistas = Array(e.n).fill(''); e.orden = ''; e.listos = Array(e.n).fill(0);
      e.fase = 'pistas';
      e.ultima = `Ronda ${e.ronda}: tema nuevo`;
      return e;
    }
  }
  return null;
}
// No hay jugadas por turno
export const aplicar = () => null;
