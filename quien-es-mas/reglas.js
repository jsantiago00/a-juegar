// =====================================================================
//  ¿Quién es más probable?: sale una frase ("…se quede dormido en un casamiento") y cada uno vota en secreto
//  a alguien de la sala (también a sí mismo). Se muestran los votos: sumás 1 punto si votaste al más votado.
//  Gana quien mejor conoce al grupo. Fases: 'votar' (todos a la vez) -> 'ver' -> 'votar' (otra frase)…
// =====================================================================
export const RONDAS = [5, 10, 15];
export const FRASES = [
  'se quede dormido en un casamiento', 'se olvide del cumpleaños de su mamá', 'termine viviendo en otro país',
  'salga en la tele', 'llegue tarde a su propio casamiento', 'se pierda en su propio barrio',
  'gane la lotería y la gaste en una semana', 'adopte diez perros', 'se tente de risa en el peor momento',
  'mande un audio de cinco minutos', 'cante en un karaoke sin que se lo pidan', 'se coma lo último de la heladera sin avisar',
  'sobreviva a un apocalipsis zombi', 'llore con una publicidad', 'tenga treinta pestañas abiertas en el navegador',
  'conteste los mensajes una semana después', 'se quede afuera porque se olvidó las llaves', 'arme un plan y lo cancele a último momento',
  'termine siendo presidente', 'se tatúe algo de lo que se arrepienta', 'discuta con un desconocido en internet',
  'se quede sin batería justo cuando más la necesita', 'desayune pizza fría', 'se haga amigo del mozo',
  'se duerma viendo una película', 'pida siempre lo mismo en un restaurante', 'le hable a las plantas',
  'deje todo para irse a vivir al campo', 'se ponga a bailar sin música', 'compre algo carísimo que no necesita',
  'diga que vio una serie que nunca vio', 'se tome un colectivo para el lado equivocado', 'se ofrezca a cocinar y queme todo',
  'tenga una cuenta secreta en las redes', 'cuente un chiste y se ría solo', 'se quede sin voz gritando un gol',
  'aparezca en el noticiero por algo insólito', 'salga con la remera al revés y no se dé cuenta', 'gane un reality',
  'se mude todos los años', 'escriba un libro', 'pierda un vuelo', 'tenga mil fotos de su mascota',
  'llore con una película de dibujitos', 'se olvide el nombre de alguien a los dos segundos', 'coma algo que se cayó al piso',
  'arruine una fiesta sorpresa', 'sea el último en enterarse de un chisme', 'sea el primero en enterarse de un chisme',
  'termine el asado a las cuatro de la mañana', 'se haga famoso por un video', 'se quede hablando dos horas con un desconocido',
  'tenga la heladera vacía', 'se compre un disfraz para cualquier ocasión', 'se ofrezca para todo y no llegue a nada',
  'se ría de su propio chiste antes de terminarlo', 'abra un negocio', 'se pierda con el GPS prendido',
];

export const info = {
  id: 'quien-es-mas',          // = nombre de la carpeta
  nombre: '¿Quién es más probable?',
  desc: 'Votá en secreto a quién le queda la frase. ¿Pensás como el grupo?',
  min: 3, max: 8,
  soloOnline: true,            // los votos son secretos
  sinTurnos: true,             // todos votan a la vez
  reglas: [
    'Sale una frase: "¿Quién es más probable que… se quede dormido en un casamiento?"',
    'Cada uno vota en secreto a alguien de la sala (también vale votarse a uno mismo).',
    'Se muestran los votos: sumás 1 punto si votaste al más votado. Si hay empate arriba, cuentan todos los empatados.',
    'Al final gana quien sumó más puntos: el que mejor conoce al grupo.',
  ],
};

const mezclar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function nuevoJuego(n, op) {
  const rondas = RONDAS.includes(+(op && op.rondas)) ? +op.rondas : 10;
  return {n, opciones: {rondas}, frases: mezclar([...FRASES.keys()]).slice(0, rondas).join(','), ronda: 1, fase: 'votar',
          votos: Array(n).fill(-1), puntos: Array(n).fill(0), coronas: Array(n).fill(0), turno: -1, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  const de = (x, f) => Array.from({length: e.n}, (_, i) => f((x || {})[i]));
  e.opciones = e.opciones || {rondas: 10};
  e.frases = String(e.frases || '0');
  e.ronda = +e.ronda || 1;
  e.votos = de(e.votos, x => (x == null ? -1 : +x));
  e.puntos = de(e.puntos, x => +x || 0);
  e.coronas = de(e.coronas, x => +x || 0);
  e.turno = -1;
  e.ultima = e.ultima || '';
  return e;
}
export const fraseDe = e => FRASES[+e.frases.split(',')[e.ronda - 1]] || FRASES[0];
export const detalle = (e, i) => `${e.puntos[i]} pts${e.fase === 'votar' && e.votos[i] >= 0 ? ' · ✔' : ''}`;
// Cuántos votos sacó cada uno y quiénes fueron los más votados
export function conteo(e) {
  const c = Array(e.n).fill(0);
  e.votos.forEach(v => { if (v >= 0) c[v]++; });
  const max = Math.max(...c);
  return {c, top: max > 0 ? c.map((x, i) => (x === max ? i : -1)).filter(i => i >= 0) : []};
}
export const ganadores = e => {
  if (e.ganador === -1) return [];
  const max = Math.max(...e.puntos);
  return e.puntos.map((x, i) => (x === max ? i : -1)).filter(i => i >= 0);
};

// Todo es a la vez: {tipo:'votar', p}  {tipo:'seguir'}
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  if (j.tipo === 'votar') {
    const p = +j.p;
    if (e.fase !== 'votar' || !(p >= 0 && p < e.n)) return null;
    e.votos[yo] = p;
    if (e.votos.every(v => v >= 0)) {
      const {top} = conteo(e);
      e.votos.forEach((v, q) => { if (top.includes(v)) e.puntos[q]++; });
      top.forEach(t => { e.coronas[t]++; });
      e.fase = 'ver';
      e.ultima = `Le quedó la frase a ${top.map(nombre).join(' y ')}`;
      if (e.ronda >= e.opciones.rondas) e.ganador = ganadores({...e, ganador: 0})[0];
    }
    return e;
  }
  if (j.tipo === 'seguir') {
    if (e.fase !== 'ver' || e.ganador !== -1) return null;
    e.ronda++; e.votos = Array(e.n).fill(-1); e.fase = 'votar';
    e.ultima = `Pregunta ${e.ronda} de ${e.opciones.rondas}`;
    return e;
  }
  return null;
}
// No hay jugadas por turno
export const aplicar = () => null;
