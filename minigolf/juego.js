// Pantalla del Minigolf: cancha en un canvas, tiro "tipo gomera" y la tarjeta de golpes.
import { W, H, R, HOYO_R, MAX_V, HOYOS, canchaDe, simular, totalDe } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, cv, g, tarjeta, escala = 1, menuEl = null;
let apunta = null;            // {x0, y0, x, y} mientras arrastrás
let anim = null;              // {p, h, puntos: [[x, y, evento]], i, fin} el tiro que se está viendo
let ultVisto = null;          // k del último tiro animado
let golpeT = 0;

// ---------- Menú: cuántos hoyos ----------
export function menu(el) {
  menuEl = el;
  el.innerHTML = `<div class="pills" role="radiogroup" aria-label="Cantidad de hoyos">${HOYOS.map(h =>
    `<label><input type="radio" name="mgHoyos" value="${h}"${h === 6 ? ' checked' : ''}><span>${h}</span></label>`).join('')}
    <span class="note">hoyos</span></div>`;
}
export function opciones() {
  const r = menuEl && menuEl.querySelector('input[name="mgHoyos"]:checked');
  return {hoyos: r ? +r.value : 6};
}

export function reiniciar() { apunta = null; anim = null; ultVisto = null; }

// El golpe suena al tirar; embocar, el agua y los rebotes suenan durante la animación
export const sonido = (a, e) => (e.ult && (!a.ult || a.ult.k !== e.ult.k) ? 'golpe' : null);

export function iniciar(c) {
  ctx = c;
  ctx.tablero.innerHTML = `<div class="mg-cancha"><canvas id="mgCv" aria-label="Cancha de minigolf"></canvas>
    <div class="mg-cartel" id="mgCartel" hidden></div></div><div class="mg-tarjeta" id="mgTarjeta"></div>`;
  cv = document.getElementById('mgCv');
  g = cv.getContext('2d');
  tarjeta = document.getElementById('mgTarjeta');
  new ResizeObserver(medir).observe(cv);
  cv.addEventListener('pointerdown', abajo);
  cv.addEventListener('pointermove', mover);
  cv.addEventListener('pointerup', soltar);
  cv.addEventListener('pointercancel', () => { apunta = null; pintar(); });
}

function medir() {
  const dpr = devicePixelRatio || 1, ancho = cv.clientWidth;
  if (!ancho) return;
  escala = ancho / W;
  cv.width = Math.round(ancho * dpr); cv.height = Math.round(ancho * H / W * dpr);
  g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  pintar();
}
const punto = ev => { const b = cv.getBoundingClientRect(); return [(ev.clientX - b.left) / b.width * W, (ev.clientY - b.top) / b.height * H]; };

// ---------- Tirar: arrastrás para atrás y soltás ----------
const fuerza = a => {
  const dx = a.x0 - a.x, dy = a.y0 - a.y, d = Math.sqrt(dx * dx + dy * dy), v = Math.min(MAX_V, d / 85 * MAX_V);
  return d < 1e-6 ? {vx: 0, vy: 0, v: 0} : {vx: dx / d * v, vy: dy / d * v, v};
};
function abajo(ev) {
  if (!ctx.puedoJugar() || anim) return;
  const [x, y] = punto(ev);
  apunta = {x0: x, y0: y, x, y};
  cv.setPointerCapture(ev.pointerId);
  pintar();
}
function mover(ev) {
  if (!apunta) return;
  [apunta.x, apunta.y] = punto(ev);
  pintar();
}
function soltar() {
  if (!apunta) return;
  const f = fuerza(apunta);
  apunta = null;
  if (f.v < 0.35) { pintar(); return; }                     // un toquecito no cuenta
  ctx.jugar({vx: Math.round(f.vx * 100) / 100, vy: Math.round(f.vy * 100) / 100});
  pintar();
}

// ---------- Animación del último tiro ----------
function arrancarAnim(e) {
  const u = e.ult, puntos = [];
  simular(canchaDe(u.h), u.x, u.y, u.vx, u.vy, (x, y, ev) => puntos.push([x, y, ev]));
  anim = {p: u.p, h: u.h, puntos, i: 0, t0: performance.now()};
  requestAnimationFrame(cuadro);
}
function cuadro(t) {
  if (!anim) return;
  const quiero = Math.floor((t - anim.t0) / (1000 / 60) * (anim.puntos.length > 400 ? 2 : 1));   // tiros largos, al doble
  while (anim.i < quiero && anim.i < anim.puntos.length - 1) {
    anim.i++;
    const ev = anim.puntos[anim.i][2];
    if (ev === 'rebote' && t - golpeT > 70) { golpeT = t; ctx.sonar('rebote'); }
  }
  if (anim.i >= anim.puntos.length - 1) {
    const ev = anim.puntos[anim.puntos.length - 1][2];
    if (ev === 'hoyo') ctx.sonar('embocar');
    else if (ev === 'agua') ctx.sonar('agua');
    const cambioHoyo = anim.h !== ctx.estado.hoyo;
    anim = null;
    if (cambioHoyo && ctx.estado.ganador === -1) cartel(`⛳ Hoyo ${ctx.estado.hoyo + 1}: ${canchaDe(ctx.estado.hoyo).nombre}`);
    ctx.refrescar();
    return;
  }
  pintar();
  requestAnimationFrame(cuadro);
}
let cartelT;
function cartel(txt) {
  const el = document.getElementById('mgCartel');
  el.textContent = txt; el.hidden = false; ctx.animar(el);
  clearTimeout(cartelT); cartelT = setTimeout(() => { el.hidden = true; }, 1800);
}

// ---------- Dibujo ----------
function camino(pol) { g.beginPath(); pol.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
function pintarCancha(c) {
  g.fillStyle = '#1d1449'; g.fillRect(0, 0, W, H);
  // Pasto a rayas, recortado al borde
  g.save(); camino(c.borde); g.clip();
  for (let y = 0; y < H; y += 20) { g.fillStyle = (y / 20) % 2 ? '#4cc26e' : '#55cc78'; g.fillRect(0, y, W, 20); }
  for (const [x, y, w, h, ax, ay] of c.rampas || []) {
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let yy = y + 14; yy < y + h; yy += 26) for (let xx = x + 14; xx < x + w; xx += 26) {
      g.save(); g.translate(xx, yy); g.rotate(Math.atan2(ay, ax) - Math.PI / 2);
      g.beginPath(); g.moveTo(-5, -3); g.lineTo(0, 3); g.lineTo(5, -3); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.45)'; g.stroke();
      g.restore();
    }
  }
  for (const [x, y, w, h] of c.arena || []) { g.fillStyle = '#f2d48b'; redondo(x, y, w, h, 8); g.fill();
    g.fillStyle = 'rgba(180,140,60,.35)'; for (let k = 0; k < w * h / 120; k++) g.fillRect(x + ((k * 37) % w), y + ((k * 53) % h), 1.2, 1.2); }
  for (const [x, y, w, h] of c.agua || []) { g.fillStyle = '#3fa7e0'; redondo(x, y, w, h, 10); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.4;
    for (let yy = y + 10; yy < y + h; yy += 14) { g.beginPath(); for (let xx = x + 6; xx < x + w - 6; xx += 12) { g.moveTo(xx, yy); g.quadraticCurveTo(xx + 3, yy - 3, xx + 6, yy); } g.stroke(); } }
  g.restore();
  // Muros
  g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#e09a55';
  camino(c.borde); g.stroke();
  for (const m of c.muros || []) { camino(m); g.fillStyle = '#fbe3b4'; g.fill(); g.stroke(); }
  for (const [x, y, r] of c.postes || []) {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = '#ff6b81'; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = '#fff8ea'; g.stroke();
    g.beginPath(); g.arc(x - r * .3, y - r * .3, r * .28, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill();
  }
  // Salida y hoyo con banderita
  const [sx, sy] = c.salida; g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(sx - 9, sy - 3, 18, 6);
  const [hx, hy] = c.hoyo;
  g.beginPath(); g.arc(hx, hy, HOYO_R, 0, Math.PI * 2); g.fillStyle = '#1a1033'; g.fill();
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,.5)'; g.stroke();
  g.strokeStyle = '#fff8ea'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx, hy - 24); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(hx, hy - 24); g.lineTo(hx + 13, hy - 19.5); g.lineTo(hx, hy - 15); g.fill();
}
function redondo(x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function pelota(x, y, color, activa) {
  if (activa) { g.beginPath(); g.arc(x, y, R + 4, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.25)'; g.fill(); }
  g.beginPath(); g.arc(x + .8, y + 1.2, R, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,.25)'; g.fill();
  g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fillStyle = color; g.fill();
  g.lineWidth = 1.3; g.strokeStyle = '#fff'; g.stroke();
}

function pintar() {
  const e = ctx && ctx.estado;
  if (!e || !escala) return;
  const h = anim ? anim.h : e.hoyo, c = canchaDe(h);
  pintarCancha(c);
  const enJuego = e.ganador === -1;
  for (let p = 0; p < e.n; p++) {
    if (anim && p === anim.p) continue;
    if (!anim && e.hecho[p]) continue;
    // Mientras se ve el último tiro de un hoyo que ya terminó, el resto queda donde estaba
    const pos = anim && anim.h !== e.hoyo ? null : e.pos[p];
    if (pos) pelota(pos[0], pos[1], ctx.color(p), enJuego && !anim && p === e.turno);
  }
  if (anim) { const [x, y] = anim.puntos[anim.i]; pelota(x, y, ctx.color(anim.p), false); }
  // Mira: flecha hacia donde sale y barra de fuerza
  if (apunta) {
    const f = fuerza(apunta), [bx, by] = e.pos[e.turno], frac = f.v / MAX_V;
    if (f.v > 0) {
      const largo = 18 + frac * 70, ux = f.vx / f.v, uy = f.vy / f.v;
      g.setLineDash([3, 4]); g.lineWidth = 2; g.strokeStyle = '#fff';
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + ux * largo, by + uy * largo); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(bx + ux * largo, by + uy * largo, 3, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
      g.fillStyle = 'rgba(10,5,40,.6)'; g.fillRect(8, H - 14, 60, 7);
      g.fillStyle = frac > .85 ? '#ff6b81' : frac > .5 ? '#ffd23f' : '#7ef0b8'; g.fillRect(8, H - 14, 60 * frac, 7);
    }
  }
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado;
  // ¿Llegó un tiro nuevo? Se anima (el propio y el de los demás)
  if (e.ult && e.ult.k !== ultVisto) {
    const primera = ultVisto === null;
    ultVisto = e.ult.k;
    if (!primera) arrancarAnim(e);
  } else if (!e.ult) ultVisto = 0;
  pintar();

  // Tarjeta de golpes
  const hoyos = e.opciones.hoyos, cols = Array.from({length: hoyos}, (_, k) => k);
  tarjeta.innerHTML = `<table><thead><tr><th></th>${cols.map(k => `<th class="${k === e.hoyo && e.ganador === -1 ? 'act' : ''}">${k + 1}</th>`).join('')}<th>Tot</th></tr>
    <tr class="par"><td>Par</td>${cols.map(k => `<td>${canchaDe(k).par}</td>`).join('')}<td>${cols.reduce((a, k) => a + canchaDe(k).par, 0)}</td></tr></thead>
    <tbody>${Array.from({length: e.n}, (_, p) => `<tr><td><span class="dot" style="background:${ctx.color(p)}"></span>${esc(ctx.nombre(p))}</td>${cols.map(k => {
      const v = k < e.tarjeta[p].length ? e.tarjeta[p][k] : k === e.hoyo && e.ganador === -1 && e.golpes[p] ? e.golpes[p] : '';
      const cls = v === '' ? '' : k === e.hoyo && e.ganador === -1 ? 'act' : v < canchaDe(k).par ? 'bajo' : v > canchaDe(k).par ? 'sobre' : '';
      return `<td class="${cls}">${v}</td>`;
    }).join('')}<td><b>${totalDe(e, p)}</b></td></tr>`).join('')}</tbody></table>`;

  if (e.ganador !== -1) return '';
  const c0 = canchaDe(e.hoyo), base = `Hoyo ${e.hoyo + 1}/${hoyos} · ${c0.nombre} · par ${c0.par}`;
  return ctx.puedoJugar() ? `${base} — arrastrá para atrás y soltá` : base;
}
