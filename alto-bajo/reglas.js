// Más alto o más bajo: cada uno esconde un número para el otro y después lo buscan por turnos.
// A cada número que probás te contesta solo si el secreto es más alto o más bajo.
// Gana quien lo encuentra en menos intentos; con los mismos intentos, empate.
export const TOPES = [100, 1000, 10000, 1000000];
export const PERDIDO = '-';                       // intento que se pasó del tiempo
export const miles = x => Number(x).toLocaleString('es-AR');
export const info = {
  id: 'alto-bajo',             // = nombre de la carpeta
  nombre: 'Más alto o más bajo',
  desc: 'Escondé un número y encontrá el del otro: solo te dicen si es más alto o más bajo.',
  min: 2, max: 2,
  soloOnline: true,            // el número es secreto: cada uno en su pantalla
  reloj: 30,                   // para esconder el número y para cada intento
  reglas: [
    'Antes de empezar se elige hasta qué número se juega: 100, 1.000, 10.000 o 1.000.000.',
    'Cada uno esconde un número para el otro (del 1 al tope).',
    'Después, por turnos, cada uno prueba un número para encontrar el del otro. Mientras juega el otro, andá pensando el tuyo.',
    'A cada número te contesta ⬆ más alto o ⬇ más bajo, hasta que le pegás.',
    'Gana quien lo encuentra en menos intentos. Si lo encuentra el que empezó, el otro tiene un último intento para empatar. Si te rendís, gana el otro.',
    '⏱️ Con reloj, tenés ese tiempo en tu turno: si se te acaba, perdés ese intento (cuenta igual) y le toca al otro. Si se acaba mientras esconden los números, se esconde uno al azar.',
  ],
};

export const tope = e => (TOPES.includes(+(e.opciones && e.opciones.tope)) ? +e.opciones.tope : 100);
export const valido = (e, x) => Number.isInteger(x) && x >= 1 && x <= tope(e);

// numeros[p]: el que escondió p (lo busca el otro; 0 = todavía no). intentos[p]: los que probó p, separados por coma.
// fin[p]: 0 jugando, 1 lo encontró, 2 se rindió. El motor sortea quién empieza (turno y empieza).
export function nuevoJuego(n, opciones) {
  const t = opciones && TOPES.includes(+opciones.tope) ? +opciones.tope : 100;
  return {n, opciones: {tope: t}, fase: 'numeros', numeros: [0, 0], intentos: ['', ''], fin: [0, 0],
          turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  // Por posición (no con lista()): si Firebase guarda solo el [1], no se tiene que correr al [0]
  const dos = (x, f) => [0, 1].map(i => f((x || {})[i]));
  e.opciones = e.opciones || {tope: 100};
  e.numeros = dos(e.numeros, x => +x || 0);
  e.intentos = dos(e.intentos, x => String(x || ''));
  e.fin = dos(e.fin, x => +x || 0);
  e.ultima = e.ultima || '';
  return e;
}
export const objetivo = (e, p) => e.numeros[1 - p];               // el número que busca p
export const intentosDe = (e, p) => (e.intentos[p] ? e.intentos[p].split(',') : []);
// Entre qué números puede estar, según lo que ya probó p
export function rango(e, p) {
  let desde = 1, hasta = tope(e);
  const obj = objetivo(e, p);
  for (const x of intentosDe(e, p)) {
    if (x === PERDIDO) continue;
    if (+x < obj) desde = Math.max(desde, +x + 1);
    else if (+x > obj) hasta = Math.min(hasta, +x - 1);
  }
  return {desde, hasta};
}
const veces = k => `${k} ${k === 1 ? 'intento' : 'intentos'}`;
export const detalle = (e, i) => (e.fase === 'numeros' ? (e.numeros[i] ? 'listo ✔' : 'eligiendo…')
  : e.fin[i] === 1 ? `¡lo encontró en ${veces(intentosDe(e, i).length)}!` : e.fin[i] === 2 ? 'se rindió 🏳️'
  : veces(intentosDe(e, i).length));

// Mientras esconden, el reloj es de los dos; después, del que tiene el turno
export const quienReloj = e => (e.fase === 'numeros' ? -1 : e.turno);
// Escondidos los dos, empieza a buscar el que salió sorteado
function arrancar(e, nombre) {
  e.fase = 'jugar';
  if (e.empieza != null) e.turno = e.empieza;
  e.ultima = `¡A buscar! Empieza ${nombre(e.turno)}`;
}

// Se decide apenas se sabe: si uno lo encontró en k y el otro ya usó k sin encontrarlo, ganó.
// Si no, le toca al otro (si el primero lo encontró, el otro tiene su intento para empatar).
function decidir(e, nombre) {
  const k = [0, 1].map(p => intentosDe(e, p).length);
  for (const p of [0, 1]) {
    const o = 1 - p;
    if (e.fin[p] !== 1) continue;
    if (e.fin[o] === 1 && k[o] === k[p]) { e.ganador = -2; e.ultima = `Los dos lo encontraron en ${veces(k[p])}`; return; }
    if ((e.fin[o] === 1 && k[o] > k[p]) || (e.fin[o] === 0 && k[o] >= k[p])) {
      e.ganador = p; e.ultima = `${nombre(p)} lo encontró en ${veces(k[p])}`; return;
    }
  }
  if (!e.fin[1 - e.turno]) e.turno = 1 - e.turno;
}
const sumar = (e, p, x) => { e.intentos[p] = e.intentos[p] ? e.intentos[p] + ',' + x : String(x); };

// En tu turno: {tipo:'intento', valor}
export function aplicar(e, j, nombre = i => 'Jugador ' + (i + 1)) {
  const yo = e.turno;
  if (e.fase !== 'jugar' || j.tipo !== 'intento' || e.fin[yo] || !valido(e, j.valor)) return null;
  sumar(e, yo, j.valor);
  const obj = objetivo(e, yo);
  if (j.valor === obj) { e.fin[yo] = 1; e.ultima = `¡${nombre(yo)} encontró el número!`; }
  else e.ultima = `${nombre(yo)} probó ${miles(j.valor)}: ${j.valor < obj ? '⬆ más alto' : '⬇ más bajo'}`;
  decidir(e, nombre);
  return e;
}

// Sin turno: {tipo:'numero', valor}: esconder el del otro   {tipo:'rendirse'}
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  if (j.tipo === 'numero') {
    if (e.fase !== 'numeros' || e.numeros[yo] || !valido(e, j.valor)) return null;
    e.numeros[yo] = j.valor;
    if (e.numeros[0] && e.numeros[1]) arrancar(e, nombre);
    return e;
  }
  if (j.tipo === 'rendirse' && e.fase === 'jugar' && !e.fin[yo]) {
    e.fin[yo] = 2; e.ganador = 1 - yo; e.ultima = `${nombre(yo)} se rindió`;
    return e;
  }
  return null;
}

// Se acabó el tiempo: al que no escondió se le esconde uno al azar; al que estaba buscando se le va el intento
export function sinTiempo(e, nombre) {
  if (e.fase === 'numeros') {
    const tarde = [0, 1].filter(p => !e.numeros[p]);
    if (!tarde.length) return null;
    for (const p of tarde) e.numeros[p] = 1 + Math.floor(Math.random() * tope(e));
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
