// Mazos incluidos: fotos de Wikimedia Commons con licencias libres, elegidas y encuadradas a mano.
// Las fotos y sus créditos (autor, licencia, link) están en fotos/creditos.js; se ven en creditos.html.
import { FOTOS } from './fotos/creditos.js';

export const TITULOS = {'famosos-ar': 'Famosos argentinos', futbolistas: 'Futbolistas', 'famosos-mundo': 'Famosos del mundo'};

// La clave es el id del mazo; el primero es el que viene elegido por defecto.
export const MAZOS_INCLUIDOS = Object.fromEntries(Object.entries(FOTOS).map(([id, cartas]) => {
  const nombre = TITULOS[id] || id;
  return [id, {nombre, cantidad: Object.keys(cartas).length,
    crear: () => ({nombre, cartas: Object.entries(cartas).map(([n, c]) => ({nombre: n, img: new URL(c.img, import.meta.url).href}))})}];
}));
