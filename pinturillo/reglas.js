// Pinturillo: uno dibuja una palabra secreta y los demás tienen que adivinarla escribiendo.
// Los trazos NO van en el estado: viven en juegos/pinturillo/salas/<código>/extra/trazos/<rid> (ver juego.js).
import { lista, EMPATE } from '../shared/salas.js';

export const PALABRAS = ('casa perro gato sol luna árbol auto avión barco pelota mate empanada asado guitarra bicicleta zapato ' +
  'sombrero anteojos reloj teléfono computadora televisor heladera cama silla mesa puerta ventana llave flor montaña río playa ' +
  'nube lluvia estrella cohete robot dinosaurio dragón fantasma pirata sirena unicornio payaso rey princesa bruja mago vaca ' +
  'caballo pingüino jirafa elefante león mono serpiente tortuga pez tiburón pulpo araña mariposa abeja caracol pájaro búho ' +
  'conejo ratón chancho oveja gallina pato banana manzana frutilla sandía pizza helado torta hamburguesa pochoclo huevo pan ' +
  'queso café botella vaso tenedor olla globo regalo vela paraguas mochila libro lápiz tijera martillo escalera bandera corona ' +
  'espada castillo puente faro carpa fogata volcán isla cactus palmera hongo calavera corazón ojo nariz boca mano pie diente ' +
  'bigote peine jabón inodoro ducha colectivo tren moto semáforo tractor helicóptero submarino ancla mapa tesoro dado ajedrez ' +
  'barrilete hamaca tobogán pileta arquero gol tango termo alfajor choripán gaucho poncho obelisco hormiga ballena cangrejo ' +
  'zanahoria tomate uva limón cebolla papa sartén cuchara micrófono auriculares cámara linterna batería piano trompeta tambor ' +
  'escoba balde carretilla tienda iglú pirámide tornado rayo arcoíris nieve muñeco esquí patineta casco medalla trofeo ' +
  'vampiro zombi momia extraterrestre ovni planeta satélite telescopio lupa imán bombita dentista bombero policía ' +
  'cocinero astronauta ninja cowboy abuela bebé novia').split(' ');
export const VUELTAS = [1, 2, 3];
export const SEGUNDOS = 80, ELEGIR_SEG = 25, VER_SEG = 5;
const PUNTOS_ACIERTO = [10, 8, 6, 5, 4], PUNTOS_DIBUJO = 3;

export const info = {
  id: 'pinturillo',
  nombre: 'Pinturillo',
  desc: 'Uno dibuja, los demás adivinan. ¡Rápido, que se acaba el tiempo!',
  min: 2, max: 6,
  soloOnline: true,          // cada uno adivina desde su pantalla
  reglas: [
    'Por turnos, a uno le toca dibujar: elige una de tres palabras y la dibuja, sin letras ni números.',
    'Los demás escriben lo que creen que es. Si le pegás, sumás más puntos cuanto antes lo adivinás (10, 8, 6, 5…).',
    `El que dibuja suma ${PUNTOS_DIBUJO} puntos por cada uno que adivina.`,
    `Cada turno dura ${SEGUNDOS} segundos (o hasta que adivinen todos). Las tildes y mayúsculas no importan.`,
    'Cuando todos dibujaron las vueltas que se eligieron, gana el que tiene más puntos.',
  ],
};

export const limpiar = s => String(s || '').toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ').replace(/[^A-ZÑ]/g, '');
const tres = usadas => {
  const libres = PALABRAS.filter(w => !usadas.includes(w));
  const de = libres.length >= 3 ? libres : PALABRAS, out = [];
  while (out.length < 3) { const w = de[Math.floor(Math.random() * de.length)]; if (!out.includes(w)) out.push(w); }
  return out;
};
const rid = () => Math.random().toString(36).slice(2, 9);

// fase: 'elegir' (el que dibuja elige palabra) -> 'dibujar' -> 'ver' (se muestra cuál era) -> 'elegir' del siguiente
// hasta: hora del servidor en que se termina la fase actual (0 = todavía no arrancó el reloj)
export function nuevoJuego(n, op, quien = 0) {
  const vueltas = VUELTAS.includes(op && op.vueltas) ? op.vueltas : 2;
  return {n, opciones: {vueltas}, fase: 'elegir', turno: quien, empieza: quien, hechos: 0, opcionesPal: tres([]), usadas: [],
          palabra: '', rid: '', hasta: 0, acertaron: [], intentos: [], puntos: Array(n).fill(0), ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.opciones = e.opciones || {vueltas: 2};
  e.opcionesPal = lista(e.opcionesPal);
  e.usadas = lista(e.usadas);
  e.acertaron = lista(e.acertaron).map(Number);
  e.intentos = lista(e.intentos).map(x => ({p: +x.p, t: String(x.t || ''), ok: !!x.ok}));
  e.puntos = Array.from({length: e.n}, (_, i) => +((e.puntos || {})[i]) || 0);
  e.palabra = e.palabra || ''; e.rid = e.rid || ''; e.hasta = +e.hasta || 0; e.hechos = +e.hechos || 0;
  e.empieza = +e.empieza || 0;
  e.ultima = e.ultima || '';
  return e;
}
export const detalle = (e, i) => `${e.puntos[i]} pts${e.fase !== 'elegir' && e.acertaron.includes(i) ? ' ✔' : ''}${e.turno === i && e.ganador === -1 ? ' 🎨' : ''}`;
export const totalTurnos = e => e.n * e.opciones.vueltas;

function empezarDibujo(e, i, t) {
  e.palabra = e.opcionesPal[i] || e.opcionesPal[0];
  e.usadas.push(e.palabra);
  if (e.usadas.length > 60) e.usadas.shift();
  Object.assign(e, {fase: 'dibujar', rid: rid(), hasta: t + SEGUNDOS * 1000, acertaron: [], intentos: [], opcionesPal: []});
}
function aVer(e, t, nombre) {
  e.fase = 'ver'; e.hasta = t + VER_SEG * 1000;
  e.ultima = e.acertaron.length ? `Era ${e.palabra.toUpperCase()}: adivinaron ${e.acertaron.map(nombre).join(', ')}`
    : `Era ${e.palabra.toUpperCase()} y nadie la adivinó`;
}

// El que dibuja elige: {tipo:'elegir', i, t}
export function aplicar(e, j) {
  if (e.fase !== 'elegir' || j.tipo !== 'elegir' || !(j.i >= 0 && j.i < 3) || !(+j.t > 0)) return null;
  empezarDibujo(e, +j.i, +j.t);
  return e;
}

// Libres: {tipo:'adivinar', texto, t}  {tipo:'reloj', t} (arranca el reloj de elegir)  {tipo:'tiempo', t} (se acabó el tiempo)
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  const t = +j.t || 0;
  switch (j.tipo) {
    case 'adivinar': {
      const w = limpiar(j.texto), txt = String(j.texto || '').trim().slice(0, 40);
      if (e.fase !== 'dibujar' || yo === e.turno || e.acertaron.includes(yo) || !w) return null;
      if (w === limpiar(e.palabra)) {
        const k = e.acertaron.length;
        e.puntos[yo] += PUNTOS_ACIERTO[Math.min(k, PUNTOS_ACIERTO.length - 1)];
        e.puntos[e.turno] += PUNTOS_DIBUJO;
        e.acertaron.push(yo);
        e.intentos.push({p: yo, t: '', ok: true});
        e.ultima = `¡${nombre(yo)} la adivinó!`;
        if (e.acertaron.length >= e.n - 1) aVer(e, t || Date.now(), nombre);
      } else e.intentos.push({p: yo, t: txt, ok: false});
      if (e.intentos.length > 40) e.intentos.shift();
      return e;
    }
    case 'reloj':
      if (e.fase !== 'elegir' || e.hasta || !t) return null;
      e.hasta = t + ELEGIR_SEG * 1000;
      return e;
    case 'tiempo':
      if (!e.hasta || t < e.hasta) return null;
      if (e.fase === 'elegir') { empezarDibujo(e, 0, t); return e; }      // el que dibuja no eligió: va la primera
      if (e.fase === 'dibujar') { aVer(e, t, nombre); return e; }
      if (e.fase === 'ver') {
        e.hechos++;
        if (e.hechos >= totalTurnos(e)) {
          const max = Math.max(...e.puntos), top = e.puntos.map((x, i) => (x === max ? i : -1)).filter(i => i >= 0);
          e.ganador = top.length === 1 ? top[0] : EMPATE;
          return e;
        }
        Object.assign(e, {fase: 'elegir', turno: (e.turno + 1) % e.n, opcionesPal: tres(e.usadas), palabra: '', hasta: t + ELEGIR_SEG * 1000,
                          acertaron: [], intentos: []});
        return e;
      }
      return null;
  }
  return null;
}
