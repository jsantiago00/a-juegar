// Código secreto: cada uno esconde un código de 4 para el otro y después lo adivinan por turnos.
// Cada intento devuelve cuántos están bien (lugar justo), y cuántos errados (van, pero en otro lugar).
// Gana quien lo saca en menos intentos; con los mismos intentos, empate.
export const LARGO = 4;
// Los códigos se guardan como texto de 4 dígitos; en Colores cada dígito (0 a 5) es un color de esta lista.
export const MODOS = {
  numeros: {nombre: 'Números', emoji: '🔢', simbolos: 10},
  colores: {nombre: 'Colores', emoji: '🎨', simbolos: 6},
};
export const COLORES = [
  {nombre: 'Rojo', c: '#e8505b'}, {nombre: 'Azul', c: '#3fa7e0'}, {nombre: 'Amarillo', c: '#f4c430'},
  {nombre: 'Verde', c: '#5cc480'}, {nombre: 'Blanco', c: '#ffffff'}, {nombre: 'Violeta', c: '#9b5cff'},
];
export const info = {
  id: 'codigo-secreto',        // = nombre de la carpeta
  nombre: 'Código secreto',
  desc: 'Escondé un código de 4 números o colores y descifrá el del otro antes que él.',
  min: 2, max: 2,
  soloOnline: true,            // el código es secreto: cada uno en su pantalla
  reloj: 30,                   // para esconder el código y para cada intento
  reglas: [
    'Antes de empezar se elige el modo: Números (del 0 al 9) o Colores (rojo, azul, amarillo, verde, blanco y violeta).',
    `Cada uno escribe un código secreto de ${LARGO} para el otro. Se pueden repetir: 0000 o cuatro rojos también valen.`,
    `Después, por turnos, cada uno prueba un código de ${LARGO} para descifrar el del otro. Mientras juega el otro, andá pensando el tuyo.`,
    '✔ Bien: cuántos están en su lugar. ⚠ Errados: cuántos van, pero en otro lugar.',
    'Solo te dice cuántos, nunca cuáles.',
    'Gana quien lo descifra en menos intentos. Si lo saca el que empezó, el otro tiene un último intento para empatar. Si te rendís, gana el otro.',
    '⏱️ Con reloj, tenés ese tiempo en tu turno: si se te acaba, perdés ese intento (cuenta igual) y le toca al otro. Si se acaba mientras esconden los códigos, se esconde uno al azar.',
  ],
};

const modoDe = e => (MODOS[e.opciones && e.opciones.modo] ? e.opciones.modo : 'numeros');
export const simbolos = e => MODOS[modoDe(e)].simbolos;
export const esColores = e => modoDe(e) === 'colores';
export const valido = (e, cod) => typeof cod === 'string' && cod.length === LARGO &&
  [...cod].every(ch => /[0-9]/.test(ch) && +ch < simbolos(e));

// Cuántos bien, errados y no, para un intento contra el código (con repetidos: cada dígito cuenta una sola vez)
export function comparar(intento, codigo) {
  let bien = 0;
  const quedan = {}, prob = {};
  for (let k = 0; k < LARGO; k++) {
    if (intento[k] === codigo[k]) bien++;
    else { quedan[codigo[k]] = (quedan[codigo[k]] || 0) + 1; prob[intento[k]] = (prob[intento[k]] || 0) + 1; }
  }
  let errado = 0;
  for (const ch in prob) errado += Math.min(prob[ch], quedan[ch] || 0);
  return {bien, errado, no: LARGO - bien - errado};
}

// codigos[p]: el que escondió p (lo adivina el otro). intentos[p]: los que probó p, separados por coma.
// fin[p]: 0 jugando, 1 lo descifró, 2 se rindió.
export function nuevoJuego(n, opciones) {   // el motor sortea quién empieza (turno y empieza)
  const modo = opciones && MODOS[opciones.modo] ? opciones.modo : 'numeros';
  return {n, opciones: {modo}, fase: 'codigos', codigos: ['', ''], intentos: ['', ''], fin: [0, 0],
          turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  // Por posición (no con lista()): si Firebase guarda solo el [1], no se tiene que correr al [0]
  const dos = (x, f) => [0, 1].map(i => f((x || {})[i]));
  e.opciones = e.opciones || {modo: 'numeros'};
  e.codigos = dos(e.codigos, x => String(x || ''));
  e.intentos = dos(e.intentos, x => String(x || ''));
  e.fin = dos(e.fin, x => +x || 0);
  e.ultima = e.ultima || '';
  return e;
}
export const objetivo = (e, p) => e.codigos[1 - p];               // el código que adivina p
export const intentosDe = (e, p) => (e.intentos[p] ? e.intentos[p].split(',') : []);
export const PERDIDO = '-';                                        // intento que se pasó del tiempo
const veces = k => `${k} ${k === 1 ? 'intento' : 'intentos'}`;
export const detalle = (e, i) => (e.fase === 'codigos' ? (e.codigos[i] ? 'listo ✔' : 'eligiendo…')
  : e.fin[i] === 1 ? `¡lo sacó en ${veces(intentosDe(e, i).length)}!` : e.fin[i] === 2 ? 'se rindió 🏳️'
  : veces(intentosDe(e, i).length));

// Mientras esconden, el reloj es de los dos; después, del que tiene el turno
export const quienReloj = e => (e.fase === 'codigos' ? -1 : e.turno);
// Escondidos los dos, empieza a adivinar el que salió sorteado
function arrancar(e, nombre) {
  e.fase = 'jugar';
  if (e.empieza != null) e.turno = e.empieza;
  e.ultima = `¡A descifrar! Empieza ${nombre(e.turno)}`;
}

// Se decide apenas se sabe: si uno lo sacó en k y el otro ya usó k sin sacarlo, ganó.
// Si no, le toca al otro (si el primero lo sacó, el otro tiene su intento para empatar).
function decidir(e, nombre) {
  const k = [0, 1].map(p => intentosDe(e, p).length);
  for (const p of [0, 1]) {
    const o = 1 - p;
    if (e.fin[p] !== 1) continue;
    if (e.fin[o] === 1 && k[o] === k[p]) { e.ganador = -2; e.ultima = `Los dos lo sacaron en ${veces(k[p])}`; return; }
    if ((e.fin[o] === 1 && k[o] > k[p]) || (e.fin[o] === 0 && k[o] >= k[p])) {
      e.ganador = p; e.ultima = `${nombre(p)} lo descifró en ${veces(k[p])}`; return;
    }
  }
  if (!e.fin[1 - e.turno]) e.turno = 1 - e.turno;
}
const sumar = (e, p, cod) => { e.intentos[p] = e.intentos[p] ? e.intentos[p] + ',' + cod : cod; };

// En tu turno: {tipo:'intento', codigo}
export function aplicar(e, j, nombre = i => 'Jugador ' + (i + 1)) {
  const yo = e.turno;
  if (e.fase !== 'jugar' || j.tipo !== 'intento' || e.fin[yo] || !valido(e, j.codigo)) return null;
  sumar(e, yo, j.codigo);
  if (j.codigo === objetivo(e, yo)) { e.fin[yo] = 1; e.ultima = `¡${nombre(yo)} descifró el código!`; }
  else { const r = comparar(j.codigo, objetivo(e, yo)); e.ultima = `${nombre(yo)}: ✔ ${r.bien} bien, ⚠ ${r.errado} ${r.errado === 1 ? 'errado' : 'errados'}`; }
  decidir(e, nombre);
  return e;
}

// Sin turno: {tipo:'codigo', codigo}: esconder el código del otro   {tipo:'rendirse'}
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  if (j.tipo === 'codigo') {
    if (e.fase !== 'codigos' || e.codigos[yo] || !valido(e, j.codigo)) return null;
    e.codigos[yo] = j.codigo;
    if (e.codigos[0] && e.codigos[1]) arrancar(e, nombre);
    return e;
  }
  if (j.tipo === 'rendirse' && e.fase === 'jugar' && !e.fin[yo]) {
    e.fin[yo] = 2; e.ganador = 1 - yo; e.ultima = `${nombre(yo)} se rindió`;
    return e;
  }
  return null;
}

// Se acabó el tiempo: al que no escondió se le esconde uno al azar; al que estaba adivinando se le va el intento
export function sinTiempo(e, nombre) {
  if (e.fase === 'codigos') {
    const tarde = [0, 1].filter(p => !e.codigos[p]);
    if (!tarde.length) return null;
    for (const p of tarde) e.codigos[p] = Array.from({length: LARGO}, () => Math.floor(Math.random() * simbolos(e))).join('');
    arrancar(e, nombre);
    e.ultima = `⏱️ A ${tarde.map(p => nombre(p)).join(' y ')} se ${tarde.length > 1 ? 'les' : 'le'} escondió uno al azar. Empieza ${nombre(e.turno)}`;
    return e;
  }
  const p = e.turno;
  if (e.fin[p]) return null;
  sumar(e, p, PERDIDO);
  e.ultima = `⏱️ ${nombre(p)} perdió el intento por tiempo`;
  decidir(e, nombre);
  return e;
}
