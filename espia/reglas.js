// Espía: a la mayoría le toca la misma palabra y a los impostores una parecida, y nadie sabe en qué grupo está.
// Si se elige, los espías no tienen palabra: escuchan, disimulan y tratan de adivinarla.
// Cuántos impostores y espías hay depende de cuántos juegan (ver REPARTO).
// Por turnos cada uno da una pista; al final de la ronda se vota a quién sacar.
import { lista } from '../shared/salas.js';

// Pares de palabras parecidas: en cada partida se sortea cuál es la de la mayoría
export const PARES = [
  ['casa', 'hotel'], ['hada', 'duende'], ['bruja', 'mago'], ['playa', 'pileta'], ['mate', 'café'], ['perro', 'lobo'],
  ['gato', 'tigre'], ['pizza', 'empanada'], ['asado', 'choripán'], ['guitarra', 'violín'], ['piano', 'órgano'],
  ['auto', 'camioneta'], ['colectivo', 'tren'], ['avión', 'helicóptero'], ['barco', 'submarino'], ['bicicleta', 'moto'],
  ['fútbol', 'básquet'], ['tenis', 'pádel'], ['río', 'lago'], ['montaña', 'volcán'], ['sol', 'luna'], ['lluvia', 'nieve'],
  ['invierno', 'otoño'], ['verano', 'primavera'], ['médico', 'enfermero'], ['policía', 'bombero'], ['dentista', 'peluquero'],
  ['cocinero', 'mozo'], ['escuela', 'universidad'], ['hospital', 'farmacia'], ['cine', 'teatro'], ['libro', 'revista'],
  ['diario', 'radio'], ['celular', 'tablet'], ['computadora', 'televisor'], ['reloj', 'calendario'], ['cama', 'sillón'],
  ['heladera', 'freezer'], ['cuchillo', 'tijera'], ['cuchara', 'tenedor'], ['vaso', 'taza'], ['botella', 'lata'],
  ['zapatilla', 'ojota'], ['campera', 'buzo'], ['sombrero', 'gorra'], ['anteojos', 'binoculares'], ['paraguas', 'piloto'],
  ['manzana', 'pera'], ['banana', 'mango'], ['frutilla', 'cereza'], ['naranja', 'mandarina'], ['limón', 'pomelo'],
  ['sandía', 'melón'], ['papa', 'batata'], ['tomate', 'morrón'], ['lechuga', 'espinaca'], ['helado', 'flan'],
  ['torta', 'alfajor'], ['pan', 'galletita'], ['queso', 'manteca'], ['leche', 'yogur'], ['cerveza', 'vino'],
  ['agua', 'soda'], ['fernet', 'vermut'], ['dulce de leche', 'mermelada'], ['milanesa', 'hamburguesa'], ['fideos', 'ravioles'],
  ['sushi', 'ceviche'], ['caballo', 'burro'], ['vaca', 'oveja'], ['gallina', 'pato'], ['león', 'oso'],
  ['elefante', 'rinoceronte'], ['jirafa', 'camello'], ['delfín', 'tiburón'], ['ballena', 'orca'], ['pingüino', 'foca'],
  ['águila', 'halcón'], ['búho', 'murciélago'], ['abeja', 'avispa'], ['mariposa', 'polilla'], ['hormiga', 'cucaracha'],
  ['araña', 'escorpión'], ['serpiente', 'lagarto'], ['tortuga', 'caracol'], ['rana', 'sapo'], ['dragón', 'dinosaurio'],
  ['vampiro', 'zombi'], ['fantasma', 'monstruo'], ['princesa', 'reina'], ['rey', 'presidente'], ['pirata', 'vikingo'],
  ['ninja', 'samurái'], ['cowboy', 'gaucho'], ['astronauta', 'piloto de avión'], ['robot', 'extraterrestre'],
  ['superhéroe', 'villano'], ['Navidad', 'Año Nuevo'], ['casamiento', 'bautismo'], ['vacaciones', 'feriado'],
  ['Papá Noel', 'Reyes Magos'], ['castillo', 'palacio'], ['iglesia', 'mezquita'], ['museo', 'biblioteca'], ['plaza', 'parque'],
  ['supermercado', 'kiosco'], ['shopping', 'feria'], ['aeropuerto', 'estación'], ['ascensor', 'escalera'],
  ['puerta', 'ventana'], ['llave', 'candado'], ['vela', 'linterna'], ['fogata', 'parrilla'], ['cohete', 'satélite'],
  ['estrella', 'planeta'], ['isla', 'península'], ['desierto', 'selva'], ['bosque', 'jardín'], ['rosa', 'tulipán'],
  ['cactus', 'palmera'], ['ajedrez', 'damas'], ['truco', 'póker'], ['globo', 'barrilete'], ['hamaca', 'tobogán'],
  ['sirena', 'pez'], ['payaso', 'mimo'], ['circo', 'zoológico'], ['dado', 'ruleta'], ['tango', 'folclore'],
];
export const ROL = {MAYORIA: 0, IMPOSTOR: 1, ESPIA: 2};
export const NOMBRE_ROL = ['de la mayoría', 'impostor', 'espía'];
export const MIN_ESPIA = 4;              // con menos, no hay lugar para un espía
// Según cuántos juegan: [impostores, espías]. La mayoría siempre es por lo menos la mitad.
export const REPARTO = {3: [1, 0], 4: [1, 1], 5: [1, 1], 6: [2, 1], 7: [2, 1], 8: [2, 2]};
export const reparto = (n, conEspia = true) => {
  const [imp, esp] = REPARTO[n] || [Math.max(1, Math.floor(n / 4)), Math.floor(n / 4)];
  return {imp, esp: conEspia ? esp : 0};
};
const cuantos = (k, uno, varios) => (k === 1 ? `1 ${uno}` : `${k} ${varios}`);
export function textoReparto(n, conEspia = true) {
  const {imp, esp} = reparto(n, conEspia);
  return [cuantos(imp, 'impostor', 'impostores'), esp ? cuantos(esp, 'espía', 'espías') : '', `${n - imp - esp} de la mayoría`]
    .filter(Boolean).join(', ');
}

export const info = {
  id: 'espia',
  nombre: 'Espía',
  desc: 'Casi todos tienen la misma palabra… ¿y vos? Dá pistas, votá y descubrí a los impostores.',
  min: 3, max: 8,
  soloOnline: true,          // cada uno ve su palabra en su pantalla
  reloj: 60,                 // tiempo para dar la pista (o para que el Espía arriesgue)
  reglas: [
    'A la mayoría le toca la misma palabra y a los impostores una parecida (ej. casa y hotel). Nadie sabe si está en la mayoría o es impostor.',
    `Si se eligió (de ${MIN_ESPIA} jugadores para arriba), hay además espías que no tienen palabra: escuchan las pistas, disimulan y tratan de adivinarla.`,
    'Cuántos hay: de 3, 1 impostor; de 4 y 5, 1 impostor y 1 espía; de 6 y 7, 2 impostores y 1 espía; de 8, 2 impostores y 2 espías.',
    'Por turnos, cada uno da una pista: una palabra o frase relacionada con la suya, sin decirla. Ni muy obvia (la descubren al Espía) ni muy rara (sospechan de vos).',
    'Cuando todos dieron su pista, se vota a quién sacar. El más votado sale y se ve qué era; si hay empate, no sale nadie. Después, otra ronda.',
    'Si sacan a un espía, tiene una sola oportunidad para adivinar la palabra de la mayoría: si acierta, gana él solo.',
    'La mayoría gana si saca a todos los impostores y espías. Si quedan dos jugadores (o no queda nadie de la mayoría), ganan los impostores y espías que siguen en juego.',
    'Si la sala tiene reloj y no das tu pista a tiempo, pasa el turno sin pista (y queda sospechoso).',
  ],
};

// Mayúsculas, sin tildes (la Ñ queda) y solo letras y números
export const limpiar = s => String(s || '').toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ').replace(/[^A-ZÑ0-9]/g, '');
function distancia(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// Al Espía se le perdona una letra mal en las palabras largas (y el plural)
export function acierta(intento, palabra) {
  const a = limpiar(intento), b = limpiar(palabra);
  if (!a) return false;
  if (a === b || a === b + 'S' || a === b + 'ES') return true;
  return b.length >= 5 && distancia(a, b) <= 1;
}

const azar = k => Math.floor(Math.random() * k);

// fase: 'pistas' (por turnos) -> 'votar' (todos a la vez, turno -1) -> 'pistas' de la ronda siguiente.
//       Si sacan al Espía: 'adivinar' (turno del Espía) antes de seguir.
// roles[i]: 0 mayoría, 1 impostor, 2 espía. pal: [la de la mayoría, la del impostor].
// pistas: [{p, r, t, nada}] de todas las rondas. votos[i]: a quién votó i (-1 todavía no).
// res: [{r, out, votos}] cómo terminó cada votación (out -1 = empate).
export function nuevoJuego(n, op, quien = 0) {
  // opciones.espia es lo que se pidió (para la revancha); si son menos de MIN_ESPIA, esa partida va sin Espía
  const pedido = op ? op.espia !== false : true, voz = !!(op && op.voz);
  const {imp, esp} = reparto(n, pedido);
  const par = PARES[azar(PARES.length)], [a, b] = Math.random() < .5 ? par : [par[1], par[0]];
  const roles = Array(n).fill(ROL.MAYORIA);
  // Los espías nunca arrancan la primera ronda: no tendrían de dónde sacar una pista
  const sortear = (k, rol, sinQuien) => {
    for (let c = 0; c < k; c++) {
      const libres = roles.map((r, i) => i).filter(i => roles[i] === ROL.MAYORIA && !(sinQuien && i === quien));
      roles[libres[azar(libres.length)]] = rol;
    }
  };
  sortear(esp, ROL.ESPIA, true);
  sortear(imp, ROL.IMPOSTOR, false);
  return {n, opciones: {espia: pedido, voz}, pal: [a, b], roles, vivos: Array(n).fill(1), ronda: 1, fase: 'pistas',
          pistas: [], votos: Array(n).fill(-1), res: [], intentos: [], gan: [], turno: quien, empieza: quien, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.opciones = e.opciones || {espia: false, voz: false};
  e.pal = lista(e.pal).map(String);
  e.roles = Array.from({length: e.n}, (_, i) => +((e.roles || {})[i]) || 0);
  e.vivos = Array.from({length: e.n}, (_, i) => +((e.vivos || {})[i]) || 0);
  e.votos = Array.from({length: e.n}, (_, i) => { const v = (e.votos || {})[i]; return v == null ? -1 : +v; });
  e.pistas = lista(e.pistas).map(x => ({p: +x.p, r: +x.r, t: String(x.t || ''), nada: !!x.nada}));
  e.res = lista(e.res).map(x => ({r: +x.r, out: +x.out, votos: Array.from({length: e.n}, (_, i) => { const v = (x.votos || {})[i]; return v == null ? -1 : +v; })}));
  e.intentos = lista(e.intentos).map(x => ({p: +x.p, t: String(x.t || '')}));
  e.gan = lista(e.gan).map(Number);
  e.ronda = +e.ronda || 1;
  e.empieza = +e.empieza || 0;
  e.turno = e.turno == null ? -1 : +e.turno;
  e.ultima = e.ultima || '';
  return e;
}

export const palabraDe = (e, i) => (e.roles[i] === ROL.ESPIA ? '' : e.roles[i] === ROL.IMPOSTOR ? e.pal[1] : e.pal[0]);
export const vivos = e => e.vivos.map((v, i) => (v ? i : -1)).filter(i => i >= 0);
// Orden de la ronda: los que siguen en juego, arrancando cada ronda uno más adelante
export function ordenRonda(e) {
  const desde = (e.empieza + e.ronda - 1) % e.n;
  return Array.from({length: e.n}, (_, k) => (desde + k) % e.n).filter(i => e.vivos[i]);
}
export const pistasRonda = (e, r = e.ronda) => e.pistas.filter(x => x.r === r);
export const ganadores = e => e.gan;
export function detalle(e, i) {
  if (e.ganador !== -1) return (e.roles[i] === ROL.MAYORIA ? 'mayoría' : e.roles[i] === ROL.IMPOSTOR ? '🎭 impostor' : '🕵️ espía') + (e.vivos[i] ? '' : ' · afuera');
  if (!e.vivos[i]) return `afuera (${e.roles[i] === ROL.MAYORIA ? 'mayoría' : e.roles[i] === ROL.IMPOSTOR ? 'impostor' : 'espía'})`;
  if (e.fase === 'votar') return e.votos[i] >= 0 ? 'votó ✔' : 'votando…';
  return pistasRonda(e).some(x => x.p === i) ? '✍️' : '';
}

// La pista no puede tener tu palabra adentro
export const pistaVale = (e, p, t) => { const w = limpiar(palabraDe(e, p)); return !w || !limpiar(t).includes(w); };

function seguirPistas(e) {
  const orden = ordenRonda(e), hechas = pistasRonda(e).length;
  if (hechas >= orden.length) { e.fase = 'votar'; e.turno = -1; e.votos = Array(e.n).fill(-1); return; }
  e.turno = orden[hechas];
}
function rondaNueva(e) {
  e.ronda++; e.fase = 'pistas'; e.votos = Array(e.n).fill(-1);
  e.turno = ordenRonda(e)[0];
}
// ¿Terminó? Gana la mayoría si no queda nadie de afuera; si quedan dos y hay alguno de afuera, ganan ellos
function terminar(e, nombre) {
  const vs = vivos(e), otros = vs.filter(i => e.roles[i] !== ROL.MAYORIA);
  if (!otros.length) {
    e.gan = e.roles.map((r, i) => (r === ROL.MAYORIA ? i : -1)).filter(i => i >= 0);
    e.ultima += ' · ¡Ganó la mayoría!';
  } else if (vs.length <= 2 || otros.length === vs.length) {
    e.gan = otros;
    e.ultima += ` · ¡${otros.length > 1 ? 'Ganan' : 'Gana'} ${otros.map(i => `${nombre(i)} (${NOMBRE_ROL[e.roles[i]]})`).join(' y ')}!`;
  } else return false;
  e.ganador = e.gan[0];
  e.fase = 'fin'; e.turno = -1;
  return true;
}
function sacar(e, p, nombre) {
  e.vivos[p] = 0;
  if (e.roles[p] === ROL.ESPIA) {
    e.fase = 'adivinar'; e.turno = p;
    e.ultima = `¡${nombre(p)} era espía! Tiene una oportunidad para adivinar la palabra`;
    return;
  }
  e.ultima = `Sacaron a ${nombre(p)}: era ${NOMBRE_ROL[e.roles[p]]}`;
  if (!terminar(e, nombre)) rondaNueva(e);
}
function contarVotos(e, nombre) {
  const cuenta = Array(e.n).fill(0);
  e.votos.forEach(v => { if (v >= 0) cuenta[v]++; });
  const max = Math.max(...cuenta), top = cuenta.map((c, i) => (c === max ? i : -1)).filter(i => i >= 0);
  const out = top.length === 1 ? top[0] : -1;
  e.res.push({r: e.ronda, out, votos: [...e.votos]});
  if (out < 0) { e.ultima = 'Empate en la votación: no sale nadie'; rondaNueva(e); return; }
  sacar(e, out, nombre);
}
function adivino(e, p, t, nombre) {
  e.intentos.push({p, t});
  if (acierta(t, e.pal[0])) {
    e.gan = [p]; e.ganador = p; e.fase = 'fin'; e.turno = -1;
    e.ultima = `¡${nombre(p)} adivinó la palabra (${e.pal[0].toUpperCase()}): gana el espía!`;
    return;
  }
  e.ultima = t ? `${nombre(p)} arriesgó "${t}" y no era` : `${nombre(p)} no llegó a arriesgar`;
  if (!terminar(e, nombre)) rondaNueva(e);
}

// Por turno: {tipo:'pista', texto} (en voz alta, sin texto)   {tipo:'adivinar', texto} (el Espía, cuando lo sacan)
export function aplicar(e, j, nombre) {
  const p = e.turno;
  if (j.tipo === 'pista') {
    if (e.fase !== 'pistas' || !e.vivos[p]) return null;
    const t = String(j.texto || '').trim().slice(0, 60);
    if (!e.opciones.voz && !t) return null;
    if (t && !pistaVale(e, p, t)) return null;
    e.pistas.push({p, r: e.ronda, t, nada: false});
    e.ultima = e.opciones.voz ? `${nombre(p)} dio su pista` : `${nombre(p)}: “${t}”`;
    seguirPistas(e);
    return e;
  }
  if (j.tipo === 'adivinar') {
    const t = String(j.texto || '').trim().slice(0, 40);
    if (e.fase !== 'adivinar' || !t) return null;
    adivino(e, p, t, nombre);
    return e;
  }
  return null;
}

// Votar es a la vez: {tipo:'votar', p} (se puede cambiar hasta que voten todos)
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  if (j.tipo !== 'votar' || e.fase !== 'votar') return null;
  const p = +j.p;
  if (!e.vivos[yo] || !(p >= 0 && p < e.n) || !e.vivos[p] || p === yo) return null;
  e.votos[yo] = p;
  if (vivos(e).every(i => e.votos[i] >= 0)) contarVotos(e, nombre);
  return e;
}

// Reloj: corre al dar la pista y cuando el Espía arriesga
export const conReloj = e => e.fase === 'pistas' || e.fase === 'adivinar';
export function sinTiempo(e, nombre) {
  const p = e.turno;
  if (e.fase === 'pistas') {
    e.pistas.push({p, r: e.ronda, t: '', nada: true});
    e.ultima = `${nombre(p)} se quedó sin tiempo y no dio pista`;
    seguirPistas(e);
    return e;
  }
  if (e.fase === 'adivinar') { adivino(e, p, '', nombre); return e; }
  return null;
}
