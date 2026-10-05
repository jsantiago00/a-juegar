// Ahorcado de a dos: cada uno le pone una palabra al otro y los dos adivinan a la vez, sin turnos.
// Gana quien adivina con menos errores; si empatan, el que terminó primero.
export const MAX_ERRORES = 6, ABC = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
export const MIN_LARGO = 3, MAX_LARGO = 14;
export const info = {
  id: 'ahorcado',              // = nombre de la carpeta
  nombre: 'Ahorcado',
  desc: 'Cada uno le pone una palabra al otro: gana quien la adivina con menos errores.',
  min: 2, max: 2,
  soloOnline: true,            // la palabra es secreta: cada uno en su pantalla
  reglas: [
    `Cada uno escribe una palabra secreta (de ${MIN_LARGO} a ${MAX_LARGO} letras) para que la adivine el otro.`,
    'Cuando los dos la eligieron, cada uno adivina la suya a su ritmo: no hay turnos.',
    `Tocás letras: si no está, es un error. Con ${MAX_ERRORES} errores te ahorcan.`,
    'Gana quien adivina con menos errores. Si empatan, gana el que terminó primero.',
    'Las tildes no cuentan (la Á es A), pero la Ñ es una letra aparte.',
  ],
};

// Mayúsculas, sin tildes (salvo la Ñ) y solo letras
export const limpiar = s => String(s || '').toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ').replace(/[^A-ZÑ]/g, '');

// palabras[p]: la que eligió p (la adivina el otro). letras[p]: las que probó p. fin[p]: 0 jugando, 1 adivinó, 2 ahorcado.
export function nuevoJuego(n) {
  return {n, fase: 'palabras', palabras: ['', ''], letras: ['', ''], errores: [0, 0], fin: [0, 0], t: [0, 0],
          turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  // Por posición (no con lista()): si Firebase guarda solo el [1], no se tiene que correr al [0]
  const dos = (x, f) => [0, 1].map(i => f((x || {})[i]));
  e.palabras = dos(e.palabras, x => limpiar(x));
  e.letras = dos(e.letras, x => String(x || ''));
  e.errores = dos(e.errores, x => +x || 0);
  e.fin = dos(e.fin, x => +x || 0);
  e.t = dos(e.t, x => +x || 0);
  e.ultima = e.ultima || '';
  return e;
}
export const objetivo = (e, p) => e.palabras[1 - p];              // la palabra que adivina p
export const adivinadas = (e, p) => [...objetivo(e, p)].filter(ch => e.letras[p].includes(ch)).length;
export const detalle = (e, i) => (e.fase === 'palabras' ? (e.palabras[i] ? 'lista ✔' : 'eligiendo…')
  : e.fin[i] === 1 ? `¡adivinó! (${e.errores[i]} ❌)` : e.fin[i] === 2 ? 'ahorcado 💀' : `${e.errores[i]}/${MAX_ERRORES} ❌`);

// No hay jugadas por turno: todo pasa por libre()
export const aplicar = () => null;

function decidir(e, nombre) {
  const [a, b] = e.fin;
  if (!a || !b) return;
  if (a === 2 && b === 2) { e.ganador = -2; e.ultima = 'Los dos terminaron ahorcados'; return; }
  let g;
  if (a !== b) g = a === 1 ? 0 : 1;
  else if (e.errores[0] !== e.errores[1]) g = e.errores[0] < e.errores[1] ? 0 : 1;
  else if (e.t[0] !== e.t[1]) g = e.t[0] < e.t[1] ? 0 : 1;
  else { e.ganador = -2; e.ultima = 'Empate perfecto'; return; }
  e.ganador = g;
  e.ultima = `${nombre(g)} adivinó con ${e.errores[g]} ${e.errores[g] === 1 ? 'error' : 'errores'}`;
}

// {tipo:'palabra', palabra}: elegir la palabra para el otro   {tipo:'letra', letra}: probar una letra
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  if (j.tipo === 'palabra') {
    const w = limpiar(j.palabra);
    if (e.fase !== 'palabras' || e.palabras[yo] || w.length < MIN_LARGO || w.length > MAX_LARGO) return null;
    e.palabras[yo] = w;
    if (e.palabras[0] && e.palabras[1]) { e.fase = 'jugar'; e.ultima = '¡A adivinar!'; }
    return e;
  }
  if (j.tipo === 'letra') {
    const L = limpiar(j.letra);
    if (e.fase !== 'jugar' || e.fin[yo] || L.length !== 1 || e.letras[yo].includes(L)) return null;
    e.letras[yo] += L;
    const w = objetivo(e, yo);
    if (w.includes(L)) {
      if ([...w].every(ch => e.letras[yo].includes(ch))) { e.fin[yo] = 1; e.t[yo] = Date.now(); e.ultima = `¡${nombre(yo)} adivinó su palabra!`; }
    } else if (++e.errores[yo] >= MAX_ERRORES) { e.fin[yo] = 2; e.t[yo] = Date.now(); e.ultima = `¡Ahorcaron a ${nombre(yo)}!`; }
    decidir(e, nombre);
    return e;
  }
  return null;
}
