// Minigolf: por turnos, cada uno le pega a su pelota. Gana quien termina el recorrido con menos golpes.
// La física es determinística (solo + - * / y raíz): el que tira la calcula y todos la ven igual.
import { lista, EMPATE } from '../shared/salas.js';

export const W = 200, H = 300;                 // tamaño de la cancha (unidades lógicas)
export const R = 3.4, HOYO_R = 5.6, MAX_V = 7.5, TOPE = 8;
const ROCE = 0.984, ROCE_ARENA = 0.935, FRENO = 0.006, REBOTE = 0.72, CAPTURA = 3.3, PARAR = 0.07;

// ---------- Canchas ----------
// borde: polígono de afuera; muros: polígonos (obstáculos); postes: [x, y, radio];
// arena / agua: rectángulos [x, y, ancho, alto]; rampas: [x, y, ancho, alto, ax, ay] (empujan)
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const CANCHAS = [
  {nombre: 'La recta', par: 2, salida: [100, 255], hoyo: [100, 60], borde: rect(45, 20, 110, 260)},
  {nombre: 'La ele', par: 3, salida: [145, 250], hoyo: [55, 55],
   borde: [[20, 20], [95, 20], [95, 190], [180, 190], [180, 280], [20, 280]]},
  {nombre: 'El tapón', par: 3, salida: [100, 258], hoyo: [100, 52], borde: rect(30, 20, 140, 260),
   muros: [rect(65, 135, 70, 22)], postes: [[60, 85, 6], [140, 85, 6]]},
  {nombre: 'Zigzag', par: 3, salida: [140, 258], hoyo: [50, 50], borde: rect(20, 20, 160, 260),
   muros: [rect(20, 100, 112, 10), rect(68, 192, 112, 10)]},
  {nombre: 'El arenero', par: 3, salida: [100, 258], hoyo: [100, 48], borde: rect(30, 20, 140, 260),
   arena: [[30, 115, 140, 55]], postes: [[75, 205, 7], [125, 205, 7], [100, 85, 7]]},
  {nombre: 'La laguna', par: 3, salida: [55, 258], hoyo: [55, 50], borde: rect(20, 20, 160, 260),
   agua: [[20, 105, 112, 85]]},
  {nombre: 'La bajada', par: 3, salida: [40, 258], hoyo: [160, 52], borde: rect(20, 20, 160, 260),
   rampas: [[20, 95, 160, 110, 0, 0.05]], muros: [[[95, 150], [125, 150], [110, 175]]]},
  {nombre: 'Los hongos', par: 3, salida: [100, 260], hoyo: [100, 45], borde: rect(25, 20, 150, 260),
   postes: [[60, 200, 8], [100, 175, 8], [140, 200, 8], [80, 130, 8], [120, 130, 8], [60, 90, 7], [140, 90, 7], [100, 95, 7]]},
  {nombre: 'El castillo', par: 4, salida: [100, 260], hoyo: [100, 62], borde: rect(20, 20, 160, 260),
   muros: [[[50, 30], [150, 30], [150, 95], [112, 95], [112, 87], [142, 87], [142, 38], [58, 38], [58, 87], [88, 87], [88, 95], [50, 95]]],
   arena: [[20, 150, 55, 40], [125, 150, 55, 40]], agua: [[85, 165, 30, 30]]},
];
export const HOYOS = [3, 6, 9];

// Segmentos de los muros (borde + obstáculos), calculados una vez por cancha
const segs = new Map();
function segmentos(c) {
  if (!segs.has(c)) {
    const out = [];
    for (const pol of [c.borde, ...(c.muros || [])]) pol.forEach((a, k) => { const b = pol[(k + 1) % pol.length]; out.push([a[0], a[1], b[0], b[1]]); });
    segs.set(c, out);
  }
  return segs.get(c);
}
const enRect = (x, y, [rx, ry, rw, rh]) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;

// Simula un tiro. Devuelve {x, y, dentro, agua, rebotes}. traza(x, y, evento) se llama en cada paso (para animar).
export function simular(c, x, y, vx, vy, traza) {
  const S = segmentos(c), [hx, hy] = c.hoyo;
  let lento = 0, rebotes = 0;
  for (let paso = 0; paso < 4000; paso++) {
    const v = Math.sqrt(vx * vx + vy * vy);
    const sub = Math.max(1, Math.ceil(v / 1.1));
    let pego = false;
    for (let s = 0; s < sub; s++) {
      x += vx / sub; y += vy / sub;
      for (const [ax, ay, bx, by] of S) {
        const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
        let t = ((x - ax) * ex + (y - ay) * ey) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = x - (ax + t * ex), dy = y - (ay + t * ey), d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 1e-12) {
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          x += nx * (R - d); y += ny * (R - d);
          const vn = vx * nx + vy * ny;
          if (vn < 0) { vx -= (1 + REBOTE) * vn * nx; vy -= (1 + REBOTE) * vn * ny; pego = true; }
        }
      }
      for (const [px, py, pr] of c.postes || []) {
        const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy, m = R + pr;
        if (d2 < m * m && d2 > 1e-12) {
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          x += nx * (m - d); y += ny * (m - d);
          const vn = vx * nx + vy * ny;
          if (vn < 0) { vx -= (1 + REBOTE) * vn * nx; vy -= (1 + REBOTE) * vn * ny; pego = true; }
        }
      }
    }
    if (pego) rebotes++;
    if ((c.agua || []).some(z => enRect(x, y, z))) { traza?.(x, y, 'agua'); return {x, y, dentro: false, agua: true, rebotes}; }
    // El hoyo: si pasa despacio, la chupa; si va rápido, la pelota sigue de largo
    const hdx = hx - x, hdy = hy - y, hd2 = hdx * hdx + hdy * hdy;
    if (hd2 < HOYO_R * HOYO_R && v < CAPTURA) {
      vx += hdx * 0.06; vy += hdy * 0.06;
      if (hd2 < (HOYO_R - R * 0.7) * (HOYO_R - R * 0.7) || v < 0.6) { traza?.(hx, hy, 'hoyo'); return {x: hx, y: hy, dentro: true, agua: false, rebotes}; }
    }
    let rampa = false;
    for (const [rx, ry, rw, rh, ax, ay] of c.rampas || []) if (enRect(x, y, [rx, ry, rw, rh])) { vx += ax; vy += ay; rampa = true; }
    const f = (c.arena || []).some(z => enRect(x, y, z)) ? ROCE_ARENA : ROCE;
    vx *= f; vy *= f;
    const v2 = Math.sqrt(vx * vx + vy * vy);
    if (v2 > FRENO) { vx -= vx / v2 * FRENO; vy -= vy / v2 * FRENO; }
    traza?.(x, y, pego ? 'rebote' : '');
    if (v2 < PARAR && !rampa) break;
    lento = v2 < 0.25 ? lento + 1 : 0;
    if (lento > 60) break;                           // trabada contra un muro en una rampa
  }
  return {x, y, dentro: false, agua: false, rebotes};
}

// ---------- Estado ----------
export const info = {
  id: 'minigolf',
  nombre: 'Minigolf',
  desc: 'Embocá la pelota en la menor cantidad de golpes.',
  min: 2, max: 4,
  reglas: [
    'Por turnos, cada uno le pega a su pelota: arrastrá hacia atrás (como una gomera) y soltá.',
    'Cuanto más lejos arrastrás, más fuerte sale. Los muros y los hongos la hacen rebotar.',
    'La arena frena, las rampas empujan y si cae al agua vuelve a donde estaba, con un golpe de castigo.',
    `Si llegás a ${TOPE} golpes sin embocar, levantás la pelota y te anotan ${TOPE + 1}.`,
    'Cuando todos embocan se pasa al hoyo siguiente. Gana quien termina el recorrido con menos golpes.',
  ],
};

const red = v => Math.round(v * 100) / 100;
export const canchaDe = h => CANCHAS[h % CANCHAS.length];
export const totalDe = (e, p) => e.tarjeta[p].reduce((a, b) => a + b, 0) + (e.hecho[p] ? 0 : e.golpes[p]);

export function nuevoJuego(n, op, quien = 0) {
  const hoyos = HOYOS.includes(op && op.hoyos) ? op.hoyos : 6;
  const e = {n, opciones: {hoyos}, hoyo: 0, pos: [], golpes: Array(n).fill(0), hecho: Array(n).fill(0),
             tarjeta: Array.from({length: n}, () => []), turno: quien, empieza: quien, ganador: -1, ultima: '', ult: null};
  e.pos = Array.from({length: n}, () => [...canchaDe(0).salida]);
  return e;
}
export function normalizar(e) {
  e.opciones = e.opciones || {hoyos: 6};
  e.pos = Array.from({length: e.n}, (_, i) => { const p = lista((e.pos || {})[i]).map(Number); return p.length === 2 ? p : [...canchaDe(e.hoyo).salida]; });
  e.golpes = Array.from({length: e.n}, (_, i) => +((e.golpes || {})[i]) || 0);
  e.hecho = Array.from({length: e.n}, (_, i) => +((e.hecho || {})[i]) || 0);
  e.tarjeta = Array.from({length: e.n}, (_, i) => lista((e.tarjeta || {})[i]).map(Number));
  e.empieza = +e.empieza || 0;
  e.ult = e.ult ? {p: +e.ult.p, h: +e.ult.h, k: +e.ult.k, x: +e.ult.x, y: +e.ult.y, vx: +e.ult.vx, vy: +e.ult.vy} : null;
  e.ultima = e.ultima || '';
  return e;
}
export const detalle = (e, i) => `${totalDe(e, i)} golpes${e.hecho[i] && e.ganador === -1 ? ' ⛳' : ''}`;

function siguiente(e, p) {
  for (let k = 1; k <= e.n; k++) { const q = (p + k) % e.n; if (!e.hecho[q]) return q; }
  return -1;
}

// Jugada: {vx, vy} (velocidad de salida)
export function aplicar(e, j, nombre) {
  const p = e.turno;
  let vx = +j.vx, vy = +j.vy;
  if (!isFinite(vx) || !isFinite(vy) || e.hecho[p]) return null;
  const v = Math.sqrt(vx * vx + vy * vy);
  if (v < 0.2) return null;
  if (v > MAX_V) { vx = vx / v * MAX_V; vy = vy / v * MAX_V; }
  vx = red(vx); vy = red(vy);
  const c = canchaDe(e.hoyo), [x0, y0] = e.pos[p];
  const r = simular(c, x0, y0, vx, vy);
  e.ult = {p, h: e.hoyo, k: (e.ult ? e.ult.k : 0) + 1, x: x0, y: y0, vx, vy};
  e.golpes[p]++;
  if (r.agua) { e.golpes[p]++; e.ultima = `${nombre(p)} la tiró al agua (+1)`; }
  else e.pos[p] = [red(r.x), red(r.y)];
  if (r.dentro) {
    e.hecho[p] = 1;
    const g = e.golpes[p], dif = g - c.par;
    e.ultima = `${nombre(p)} embocó en ${g} ${g === 1 ? 'golpe ¡hoyo en uno!' : 'golpes'}${g > 1 && dif < 0 ? ' (¡bajo el par!)' : ''}`;
  } else if (e.golpes[p] >= TOPE) {
    e.hecho[p] = 1; e.golpes[p] = TOPE + 1;
    e.ultima = `${nombre(p)} llegó a ${TOPE} golpes y levanta la pelota`;
  } else if (!r.agua) e.ultima = `${nombre(p)} le pegó (${e.golpes[p]})`;

  const q = siguiente(e, p);
  if (q >= 0) { e.turno = q; return e; }
  // Terminó el hoyo: se anota y se pasa al siguiente (o se termina)
  for (let i = 0; i < e.n; i++) e.tarjeta[i].push(e.golpes[i]);
  if (e.hoyo + 1 >= e.opciones.hoyos) {
    const tot = e.tarjeta.map(t => t.reduce((a, b) => a + b, 0)), min = Math.min(...tot);
    const mejores = tot.map((t, i) => (t === min ? i : -1)).filter(i => i >= 0);
    e.ganador = mejores.length === 1 ? mejores[0] : EMPATE;
    e.ultima = `Recorrido terminado: ${tot.map((t, i) => `${nombre(i)} ${t}`).join(' · ')}`;
    return e;
  }
  e.hoyo++;
  e.pos = Array.from({length: e.n}, () => [...canchaDe(e.hoyo).salida]);
  e.golpes.fill(0); e.hecho.fill(0);
  e.turno = (e.empieza + e.hoyo) % e.n;          // cada hoyo arranca uno distinto
  e.ultima += ` · ¡Al hoyo ${e.hoyo + 1}!`;
  return e;
}
