// Pantalla de Lameloide: rombo de hexágonos. Un toque elige, otro toque confirma.
import { N, COLS, VECINOS, puedeCambiar, primero } from './reglas.js';
import { animaciones } from '../shared/efectos.js';

const R = 22, W = Math.sqrt(3) * R, PX = W / 2 + 22, PY = R + 22;
const ANCHO = PX * 2 + W * (N - 1) * 1.5, ALTO = PY * 2 + 1.5 * R * (N - 1);
const centro = (r, c) => [PX + W * (c + r / 2), PY + 1.5 * R * r];
// Vértices de un hexágono con punta arriba: 0 arriba y en sentido horario.
const vert = (x, y) => Array.from({length: 6}, (_, k) => {
  const a = (-90 + 60 * k) * Math.PI / 180;
  return [x + R * Math.cos(a), y + R * Math.sin(a)];
});

let ctx, svg, sel = -1, ultVista = null;
const anim = animaciones();
export function reiniciar() { sel = -1; }

// Cambiar no agrega fichas: suena como un "swoosh"
const fichas = e => e.celdas.filter(x => x >= 0).length;
export const sonido = (a, e) => (fichas(e) === fichas(a) ? 'cambiar' : 'colocar');

export function iniciar(c) {
  ctx = c;
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'board';
  svg.setAttribute('viewBox', `0 0 ${ANCHO} ${ALTO}`);
  ctx.tablero.append(svg);
  svg.addEventListener('click', ev => {
    const t = ev.target.closest('[data-i]');
    if (!t || !ctx.puedoJugar()) return;
    const i = +t.dataset.i;
    if (ctx.estado.celdas[i] !== -1) return;
    if (sel === i) ctx.jugar({i}).then(() => { sel = -1; ctx.refrescar(); });
    else { sel = i; ctx.sonar('tick'); ctx.refrescar(); }
  });
  ctx.controles.innerHTML = '<button id="bCambiar" hidden>Cambiar</button>';
  document.getElementById('bCambiar').onclick = () =>
    ctx.jugar({tipo: 'cambiar'}).then(() => { sel = -1; ctx.refrescar(); });
}

export function dibujar(ctx) {
  const e = ctx.estado, puedo = ctx.puedoJugar();
  if (!puedo) sel = -1;
  const claveUlt = e.ult >= 0 ? `${e.ult}:${e.celdas[e.ult]}:${e.jugadas}` : null;
  if (ultVista !== null && claveUlt && claveUlt !== ultVista) anim.marcar(claveUlt);
  ultVista = claveUlt || '';
  let hexes = '', bordes = '', marcas = '';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const i = r * N + c, [x, y] = centro(r, c), v = vert(x, y), d = e.celdas[i];
    const fill = d >= 0 ? ctx.color(d) : (i === sel ? 'var(--ok)' : ((r + c) % 2 ? 'var(--wood)' : 'var(--wood2)'));
    const poly = `<polygon class="hex${d < 0 && puedo ? ' libre' : ''}" data-i="${i}" points="${v.map(p => p.join(',')).join(' ')}" fill="${fill}"/>`;
    hexes += i === e.ult && claveUlt ? anim.envolver(claveUlt, poly) : poly;
    if (i === e.ult) marcas += `<circle class="ultm" cx="${x}" cy="${y}" r="6"/>`;
    // Lados que dan afuera del tablero: arriba/abajo de Rojo, costados de Azul
    VECINOS.forEach(([dr, dc], k) => {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < N && nc < N) return;
      const due = (nr < 0 || nr >= N) ? 0 : 1;
      const [a, b] = [v[(k + 5) % 6], v[k]];
      bordes += `<line class="borde" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${ctx.color(due)}"/>`;
    });
  }
  let etiquetas = '';
  for (let k = 0; k < N; k++) {
    const [x, y] = centro(0, k); etiquetas += `<text class="lbl" x="${x}" y="${y - R - 8}">${COLS[k]}</text>`;
    const [x2, y2] = centro(k, 0); etiquetas += `<text class="lbl" x="${x2 - W / 2 - 12}" y="${y2 + 4}">${k + 1}</text>`;
  }
  svg.innerHTML = bordes + hexes + marcas + etiquetas;

  document.getElementById('bCambiar').hidden = !(puedo && puedeCambiar(e));
  if (!puedo) return '';
  if (sel >= 0) return 'Tocá el mismo hexágono de nuevo para confirmar';
  return puedeCambiar(e) ? `Elegí un hexágono o tocá Cambiar para quedarte con el de ${ctx.nombre(primero(e))}` : 'Tocá un hexágono libre';
}
