// Pantalla de Cuatro en línea: se toca cualquier casilla de una columna y la ficha cae hasta abajo.
import { COLS, FILAS, VACIO, fila } from './reglas.js';

let ctx, tab, flechas, sobre = -1;

export function reiniciar() { sobre = -1; }

export function iniciar(c) {
  ctx = c;
  ctx.tablero.innerHTML = `<div class="c4"><div class="c4-flechas" id="c4F"></div><div class="c4-tab" id="c4T"></div></div>`;
  flechas = document.getElementById('c4F');
  tab = document.getElementById('c4T');
  flechas.innerHTML = Array.from({length: COLS}, (_, c) => `<span data-c="${c}"></span>`).join('');
  tab.innerHTML = Array.from({length: COLS * FILAS}, (_, k) =>
    `<button data-c="${k % COLS}" data-k="${k}" aria-label="Columna ${k % COLS + 1}"><span></span></button>`).join('');
  tab.addEventListener('click', ev => {
    const b = ev.target.closest('[data-c]');
    if (b && ctx.puedoJugar()) ctx.jugar({col: +b.dataset.c});
  });
  // Con el mouse se marca la columna donde caería la ficha
  tab.addEventListener('pointerover', ev => { const b = ev.target.closest('[data-c]'); sobre = b ? +b.dataset.c : -1; marcar(); });
  tab.addEventListener('pointerleave', () => { sobre = -1; marcar(); });
}

function marcar() {
  const e = ctx.estado;
  if (!e) return;
  const ok = sobre >= 0 && ctx.puedoJugar() && fila(e, sobre) >= 0;
  flechas.style.setProperty('--c', ctx.color(e.turno));
  flechas.querySelectorAll('span').forEach(s => s.classList.toggle('on', ok && +s.dataset.c === sobre));
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, puedo = ctx.puedoJugar();
  const linea = e.linea ? e.linea.split(',').map(Number) : [];
  tab.querySelectorAll('button').forEach(b => {
    const k = +b.dataset.k, v = e.celdas[k], s = b.firstChild;
    if (b.dataset.v !== v) {
      b.dataset.v = v;
      s.style.background = v === VACIO ? '' : ctx.color(+v);
      // La ficha nueva cae desde arriba de su columna
      s.classList.remove('cae');
      if (v !== VACIO && k === e.ult) { s.style.setProperty('--f', Math.floor(k / COLS) + 1); void s.offsetWidth; s.classList.add('cae'); }
    }
    b.classList.toggle('gana', linea.includes(k));
    b.disabled = !puedo || fila(e, k % COLS) < 0;
  });
  marcar();
  return puedo ? 'Tocá una columna para tirar tu ficha' : '';
}
