// Mazos incluidos de gente conocida. Hay dos versiones de cada uno:
//  - con fotos de Wikimedia Commons (licencias libres; autor y licencia en creditos.html)
//  - dibujados con el mismo estilo que los Dibujitos, con rasgos que ayudan a reconocerlos
//    (pelo, barba, anteojos, camiseta...). También son el respaldo si a alguien le falta foto.
import { cara } from './dibujitos.js';
import { FOTOS } from './fotos/creditos.js';

const PIEL = {clara: '#f6d5b8', media: '#ecbc94', trigena: '#d39a6a', morena: '#a8704a', oscura: '#7a4a2e'};
const PELO = {negro: '#2b1d14', castano: '#5a3420', castClaro: '#8a5a32', rubio: '#e0b04a', colorado: '#c4511f',
              canoso: '#c9ccd1', platino: '#ece6cf'};
const OJOS = {marrones: '#3b2a20', celestes: '#2f6fc0', verdes: '#3e8e41'};
const NEGRO = '#2b2b2b', BLANCO = '#f4f4f4';
const ARG = {remera: '#75aadb', rayas: '#ffffff'};             // camiseta de la Selección
const BRASIL = {remera: '#f4d03f'};

const carta = (nombre, fondo, t) => ({nombre, svg: cara({piel: PIEL.media, pelo: PELO.castano, estilo: 'corto', remera: NEGRO,
  ojos: OJOS.marrones, fondo, anteojos: false, gorra: '', barba: '', aros: false, ...t})});

// En famosos, el fondo dice el rubro: así se puede preguntar "¿es músico?"
const DEPORTE = '#dcefe6', MUSICA = '#f3dde0', POLITICA = '#dfe6f5', CULTURA = '#f6e7c8';

function famososAr() {
  return {nombre: 'Famosos argentinos', cartas: [
    carta('Messi', DEPORTE, {...ARG, barba: PELO.castano}),
    carta('Maradona', DEPORTE, {...ARG, piel: PIEL.trigena, pelo: PELO.negro, estilo: 'rulos', aros: true}),
    carta('Ginóbili', DEPORTE, {estilo: 'pelado', remera: NEGRO}),
    carta('Sabatini', DEPORTE, {estilo: 'largo', remera: BLANCO}),
    carta('Del Potro', DEPORTE, {piel: PIEL.clara, barba: PELO.castano, remera: '#3fa7e0'}),
    carta('Lucha', DEPORTE, {...ARG, pelo: PELO.castClaro, estilo: 'rodete'}),
    carta('Scaloni', DEPORTE, {piel: PIEL.clara, pelo: PELO.castClaro, barba: PELO.castClaro, remera: '#1f2a44'}),
    carta('Charly', MUSICA, {piel: PIEL.clara, pelo: '#b08a4a', estilo: 'largo', anteojos: true, bigote: [BLANCO, PELO.negro]}),
    carta('Cerati', MUSICA, {piel: PIEL.clara, pelo: PELO.negro, anteojos: true}),
    carta('La Negra Sosa', MUSICA, {piel: PIEL.morena, pelo: PELO.negro, estilo: 'largo', remera: '#c0392b', aros: true}),
    carta('Fito Páez', MUSICA, {piel: PIEL.clara, estilo: 'rulos', anteojos: true}),
    carta('Tini', MUSICA, {piel: PIEL.clara, pelo: PELO.rubio, estilo: 'largo', remera: '#ff8fb1', aros: true}),
    carta('Lali', MUSICA, {estilo: 'largo', remera: '#e8505b', aros: true}),
    carta('Bizarrap', MUSICA, {piel: PIEL.clara, gorra: NEGRO, anteojos: true}),
    carta('Duki', MUSICA, {piel: PIEL.clara, pelo: PELO.platino, remera: '#9b6dd6', aros: true}),
    carta('Calamaro', MUSICA, {piel: PIEL.clara, estilo: 'largo', barba: PELO.castano, anteojos: true}),
    carta('Evita', POLITICA, {piel: PIEL.clara, pelo: PELO.rubio, estilo: 'rodete', remera: BLANCO, aros: true}),
    carta('Perón', POLITICA, {pelo: PELO.negro, remera: '#2f4f46'}),
    carta('Alfonsín', POLITICA, {piel: PIEL.clara, pelo: PELO.canoso, bigote: PELO.canoso, remera: '#1f2a44'}),
    carta('Cristina', POLITICA, {piel: PIEL.clara, pelo: '#3a2418', estilo: 'largo', aros: true}),
    carta('Macri', POLITICA, {piel: PIEL.clara, pelo: '#b5a48a', ojos: OJOS.celestes, remera: '#75aadb'}),
    carta('Milei', POLITICA, {piel: PIEL.clara, estilo: 'rulos', ojos: OJOS.celestes}),
    carta('Darín', CULTURA, {piel: PIEL.clara, pelo: PELO.canoso, barba: PELO.canoso, ojos: OJOS.celestes, remera: '#3d5a80'}),
    carta('Francella', CULTURA, {piel: PIEL.clara, estilo: 'pelado', remera: '#5cc480'}),
    carta('Susana', CULTURA, {piel: PIEL.clara, pelo: PELO.rubio, estilo: 'largo', remera: '#ff8fb1', aros: true}),
    carta('Mirtha', CULTURA, {piel: PIEL.clara, pelo: PELO.platino, estilo: 'rodete', remera: '#9b6dd6', aros: true}),
    carta('El Papa', CULTURA, {piel: PIEL.clara, pelo: PELO.canoso, anteojos: true, remera: BLANCO}),
    carta('Borges', CULTURA, {piel: PIEL.clara, pelo: PELO.canoso, remera: '#4a4a4a'}),
  ]};
}

// En futbolistas, la camiseta es la de su selección
const CANCHA = '#e3f1d9';
function futbolistas() {
  return {nombre: 'Futbolistas', cartas: [
    carta('Messi', CANCHA, {...ARG, barba: PELO.castano}),
    carta('Maradona', CANCHA, {...ARG, piel: PIEL.trigena, pelo: PELO.negro, estilo: 'rulos', aros: true}),
    carta('Di María', CANCHA, {...ARG, pelo: PELO.negro}),
    carta('Dibu', CANCHA, {piel: PIEL.clara, barba: PELO.castano, remera: '#5cc480'}),
    carta('Julián', CANCHA, {...ARG}),
    carta('Enzo', CANCHA, {...ARG, piel: PIEL.clara, barba: PELO.castano}),
    carta('Lautaro', CANCHA, {...ARG, piel: PIEL.trigena, pelo: PELO.negro, barba: PELO.negro}),
    carta('Mac Allister', CANCHA, {...ARG, piel: PIEL.clara, pelo: PELO.colorado}),
    carta('De Paul', CANCHA, {...ARG, estilo: 'largo', barba: PELO.castano}),
    carta('Otamendi', CANCHA, {...ARG, estilo: 'pelado', barba: PELO.negro}),
    carta('Riquelme', CANCHA, {...ARG, piel: PIEL.trigena, pelo: PELO.negro}),
    carta('Batistuta', CANCHA, {...ARG, pelo: '#b98a4a', estilo: 'largo'}),
    carta('Tevez', CANCHA, {...ARG, piel: PIEL.trigena, pelo: PELO.negro}),
    carta('Agüero', CANCHA, {...ARG, pelo: PELO.castano}),
    carta('Palermo', CANCHA, {...ARG, piel: PIEL.clara, pelo: PELO.rubio, estilo: 'largo'}),
    carta('Cristiano', CANCHA, {pelo: PELO.negro, remera: '#c8102e'}),
    carta('Neymar', CANCHA, {...BRASIL, piel: PIEL.trigena, pelo: PELO.castClaro, aros: true}),
    carta('Pelé', CANCHA, {...BRASIL, piel: PIEL.oscura, pelo: PELO.negro}),
    carta('Ronaldinho', CANCHA, {...BRASIL, piel: PIEL.morena, pelo: PELO.negro, estilo: 'largo', vincha: BLANCO}),
    carta('Mbappé', CANCHA, {piel: PIEL.oscura, estilo: 'pelado', remera: '#1f3a93'}),
    carta('Haaland', CANCHA, {piel: PIEL.clara, pelo: PELO.rubio, estilo: 'rodete', ojos: OJOS.celestes, remera: '#6cabdd'}),
    carta('Zidane', CANCHA, {piel: PIEL.clara, estilo: 'pelado', remera: '#1f3a93'}),
    carta('Modrić', CANCHA, {piel: PIEL.clara, pelo: PELO.castClaro, estilo: 'largo', remera: BLANCO, rayas: '#d52b1e'}),
    carta('Vinícius', CANCHA, {piel: PIEL.oscura, pelo: PELO.negro, estilo: 'rulos', remera: BLANCO}),
    carta('Lamine', CANCHA, {piel: PIEL.morena, pelo: PELO.negro, estilo: 'rulos', remera: '#c60b1e'}),
    carta('Salah', CANCHA, {piel: PIEL.trigena, pelo: PELO.negro, estilo: 'rulos', barba: PELO.negro, remera: '#c8102e'}),
    carta('Lewa', CANCHA, {piel: PIEL.clara, remera: BLANCO}),
    carta('Kane', CANCHA, {piel: PIEL.clara, pelo: PELO.castClaro, ojos: OJOS.celestes, remera: BLANCO}),
  ]};
}

// Versión con fotos: cada carta usa su foto de Wikimedia Commons si hay (ver fotos/creditos.js
// y creditos.html); si no, queda el dibujito.
function conFotos(id, crear, nombre) {
  return () => {
    const m = crear(), fotos = FOTOS[id] || {};
    return {nombre, cartas: m.cartas.map(c => (fotos[c.nombre] ? {nombre: c.nombre, img: new URL(fotos[c.nombre].img, import.meta.url).href} : c))};
  };
}

// Mazos que vienen con el juego (no están en Firebase). La clave es el id del mazo.
export const MAZOS_INCLUIDOS = {
  'famosos-ar': {nombre: 'Famosos argentinos', cantidad: 28, crear: conFotos('famosos-ar', famososAr, 'Famosos argentinos')},
  futbolistas: {nombre: 'Futbolistas', cantidad: 28, crear: conFotos('futbolistas', futbolistas, 'Futbolistas')},
  'famosos-ar-dib': {nombre: 'Famosos argentinos (dibujados)', cantidad: 28, crear: famososAr},
  'futbolistas-dib': {nombre: 'Futbolistas (dibujados)', cantidad: 28, crear: futbolistas},
};
