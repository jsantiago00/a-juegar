// Truco argentino (sin flor) de 2, 4 o 6. Con equipos, los asientos se alternan: 0, 2, 4 contra 1, 3, 5.
// Todo pasa por turnos: el que tiene que contestar un canto tiene el turno.
// A 6, con "punta y hacha": entre los 5 de las malas y los 10 de las buenas se intercala una mano normal
// y una de duelos 1 contra 1 con el de enfrente (se juegan de a uno; los puntos van al equipo).
import { lista } from '../shared/salas.js';

export const PALOS = ['e', 'b', 'o', 'c'];                       // espada, basto, oro, copa
export const NOMBRE_PALO = {e: 'espada', b: 'basto', o: 'oro', c: 'copa'};
export const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
export const METAS = [15, 30];
export const CANTO_TRUCO = {2: 'Truco', 3: 'Retruco', 4: 'Vale cuatro'};
export const CANTO_ENVIDO = {envido: 'Envido', real: 'Real envido', falta: 'Falta envido'};

export const info = {
  id: 'truco',
  nombre: 'Truco',
  desc: 'El truco de siempre: de a 2, 4 o 6, con envido, truco, retruco, vale cuatro y punta y hacha.',
  min: 2, max: 6, cantidades: [2, 4, 6],
  equipos: 2,                // equipo = asiento % 2; de a 4 o 6 se pueden elegir (o sortear) antes de empezar
  soloOnline: true,          // las cartas son secretas: cada uno en su pantalla
  reglas: [
    'Se juega con el mazo español de 40 cartas, sin flor. Cada mano se reparten 3 cartas y gana la mano el equipo que gana 2 de las 3 bazas.',
    'De a 4 o de a 6 se juega en dos equipos, sentados alternados. Antes de empezar, cada uno puede elegir su equipo (o se arman al azar).',
    'De mayor a menor: 1 de espada, 1 de basto, 7 de espada, 7 de oro, los 3, los 2, 1 de oro y de copa, los 12, 11, 10, 7 de copa y de basto, 6, 5 y 4.',
    'Cada baza la gana el equipo de la carta más alta (si empatan cartas de los dos equipos, es parda). Si una baza es parda, define la siguiente; si la primera la ganó alguien y después hay parda, gana el de la primera. Si todo es parda, gana el equipo del mano.',
    'Truco (2 puntos), Retruco (3) y Vale cuatro (4): solo puede subir el equipo que quiso el último canto. Contesta el rival que sigue en la ronda. Si no quieren, el que cantó se lleva lo que valía antes.',
    'Envido (2), Real envido (3) y Falta envido (lo que le falta al que va ganando): se canta en la primera baza antes de tirar tu primera carta. El envido está primero: si te cantan truco, podés contestar con envido.',
    'Tanto: dos cartas del mismo palo suman 20 más sus números (las figuras valen 0); si no, vale tu carta más alta. Gana el mejor tanto de cada equipo; si empatan, el que está más cerca del mano.',
    'Irse al mazo le da al otro equipo lo que valía la mano. Gana el equipo que llega primero a los puntos de la partida (15 o 30).',
    'Punta y hacha (de a 6, a 30, si se eligió): desde los 5 de las malas hasta los 10 de las buenas, se intercala una mano normal con una de tres duelos: cada uno contra el de enfrente, uno después del otro. Los puntos de cada duelo van a su equipo.',
  ],
};

// ---------- Cartas ----------
export const num = c => parseInt(c, 10);
export const palo = c => c.slice(-1);
const RANGO = {'1e': 14, '1b': 13, '7e': 12, '7o': 11};
export function valor(c) {
  if (RANGO[c]) return RANGO[c];
  return {3: 10, 2: 9, 1: 8, 12: 7, 11: 6, 10: 5, 7: 4, 6: 3, 5: 2, 4: 1}[num(c)];
}
const puntoEnvido = c => (num(c) <= 7 ? num(c) : 0);
export function tanto(cartas) {
  let mejor = Math.max(...cartas.map(puntoEnvido));
  for (let a = 0; a < cartas.length; a++) for (let b = a + 1; b < cartas.length; b++)
    if (palo(cartas[a]) === palo(cartas[b])) mejor = Math.max(mejor, 20 + puntoEnvido(cartas[a]) + puntoEnvido(cartas[b]));
  return mejor;
}
export function mazoMezclado(azar = Math.random) {
  const m = PALOS.flatMap(p => NUMEROS.map(n => n + p));
  for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; }
  return m;
}

// ---------- Equipos y ronda ----------
export const equipo = p => p % 2;
export const companeros = (e, eq) => Array.from({length: e.n}, (_, i) => i).filter(i => equipo(i) === eq);
// jug: los que juegan esta mano (o este duelo), en orden empezando por el mano
const sig = (e, p) => e.jug[(e.jug.indexOf(p) + 1) % e.jug.length];
export function rivalDe(e, p) { let q = sig(e, p); while (equipo(q) === equipo(p)) q = sig(e, q); return q; }
const desde = (e, p) => { const i = e.jug.indexOf(p); return [...e.jug.slice(i), ...e.jug.slice(0, i)]; };

// ¿Esta mano va de punta y hacha?
export function tocaPyh(e) {
  if (!e.opciones.pyh || e.n !== 6) return false;
  const max = Math.max(...e.puntos), desdeP = e.opciones.meta / 6, hasta = e.opciones.meta * 5 / 6;
  return max >= desdeP && max <= hasta && e.tipo !== 'pyh';
}

// ---------- Estado ----------
// mano: el mano de la mano (con duelos, el del duelo es jug[0]). aJugar: a quién le toca tirar. lider: quién abrió la baza.
// turno: quién tiene que hacer algo (tirar, o contestar un canto).
// canto: lo que espera respuesta: {tipo:'truco', nivel, por} o {tipo:'envido', lista, por}.
// enEspera: el truco que quedó pendiente mientras se resuelve el envido ("el envido está primero").
// truco: {valor, quiere}: cuánto vale la mano y qué equipo puede subir (-1: cualquiera).
// bazas: equipo que ganó cada baza (-1 parda). puntos: por equipo.
function empezarRonda(e, jug) {
  Object.assign(e, {jug, bazas: [], lider: jug[0], aJugar: jug[0], turno: jug[0], canto: null, enEspera: null,
                    truco: {valor: 1, quiere: -1}, envido: 0, fase: 'jugar', proximo: ''});
}
function repartir(e, mano) {
  const m = mazoMezclado();
  e.mano = mano;
  e.cartas = Array.from({length: e.n}, (_, i) => m.slice(i * 3, i * 3 + 3));
  e.jugadas = Array.from({length: e.n}, () => []);
  if (tocaPyh(e)) {
    e.tipo = 'pyh';
    e.duelos = [0, 1, 2].map(k => { const a = (mano + k) % 6; return [a, (a + 3) % 6]; });
    e.duelo = 0;
    empezarRonda(e, e.duelos[0]);
  } else {
    e.tipo = 'normal'; e.duelos = []; e.duelo = 0;
    empezarRonda(e, Array.from({length: e.n}, (_, k) => (mano + k) % e.n));
  }
}
export function nuevoJuego(n, op, quien = 0) {
  const meta = METAS.includes(op && op.meta) ? op.meta : 30;
  const e = {n, opciones: {meta, pyh: !!(op && op.pyh)}, puntos: [0, 0], ganador: -1, ultima: '', log: [], nroMano: 1, tipo: 'normal'};
  repartir(e, quien);
  return e;
}
const canto = c => (!c ? null : c.tipo === 'truco' ? {tipo: 'truco', nivel: +c.nivel, por: +c.por}
  : {tipo: 'envido', lista: lista(c.lista), por: +c.por});
export function normalizar(e) {
  e.opciones = e.opciones || {meta: 30};
  e.opciones.pyh = !!e.opciones.pyh;
  e.puntos = [0, 1].map(i => +((e.puntos || {})[i]) || 0);
  e.cartas = Array.from({length: e.n}, (_, i) => lista((e.cartas || {})[i]));
  e.jugadas = Array.from({length: e.n}, (_, i) => lista((e.jugadas || {})[i]));
  e.jug = lista(e.jug).map(Number);
  if (!e.jug.length) e.jug = Array.from({length: e.n}, (_, k) => (e.mano + k) % e.n);   // salas de la versión de a dos
  e.lider = e.lider == null ? e.jug[0] : +e.lider;
  e.duelos = lista(e.duelos).map(d => lista(d).map(Number));
  e.duelo = +e.duelo || 0;
  e.tipo = e.tipo || 'normal';
  e.proximo = e.proximo || '';
  e.bazas = lista(e.bazas).map(Number);
  e.canto = canto(e.canto);
  e.enEspera = canto(e.enEspera);
  e.truco = e.truco ? {valor: +e.truco.valor || 1, quiere: e.truco.quiere == null ? -1 : +e.truco.quiere} : {valor: 1, quiere: -1};
  e.envido = +e.envido || 0;
  e.log = lista(e.log);
  e.ultima = e.ultima || '';
  return e;
}
export const detalle = (e, i) => (e.n === 2 ? `${e.puntos[i]} pts` : `eq. ${equipo(i) + 1}`) +
  (e.jug[0] === i && e.ganador === -1 ? ' · mano' : '') + (e.ganador === -1 && !e.jug.includes(i) ? ' · mira' : '');
export const ganadores = e => (e.ganador >= 0 ? companeros(e, equipo(e.ganador)) : []);

// ---------- Ayudas ----------
function anotar(e, txt) { e.ultima = txt; e.log.push(txt); if (e.log.length > 14) e.log.shift(); }
const nombreEq = (e, eq, nombre) => (e.n === 2 ? nombre(eq) : companeros(e, eq).map(nombre).join(' y '));
function sumar(e, eq, k) {
  e.puntos[eq] = Math.min(e.opciones.meta, e.puntos[eq] + k);
  if (e.puntos[eq] >= e.opciones.meta && e.ganador === -1) e.ganador = eq;   // el asiento eq es del equipo eq
}
// ¿Qué equipo ganó la mano según las bazas? -1 si todavía no se sabe
export function ganadorMano(e) {
  const r = e.bazas, m = equipo(e.jug[0]);
  if (r.length < 2) return -1;
  if (r[0] === -1) return r[1] !== -1 ? r[1] : r.length === 3 ? (r[2] !== -1 ? r[2] : m) : -1;
  if (r[1] === -1 || r[1] === r[0]) return r[0];
  return r.length === 3 ? (r[2] !== -1 ? r[2] : r[0]) : -1;
}
const enJuego = (e, p) => e.ganador === -1 && e.fase === 'jugar' && e.jug.includes(p);
// Empezar un envido: en la primera baza, antes de tirar tu primera carta y si todavía no se quiso el truco
export const puedeEnvido = (e, p) => enJuego(e, p) && !e.envido && e.bazas.length === 0 &&
  e.jugadas[p].length === 0 && e.truco.valor === 1;
// Lo que se puede cantar de envido después de la lista que ya hay
export function envidosPosibles(listaActual) {
  const l = listaActual || [];
  if (l.includes('falta')) return [];
  if (l.includes('real')) return ['falta'];
  return l.filter(x => x === 'envido').length >= 2 ? ['real', 'falta'] : ['envido', 'real', 'falta'];
}
const valorEnvido = (e, l) => l.reduce((a, x) => a + (x === 'envido' ? 2 : x === 'real' ? 3 : e.opciones.meta - Math.max(...e.puntos)), 0);
export const puedeTruco = (e, p) => enJuego(e, p) && !e.canto && e.aJugar === p &&
  e.truco.valor < 4 && (e.truco.quiere === -1 || e.truco.quiere === equipo(p));
// Contestar un truco subiéndolo ("¡Quiero retruco!")
export const puedeSubirTruco = (e, p) => !!e.canto && e.canto.tipo === 'truco' && equipo(e.canto.por) !== equipo(p) && e.canto.nivel < 4;

function terminarMano(e, eq, motivo, nombre) {
  sumar(e, eq, e.truco.valor);
  const quien = e.tipo === 'pyh' ? `${nombre(e.jug.find(p => equipo(p) === eq))} (para su equipo)` : nombreEq(e, eq, nombre);
  anotar(e, `${motivo}: ${quien} ${e.n === 2 || e.tipo === 'pyh' ? 'se lleva' : 'se llevan'} ${e.truco.valor} ${e.truco.valor === 1 ? 'punto' : 'puntos'}`);
  e.fase = 'fin'; e.canto = null; e.enEspera = null;
  if (e.tipo === 'pyh' && e.duelo + 1 < e.duelos.length) { e.proximo = 'duelo'; e.turno = e.duelos[e.duelo + 1][0]; }
  else { e.proximo = 'mano'; e.turno = (e.mano + 1) % e.n; }   // el próximo mano reparte la siguiente
}
// Después de resolver el envido, vuelve el truco que estaba esperando (o sigue el juego)
function despuesDelEnvido(e) {
  e.canto = e.enEspera; e.enEspera = null;
  e.turno = e.canto ? rivalDe(e, e.canto.por) : e.aJugar;
}

// ---------- Jugadas ----------
// {tipo:'carta', c}  {tipo:'truco'}  {tipo:'envido', cual}  {tipo:'quiero'}  {tipo:'noquiero'}  {tipo:'mazo'}  {tipo:'repartir'}
export function aplicar(e, j, nombre) {
  const p = e.turno;
  if (e.ganador !== -1) return null;
  if (j.tipo === 'repartir') {
    if (e.fase !== 'fin') return null;
    if (e.proximo === 'duelo') {
      e.duelo++;
      empezarRonda(e, e.duelos[e.duelo]);
      e.ultima = `Punta y hacha, duelo ${e.duelo + 1} de 3: ${nombre(e.jug[0])} contra ${nombre(e.jug[1])}`;
      return e;
    }
    repartir(e, (e.mano + 1) % e.n); e.nroMano++;
    e.ultima = e.tipo === 'pyh' ? `¡Punta y hacha! Duelo 1 de 3: ${nombre(e.jug[0])} contra ${nombre(e.jug[1])}`
      : `Mano ${e.nroMano}: es mano ${nombre(e.mano)}`;
    return e;
  }
  if (e.fase !== 'jugar' || !e.jug.includes(p)) return null;
  const q = rivalDe(e, p);

  switch (j.tipo) {
    case 'carta': {
      const c = String(j.c), b = e.bazas.length;
      if (e.canto || e.aJugar !== p || !e.cartas[p].includes(c) || e.jugadas[p].includes(c) || e.jugadas[p].length !== b) return null;
      e.jugadas[p].push(c);
      const s = sig(e, p);
      if (e.jugadas[s].length === b) { e.aJugar = e.turno = s; e.ultima = `${nombre(p)} tiró el ${num(c)} de ${NOMBRE_PALO[palo(c)]}`; return e; }
      // Se completó la baza: gana el equipo de la carta más alta (parda si empatan dos equipos)
      const orden = desde(e, e.lider), max = Math.max(...orden.map(x => valor(e.jugadas[x][b])));
      const altos = orden.filter(x => valor(e.jugadas[x][b]) === max);
      const eqs = new Set(altos.map(equipo));
      const gb = eqs.size === 1 ? equipo(altos[0]) : -1;
      e.bazas.push(gb);
      const gm = ganadorMano(e);
      if (gm >= 0) { terminarMano(e, gm, `${e.tipo === 'pyh' ? nombre(e.jug.find(x => equipo(x) === gm)) + ' ganó el duelo' : nombreEq(e, gm, nombre) + (e.n === 2 ? ' ganó' : ' ganaron') + ' la mano'}`, nombre); return e; }
      // Abre la próxima baza el que tiró la carta más alta (en parda, el primero de los empatados)
      e.lider = e.aJugar = e.turno = gb === -1 ? desde(e, e.jug[0]).find(x => altos.includes(x)) : altos[0];
      e.ultima = gb === -1 ? 'Parda' : `${nombre(altos[0])} ganó la baza`;
      return e;
    }
    case 'truco': {
      if (puedeSubirTruco(e, p)) {                         // quiere lo que le cantaron y sube
        e.truco = {valor: e.canto.nivel, quiere: equipo(p)};
        e.canto = {tipo: 'truco', nivel: e.truco.valor + 1, por: p};
        e.turno = q;
        anotar(e, `${nombre(p)}: ¡Quiero ${CANTO_TRUCO[e.canto.nivel].toLowerCase()}!`);
        return e;
      }
      if (!puedeTruco(e, p)) return null;
      e.canto = {tipo: 'truco', nivel: e.truco.valor + 1, por: p};
      e.turno = q;
      anotar(e, `${nombre(p)}: ¡${CANTO_TRUCO[e.canto.nivel]}!`);
      return e;
    }
    case 'envido': {
      const cual = j.cual;
      if (!CANTO_ENVIDO[cual]) return null;
      if (!e.canto) {                                      // canta en su turno de tirar
        if (e.aJugar !== p || !puedeEnvido(e, p)) return null;
        e.canto = {tipo: 'envido', lista: [cual], por: p};
      } else if (e.canto.tipo === 'truco') {               // el envido está primero
        if (e.canto.nivel !== 2 || equipo(e.canto.por) === equipo(p) || !puedeEnvido(e, p)) return null;
        e.enEspera = e.canto;
        e.canto = {tipo: 'envido', lista: [cual], por: p};
      } else {                                             // sube el envido que le cantaron
        if (equipo(e.canto.por) === equipo(p) || !envidosPosibles(e.canto.lista).includes(cual)) return null;
        e.canto = {tipo: 'envido', lista: [...e.canto.lista, cual], por: p};
      }
      e.turno = q;
      anotar(e, `${nombre(p)}: ¡${CANTO_ENVIDO[cual]}!`);
      return e;
    }
    case 'quiero': {
      const c = e.canto;
      if (!c || equipo(c.por) === equipo(p)) return null;
      if (c.tipo === 'truco') {
        e.truco = {valor: c.nivel, quiere: equipo(p)};
        e.canto = null; e.turno = e.aJugar;
        anotar(e, `${nombre(p)}: ¡Quiero! (la mano vale ${c.nivel})`);
        return e;
      }
      // Gana el mejor tanto; si empatan, el más cercano al mano
      const tantos = e.jug.map(x => [x, tanto(e.cartas[x])]), max = Math.max(...tantos.map(t => t[1]));
      const g = equipo(tantos.find(t => t[1] === max)[0]), pts = valorEnvido(e, c.lista);
      const mejor = eq => tantos.filter(t => equipo(t[0]) === eq).sort((a, b) => b[1] - a[1])[0];
      const dice = [0, 1].map(eq => mejor(eq)).filter(Boolean).sort((a, b) => e.jug.indexOf(a[0]) - e.jug.indexOf(b[0]))
        .map(([x, t]) => `${nombre(x)} tiene ${t}`).join(', ');
      e.envido = 1;
      anotar(e, `${nombre(p)}: ¡Quiero! — ${dice}: ${e.tipo === 'pyh' ? nombre(e.jug.find(x => equipo(x) === g)) : nombreEq(e, g, nombre)} ${e.n === 2 || e.tipo === 'pyh' ? 'gana' : 'ganan'} el envido (+${pts})`);
      sumar(e, g, pts);
      despuesDelEnvido(e);
      return e;
    }
    case 'noquiero': {
      const c = e.canto;
      if (!c || equipo(c.por) === equipo(p)) return null;
      if (c.tipo === 'truco') { terminarMano(e, equipo(c.por), `${nombre(p)} no quiso`, nombre); return e; }
      const pts = Math.max(1, valorEnvido(e, c.lista.slice(0, -1)));
      e.envido = 1;
      anotar(e, `${nombre(p)}: No quiero (+${pts} para ${e.tipo === 'pyh' ? nombre(c.por) : nombreEq(e, equipo(c.por), nombre)})`);
      sumar(e, equipo(c.por), pts);
      despuesDelEnvido(e);
      return e;
    }
    case 'mazo': {
      if (e.canto) return null;
      terminarMano(e, equipo(q), `${nombre(p)} se fue al mazo`, nombre);
      return e;
    }
  }
  return null;
}
