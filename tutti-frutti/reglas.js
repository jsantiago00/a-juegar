// Tutti Frutti (Basta): sale una letra y todos llenan las categorías a la vez.
// El primero que completa todo canta ¡Basta!; después se votan las respuestas dudosas y se suman puntos.
import { lista, EMPATE } from '../shared/salas.js';

export const CATEGORIAS = ['Nombre', 'Apellido', 'Animal', 'País o ciudad', 'Color', 'Fruta o verdura', 'Cosa', 'Comida',
  'Marca', 'Profesión', 'Famoso/a', 'Película o serie', 'Deporte', 'Cantante o banda', 'Club de fútbol', 'Parte del cuerpo',
  'Instrumento', 'Algo que se rompe', 'Excusa para no ir'];
export const POR_DEFECTO = ['Nombre', 'Animal', 'País o ciudad', 'Color', 'Fruta o verdura', 'Cosa', 'Comida'];
export const RONDAS = [3, 5, 7];
export const LETRAS = 'ABCDEFGHIJLMNOPRSTUV';          // sin las difíciles (K, Ñ, Q, W, X, Y, Z)
export const ESPERA = 6000;                             // después del ¡Basta!, cuánto se espera a los que tardan en entregar

export const info = {
  id: 'tutti-frutti',
  nombre: 'Tutti Frutti',
  desc: 'Sale una letra: llená las categorías antes que nadie y cantá ¡Basta!',
  min: 2, max: 6,
  soloOnline: true,          // cada uno escribe en su pantalla
  sinTurnos: true,           // todos juegan a la vez
  reglas: [
    'Sale una letra al azar y todos completan las categorías con palabras que empiecen con esa letra.',
    'El primero que llena todo canta ¡Basta! y se termina la ronda para todos.',
    'Después se ven las respuestas: tocá las de los otros que no valgan para votarlas ❌. Si la mitad o más de los otros la votan, no vale.',
    'Puntos por categoría: 20 si sos el único que puso algo que vale, 10 si tu respuesta es única y 5 si alguien puso lo mismo.',
    'Las tildes y las mayúsculas no importan. Gana quien suma más puntos al final de las rondas.',
  ],
};

// Mayúsculas, sin tildes (la Ñ queda) y con los espacios ordenados
export const limpiar = s => String(s || '').toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ').replace(/[^A-ZÑ0-9 ]/g, '').replace(/\s+/g, ' ').trim();
export const empiezaBien = (s, letra) => { const w = limpiar(s); return w.length >= 2 && w[0] === letra; };

const letraNueva = usadas => {
  const libres = [...LETRAS].filter(l => !usadas.includes(l));
  const de = libres.length ? libres : [...LETRAS];
  return de[Math.floor(Math.random() * de.length)];
};

export function nuevoJuego(n, op) {
  const cats = op && Array.isArray(op.cats) && op.cats.length >= 3 ? op.cats.slice(0, 12) : POR_DEFECTO;
  const rondas = RONDAS.includes(op && op.rondas) ? op.rondas : 5;
  const letra = letraNueva('');
  return {n, opciones: {cats, rondas}, ronda: 1, letra, usadas: letra, fase: 'escribir', basta: null,
          resp: Array.from({length: n}, () => cats.map(() => '')), entregado: Array(n).fill(0),
          votos: {}, listos: Array(n).fill(0), puntos: Array(n).fill(0), turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.opciones = e.opciones || {cats: POR_DEFECTO, rondas: 5};
  e.opciones.cats = lista(e.opciones.cats);
  const k = e.opciones.cats.length;
  e.resp = Array.from({length: e.n}, (_, p) => { const r = (e.resp || {})[p] || {}; return Array.from({length: k}, (_, c) => String(r[c] || '')); });
  for (const x of ['entregado', 'listos', 'puntos']) e[x] = Array.from({length: e.n}, (_, p) => +((e[x] || {})[p]) || 0);
  e.votos = e.votos || {};
  e.basta = e.basta ? {p: +e.basta.p, t: +e.basta.t} : null;
  e.usadas = e.usadas || e.letra;
  e.ultima = e.ultima || '';
  return e;
}

// Votos en contra de la respuesta de p en la categoría c: string con los asientos que votaron ("02")
export const votosDe = (e, p, c) => String(e.votos[`${p}_${c}`] || '');
export function vale(e, p, c) {
  if (!empiezaBien(e.resp[p][c], e.letra)) return false;
  return votosDe(e, p, c).length * 2 < e.n - 1;
}
// Puntos de la ronda: pr[p][c]
export function puntosRonda(e) {
  const pr = Array.from({length: e.n}, () => e.opciones.cats.map(() => 0));
  e.opciones.cats.forEach((_, c) => {
    const validos = [];
    for (let p = 0; p < e.n; p++) if (vale(e, p, c)) validos.push(p);
    for (const p of validos) {
      if (validos.length === 1) { pr[p][c] = 20; continue; }
      const w = limpiar(e.resp[p][c]).replace(/ /g, '');
      pr[p][c] = validos.some(q => q !== p && limpiar(e.resp[q][c]).replace(/ /g, '') === w) ? 5 : 10;
    }
  });
  return pr;
}
export const completas = (e, p) => e.resp[p].filter(r => empiezaBien(r, e.letra)).length;
export const detalle = (e, i) => (e.fase === 'votar' ? `${e.puntos[i]} pts${e.listos[i] && e.ganador === -1 ? ' ✔' : ''}`
  : `${e.puntos[i]} pts · ${completas(e, i)}/${e.opciones.cats.length}`);

// No hay jugadas por turno: todo pasa por libre()
export const aplicar = () => null;

const respuestas = (e, r) => e.opciones.cats.map((_, c) => String((r || [])[c] || '').slice(0, 40));
function aVotar(e) { e.fase = 'votar'; e.listos.fill(0); e.votos = {}; }

// {tipo:'resp', r}: guardar lo escrito    {tipo:'basta', r}: cantar ¡Basta! (con todo completo)
// {tipo:'entregar', r}: mandar lo que tenía al cantarse ¡Basta!    {tipo:'forzar', t}: seguir sin los que no entregaron
// {tipo:'voto', p, c}: votar (o desvotar) la respuesta de p en c    {tipo:'listo'}: terminé de votar
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  switch (j.tipo) {
    case 'resp':
      if (e.fase !== 'escribir' && !(e.fase === 'cerrando' && !e.entregado[yo])) return null;
      e.resp[yo] = respuestas(e, j.r);
      return e;
    case 'basta': {
      if (e.fase !== 'escribir') return null;
      const r = respuestas(e, j.r);
      if (!r.every(x => empiezaBien(x, e.letra))) return null;
      e.resp[yo] = r; e.entregado = e.entregado.map((_, p) => (p === yo ? 1 : 0));
      e.fase = 'cerrando'; e.basta = {p: yo, t: +j.t || 0};
      e.ultima = `¡${nombre(yo)} cantó Basta!`;
      if (e.entregado.every(Boolean)) aVotar(e);
      return e;
    }
    case 'entregar':
      if (e.fase !== 'cerrando' || e.entregado[yo]) return null;
      e.resp[yo] = respuestas(e, j.r); e.entregado[yo] = 1;
      if (e.entregado.every(Boolean)) aVotar(e);
      return e;
    case 'forzar':
      if (e.fase !== 'cerrando' || !e.basta || +j.t - e.basta.t < ESPERA) return null;
      aVotar(e);
      return e;
    case 'voto': {
      const p = +j.p, c = +j.c;
      if (e.fase !== 'votar' || e.ganador !== -1 || p === yo || !(p >= 0 && p < e.n) || !(c >= 0 && c < e.opciones.cats.length)) return null;
      if (!empiezaBien(e.resp[p][c], e.letra)) return null;
      const k = `${p}_${c}`, v = votosDe(e, p, c);
      e.votos[k] = v.includes(yo) ? v.replace(String(yo), '') : v + yo;
      if (!e.votos[k]) delete e.votos[k];
      e.listos.fill(0);                      // si cambian los votos, todos vuelven a confirmar
      return e;
    }
    case 'listo': {
      if (e.fase !== 'votar' || e.ganador !== -1 || e.listos[yo]) return null;
      e.listos[yo] = 1;
      if (!e.listos.every(Boolean)) return e;
      // Todos confirmaron: se suman los puntos y sigue la próxima ronda (o se termina)
      const pr = puntosRonda(e);
      pr.forEach((fila, p) => { e.puntos[p] += fila.reduce((a, b) => a + b, 0); });
      e.ultima = `Ronda ${e.ronda} (${e.letra}): ` + pr.map((f, p) => `${nombre(p)} +${f.reduce((a, b) => a + b, 0)}`).join(' · ');
      if (e.ronda >= e.opciones.rondas) {
        const max = Math.max(...e.puntos), top = e.puntos.map((x, p) => (x === max ? p : -1)).filter(p => p >= 0);
        e.ganador = top.length === 1 ? top[0] : EMPATE;   // queda en 'votar': se siguen viendo las respuestas
        return e;
      }
      e.ronda++;
      e.letra = letraNueva(e.usadas); e.usadas += e.letra;
      e.fase = 'escribir'; e.basta = null; e.votos = {};
      e.resp = e.resp.map(() => e.opciones.cats.map(() => ''));
      e.entregado.fill(0); e.listos.fill(0);
      return e;
    }
  }
  return null;
}
