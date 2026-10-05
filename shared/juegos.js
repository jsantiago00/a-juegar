// Lista de juegos que muestra la portada.
// Para sumar uno: agregá una entrada acá con el mismo id que el nombre de su carpeta.
//   color:   fondo de su tarjeta
//   resumen: las reglas "rapidito" (2 o 3 pasos cortos) que se ven al elegirlo
//   La imagen de muestra va en capturas/<id>.webp (y el ícono, opcional, en shared/iconos.js).
export const JUEGOS = [
  { id: 'al-centro', nombre: 'Al Centro', jugadores: '2 a 4', color: '#ff7a85',
    desc: 'Llegá a la meta esquivando muros.',
    resumen: ['Llevá tu bolita al centro antes que nadie.', 'En tu turno: movete un casillero o poné un muro.', 'Los muros traban, pero nunca pueden encerrar a nadie.'] },
  { id: 'juegardium', nombre: 'Juegardium', jugadores: '2 a 4', color: '#6fdc9b',
    desc: 'Uní puntos, cerrá cajas y quedate con el tablero.',
    resumen: ['Trazá una línea entre dos puntos vecinos.', 'Si cerrás una caja, es tuya y volvés a jugar.', 'Gana quien tenga más cajas al final.'] },
  { id: 'tateti-cuadrado', nombre: 'Ta-te-ti²', jugadores: '2', color: '#b98cff',
    desc: 'Nueve ta-te-tis adentro de uno.',
    resumen: ['Son 9 ta-te-tis adentro de uno grande.', 'La casilla donde jugás manda al otro a ese tablerito.', 'Ganá 3 tableritos en línea.'] },
  { id: 'lameloide', nombre: 'Lameloide', jugadores: '2', color: '#ffa45c',
    desc: 'Uní tus dos bordes con hexágonos.',
    resumen: ['Rojo une arriba con abajo; Azul, izquierda con derecha.', 'Por turnos, pintás un hexágono libre.', 'El primero que conecta sus dos bordes gana.'] },
  { id: 'quien-soy', nombre: '¿Quién soy?', jugadores: '2', color: '#ffd23f',
    desc: 'Adiviná el personaje del otro. Con mazos de tus fotos.',
    resumen: ['Cada uno tiene un personaje secreto.', 'Preguntá cosas de sí o no y bajá las cartas que no van.', 'Arriesgá quién es: si le errás, perdés.'] },
  { id: 'ta-te-ti', nombre: 'Ta-te-ti', jugadores: '2', color: '#5cc3f5',
    desc: 'El clásico. También sirve de plantilla.',
    resumen: ['Por turnos, marcá una casilla.', 'Tres en línea gana.'] },
];
