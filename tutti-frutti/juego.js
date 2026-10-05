// Pantalla del Tutti Frutti: la letra, las categorías para llenar y después la votación.
import { CATEGORIAS, POR_DEFECTO, RONDAS, LETRAS, ESPERA, empiezaBien, votosDe, vale, puntosRonda } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, menuEl = null, clave = '', entregue = '', guardarT = 0, esperaT = 0, letraVista = '';

// ---------- Menú: rondas y categorías ----------
export function menu(el) {
  menuEl = el;
  el.innerHTML = `<div class="pills" role="radiogroup" aria-label="Rondas">${RONDAS.map(r =>
      `<label><input type="radio" name="ttRondas" value="${r}"${r === 5 ? ' checked' : ''}><span>${r}</span></label>`).join('')}
      <span class="note">rondas</span></div>
    <p class="note">Categorías (elegí de 3 a 12):</p>
    <div class="fichas tt-cats">${CATEGORIAS.map(c =>
      `<label><input type="checkbox" value="${esc(c)}"${POR_DEFECTO.includes(c) ? ' checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div>`;
}
export function opciones() {
  if (!menuEl) return {cats: POR_DEFECTO, rondas: 5};
  const cats = [...menuEl.querySelectorAll('.tt-cats input:checked')].map(i => i.value).slice(0, 12);
  const r = menuEl.querySelector('input[name="ttRondas"]:checked');
  return {cats: cats.length >= 3 ? cats : POR_DEFECTO, rondas: r ? +r.value : 5};
}

export function reiniciar() { clave = ''; entregue = ''; letraVista = ''; clearTimeout(guardarT); clearTimeout(esperaT); }

export function sonido(a, e, ctx) {
  if (a.ronda !== e.ronda) return 'cambiar';
  if (a.fase === 'escribir' && e.fase !== 'escribir') return 'basta';
  if (a.fase !== 'votar' && e.fase === 'votar') return 'entrar';
  if (JSON.stringify(a.votos) !== JSON.stringify(e.votos)) return 'tick';
  if (e.listos[ctx.miAsiento] && !a.listos[ctx.miAsiento]) return 'tap';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (e.fase === 'escribir') return `✍️ ¡Con la ${e.letra}!`;
  if (e.fase === 'cerrando') return '✋ ¡Basta!';
  return e.listos[yo] ? '⏳ Esperando a los demás' : '🗳️ Revisá las respuestas';
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `
    <div class="tt-letra"><span class="tt-ronda" id="ttRonda"></span><b id="ttLetra"></b></div>
    <div id="ttEscribir"></div>
    <div id="ttVotar" hidden></div>`;
  $('ttEscribir').addEventListener('input', ev => {
    if (!ev.target.matches('[data-c]')) return;
    marcar(ev.target);
    pintarBasta();
    clearTimeout(guardarT);
    guardarT = setTimeout(() => ctx.jugarLibre({tipo: 'resp', r: misRespuestas()}), 700);
  });
  $('ttEscribir').addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' || !ev.target.matches('[data-c]')) return;
    ev.preventDefault();
    const sig = $('ttEscribir').querySelector(`[data-c="${+ev.target.dataset.c + 1}"]`);
    if (sig) sig.focus(); else if (!$('ttBasta').disabled) basta();
  });
  $('ttEscribir').addEventListener('click', ev => {
    if (ev.target.closest('#ttBasta')) basta();
    if (ev.target.closest('#ttForzar')) ctx.jugarLibre({tipo: 'forzar', t: ctx.ahora()});
  });
  $('ttVotar').addEventListener('click', ev => {
    const b = ev.target.closest('[data-p]');
    if (b && !b.disabled) { ctx.jugarLibre({tipo: 'voto', p: +b.dataset.p, c: +b.dataset.c}); return; }
    if (ev.target.closest('#ttListo')) { ctx.sonar('tap'); ctx.jugarLibre({tipo: 'listo'}); }
  });
}

const campos = () => [...$('ttEscribir').querySelectorAll('[data-c]')];
const misRespuestas = () => campos().map(i => i.value.trim());
function marcar(inp) {
  const v = inp.value.trim(), e = ctx.estado;
  inp.classList.toggle('ok', empiezaBien(v, e.letra));
  inp.classList.toggle('mal', !!v && !empiezaBien(v, e.letra));
}
function pintarBasta() {
  const b = $('ttBasta');
  if (b) b.disabled = !(ctx.estado.fase === 'escribir' && misRespuestas().every(v => empiezaBien(v, ctx.estado.letra)));
}
async function basta() {
  clearTimeout(guardarT);
  if (!(await ctx.jugarLibre({tipo: 'basta', r: misRespuestas(), t: ctx.ahora()}))) ctx.aviso('Completá todo con la letra que salió');
}

// La letra gira un ratito antes de quedarse quieta
function ruleta(letra) {
  const el = $('ttLetra');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = letra; return; }
  let k = 0;
  const t = setInterval(() => {
    el.textContent = LETRAS[Math.floor(Math.random() * LETRAS.length)];
    if (++k % 2) ctx.sonar('reloj');
    if (k >= 14) { clearInterval(t); el.textContent = letra; ctx.animar(el); ctx.sonar('entrar'); }
  }, 65);
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento, cats = e.opciones.cats;
  if (yo < 0) return '';
  $('ttRonda').textContent = `Ronda ${e.ronda}/${e.opciones.rondas}`;
  if (!ctx.listos) { $('ttLetra').textContent = '?'; letraVista = ''; }    // la letra no se ve hasta que estén todos
  else if (letraVista !== `${e.ronda}${e.letra}`) {
    const nueva = letraVista !== '' || e.fase === 'escribir';
    letraVista = `${e.ronda}${e.letra}`;
    if (nueva && ctx.listos && e.ganador === -1 && e.fase === 'escribir') ruleta(e.letra); else $('ttLetra').textContent = e.letra;
  }
  const votando = e.fase === 'votar';
  $('ttEscribir').hidden = votando;
  $('ttVotar').hidden = !votando;

  // ---------- Escribir (y entregar cuando alguien canta ¡Basta!) ----------
  if (!votando) {
    const k = `${e.ronda}|${e.letra}`;
    if (k !== clave) {
      clave = k;
      $('ttEscribir').innerHTML = `<div class="tt-form">${cats.map((cat, i) =>
        `<label><span>${esc(cat)}</span><input data-c="${i}" maxlength="40" autocomplete="off" spellcheck="false" placeholder="${e.letra}…" value="${esc(e.resp[yo][i])}"></label>`).join('')}</div>
        <div class="tt-basta"><button class="main grande" id="ttBasta" disabled>✋ ¡Basta!</button>
        <p class="note" id="ttEspera"></p></div>`;
      campos().forEach(marcar);
    }
    const cerrando = e.fase === 'cerrando';
    campos().forEach(i => { i.disabled = cerrando || !ctx.listos; });
    pintarBasta();
    $('ttBasta').hidden = cerrando;
    if (cerrando && !e.entregado[yo] && entregue !== k) {
      entregue = k;
      clearTimeout(guardarT);
      ctx.jugarLibre({tipo: 'entregar', r: misRespuestas()});
    }
    let txt = '';
    if (cerrando) {
      const faltan = e.entregado.map((x, p) => (x ? -1 : p)).filter(p => p >= 0);
      const pasado = ctx.ahora() - e.basta.t;
      txt = `✋ ${esc(ctx.nombre(e.basta.p))} cantó ¡Basta!` + (faltan.length ? ` Esperando a ${faltan.map(p => esc(ctx.nombre(p))).join(', ')}…` : '');
      if (faltan.length && pasado >= ESPERA) txt += ' <button class="chico" id="ttForzar">Seguir sin esperar</button>';
      else if (faltan.length) { clearTimeout(esperaT); esperaT = setTimeout(() => ctx.refrescar(), ESPERA - pasado + 100); }
    }
    $('ttEspera').innerHTML = txt;
    if (!ctx.listos) return '';
    return cerrando ? '' : `Completá todo con ${e.letra} y cantá ¡Basta! antes que nadie`;
  }

  // ---------- Votar: todas las respuestas, por categoría ----------
  const pr = puntosRonda(e), termino = e.ganador !== -1;
  const totRonda = pr.map(f => f.reduce((a, b) => a + b, 0));
  $('ttVotar').innerHTML = `<div class="tt-grilla">${cats.map((cat, ci) => `<section class="tt-cat"><h3>${esc(cat)}</h3>${
    Array.from({length: e.n}, (_, p) => {
      const r = e.resp[p][ci], ok = vale(e, p, ci), v = votosDe(e, p, ci), mio = v.includes(String(yo));
      const puedeVotar = !termino && p !== yo && empiezaBien(r, e.letra);
      return `<button class="tt-resp${ok ? '' : ' no'}${mio ? ' voto' : ''}" data-p="${p}" data-c="${ci}"${puedeVotar ? '' : ' disabled'}
        style="--c:${ctx.color(p)}" aria-label="${esc(ctx.nombre(p))}: ${esc(r || 'nada')}">
        <span class="dot" style="background:${ctx.color(p)}"></span><span class="tt-txt">${r ? esc(r) : '—'}</span>
        ${v.length ? `<span class="tt-votos">❌${v.length > 1 ? '×' + v.length : ''}</span>` : ''}<b class="tt-pts">+${pr[p][ci]}</b></button>`;
    }).join('')}</section>`).join('')}</div>
    <div class="tt-total">${Array.from({length: e.n}, (_, p) =>
      `<span><span class="dot" style="background:${ctx.color(p)}"></span>${esc(ctx.nombre(p))} <b>+${totRonda[p]}</b></span>`).join('')}</div>
    ${termino ? '' : `<button class="main grande" id="ttListo"${e.listos[yo] ? ' disabled' : ''}>${
      e.listos[yo] ? '⏳ Esperando a los demás' : e.ronda >= e.opciones.rondas ? '✔ Listo, ver quién ganó' : '✔ Listo, otra letra'}</button>`}`;
  if (termino) return '';
  return e.listos[yo] ? '' : 'Tocá las respuestas de los otros que no valgan. Cuando estés, tocá Listo.';
}
