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
    'En tu turno escribís una pregunta de sí o no; el otro la responde y le toca preguntar a él.',
    'Bajás o levantás tus cartas cuando quieras, sea o no tu turno.',
    'En vez de preguntar podés arriesgar quién es. Si acertás ganás; si le errás, perdés.',
    'Los mazos de fotos se arman desde "Crear o editar mazos".',
  ],
};

const POR_DEFECTO = {mazo: 'dibujitos', nombre: 'Dibujitos', cantidad: 24};
const azar = k => Math.floor(Math.random() * k);

// fase: 'pregunta' (turno pregunta) -> 'respuesta' (turno pasa al otro, que responde)
//       -> 'pregunta' del que respondió. Las cartas se bajan aparte, con libre(), en cualquier momento.
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
  // Salas de la versión anterior que quedaron en "descartar": sigue preguntando el que respondió
  if (e.fase === 'descartar') { e.fase = 'pregunta'; e.turno = 1 - e.turno; }
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
      Object.assign(e, {fase: 'pregunta', ultima: `${nombre(p)} respondió ${e.respuesta}`});   // ahora pregunta quien respondió
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

// Jugadas libres: no dependen del turno y solo tocan lo tuyo. yo = tu asiento.
// {tipo:'bajar', i}: baja o levanta tu carta i.
export function libre(e, j, yo) {
  if (j.tipo !== 'bajar' || e.ganador !== -1 || !e.bajadas[yo] || !(j.i >= 0 && j.i < e.bajadas[yo].length)) return null;
  e.bajadas[yo][j.i] = e.bajadas[yo][j.i] ? 0 : 1;
  return e;
}
