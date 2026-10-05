// Pantalla del Pinturillo: el lienzo, las herramientas del que dibuja y el cuadro para adivinar.
// Los trazos van a extra/trazos/<rid> (ver shared/lienzo.js).
import { VUELTAS, SEGUNDOS, limpiar, totalTurnos } from './reglas.js';
import { esc } from '../shared/salas.js';
import { crearLienzo } from '../shared/lienzo.js';

let ctx, $, lz, menuEl = null;
let rid = '';
let relojT = 0, mandado = '', ultimoTic = -1;

// ---------- Menú: cuántas vueltas ----------
export function menu(el) {
  menuEl = el;
  el.innerHTML = `<div class="pills" role="radiogroup" aria-label="Vueltas">${VUELTAS.map(v =>
    `<label><input type="radio" name="ptVueltas" value="${v}"${v === 2 ? ' checked' : ''}><span>${v}</span></label>`).join('')}
    <span class="note">vueltas (cada uno dibuja esa cantidad de veces)</span></div>`;
}
export function opciones() {
  const r = menuEl && menuEl.querySelector('input[name="ptVueltas"]:checked');
  return {vueltas: r ? +r.value : 2};
}

export function reiniciar() { rid = ''; mandado = ''; lz?.reset(); }

export function sonido(a, e, ctx) {
  const yo = ctx.miAsiento;
  if (a.fase !== e.fase) return e.fase === 'dibujar' ? 'entrar' : e.fase === 'ver' ? 'pasar' : 'cambiar';
  if (e.acertaron.length > a.acertaron.length) return e.acertaron.includes(yo) && !a.acertaron.includes(yo) ? 'punto' : 'si';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento, dibujo = e.turno === yo;
  if (yo < 0) return '';
  if (e.fase === 'elegir') return dibujo ? '🎨 Elegí qué dibujar' : `⏳ ${ctx.nombre(e.turno)} está eligiendo`;
  if (e.fase === 'dibujar') return dibujo ? '🎨 ¡Dibujá!' : e.acertaron.includes(yo) ? '✔ ¡La adivinaste!' : '🤔 ¡Adiviná!';
  return '👀 ¡Se terminó el tiempo!';
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `
    <div class="pt-top"><div class="pt-palabra" id="ptPalabra"></div><div class="pt-reloj" id="ptReloj"></div></div>
    <div id="ptLienzo"></div>
    <form class="row pt-adivinar" id="ptForm" hidden>
      <input id="ptTxt" maxlength="40" autocomplete="off" spellcheck="false" placeholder="¿Qué es? Escribilo acá" aria-label="Tu respuesta">
      <button class="main">➤</button></form>
    <ul class="pt-intentos" id="ptIntentos"></ul>`;
  lz = crearLienzo($('ptLienzo'), {ctx, ruta: () => `trazos/${rid}`, puedeDibujar: dibujo, herramientas: true});
  lz.cv.id = 'ptCv'; lz.capa.id = 'ptCapa';
  $('ptForm').addEventListener('submit', ev => { ev.preventDefault(); adivinar(); });
  $('ptCapa').addEventListener('click', ev => {
    const b = ev.target.closest('[data-i]');
    if (b) ctx.jugar({tipo: 'elegir', i: +b.dataset.i, t: ctx.ahora()});
  });
  clearInterval(relojT);
  relojT = setInterval(reloj, 250);
}

// Solo dibuja el que tiene el turno
const dibujo = () => ctx.estado && ctx.estado.fase === 'dibujar' && ctx.estado.turno === ctx.miAsiento && ctx.listos && ctx.estado.ganador === -1;

// ---------- Adivinar ----------
function distancia(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
async function adivinar() {
  const txt = $('ptTxt').value.trim();
  if (!txt) return;
  $('ptTxt').value = '';
  const w = limpiar(txt), obj = limpiar(ctx.estado.palabra);
  if (w !== obj && w.length > 3 && distancia(w, obj) === 1) ctx.aviso('¡Casi! Estás muy cerca');
  await ctx.jugarLibre({tipo: 'adivinar', texto: txt, t: ctx.ahora()});
}

// ---------- Reloj: también avisa cuando se acaba el tiempo ----------
function reloj() {
  const e = ctx && ctx.estado;
  if (!e || !ctx.online || !ctx.listos || e.ganador !== -1) { if ($('ptReloj')) $('ptReloj').textContent = ''; return; }
  if (e.fase === 'elegir' && !e.hasta && mandado !== 'reloj' + e.turno + e.hechos) {
    mandado = 'reloj' + e.turno + e.hechos;
    ctx.jugarLibre({tipo: 'reloj', t: ctx.ahora()});
  }
  if (!e.hasta) return;
  const queda = Math.max(0, Math.ceil((e.hasta - ctx.ahora()) / 1000));
  $('ptReloj').textContent = e.fase === 'ver' ? '' : `⏱️ ${queda}`;
  $('ptReloj').classList.toggle('apurado', e.fase === 'dibujar' && queda <= 10);
  if (e.fase === 'dibujar' && queda <= 10 && queda > 0 && queda !== ultimoTic) { ultimoTic = queda; ctx.sonar('reloj'); }
  const clave = e.fase + e.hasta;
  if (queda <= 0 && mandado !== clave) { mandado = clave; ctx.jugarLibre({tipo: 'tiempo', t: ctx.ahora()}); }
  if (e.fase === 'dibujar' && ctx.estado.turno !== ctx.miAsiento) pintarPalabra(e);
}
// La palabra con rayitas; a la mitad del tiempo se muestra una letra y a los 3/4, otra
function pintarPalabra(e) {
  const yo = ctx.miAsiento, ve = e.turno === yo || e.acertaron.includes(yo) || e.fase === 'ver';
  const w = e.palabra.toUpperCase();
  if (ve) { $('ptPalabra').innerHTML = `<span class="pt-ve">${esc(w)}</span>`; return; }
  const total = SEGUNDOS * 1000, pasado = total - (e.hasta - ctx.ahora());
  const letras = [...w].map((ch, i) => i).filter(i => w[i] !== ' ');
  let h = 0; for (const ch of e.rid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const muestra = new Set();
  if (pasado > total / 2 && letras.length > 2) muestra.add(letras[h % letras.length]);
  if (pasado > total * .75 && letras.length > 4) muestra.add(letras[(h >> 4) % letras.length]);
  $('ptPalabra').innerHTML = [...w].map((ch, i) => (ch === ' ' ? '<i></i>' : `<span>${muestra.has(i) ? ch : ''}</span>`)).join('') +
    `<small>${letras.length}</small>`;
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  const soyDibujante = e.turno === yo;

  // Ronda nueva: se arranca de cero (y el que dibuja limpia los trazos viejos)
  if (e.rid !== rid) {
    rid = e.rid; lz.reset();
    if (soyDibujante && e.fase === 'dibujar') {
      const viejos = {};
      for (const r of Object.keys(ctx.extra.trazos || {})) if (r !== rid) viejos['trazos/' + r] = null;
      if (Object.keys(viejos).length) ctx.cambiarExtra(viejos);
    }
  }
  // Trazos que llegaron (o que se borraron)
  lz.mostrar((ctx.extra.trazos || {})[rid] || {});

  const enJuego = e.ganador === -1 && ctx.listos;
  lz.verHerramientas(soyDibujante && e.fase === 'dibujar' && enJuego);
  $('ptForm').hidden = !(enJuego && e.fase === 'dibujar' && !soyDibujante && !e.acertaron.includes(yo));

  // Capa sobre el lienzo: elegir palabra / alguien elige / cuál era
  const capa = $('ptCapa');
  let html = '';
  if (enJuego && e.fase === 'elegir') html = soyDibujante
    ? `<h3>¿Qué querés dibujar?</h3><div class="pt-elegir">${e.opcionesPal.map((w, i) => `<button class="main" data-i="${i}">${esc(w)}</button>`).join('')}</div>`
    : `<h3>✏️ ${esc(ctx.nombre(e.turno))} está eligiendo qué dibujar…</h3>`;
  else if (e.fase === 'ver' || (!enJuego && e.palabra && e.ganador !== -1)) html = `<p>Era</p><h2>${esc(e.palabra.toUpperCase())}</h2>` +
    (e.acertaron.length ? `<p>✔ ${e.acertaron.map(p => esc(ctx.nombre(p))).join(', ')}</p>` : '<p>Nadie la adivinó 😅</p>');
  capa.hidden = !html;
  if (capa.dataset.k !== html) { capa.dataset.k = html; capa.innerHTML = html; }

  if (e.fase === 'dibujar') pintarPalabra(e);
  else $('ptPalabra').innerHTML = `<span class="pt-turno">Turno ${Math.min(e.hechos + 1, totalTurnos(e))} de ${totalTurnos(e)}</span>`;

  $('ptIntentos').innerHTML = e.intentos.slice(-12).reverse().map(x =>
    `<li class="${x.ok ? 'ok' : ''}"><span class="dot" style="background:${ctx.color(x.p)}"></span>${x.ok
      ? `<b>${esc(ctx.nombre(x.p))}</b> ¡la adivinó!` : `<b>${esc(ctx.nombre(x.p))}:</b> ${esc(x.t)}`}</li>`).join('');

  if (!enJuego) return '';
  if (e.fase === 'dibujar') return soyDibujante ? 'Dibujá con el dedo o el mouse. ¡Nada de letras!' : e.acertaron.includes(yo) ? 'Esperando a los demás…' : '';
  return '';
}
