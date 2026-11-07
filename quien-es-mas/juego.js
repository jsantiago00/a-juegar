// Pantalla de ¿Quién es más probable?: la frase, votar a alguien y ver cómo votó el grupo.
import { RONDAS, fraseDe, conteo } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, menuEl = null, clave = '';

export function menu(el) {
  menuEl = el;
  el.innerHTML = `<div class="pills" role="radiogroup" aria-label="Preguntas">${RONDAS.map(r =>
    `<label><input type="radio" name="qmRondas" value="${r}"${r === 10 ? ' checked' : ''}><span>${r}</span></label>`).join('')}
    <span class="note">preguntas</span></div>`;
}
export function opciones() {
  const r = menuEl && menuEl.querySelector('input[name="qmRondas"]:checked');
  return {rondas: r ? +r.value : 10};
}
export function reiniciar() { clave = ''; }

export function sonido(a, e) {
  if (a.fase !== e.fase) return e.fase === 'ver' ? 'si' : 'cambiar';
  if (e.votos.join() !== a.votos.join()) return 'tick';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (e.fase === 'votar') return e.votos[yo] >= 0 ? '⏳ Esperando los votos' : '🗳️ ¡Votá!';
  return '👀 ¡Así votaron!';
}
export function resumenFin(ctx) {
  const e = ctx.estado, max = Math.max(...e.coronas);
  const reyes = e.coronas.map((x, i) => (x === max ? ctx.nombre(i) : '')).filter(Boolean);
  return `👑 Le quedaron más frases a ${reyes.join(' y ')} (${max})`;
}

const quien = i => `<span class="dot" style="background:${ctx.color(i)}"></span>${esc(ctx.nombre(i))}`;

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = '<div class="qm-frase" id="qmFrase"></div><div class="qm-panel" id="qmPanel"></div>';
  ctx.tablero.addEventListener('click', ev => {
    const b = ev.target.closest('[data-a]');
    if (!b || b.disabled) return;
    if (b.dataset.a === 'votar') ctx.jugarLibre({tipo: 'votar', p: +b.dataset.p});
    if (b.dataset.a === 'seguir') ctx.jugarLibre({tipo: 'seguir'});
  });
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0 || !ctx.listos) { $('qmFrase').innerHTML = '<p class="note">Cuando estén todos, sale la primera pregunta.</p>'; $('qmPanel').innerHTML = ''; return ''; }
  const k = [e.ronda, e.fase, e.votos.join(), e.ganador].join('|');
  if (k === clave) return '';
  clave = k;

  $('qmFrase').innerHTML = `<p class="note">Pregunta ${e.ronda} de ${e.opciones.rondas}</p>
    <p class="qm-pre">¿Quién es más probable que…</p><p class="qm-txt">${esc(fraseDe(e))}?</p>`;

  const todos = Array.from({length: e.n}, (_, i) => i);
  if (e.fase === 'votar') {
    const votaron = e.votos.filter(v => v >= 0).length;
    $('qmPanel').innerHTML = `<div class="qm-votos">${todos.map(i => `<button data-a="votar" data-p="${i}" class="${e.votos[yo] === i ? 'elegido' : ''}"
        style="--c:${ctx.color(i)}">${quien(i)}${i === yo ? ' <small>(vos)</small>' : ''}</button>`).join('')}</div>
      <p class="note">${e.votos[yo] >= 0 ? 'Votaste: podés cambiar hasta que voten todos. ' : 'Nadie ve a quién votaste hasta el final de la pregunta. '}Votaron ${votaron} de ${e.n}.</p>`;
    return '';
  }

  const {c: cuenta, top} = conteo(e), max = Math.max(1, ...cuenta);
  const filas = todos.filter(i => cuenta[i] > 0).sort((a, b) => cuenta[b] - cuenta[a]).map(i => {
    const por = todos.filter(q => e.votos[q] === i).map(q => esc(ctx.nombre(q))).join(', ');
    return `<li class="${top.includes(i) ? 'top' : ''}" style="--c:${ctx.color(i)};--p:${(cuenta[i] / max) * 100}%">
      <span class="qm-barra"></span><span class="qm-quien">${top.includes(i) ? '👑 ' : ''}${quien(i)}</span>
      <b>${cuenta[i]}</b><small>← ${por}</small></li>`;
  }).join('');
  const sumaron = todos.filter(q => top.includes(e.votos[q]));
  $('qmPanel').innerHTML = `<ul class="qm-res">${filas}</ul>
    <p class="qm-pts">${sumaron.length ? `+1 para ${sumaron.map(q => esc(ctx.nombre(q))).join(', ')}` : 'Nadie sumó'}
      ${top.includes(e.votos[yo]) ? ' · ¡Pensaste como el grupo!' : ''}</p>
    ${e.ganador === -1 ? '<button class="main grande" data-a="seguir">Siguiente pregunta</button>' : ''}`;
  return '';
}
