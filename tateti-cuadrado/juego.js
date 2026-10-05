// Pantalla de Ta-te-ti²: 9 tableritos de 9 botones cada uno.
import { sePuede } from './reglas.js';

let grande;
const signo = v => (v === 0 ? 'X' : v === 1 ? 'O' : '');

// Ganar un tablerito suena distinto que marcar una casilla
export const sonido = (a, e) => (e.chicos.some((v, i) => v >= 0 && v !== a.chicos[i]) ? 'punto' : 'colocar');

export function iniciar(ctx) {
  grande = document.createElement('div');
  grande.className = 'ult';
  for (let b = 0; b < 9; b++) {
    const chico = document.createElement('div');
    chico.className = 'chico';
    for (let k = 0; k < 9; k++) {
      const btn = document.createElement('button');
      btn.dataset.b = b; btn.dataset.k = k;
      btn.onclick = () => ctx.jugar({b, k});
      chico.append(btn);
    }
    const marca = document.createElement('span');
    marca.className = 'gran';
    chico.append(marca);
    grande.append(chico);
  }
  ctx.tablero.append(grande);
}

export function dibujar(ctx) {
  const e = ctx.estado, puedo = ctx.puedoJugar();
  [...grande.children].forEach((chico, b) => {
    const dueno = e.chicos[b];
    chico.classList.toggle('activo', puedo && sePuede(e, b));
    chico.classList.toggle('lleno', dueno === -2);
    const marca = chico.querySelector('.gran');
    if (marca.dataset.v !== String(dueno)) { marca.dataset.v = dueno; if (dueno >= 0) ctx.animar(marca); }
    marca.hidden = dueno < 0;
    marca.textContent = signo(dueno);
    marca.style.color = dueno >= 0 ? ctx.color(dueno) : '';
    chico.querySelectorAll('button').forEach(btn => {
      const i = b * 9 + +btn.dataset.k, v = e.celdas[i];
      if (btn.dataset.v !== String(v)) { btn.dataset.v = v; if (v !== -1) ctx.animar(btn); }
      btn.textContent = signo(v);
      btn.style.color = v >= 0 ? ctx.color(v) : '';
      btn.classList.toggle('ult', i === e.ult);
      btn.disabled = !puedo || v !== -1 || !sePuede(e, b);
    });
  });
  if (!puedo) return '';
  return e.activo === -1 ? 'Podés jugar en cualquier tablerito libre' : 'Jugá en el tablerito resaltado';
}
