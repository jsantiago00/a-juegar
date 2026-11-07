// =====================================================================
//  Dados mentirosos: cada uno tiene sus dados escondidos. Por turnos se apuesta cuántos dados de un número
//  hay en TODA la mesa, siempre subiendo, hasta que alguien dice "¡Dudo!" y se levantan los vasos.
//  El que se equivocó pierde un dado; el último que tiene dados gana.
//  dados[i]: los dados de cada uno como texto ('13356'); ap: la apuesta que está en la mesa {c, v, p}.
// =====================================================================
export const DADOS = 5;
export const CARA = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];
export const CARAS = ['', 'unos', 'doses', 'treses', 'cuatros', 'cincos', 'seises'];
export const textoApuesta = (c, v) => `${c} ${c === 1 ? CARA[v] : CARAS[v]}`;

export const info = {
  id: 'dados-mentirosos',      // = nombre de la carpeta
  nombre: 'Dados mentirosos',
  desc: 'Apostá cuántos dados hay en la mesa… o decí ¡dudo!',
  min: 2, max: 6,
  soloOnline: true,            // los dados de cada uno son secretos
  reglas: [
    `Cada uno tiene ${DADOS} dados que solo ve él. Al empezar cada ronda, todos tiran.`,
    'Por turnos, cada uno apuesta cuántos dados de un número hay en TODA la mesa, contando los de todos (por ejemplo: "hay cuatro cincos").',
    'Cada apuesta tiene que subir: más dados, o la misma cantidad de un número más alto.',
    'En vez de subir, podés decir ¡Dudo! Se muestran todos los dados: si hay menos de los que se apostaron, pierde un dado el que apostó; si hay esos o más, pierde un dado el que dudó.',
    'El que perdió el dado arranca la ronda siguiente. Quien se queda sin dados, queda afuera. Gana el último que tiene dados.',
    'Con la opción de comodines, los unos cuentan como cualquier número (y no se puede apostar a los unos).',
  ],
};

const tirar = k => Array.from({length: k}, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b).join('');
export const total = e => e.cant.reduce((s, x) => s + x, 0);
export const vivos = e => e.cant.map((c, i) => (c > 0 ? i : -1)).filter(i => i >= 0);
export const minCara = e => (e.opciones.comodines ? 2 : 1);
export function siguiente(e, p) {
  for (let k = 1; k <= e.n; k++) { const q = (p + k) % e.n; if (e.cant[q] > 0) return q; }
  return p;
}
// Cuántos dados de v hay en la mesa (con comodines, los unos también cuentan)
export const cuenta = (e, v) => e.dados.join('').split('').filter(d => +d === v || (e.opciones.comodines && d === '1')).length;
// ¿Esta apuesta sube la que está en la mesa?
export const sube = (e, c, v) => c >= 1 && c <= total(e) && v >= minCara(e) && v <= 6 && (c > e.ap.c || (c === e.ap.c && v > e.ap.v));

export function nuevoJuego(n, op, quien = 0) {
  const cant = Array(n).fill(DADOS);
  return {n, opciones: {comodines: !!(op && op.comodines)}, cant, dados: cant.map(tirar), ap: {c: 0, v: 0, p: -1}, hist: '',
          fase: 'apostar', ronda: 1, turno: quien, empieza: quien, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.opciones = e.opciones || {comodines: false};
  e.cant = Array.from({length: e.n}, (_, i) => +((e.cant || {})[i]) || 0);
  e.dados = Array.from({length: e.n}, (_, i) => String((e.dados || {})[i] || ''));
  const a = e.ap || {};
  e.ap = {c: +a.c || 0, v: +a.v || 0, p: a.p == null ? -1 : +a.p};
  e.hist = String(e.hist || '');
  e.res = e.res ? {d: +e.res.d, a: +e.res.a, c: +e.res.c, v: +e.res.v, hay: +e.res.hay, perd: +e.res.perd} : null;
  e.ronda = +e.ronda || 1;
  e.ultima = e.ultima || '';
  return e;
}
export const detalle = (e, i) => (e.cant[i] ? `🎲 ${e.cant[i]}` : 'afuera');
// Las apuestas de esta ronda: [{p, c, v}]
export const apuestas = e => (e.hist ? e.hist.split(',').map(x => { const [p, c, v] = x.split(':').map(Number); return {p, c, v}; }) : []);

// Por turno: {tipo:'apostar', c, v}   {tipo:'dudo'}
export function aplicar(e, j, nombre) {
  const p = e.turno;
  if (e.fase !== 'apostar' || !e.cant[p]) return null;
  if (j.tipo === 'apostar') {
    const c = +j.c, v = +j.v;
    if (!Number.isInteger(c) || !Number.isInteger(v) || !sube(e, c, v)) return null;
    e.ap = {c, v, p};
    e.hist = (e.hist ? e.hist + ',' : '') + `${p}:${c}:${v}`;
    e.ultima = `${nombre(p)}: "hay ${textoApuesta(c, v)}"`;
    e.turno = siguiente(e, p);
    return e;
  }
  if (j.tipo === 'dudo') {
    if (!e.ap.c || e.ap.p === p) return null;
    const hay = cuenta(e, e.ap.v), perd = hay >= e.ap.c ? p : e.ap.p;
    e.res = {d: p, a: e.ap.p, c: e.ap.c, v: e.ap.v, hay, perd};
    e.cant[perd]--;
    e.fase = 'ver';
    e.ultima = `${nombre(p)} dudó y había ${hay}: pierde un dado ${nombre(perd)}`;
    const vs = vivos(e);
    if (vs.length === 1) e.ganador = vs[0];
    else e.turno = e.cant[perd] ? perd : siguiente(e, perd);   // arranca la próxima el que perdió (si sigue)
    return e;
  }
  return null;
}

// Cualquiera, con los vasos levantados: {tipo:'seguir'} -> otra ronda
export function libre(e, j) {
  if (j.tipo !== 'seguir' || e.fase !== 'ver' || e.ganador !== -1) return null;
  e.dados = e.cant.map(k => (k ? tirar(k) : ''));
  e.ap = {c: 0, v: 0, p: -1};
  e.hist = ''; e.res = null; e.fase = 'apostar'; e.ronda++;
  e.ultima = `Ronda ${e.ronda}: todos tiraron los dados`;
  return e;
}
