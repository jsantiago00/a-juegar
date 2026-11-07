// =====================================================================
//  Duelo de palabras: cada uno esconde una palabra para el otro y, por turnos, prueban palabras.
//  Cada letra del intento dice: v = está y en ese lugar, a = está pero en otro lugar, g = no está.
//  Gana quien la saca en menos intentos (el otro siempre tiene la misma cantidad de intentos para empatar).
// =====================================================================
export const LARGOS = [4, 5, 6];
export const PERDIDO = '-';                                        // intento que se pasó del tiempo
// Por si a alguien se le acaba el tiempo para esconder la suya
const AL_AZAR = {
  4: ['CASA', 'MESA', 'GATO', 'LUNA', 'PATO', 'ROSA', 'NUBE', 'TREN', 'MANO', 'VASO', 'LORO', 'PERA', 'SAPO', 'FOCA', 'DADO', 'MAPA'],
  5: ['PERRO', 'LIBRO', 'MANGO', 'PLAYA', 'ARBOL', 'FUEGO', 'CIELO', 'TIGRE', 'QUESO', 'BARCO', 'LLAVE', 'PIANO', 'SILLA', 'RELOJ', 'PLATO', 'TORTA'],
  6: ['PLANTA', 'ESPEJO', 'CEREZA', 'CORONA', 'PALOMA', 'ZAPATO', 'TOMATE', 'ABUELA', 'JIRAFA', 'CAMION', 'DIBUJO', 'PELOTA', 'CARTEL', 'MONEDA'],
};

export const info = {
  id: 'duelo-de-palabras',     // = nombre de la carpeta
  nombre: 'Duelo de palabras',
  desc: 'Escondé una palabra y adiviná la del otro, letra por letra.',
  min: 2, max: 2,
  soloOnline: true,            // la palabra es secreta: cada uno en su pantalla
  reloj: 60,                   // para esconder la palabra y para cada intento
  reglas: [
    'Cada uno escribe una palabra secreta para el otro (de 4, 5 o 6 letras, según se elija). Tiene que existir: el juego la revisa con un diccionario.',
    'Después, por turnos, cada uno prueba una palabra del mismo largo para descubrir la del otro. Las que probás también tienen que existir.',
    'Cada letra se pinta: 🟩 verde si está en ese lugar, 🟨 amarilla si está pero en otro lugar, y gris si no está.',
    'Gana quien la descubre en menos intentos. Si el primero la saca, el otro tiene un último intento para empatar.',
    'Las tildes no cuentan: Á es lo mismo que A. La Ñ sí es una letra aparte.',
  ],
};

export const largo = e => (LARGOS.includes(+(e.opciones && e.opciones.largo)) ? +e.opciones.largo : 5);
// Mayúsculas, sin tildes ni nada que no sea letra (la Ñ se queda)
export const limpiar = s => String(s || '').toUpperCase().normalize('NFD').replace(/Ñ/g, 'Ñ')
  .replace(/[̀-ͯ]/g, '').replace(/[^A-ZÑ]/g, '');
export const valida = (e, w) => typeof w === 'string' && w.length === largo(e) && /^[A-ZÑ]+$/.test(w);

// Cómo le fue a cada letra del intento contra la palabra
export function comparar(intento, palabra) {
  const res = Array(intento.length).fill('g'), quedan = {};
  for (let k = 0; k < intento.length; k++) {
    if (intento[k] === palabra[k]) res[k] = 'v';
    else quedan[palabra[k]] = (quedan[palabra[k]] || 0) + 1;
  }
  for (let k = 0; k < intento.length; k++) {
    if (res[k] === 'v' || !quedan[intento[k]]) continue;
    res[k] = 'a'; quedan[intento[k]]--;
  }
  return res.join('');
}

export function nuevoJuego(n, opciones) {   // el motor sortea quién empieza (turno y empieza)
  const l = opciones && LARGOS.includes(+opciones.largo) ? +opciones.largo : 5;
  return {n, opciones: {largo: l}, fase: 'palabras', palabras: ['', ''], intentos: ['', ''], fin: [0, 0],
          turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  const dos = (x, f) => [0, 1].map(i => f((x || {})[i]));
  e.opciones = e.opciones || {largo: 5};
  e.palabras = dos(e.palabras, x => String(x || ''));
  e.intentos = dos(e.intentos, x => String(x || ''));
  e.fin = dos(e.fin, x => +x || 0);
  e.ultima = e.ultima || '';
  return e;
}
export const objetivo = (e, p) => e.palabras[1 - p];               // la palabra que busca p
export const intentosDe = (e, p) => (e.intentos[p] ? e.intentos[p].split(',') : []);
const veces = k => `${k} ${k === 1 ? 'intento' : 'intentos'}`;
export const detalle = (e, i) => (e.fase === 'palabras' ? (e.palabras[i] ? 'lista ✔' : 'eligiendo…')
  : e.fin[i] === 1 ? `¡la sacó en ${veces(intentosDe(e, i).length)}!` : e.fin[i] === 2 ? 'se rindió 🏳️'
  : veces(intentosDe(e, i).length));

export const quienReloj = e => (e.fase === 'palabras' ? -1 : e.turno);
function arrancar(e, nombre) {
  e.fase = 'jugar';
  if (e.empieza != null) e.turno = e.empieza;
  e.ultima = `¡A adivinar! Empieza ${nombre(e.turno)}`;
}

function decidir(e, nombre) {
  const k = [0, 1].map(p => intentosDe(e, p).length);
  for (const p of [0, 1]) {
    const o = 1 - p;
    if (e.fin[p] !== 1) continue;
    if (e.fin[o] === 1 && k[o] === k[p]) { e.ganador = -2; e.ultima = `Los dos la sacaron en ${veces(k[p])}`; return; }
    if ((e.fin[o] === 1 && k[o] > k[p]) || (e.fin[o] === 0 && k[o] >= k[p])) {
      e.ganador = p; e.ultima = `${nombre(p)} la descubrió en ${veces(k[p])}`; return;
    }
  }
  if (!e.fin[1 - e.turno]) e.turno = 1 - e.turno;
}
const sumar = (e, p, w) => { e.intentos[p] = e.intentos[p] ? e.intentos[p] + ',' + w : w; };

// Por turno: {tipo:'intento', palabra}
export function aplicar(e, j, nombre = i => 'Jugador ' + (i + 1)) {
  const yo = e.turno, w = limpiar(j.palabra);
  if (e.fase !== 'jugar' || j.tipo !== 'intento' || e.fin[yo] || !valida(e, w)) return null;
  sumar(e, yo, w);
  if (w === objetivo(e, yo)) { e.fin[yo] = 1; e.ultima = `¡${nombre(yo)} descubrió la palabra!`; }
  else {
    const r = comparar(w, objetivo(e, yo)), v = [...r].filter(x => x === 'v').length, a = [...r].filter(x => x === 'a').length;
    e.ultima = `${nombre(yo)} probó ${w}: 🟩 ${v} · 🟨 ${a}`;
  }
  decidir(e, nombre);
  return e;
}

// A la vez: {tipo:'palabra', palabra} (esconder la tuya)   {tipo:'rendirse'}
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  if (j.tipo === 'palabra') {
    const w = limpiar(j.palabra);
    if (e.fase !== 'palabras' || e.palabras[yo] || !valida(e, w)) return null;
    e.palabras[yo] = w;
    if (e.palabras[0] && e.palabras[1]) arrancar(e, nombre);
    return e;
  }
  if (j.tipo === 'rendirse' && e.fase === 'jugar' && !e.fin[yo]) {
    e.fin[yo] = 2; e.ganador = 1 - yo; e.ultima = `${nombre(yo)} se rindió`;
    return e;
  }
  return null;
}

export function sinTiempo(e, nombre) {
  if (e.fase === 'palabras') {
    const tarde = [0, 1].filter(p => !e.palabras[p]);
    if (!tarde.length) return null;
    const lista = AL_AZAR[largo(e)];
    for (const p of tarde) e.palabras[p] = lista[Math.floor(Math.random() * lista.length)];
    arrancar(e, nombre);
    e.ultima = `⏱️ A ${tarde.map(p => nombre(p)).join(' y ')} se ${tarde.length > 1 ? 'les' : 'le'} eligió una al azar. Empieza ${nombre(e.turno)}`;
    return e;
  }
  const p = e.turno;
  if (e.fin[p]) return null;
  sumar(e, p, PERDIDO);
  e.ultima = `⏱️ ${nombre(p)} perdió el intento por tiempo`;
  decidir(e, nombre);
  return e;
}
