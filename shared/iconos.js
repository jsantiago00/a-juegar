// Ícono de cada juego (SVG chiquito sobre fondo crema). La clave es el id del juego.
const O = '#2a1d4f', ROJO = '#e8505b', AZUL = '#3fa7e0', VERDE = '#3fbf7f', CREMA = '#fbe3b4';
const svg = cuerpo => `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="2" y="2" width="44" height="44" rx="12" fill="#fff8ea"/>${cuerpo}</svg>`;
const cruz = (x, y, c = ROJO) => `<path d="M${x - 3} ${y - 3}l6 6M${x + 3} ${y - 3}l-6 6" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`;
const bola = (x, y, c) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${c}"/><circle cx="${x - 1.4}" cy="${y - 1.4}" r="1.3" fill="#fff" opacity=".7"/>`;
const hex = (cx, cy, c) => `<polygon points="${Array.from({length: 6}, (_, k) => {
  const a = (-90 + 60 * k) * Math.PI / 180;
  return `${(cx + 7.6 * Math.cos(a)).toFixed(1)},${(cy + 7.6 * Math.sin(a)).toFixed(1)}`;
}).join(' ')}" fill="${c}" stroke="#e09a55" stroke-width="1.4"/>`;
const tres = [8.5, 19.5, 30.5];

export const ICONOS = {
  'ta-te-ti': svg(
    `<path d="M19 9v30M29 9v30M9 19h30M9 29h30" stroke="${O}" stroke-opacity=".22" stroke-width="2.5" stroke-linecap="round"/>` +
    cruz(14, 14) + cruz(34, 34) +
    `<circle cx="24" cy="24" r="3.2" fill="none" stroke="${AZUL}" stroke-width="3"/><circle cx="34" cy="14" r="3.2" fill="none" stroke="${AZUL}" stroke-width="3"/>`),

  'tateti-cuadrado': svg(
    tres.flatMap((y, r) => tres.map((x, c) => {
      const fill = r === c ? ROJO : (r === 0 && c === 2) ? AZUL : O;
      const op = r === c || (r === 0 && c === 2) ? .85 : .12;
      return `<rect x="${x}" y="${y}" width="9" height="9" rx="2.5" fill="${fill}" opacity="${op}"/>`;
    })).join('')),

  'al-centro': svg(
    tres.flatMap(y => tres.map(x => `<rect x="${x}" y="${y}" width="9" height="9" rx="2.5" fill="${CREMA}"/>`)).join('') +
    `<circle cx="24" cy="24" r="3" fill="none" stroke="#e09a55" stroke-width="2"/>` +
    `<rect x="28.3" y="7" width="2.4" height="20" rx="1.2" fill="${AZUL}"/><rect x="7" y="28.3" width="20" height="2.4" rx="1.2" fill="${VERDE}"/>` +
    bola(13, 13, ROJO) + bola(35, 35, AZUL)),

  juegardium: svg(
    `<rect x="11" y="11" width="12" height="12" rx="2" fill="${ROJO}" opacity=".4"/>` +
    `<path d="M10 10h14M10 10v14M24 10v14M10 24h14" stroke="${ROJO}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M24 24h14M38 24v14" stroke="${AZUL}" stroke-width="3" stroke-linecap="round"/>` +
    [10, 24, 38].flatMap(y => [10, 24, 38].map(x => `<circle cx="${x}" cy="${y}" r="2.6" fill="${O}"/>`)).join('')),

  lameloide: svg(hex(17.2, 15, ROJO) + hex(30.4, 15, CREMA) + hex(23.8, 26.4, ROJO) + hex(37, 26.4, AZUL) + hex(17.2, 37.8, CREMA) + hex(30.4, 37.8, ROJO)),

  acorazado: svg(
    `<rect x="7" y="7" width="34" height="34" rx="7" fill="#5bb4e5"/>` +
    `<path d="M7 17h34M7 27h34M17 7v34M27 7v34" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>` +
    `<path d="M10 31h21l-3 5H13z" fill="#8d99ae" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<rect x="16" y="26" width="8" height="5" rx="1" fill="#8d99ae" stroke="${O}" stroke-width="1.6"/>` +
    `<path d="M20 26v-4" stroke="${O}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<circle cx="34" cy="14" r="5.5" fill="#ff7b39"/><path d="M31.5 11.5l5 5M36.5 11.5l-5 5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="13" cy="13" r="2" fill="#fff"/><circle cx="37" cy="37" r="2" fill="#fff"/>`),

  ahorcado: svg(
    `<path d="M9 40h18M14 40V9h18M14 16l7-7" stroke="#e09a55" stroke-width="3" stroke-linecap="round" fill="none"/>` +
    `<path d="M32 9v4" stroke="${O}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M32 22v8M32 24l-4 4M32 24l4 4M32 30l-3 6M32 30l3 6" stroke="${O}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<circle cx="32" cy="17.5" r="4.5" fill="#ffd23f" stroke="${O}" stroke-width="1.6"/>` +
    `<rect x="29" y="36" width="6.5" height="8" rx="1.5" fill="#fff" stroke="${O}" stroke-width="1.2"/><text x="32.25" y="42.4" text-anchor="middle" font-size="6.5" font-weight="700" fill="${ROJO}" font-family="Fredoka,system-ui,sans-serif">A</text>` +
    `<rect x="37" y="36" width="6.5" height="8" rx="1.5" fill="#fff" stroke="${O}" stroke-width="1.2"/>`),

  'quien-soy': svg(
    `<rect x="11" y="8" width="24" height="32" rx="4" fill="#ffd23f" stroke="${O}" stroke-width="2"/>` +
    `<circle cx="23" cy="20" r="5.5" fill="${O}" opacity=".85"/><path d="M14.5 36q8.5-11 17 0z" fill="${O}" opacity=".85"/>` +
    `<circle cx="36" cy="13" r="7" fill="${ROJO}"/><text x="36" y="17.2" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="Fredoka,system-ui,sans-serif">?</text>`),

  minigolf: svg(
    `<path d="M8 40q16-8 32 0" fill="#5cc480"/><ellipse cx="30" cy="36" rx="5" ry="1.8" fill="${O}"/>` +
    `<path d="M30 36V9" stroke="${O}" stroke-width="2" stroke-linecap="round"/><path d="M30 9l10 3.5-10 3.5z" fill="${ROJO}"/>` +
    `<circle cx="14" cy="33" r="4" fill="#fff" stroke="${O}" stroke-width="1.6"/>` +
    `<path d="M6 22q4 6 8 9" stroke="${O}" stroke-width="1.4" stroke-dasharray="1.5 2.5" fill="none"/>`),

  'tutti-frutti': svg(
    `<rect x="9" y="7" width="22" height="28" rx="4" fill="#ffd23f" stroke="${O}" stroke-width="2" transform="rotate(-8 20 21)"/>` +
    `<text x="19" y="29" text-anchor="middle" font-size="19" font-weight="700" fill="${O}" font-family="Fredoka,system-ui,sans-serif" transform="rotate(-8 20 21)">M</text>` +
    `<circle cx="34" cy="33" r="7" fill="${ROJO}"/><path d="M34 26q1-4 4-5" stroke="#2f7a48" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="38.5" cy="22" rx="3" ry="1.6" fill="${VERDE}" transform="rotate(-25 38.5 22)"/>`),

  truco: svg(
    `<g transform="rotate(-14 18 26)"><rect x="8" y="10" width="17" height="25" rx="3" fill="#fffdf6" stroke="${O}" stroke-width="1.8"/>` +
    `<path d="M16.5 14l2 3.5v10h-4v-10z" fill="#cfe0f2" stroke="#3f6fa0" stroke-width="1.2"/><rect x="12" y="27" width="9" height="2.4" rx="1.2" fill="${AZUL}"/></g>` +
    `<g transform="rotate(12 30 26)"><rect x="21" y="10" width="17" height="25" rx="3" fill="#fffdf6" stroke="${O}" stroke-width="1.8"/>` +
    `<path d="M27.5 31l-1.2-11q-.4-5 3.2-5t3 5l-1.2 11z" fill="#5cc480" stroke="#2f7a48" stroke-width="1.2"/></g>`),

  dibujamiento: svg(
    `<rect x="5" y="6" width="17" height="13" rx="3" fill="#fff" stroke="${O}" stroke-width="1.8"/><path d="M9 15q2-5 4-1t5-4" stroke="${ROJO}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<path d="M24 12h6m-2.5-3 3 3-3 3" stroke="${O}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M26 22h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-9l-4 4v-4h-2a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z" fill="#ffd23f" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="M29 27h10M29 31h6" stroke="${O}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<rect x="5" y="26" width="17" height="13" rx="3" fill="#fff" stroke="${O}" stroke-width="1.8"/><circle cx="13.5" cy="32.5" r="3.5" fill="none" stroke="${AZUL}" stroke-width="2"/>`),

  pinturillo: svg(
    `<rect x="7" y="9" width="30" height="24" rx="3" fill="#fff" stroke="${O}" stroke-width="2"/>` +
    `<path d="M12 27q4-12 9-6t9-8" stroke="${ROJO}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `<circle cx="17" cy="16" r="2.5" fill="#ffd23f"/>` +
    `<path d="M31 41l9-15 3 2-9 15-4 1z" fill="#ffd23f" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/><path d="M40 26l3 2" stroke="${ROJO}" stroke-width="2.6"/>`),

  // Espía: sombrero y anteojos oscuros, con un cartelito de palabra
  espia: svg(
    `<path d="M10 22h28" stroke="${O}" stroke-width="3" stroke-linecap="round"/><path d="M15 21q1-11 9-11t9 11z" fill="${O}"/>` +
    `<path d="M15 19h18" stroke="${ROJO}" stroke-width="2.2"/>` +
    `<circle cx="18.5" cy="28" r="4.6" fill="${O}"/><circle cx="29.5" cy="28" r="4.6" fill="${O}"/><path d="M23 28h2" stroke="${O}" stroke-width="2"/>` +
    `<circle cx="17" cy="26.6" r="1.3" fill="#fff" opacity=".7"/><circle cx="28" cy="26.6" r="1.3" fill="#fff" opacity=".7"/>` +
    `<rect x="12" y="35" width="24" height="8" rx="3" fill="#ffd23f" stroke="${O}" stroke-width="1.6"/><path d="M16 39h16" stroke="${O}" stroke-width="1.6" stroke-dasharray="2.5 2" stroke-linecap="round"/>`),

  // Código secreto: cuatro bolitas de colores y, abajo, las pistas
  'codigo-secreto': svg(
    [ROJO, AZUL, '#f4c430', VERDE].map((c, k) => bola(10.5 + k * 9, 19, c)).join('') +
    `<rect x="8" y="30" width="32" height="10" rx="4" fill="${O}" opacity=".12"/>` +
    `<circle cx="16" cy="35" r="2.6" fill="${VERDE}"/><circle cx="24" cy="35" r="2.6" fill="#f4c430"/><path d="M30 33l4 4M34 33l-4 4" stroke="${ROJO}" stroke-width="2" stroke-linecap="round"/>`),

  // Más alto o más bajo: un número con flechitas arriba y abajo
  'alto-bajo': svg(
    `<rect x="9" y="15" width="24" height="18" rx="4" fill="${CREMA}" stroke="#e09a55" stroke-width="1.6"/>` +
    `<text x="21" y="29" text-anchor="middle" font-size="13" font-weight="700" fill="${O}" font-family="Fredoka,system-ui,sans-serif">42</text>` +
    `<path d="M39 8l-4.5 6h9z" fill="#f4c430"/><path d="M39 40l-4.5-6h9z" fill="${AZUL}"/><path d="M39 15v18" stroke="${O}" stroke-opacity=".2" stroke-width="2" stroke-linecap="round"/>`),

  // Críptico: un cartel con signos sobre las rayitas del ahorcado
  criptico: svg(
    `<path d="M10 8h28a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H22l-5 5v-5h-7a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z" fill="#b98cff" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<text x="24" y="22.5" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" font-family="Fredoka,system-ui,sans-serif">?!</text>` +
    `<rect x="8" y="34" width="7" height="8" rx="1.5" fill="#fff" stroke="${O}" stroke-width="1.2"/><text x="11.5" y="40.4" text-anchor="middle" font-size="6.5" font-weight="700" fill="${ROJO}" font-family="Fredoka,system-ui,sans-serif">C</text>` +
    `<path d="M19 42h6M29 42h6M37.5 42h3" stroke="${O}" stroke-width="2.2" stroke-linecap="round"/>`),

  // Cuatro en línea: tablero con agujeros y una diagonal roja
  'cuatro-en-linea': svg(
    `<rect x="5" y="9" width="38" height="31" rx="7" fill="#e09a55"/>` +
    [16, 24.5, 33].flatMap((y, f) => [12, 20, 28, 36].map((x, c) => {
      const col = (f === 2 && c === 0) || (f === 1 && c === 1) || (f === 0 && c === 2) ? ROJO
        : (f === 2 && (c === 1 || c === 2)) || (f === 1 && c === 2) ? AZUL : '#fff8ea';
      return `<circle cx="${x}" cy="${y}" r="3.4" fill="${col}"/>`;
    })).join('') + `<path d="M36 4v4" stroke="${ROJO}" stroke-width="2.6" stroke-linecap="round"/>`),

  // Mancala: tablero de madera con dos graneros y semillas
  mancala: svg(
    `<rect x="3" y="13" width="42" height="22" rx="11" fill="#e09a55"/>` +
    `<ellipse cx="10" cy="24" rx="3.6" ry="7.4" fill="${CREMA}"/><ellipse cx="38" cy="24" rx="3.6" ry="7.4" fill="${CREMA}"/>` +
    [18, 24, 30].flatMap(x => [19.5, 28.5].map(y => `<circle cx="${x}" cy="${y}" r="3.1" fill="${CREMA}"/>`)).join('') +
    `<circle cx="17.2" cy="19" r="1.1" fill="${ROJO}"/><circle cx="18.9" cy="20.3" r="1.1" fill="${AZUL}"/>` +
    `<circle cx="29.3" cy="28" r="1.1" fill="#f4c430"/><circle cx="30.8" cy="29.2" r="1.1" fill="${VERDE}"/><circle cx="24" cy="28.5" r="1.1" fill="${ROJO}"/>` +
    `<circle cx="38" cy="21" r="1.1" fill="${AZUL}"/><circle cx="37.6" cy="24.5" r="1.1" fill="#f4c430"/><circle cx="38.5" cy="27.6" r="1.1" fill="${ROJO}"/>`),

  // Duelo de palabras: cuatro letras pintadas
  'duelo-de-palabras': svg(
    [['A', VERDE], ['M', '#f4c430'], ['O', '#8a80b0'], ['R', VERDE]].map(([l, c], k) =>
      `<rect x="${4.5 + k * 10}" y="17" width="9" height="11" rx="2.4" fill="${c}"/>` +
      `<text x="${9 + k * 10}" y="25.6" text-anchor="middle" font-size="8" font-weight="700" fill="#fff" font-family="Fredoka,system-ui,sans-serif">${l}</text>`).join('') +
    `<path d="M10 35h28" stroke="${O}" stroke-opacity=".18" stroke-width="2.4" stroke-linecap="round"/>`),

  // Dados mentirosos: un vaso dado vuelta y dos dados
  'dados-mentirosos': svg(
    `<path d="M9 10h15l-2.4 20H11.4z" fill="#8a4b2a" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<rect x="7" y="8" width="19" height="4" rx="2" fill="#b0663c" stroke="${O}" stroke-width="1.4"/>` +
    `<g transform="rotate(-10 20 33)"><rect x="13" y="26" width="13" height="13" rx="3" fill="#fff" stroke="${O}" stroke-width="1.6"/>` +
    `<circle cx="16.6" cy="29.6" r="1.3" fill="${O}"/><circle cx="19.5" cy="32.5" r="1.3" fill="${O}"/><circle cx="22.4" cy="35.4" r="1.3" fill="${O}"/></g>` +
    `<g transform="rotate(12 35 30)"><rect x="28.5" y="23.5" width="13" height="13" rx="3" fill="#fff" stroke="${O}" stroke-width="1.6"/>` +
    `<circle cx="32" cy="27" r="1.3" fill="${ROJO}"/><circle cx="38" cy="27" r="1.3" fill="${ROJO}"/><circle cx="32" cy="33" r="1.3" fill="${ROJO}"/><circle cx="38" cy="33" r="1.3" fill="${ROJO}"/></g>`),

  // Carrera al 100: un dado y la bandera de llegada
  'carrera-al-100': svg(
    `<g transform="rotate(-12 17 31)"><rect x="8" y="22" width="18" height="18" rx="4" fill="#fff" stroke="${O}" stroke-width="1.8"/>` +
    `<circle cx="12.8" cy="26.8" r="1.7" fill="${O}"/><circle cx="21.2" cy="26.8" r="1.7" fill="${O}"/><circle cx="17" cy="31" r="1.7" fill="${O}"/>` +
    `<circle cx="12.8" cy="35.2" r="1.7" fill="${O}"/><circle cx="21.2" cy="35.2" r="1.7" fill="${O}"/></g>` +
    `<path d="M29 41V7" stroke="${O}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M30 8h14l-2.6 5.5 2.6 5.5H30z" fill="${ROJO}"/>` +
    `<text x="36.3" y="16.4" text-anchor="middle" font-size="7.4" font-weight="700" fill="#fff" font-family="Fredoka,system-ui,sans-serif">100</text>`),

  // Ordenados: tres cartas que van de menor a mayor
  ordenados: svg(
    [[8, 26, AZUL, '7'], [19, 20, '#f4c430', '48'], [30, 14, ROJO, '93']].map(([x, y, c, t]) =>
      `<rect x="${x}" y="${y}" width="10" height="${40 - y}" rx="2.6" fill="${c}"/>` +
      `<text x="${x + 5}" y="${y + 7.5}" text-anchor="middle" font-size="${t.length > 1 ? 5.6 : 7}" font-weight="700" fill="#fff" font-family="Fredoka,system-ui,sans-serif">${t}</text>`).join('') +
    `<path d="M8 43.5h32" stroke="${O}" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/>`),

  // Dos verdades y una mentira: tres renglones, dos bien y uno mal
  'dos-verdades': svg(
    [12.5, 22, 31.5].map(y => `<rect x="7" y="${y}" width="24" height="6" rx="3" fill="${O}" opacity=".16"/>`).join('') +
    `<path d="M35 15.5l2.4 2.4 4.2-4.6M35 25l2.4 2.4 4.2-4.6" fill="none" stroke="${VERDE}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>` +
    cruz(38.3, 34.5)),

  // ¿Quién es más probable?: tres personas y la del medio con corona
  'quien-es-mas': svg(
    [[12, 26, AZUL], [36, 26, VERDE], [24, 22, ROJO]].map(([x, y, c]) =>
      `<circle cx="${x}" cy="${y}" r="4.6" fill="${c}"/><path d="M${x - 7} ${y + 16}a7 7.5 0 0 1 14 0z" fill="${c}"/>`).join('') +
    `<path d="M18.5 15l2-6 3.5 4 3.5-4 2 6z" fill="#f4c430" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/>`),
};
