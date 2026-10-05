// Pantalla de Al Centro: dibuja el tablero y traduce toques en jugadas.
import { N, META, COLS, movidas, problemaMuro } from './reglas.js';

const CS = 40, GP = 10, PD = 26, STEP = CS + GP;
const LADO = N * CS + (N - 1) * GP, SZ = PD + LADO + 12;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let ctx, svg;
let ui = {muro: false, orient: 'h', toque: null, preview: null};

function ancla(c, r, o) {
  return o === 'h' ? {o, c: clamp(c - 1, 0, 8), r: clamp(r, 0, 9)}
                   : {o, c: clamp(c, 0, 9), r: clamp(r - 1, 0, 8)};
}
export function reiniciar() { ui = {...ui, muro: false, toque: null, preview: null}; }

async function hacer(jugada) {
  if (await ctx.jugar(jugada)) { reiniciar(); ctx.refrescar(); }
}
function tocar(c, r) {
  if (!ctx.puedoJugar()) return;
  if (ui.muro) { ui.toque = [c, r]; ui.preview = ancla(c, r, ui.orient); ctx.refrescar(); return; }
  hacer({tipo: 'mover', a: [c, r]});
}

export function iniciar(c) {
  ctx = c;
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'board';
  svg.setAttribute('viewBox', `0 0 ${SZ} ${SZ}`);
  ctx.tablero.append(svg);
  svg.addEventListener('click', e => { const t = e.target.closest('[data-c]'); if (t) tocar(+t.dataset.c, +t.dataset.r); });

  ctx.controles.innerHTML = `
    <button id="bMover">Mover</button>
    <button id="bMuro">Muro</button>
    <button id="bGirar" hidden>Girar</button>
    <button class="main" id="bPoner" hidden>Poner muro</button>
    <button id="bPasar" hidden>Pasar turno</button>`;
  const $ = id => document.getElementById(id);
  $('bMover').onclick = () => { ui.muro = false; ui.preview = null; ctx.refrescar(); };
  $('bMuro').onclick = () => { ui.muro = true; ctx.refrescar(); };
  $('bGirar').onclick = () => {
    ui.orient = ui.orient === 'h' ? 'v' : 'h';
    if (ui.toque) ui.preview = ancla(ui.toque[0], ui.toque[1], ui.orient);
    ctx.refrescar();
  };
  $('bPoner').onclick = () => { if (ui.preview) hacer({tipo: 'muro', ...ui.preview}); };
  $('bPasar').onclick = () => hacer({tipo: 'pasar'});
}

function muroRect(w, col, cls) {
  let x, y, wd, ht;
  if (w.o === 'h') { x = PD + w.c * STEP; y = PD + w.r * STEP + CS + 1; wd = 3 * CS + 2 * GP; ht = GP - 2; }
  else { x = PD + w.c * STEP + CS + 1; y = PD + w.r * STEP; wd = GP - 2; ht = 3 * CS + 2 * GP; }
  return `<rect class="${cls}" x="${x}" y="${y}" width="${wd}" height="${ht}" rx="3" fill="${col}"/>`;
}

export function dibujar(ctx) {
  const e = ctx.estado, puedo = ctx.puedoJugar(), p = e.turno;
  const muroActivo = puedo && ui.muro;
  const mv = puedo && !ui.muro ? movidas(e, p) : [];
  const esMv = (c, r) => mv.some(([a, b]) => a === c && b === r);

  let s = `<rect class="bg" x="${PD - 8}" y="${PD - 8}" width="${LADO + 16}" height="${LADO + 16}" rx="14"/>`;
  for (let i = 0; i < N; i++) {
    s += `<text class="lbl" x="${PD + i * STEP + CS / 2}" y="${PD - 12}">${COLS[i]}</text>`;
    s += `<text class="lbl" x="${PD - 16}" y="${PD + i * STEP + CS / 2 + 4}">${i + 1}</text>`;
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const x = PD + c * STEP, y = PD + r * STEP, meta = c === META[0] && r === META[1];
    s += `<rect class="cell${meta ? ' goal' : ''}${esMv(c, r) ? ' mv' : ''}" x="${x}" y="${y}" width="${CS}" height="${CS}" rx="7" data-c="${c}" data-r="${r}"/>`;
    if (meta) s += `<circle class="goalmark" cx="${x + CS / 2}" cy="${y + CS / 2}" r="12"/>`;
  }
  for (const w of e.muros) s += muroRect(w, ctx.color(w.p), 'wall');
  if (muroActivo && ui.preview) {
    const ok = e.quedan[p] > 0 && !problemaMuro(e, ui.preview, ctx.nombre);
    s += muroRect(ui.preview, ok ? 'var(--ok)' : 'var(--bad)', 'prev');
  }
  e.pos.forEach(([c, r], i) => {
    const x = PD + c * STEP + CS / 2, y = PD + r * STEP + CS / 2;
    if (i === p && e.ganador === -1) s += `<circle class="ring" cx="${x}" cy="${y}" r="17.5" stroke="${ctx.color(i)}"/>`;
    s += `<circle class="ball" cx="${x}" cy="${y}" r="13" fill="${ctx.color(i)}" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>`;
    s += `<circle class="shine" cx="${x - 4}" cy="${y - 4}" r="4" fill="rgba(255,255,255,.55)"/>`;
  });
  svg.innerHTML = s;

  const $ = id => document.getElementById(id);
  $('bMover').classList.toggle('on', !ui.muro);
  $('bMuro').classList.toggle('on', ui.muro);
  $('bMover').disabled = !puedo;
  $('bMuro').disabled = !puedo || e.quedan[p] <= 0;
  $('bGirar').hidden = $('bPoner').hidden = !muroActivo;
  $('bPoner').disabled = !ui.preview || !!problemaMuro(e, ui.preview, ctx.nombre);
  $('bPasar').hidden = !(puedo && !movidas(e, p).length && e.quedan[p] <= 0);

  // Texto de ayuda (si no devolvés nada, se muestra la última jugada)
  if (!puedo) return '';
  if (ui.muro) return ui.preview ? (problemaMuro(e, ui.preview, ctx.nombre) || 'Listo para poner') : 'Tocá una casilla para ubicar el muro';
  return movidas(e, p).length ? 'Tocá una casilla verde para moverte' : 'No podés moverte: poné un muro';
}
