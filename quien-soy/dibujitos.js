// Mazo incluido: 24 personajes dibujados con SVG, con rasgos variados para poder preguntar
// (pelo, color de pelo, anteojos, gorra, barba, aros, color de remera...).
const NOMBRES = ['Ana', 'Beto', 'Caro', 'Dante', 'Ema', 'Facu', 'Gabi', 'Hugo', 'Inés', 'Juana', 'Kevin', 'Lola',
                 'Mateo', 'Nora', 'Omar', 'Paz', 'Quino', 'Rocío', 'Simón', 'Tina', 'Ulises', 'Vera', 'Walter', 'Zoe'];
const PIELES = ['#f6d5b8', '#ecbc94', '#d39a6a', '#a8704a', '#7a4a2e', '#f1c99e'];
const PELOS = ['#2b1d14', '#7a4a24', '#e0b04a', '#c4511f', '#b9bec4', '#4f6fd1'];   // negro, castaño, rubio, colorado, canoso, azul
const ESTILOS = ['corto', 'largo', 'rulos', 'pelado', 'cresta', 'rodete'];
const REMERAS = ['#e8505b', '#3fa7e0', '#f4c430', '#5cc480', '#9b6dd6', '#f08a3c'];
const OJOS = ['#3b2a20', '#2f6fc0', '#3e8e41'];
const FONDOS = ['#f6e7c8', '#dcefe6', '#f3dde0', '#dfe6f5', '#efe3f6', '#f5ecd6'];

function prng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function cara(t) {
  const {piel, pelo, estilo, remera, ojos, fondo, anteojos, gorra, barba, aros} = t;
  const ceja = estilo === 'pelado' ? '#5a4636' : pelo;
  let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${fondo}"/>`;
  if (estilo === 'largo') s += `<path d="M25 46 Q23 20 50 19 Q77 20 75 46 L78 84 Q50 90 22 84Z" fill="${pelo}"/>`;
  s += `<path d="M12 100 Q14 79 50 77 Q86 79 88 100Z" fill="${remera}"/>`;
  s += `<rect x="43" y="64" width="14" height="15" rx="4" fill="${piel}"/>`;
  s += `<circle cx="27" cy="51" r="5" fill="${piel}"/><circle cx="73" cy="51" r="5" fill="${piel}"/>`;
  s += `<ellipse cx="50" cy="48" rx="23" ry="25" fill="${piel}"/>`;
  if (!gorra) {
    if (estilo === 'corto') s += `<path d="M27 47 Q25 21 50 20 Q75 21 73 47 Q70 33 58 31 Q46 36 34 32 Q29 37 27 47Z" fill="${pelo}"/>`;
    if (estilo === 'largo') s += `<path d="M27 49 Q25 20 50 19 Q75 20 73 49 Q68 30 50 29 Q32 30 27 49Z" fill="${pelo}"/>`;
    if (estilo === 'rulos') for (const [x, y] of [[29,40],[34,29],[43,22],[57,22],[66,29],[71,40],[50,25],[39,32],[61,32]]) s += `<circle cx="${x}" cy="${y}" r="8" fill="${pelo}"/>`;
    if (estilo === 'pelado') s += `<ellipse cx="41" cy="30" rx="6" ry="3" fill="#fff" opacity=".3"/>`;
    if (estilo === 'cresta') s += `<path d="M44 33 Q45 7 50 5 Q55 7 56 33 Q50 29 44 33Z" fill="${pelo}"/>`;
    if (estilo === 'rodete') s += `<circle cx="50" cy="16" r="9" fill="${pelo}"/><path d="M27 45 Q26 22 50 21 Q74 22 73 45 Q66 29 50 28 Q34 29 27 45Z" fill="${pelo}"/>`;
  } else {
    if (estilo === 'largo') s += `<path d="M27 49 Q27 36 33 33 L67 33 Q73 36 73 49 Q68 38 50 37 Q32 38 27 49Z" fill="${pelo}"/>`;
    s += `<path d="M25 41 Q26 17 50 16 Q74 17 75 41Z" fill="${gorra}"/>`;
    s += `<path d="M50 39 Q80 36 88 43 Q75 46 50 43Z" fill="${gorra}" opacity=".85"/>`;
  }
  s += `<path d="M36 42 Q41 39 46 42" stroke="${ceja}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M54 42 Q59 39 64 42" stroke="${ceja}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  s += `<circle cx="41" cy="49" r="3.2" fill="${ojos}"/><circle cx="59" cy="49" r="3.2" fill="${ojos}"/>`;
  s += `<circle cx="42" cy="48" r="1" fill="#fff"/><circle cx="60" cy="48" r="1" fill="#fff"/>`;
  if (anteojos) s += `<g stroke="#222" stroke-width="2" fill="none"><circle cx="41" cy="49" r="7"/><circle cx="59" cy="49" r="7"/><path d="M48 49 L52 49 M34 48 L28 46 M66 48 L72 46"/></g>`;
  s += `<path d="M50 52 Q46.5 58 50 59.5" stroke="rgba(0,0,0,.28)" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  s += `<circle cx="36" cy="58" r="4" fill="#e8505b" opacity=".18"/><circle cx="64" cy="58" r="4" fill="#e8505b" opacity=".18"/>`;
  if (barba) {
    s += `<path d="M27 52 Q29 77 50 77 Q71 77 73 52 Q70 66 60 68 Q50 72 40 68 Q30 66 27 52Z" fill="${barba}"/>`;
    s += `<path d="M42 62 Q50 57 58 62 Q50 63.5 42 62Z" fill="${barba}"/>`;
  }
  s += `<path d="M43 65 Q50 70 57 65" stroke="#7a3b2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  if (aros) s += `<circle cx="26" cy="58" r="2.6" fill="#f4c430" stroke="#b8861f"/><circle cx="74" cy="58" r="2.6" fill="#f4c430" stroke="#b8861f"/>`;
  return s + '</svg>';
}

export function rasgos() {
  const r = prng(7);
  const pick = a => a[Math.floor(r() * a.length)];
  return NOMBRES.map((nombre, i) => {
    const pelo = PELOS[(i + Math.floor(i / 6)) % PELOS.length];
    return {nombre, piel: pick(PIELES), pelo, estilo: ESTILOS[i % ESTILOS.length], remera: pick(REMERAS),
            ojos: pick(OJOS), fondo: FONDOS[i % FONDOS.length], anteojos: r() < .33,
            gorra: r() < .2 ? pick(['#e8505b', '#3fa7e0', '#2f4f46', '#f08a3c']) : '',
            barba: r() < .25 ? pelo : '', aros: r() < .3};
  });
}

export function dibujitos() {
  return {nombre: 'Dibujitos', cartas: rasgos().map(t => ({nombre: t.nombre, svg: cara(t)}))};
}
