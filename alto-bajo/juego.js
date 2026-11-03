// Pantalla de Más alto o más bajo: primero cada uno esconde el número del otro; después buscan por turnos.
// Mientras juega el otro, podés ir escribiendo tu próximo número (se manda cuando te toca).
import { TOPES, PERDIDO, miles, tope, objetivo, intentosDe, rango } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, menuEl = null;
let entrada = '', clave = '', verMio = false;
export function reiniciar() { entrada = ''; clave = ''; verMio = false; }

// ---------- Menú: hasta qué número ----------
export function menu(el) {
  menuEl = el;
  el.innerHTML = `<div class="pills ab-topes" role="radiogroup" aria-label="Hasta qué número">${TOPES.map((t, k) =>
    `<label><input type="radio" name="abTope" value="${t}"${k === 0 ? ' checked' : ''}><span>1 a ${miles(t)}</span></label>`).join('')}</div>`;
}
export function opciones() {
  const r = menuEl && menuEl.querySelector('input[name="abTope"]:checked');
  return {tope: r ? +r.value : 100};
}

export function sonido(a, e, ctx) {
  const yo = ctx.miAsiento;
  if (a.fase !== e.fase) return 'entrar';
  if (e.intentos[yo] !== a.intentos[yo]) return e.fin[yo] === 1 ? 'punto' : intentosDe(e, yo).at(-1) === PERDIDO ? null : 'colocar';
  if (e.intentos[1 - yo] !== a.intentos[1 - yo]) return e.fin[1 - yo] === 1 ? 'no' : 'tick';   // jugó el otro: te toca
  if (e.numeros.join() !== a.numeros.join()) return 'tick';
  return null;
}
// Mientras esconden, el cartel de arriba dice en qué andás vos; después, el de siempre (de quién es el turno)
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento, rival = ctx.nombre(1 - yo);
  if (yo < 0 || e.fase !== 'numeros') return '';
  return e.numeros[yo] ? `⏳ Esperando a ${rival}` : '🔒 Escondé tu número';
}

function resultado(x, obj) {
  if (x === PERDIDO) return '<span class="note">⏱️ Se pasó el tiempo</span>';
  const v = +x;
  return `<b class="ab-num">${miles(v)}</b>` + (v === obj ? '<span class="ab-res ok">🎯 ¡Ese!</span>'
    : v < obj ? '<span class="ab-res sube">⬆ más alto</span>' : '<span class="ab-res baja">⬇ más bajo</span>');
}
const historial = (lista, obj) => lista.map((x, k) => `<li><span class="nro">${k + 1}</span>${resultado(x, obj)}</li>`).reverse().join('');

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `
    <div class="ab-panel" id="abArriba"></div>
    <div class="ab-panel" id="abArmar">
      <p class="ab-pista" id="abPista"></p>
      <div class="ab-visor" id="abVisor"></div>
      <div class="ab-teclado" id="abTeclado">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-d="${d}">${d}</button>`).join('')}
        <button data-a="borrar" class="ab-borrar" aria-label="Borrar">⌫</button><button data-d="0">0</button>
        <button data-a="ok" class="main ab-ok" id="abOk"></button></div>
    </div>
    <div id="abMios"></div>
    <div class="ab-rival" id="abRival"></div>`;
  $('abTeclado').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.d) poner(b.dataset.d);
    else if (b.dataset.a === 'borrar') borrar();
    else if (b.dataset.a === 'ok') enviar();
  });
  ctx.tablero.addEventListener('click', ev => {
    if (ev.target.closest('[data-a="ver"]')) { verMio = !verMio; clave = ''; ctx.refrescar(); }
    if (ev.target.closest('[data-a="rendirse"]') && confirm('¿Seguro que te rendís? Gana el otro.')) ctx.jugarLibre({tipo: 'rendirse'});
  });
  // En la compu también se juega con el teclado: números, ⌫ y Enter
  addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.target.closest?.('input, textarea') || $('abArmar').hidden || !ctx.estado) return;
    if (/^[0-9]$/.test(ev.key)) poner(ev.key);
    else if (ev.key === 'Backspace') borrar();
    else if (ev.key === 'Enter') enviar();
    else return;
    ev.preventDefault();
  });
}

function poner(d) {
  const nuevo = String(+(entrada + d));
  if (+nuevo > tope(ctx.estado)) { ctx.sonar('error'); ctx.aviso(`Hasta ${miles(tope(ctx.estado))}`); return; }
  entrada = nuevo === '0' ? '' : nuevo;
  ctx.sonar('tap');
  pintarVisor();
}
function borrar() { entrada = entrada.slice(0, -1); pintarVisor(); }
async function enviar() {
  const e = ctx.estado, yo = ctx.miAsiento, v = +entrada;
  if (!v) { ctx.sonar('error'); ctx.aviso(`Escribí un número del 1 al ${miles(tope(e))}`); return; }
  if (e.fase === 'jugar') {
    if (e.turno !== yo) { ctx.sonar('error'); ctx.aviso(`Esperá tu turno: está jugando ${ctx.nombre(e.turno)}`); return; }
    const r = rango(e, yo);
    if (v < r.desde || v > r.hasta) { ctx.sonar('error'); ctx.aviso(`Ya sabés que está entre ${miles(r.desde)} y ${miles(r.hasta)}`); return; }
  }
  const ok = e.fase === 'numeros' ? await ctx.jugarLibre({tipo: 'numero', valor: v}) : await ctx.jugar({tipo: 'intento', valor: v});
  if (ok) { entrada = ''; pintarVisor(); }
  else if (e.fase === 'numeros') ctx.aviso('No se pudo mandar, probá de nuevo');
}
function pintarVisor() {
  $('abVisor').innerHTML = entrada ? miles(entrada) : '<span class="note">—</span>';
}

export function dibujar(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  const otro = 1 - yo, rival = esc(ctx.nombre(otro)), termino = e.ganador !== -1;
  const jugando = e.fase === 'jugar', mio = e.numeros[yo], t = tope(e);

  // Si empezó otra partida (revancha) o cambió la fase, se limpia lo escrito
  const k = [t, e.fase, mio ? 1 : 0, e.numeros[otro] ? 1 : 0, verMio, termino].join('|');
  if (k !== clave) {
    if (clave.split('|').slice(0, 3).join('|') !== k.split('|').slice(0, 3).join('|')) entrada = '';
    clave = k;
    const tuyo = mio ? `<span class="ab-tuyo">Tu número para ${rival}: <b class="ab-num">${verMio || termino ? miles(mio) : '•••'}</b>
      ${termino ? '' : `<button class="icono ab-ver" data-a="ver" title="${verMio ? 'Tapar' : 'Ver'}">${verMio ? '🙈' : '👁'}</button>`}</span>` : '';
    $('abArriba').innerHTML = !mio
      ? `<h3>🔒 Escondé tu número para ${rival}</h3><p class="note">Cualquiera del 1 al ${miles(t)}.</p>`
      : !jugando ? `${tuyo}<p class="note">Esperando que ${rival} esconda el tuyo…</p>`
      : tuyo + (termino ? `<p class="note">El de ${rival} era <b class="ab-num">${miles(objetivo(e, yo))}</b></p>` : '');
  }

  const armando = !termino && (e.fase === 'numeros' ? !mio : !e.fin[yo]);
  $('abArmar').hidden = !armando;
  if (armando) {
    const espero = jugando && e.turno !== yo;
    $('abOk').textContent = e.fase === 'numeros' ? '🔒' : espero ? '⏳' : '🔍';
    $('abOk').setAttribute('aria-label', e.fase === 'numeros' ? 'Esconder' : espero ? 'Esperá tu turno' : 'Probar');
    $('abOk').disabled = espero;
    const r = jugando ? rango(e, yo) : null;
    $('abPista').innerHTML = r ? `🎯 Está entre <b>${miles(r.desde)}</b> y <b>${miles(r.hasta)}</b>` : `Del 1 al ${miles(t)}`;
    pintarVisor();
  }

  if (!jugando) { $('abMios').innerHTML = ''; $('abRival').innerHTML = ''; return mio ? '' : `Escribí el número que va a tener que encontrar ${rival}`; }

  // Mis intentos (el último arriba)
  const mios = intentosDe(e, yo);
  $('abMios').innerHTML = `<div class="ab-panel">
      <div class="ab-titulo"><h3>Tus intentos <span class="note">(${mios.length})</span></h3>
        ${!e.fin[yo] && !termino ? '<button class="ab-rendirse" data-a="rendirse">🏳️ Me rindo</button>' : ''}</div>
      ${mios.length ? `<ol class="ab-hist">${historial(mios, objetivo(e, yo))}</ol>` : '<p class="note">Todavía no probaste ninguno.</p>'}
      ${e.fin[yo] === 1 ? `<p class="ab-msg">🎉 ¡Lo encontraste en <b>${mios.length}</b> ${mios.length === 1 ? 'intento' : 'intentos'}!</p>`
        : e.fin[yo] === 2 ? '<p class="ab-msg">🏳️ Te rendiste</p>' : ''}
    </div>`;

  // Cómo viene el otro: sus intentos son contra TU número, así que verlos no regala nada
  const suyos = intentosDe(e, otro);
  const estadoR = e.fin[otro] === 1 ? '🎉 lo encontró' : e.fin[otro] === 2 ? '🏳️ se rindió' : 'buscando…';
  $('abRival').innerHTML = `<details${termino ? ' open' : ''}><summary><b>${rival}</b> · ${suyos.length} ${suyos.length === 1 ? 'intento' : 'intentos'} · <span class="note">${estadoR}</span></summary>
      ${suyos.length ? `<ol class="ab-hist chico">${historial(suyos, mio)}</ol>` : '<p class="note">Todavía no probó ninguno.</p>'}</details>`;

  if (e.fin[yo] && !termino) return `¡Lo encontraste! ${rival} tiene un último intento para empatar…`;
  if (armando && e.turno !== yo) return `Mientras ${rival} juega, andá pensando tu próximo número`;
  return armando ? 'Escribí un número y tocá 🔍' : '';
}
