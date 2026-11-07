// Pantalla de Dos verdades y una mentira: escribir tus tres frases, votar la mentira de cada uno y ver quién acertó.
import { MAX_FRASE, escribio, votantes } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, clave = '';
export function reiniciar() { clave = ''; }

export function sonido(a, e) {
  if (a.fase !== e.fase || a.autor !== e.autor) return e.fase === 'ver' ? 'si' : e.fase === 'votar' ? 'cambiar' : null;
  if (e.votos.join() !== a.votos.join() || e.mentira.join() !== a.mentira.join()) return 'tick';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (e.fase === 'escribir') return escribio(e, yo) ? '⏳ Esperando a los demás' : '✍️ Escribí tus tres frases';
  if (e.fase === 'votar') return e.autor === yo ? '🤫 Están votando tus frases' : e.votos[yo] >= 0 ? '⏳ Esperando los votos' : `🤔 ¿Cuál es la mentira de ${ctx.nombre(e.autor)}?`;
  return `🎭 La mentira de ${ctx.nombre(e.autor)}`;
}
export function resumenFin(ctx) {
  const e = ctx.estado;
  return 'Puntos: ' + e.puntos.map((x, i) => ({x, i})).sort((a, b) => b.x - a.x).map(({x, i}) => `${ctx.nombre(i)} ${x}`).join(' · ');
}

const quien = i => `<span class="dot" style="background:${ctx.color(i)}"></span><b>${esc(ctx.nombre(i))}</b>`;

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = '<div class="dv-panel" id="dvPanel"></div>';
  ctx.tablero.addEventListener('click', ev => {
    const b = ev.target.closest('[data-a]');
    if (!b || b.disabled) return;
    if (b.dataset.a === 'mandar') mandar();
    if (b.dataset.a === 'votar') ctx.jugarLibre({tipo: 'votar', k: +b.dataset.k});
    if (b.dataset.a === 'seguir') ctx.jugarLibre({tipo: 'seguir'});
  });
}
async function mandar() {
  const f = ['dvV1', 'dvV2', 'dvM'].map(id => $(id).value.trim());
  const falta = f.findIndex(x => x.length < 3);
  if (falta >= 0) { ctx.sonar('error'); ctx.aviso(falta === 2 ? 'Te falta la mentira' : 'Te falta una verdad'); $(['dvV1', 'dvV2', 'dvM'][falta]).focus(); return; }
  await ctx.jugarLibre({tipo: 'escribir', f});
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0 || !ctx.listos) { $('dvPanel').innerHTML = '<p class="note">Cuando estén todos, cada uno escribe sus frases.</p>'; return ''; }
  // Mientras escribís, el panel no se rearma cuando los demás terminan (así no se borra lo tuyo): solo el contador
  const listos = e.mentira.filter(x => x >= 0).length;
  const k = [e.fase, e.autor, e.fase === 'escribir' ? escribio(e, yo) : e.votos.join(), e.ganador].join('|');
  if (k === clave) { if ($('dvCuenta')) $('dvCuenta').textContent = `${listos} de ${e.n}`; return ''; }
  clave = k;

  if (e.fase === 'escribir') {
    $('dvPanel').innerHTML = escribio(e, yo)
      ? `<h3>¡Listo!</h3><p>Tus frases ya están mezcladas. Esperando a los demás: ya van <span id="dvCuenta">${listos} de ${e.n}</span>.</p>`
      : `<h3>Contá tres cosas de vos</h3>
         <label class="dv-label verdad" for="dvV1">✅ Una verdad</label>
         <textarea id="dvV1" maxlength="${MAX_FRASE}" rows="2" placeholder="Ej.: Una vez me crucé con un famoso en el súper"></textarea>
         <label class="dv-label verdad" for="dvV2">✅ Otra verdad</label>
         <textarea id="dvV2" maxlength="${MAX_FRASE}" rows="2" placeholder="Algo que pocos saben de vos"></textarea>
         <label class="dv-label mentira" for="dvM">🤥 La mentira</label>
         <textarea id="dvM" maxlength="${MAX_FRASE}" rows="2" placeholder="Que suene creíble…"></textarea>
         <button class="main grande" data-a="mandar">Listo</button>
         <p class="note">Se mezclan solas: nadie sabe cuál pusiste última. Ya escribieron <span id="dvCuenta">${listos} de ${e.n}</span>.</p>`;
    return '';
  }

  const a = e.autor, fr = e.frases[a], m = e.mentira[a], ver = e.fase === 'ver';
  const vs = votantes(e), votaron = vs.filter(q => e.votos[q] >= 0).length;
  const quienes = kk => vs.filter(q => e.votos[q] === kk);
  const opcion = (t, kk) => {
    const esM = kk === m, mio = e.votos[yo] === kk;
    if (ver || a === yo) {
      const qs = ver ? quienes(kk) : [];
      return `<div class="dv-frase ${(ver || a === yo) && esM ? 'mentira' : 'verdad'}">
        <span class="dv-sello">${esM ? '🤥 Mentira' : '✅ Verdad'}</span><p>${esc(t)}</p>
        ${ver ? `<small>${qs.length ? qs.map(q => esc(ctx.nombre(q))).join(', ') : 'Nadie la votó'}</small>` : ''}</div>`;
    }
    return `<button class="dv-frase dv-voto${mio ? ' elegida' : ''}" data-a="votar" data-k="${kk}"><span class="dv-n">${kk + 1}</span><p>${esc(t)}</p></button>`;
  };
  const cab = `<p class="note">Jugador ${a + 1} de ${e.n}</p><h3>${quien(a)}${a === yo ? ' (vos)' : ''}</h3>`;
  let pie;
  if (ver) {
    const acertaron = quienes(m).length, engano = vs.length - acertaron;
    pie = `<p class="dv-res">${acertaron ? `Descubrieron la mentira: <b>${acertaron}</b> (+1 cada uno)` : 'Nadie la descubrió'} ·
      ${esc(ctx.nombre(a))} engañó a <b>${engano}</b> (+${engano})</p>
      ${e.ganador === -1 ? `<button class="main grande" data-a="seguir">Siguiente: ${esc(ctx.nombre(a + 1))}</button>` : ''}`;
  } else if (a === yo) pie = `<p class="note">Los demás están eligiendo cuál es tu mentira (${votaron}/${vs.length}). ¡Poné cara de póker!</p>`;
  else pie = `<p class="note">${e.votos[yo] >= 0 ? 'Votaste: podés cambiar hasta que voten todos. ' : 'Tocá la que te parece mentira. '}Votaron ${votaron} de ${vs.length}.</p>`;
  $('dvPanel').innerHTML = cab + (a !== yo && !ver ? '<p>¿Cuál es la mentira?</p>' : '') + `<div class="dv-frases">${fr.map(opcion).join('')}</div>` + pie;
  return '';
}
