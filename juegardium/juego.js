// Pantalla de Juegardium. Tocás una línea para elegirla y otra vez para confirmar.
const D = 64, PD = 26;
let ctx, svg, sel = null;

export function reiniciar() { sel = null; }

export function iniciar(c) {
  ctx = c;
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'board';
  ctx.tablero.append(svg);
  svg.addEventListener('click', ev => {
    const t = ev.target.closest('[data-o]');
    if (!t || !ctx.puedoJugar()) return;
    const j = {o: t.dataset.o, i: +t.dataset.i};
    if (sel && sel.o === j.o && sel.i === j.i) {
      ctx.jugar(j).then(() => { sel = null; ctx.refrescar(); });
    } else { sel = j; ctx.refrescar(); }
  });
}

export function dibujar(ctx) {
  const e = ctx.estado, S = e.S, puedo = ctx.puedoJugar();
  if (!puedo) sel = null;
  const tam = PD * 2 + S * D;
  svg.setAttribute('viewBox', `0 0 ${tam} ${tam}`);
  const X = c => PD + c * D, Y = r => PD + r * D;
  const esSel = (o, i) => sel && sel.o === o && sel.i === i;
  const esUlt = (o, i) => e.ult && e.ult.o === o && e.ult.i === i;

  let s = `<rect class="bg" x="4" y="4" width="${tam - 8}" height="${tam - 8}" rx="16"/>`;
  for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
    const d = e.cajas[r * S + c];
    if (d >= 0) {
      s += `<rect x="${X(c) + 4}" y="${Y(r) + 4}" width="${D - 8}" height="${D - 8}" rx="6" fill="${ctx.color(d)}" opacity=".45"/>`;
      s += `<circle cx="${X(c) + D / 2}" cy="${Y(r) + D / 2}" r="9" fill="${ctx.color(d)}"/>`;
    }
  }
  const linea = (o, i, x1, y1, x2, y2) => {
    const d = (o === 'h' ? e.h : e.v)[i];
    let out;
    if (d >= 0) out = `<line class="lin${esUlt(o, i) ? ' ult' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ctx.color(d)}"/>`;
    else if (esSel(o, i)) out = `<line class="lin sel" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    else out = `<line class="vacia" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    if (d < 0 && puedo) {
      const hx = o === 'h' ? x1 + 10 : x1 - 15, hy = o === 'h' ? y1 - 15 : y1 + 10;
      const hw = o === 'h' ? D - 20 : 30, hh = o === 'h' ? 30 : D - 20;
      out += `<rect class="hit" data-o="${o}" data-i="${i}" x="${hx}" y="${hy}" width="${hw}" height="${hh}"/>`;
    }
    return out;
  };
  for (let r = 0; r <= S; r++) for (let c = 0; c < S; c++) s += linea('h', r * S + c, X(c), Y(r), X(c + 1), Y(r));
  for (let r = 0; r < S; r++) for (let c = 0; c <= S; c++) s += linea('v', r * (S + 1) + c, X(c), Y(r), X(c), Y(r + 1));
  for (let r = 0; r <= S; r++) for (let c = 0; c <= S; c++) s += `<circle class="punto" cx="${X(c)}" cy="${Y(r)}" r="6"/>`;
  svg.innerHTML = s;

  if (!puedo) return '';
  return sel ? 'Tocá la misma línea de nuevo para trazarla' : 'Tocá una línea para elegirla';
}
