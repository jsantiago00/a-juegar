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

  'quien-soy': svg(
    `<rect x="11" y="8" width="24" height="32" rx="4" fill="#ffd23f" stroke="${O}" stroke-width="2"/>` +
    `<circle cx="23" cy="20" r="5.5" fill="${O}" opacity=".85"/><path d="M14.5 36q8.5-11 17 0z" fill="${O}" opacity=".85"/>` +
    `<circle cx="36" cy="13" r="7" fill="${ROJO}"/><text x="36" y="17.2" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="Fredoka,system-ui,sans-serif">?</text>`),
};
