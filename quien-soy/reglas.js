// ¿Quién soy?: cada uno tiene un personaje secreto; se hacen preguntas de sí o no y se bajan cartas.
import { lista } from '../shared/salas.js';

export const info = {
  id: 'quien-soy',
  nombre: '¿Quién soy?',
  desc: 'Adiviná el personaje del otro con preguntas de sí o no.',
  min: 2, max: 2,
  soloOnline: true,          // cada uno necesita su pantalla, porque el personaje es secreto
  reglas: [
    'A cada jugador le toca un personaje secreto del mazo.',
    'En tu turno escribís una pregunta de sí o no; el otro la responde.',
    'Con la respuesta, bajás las cartas que no cumplen.',
    'En vez de preguntar podés arriesgar quién es. Si acertás ganás; si le errás, perdés.',
    'Los mazos de fotos se arman desde "Crear o editar mazos".',
  ],
};

const POR_DEFECTO = {mazo: 'dibujitos', nombre: 'Dibujitos', cantidad: 24};
const azar = k => Math.floor(Math.random() * k);

// fase: 'pregunta' (turno pregunta) -> 'respuesta' (turno pasa al otro, que responde)
//       -> 'descartar' (vuelve al que preguntó, que baja cartas) -> 'pregunta' del otro
export function nuevoJuego(n, op) {
  op = op && op.mazo ? op : POR_DEFECTO;
  const k = op.cantidad;
  return {n, opciones: op, secretos: [azar(k), azar(k)], bajadas: [Array(k).fill(0), Array(k).fill(0)],
          fase: 'pregunta', pregunta: '', respuesta: '', historial: [], turno: 0, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  e.opciones = e.opciones || POR_DEFECTO;
  e.secretos = lista(e.secretos).map(Number);
  e.bajadas = lista(e.bajadas).map(b => lista(b).map(Number));
  e.historial = lista(e.historial);
  e.pregunta = e.pregunta || '';
  e.respuesta = e.respuesta || '';
  e.ultima = e.ultima || '';
  return e;
}
export const enPie = (e, i) => e.bajadas[i].filter(x => !x).length;
export const detalle = (e, i) => `${enPie(e, i)} en pie`;

export function aplicar(e, j, nombre) {
  const p = e.turno, otro = 1 - p;
  switch (j.tipo) {
    case 'preguntar': {
      const t = String(j.texto || '').trim().slice(0, 120);
      if (e.fase !== 'pregunta' || !t) return null;
      Object.assign(e, {pregunta: t, respuesta: '', fase: 'respuesta', turno: otro, ultima: `${nombre(p)} preguntó`});
      return e;
    }
    case 'responder': {
      if (e.fase !== 'respuesta') return null;
      e.respuesta = j.si ? 'Sí' : 'No';
      e.historial.push({p: otro, q: e.pregunta, r: e.respuesta});
      if (e.historial.length > 30) e.historial.shift();
      Object.assign(e, {fase: 'descartar', turno: otro, ultima: `${nombre(p)} respondió ${e.respuesta}`});
      return e;
    }
    case 'bajar': {
      const i = j.i;
      if ((e.fase !== 'pregunta' && e.fase !== 'descartar') || !(i >= 0 && i < e.bajadas[p].length)) return null;
      e.bajadas[p][i] = e.bajadas[p][i] ? 0 : 1;
      return e;
    }
    case 'listo': {
      if (e.fase !== 'descartar') return null;
      Object.assign(e, {fase: 'pregunta', pregunta: '', respuesta: '', turno: otro, ultima: `${nombre(p)} bajó cartas`});
      return e;
    }
    case 'arriesgar': {
      if (e.fase !== 'pregunta' || !(j.i >= 0 && j.i < e.bajadas[p].length)) return null;
      const acierto = j.i === e.secretos[otro];
      e.ganador = acierto ? p : otro;
      e.ultima = acierto ? `${nombre(p)} arriesgó y acertó` : `${nombre(p)} arriesgó y le erró`;
      return e;
    }
  }
  return null;
}
