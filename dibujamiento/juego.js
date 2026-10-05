// Pantalla del Dibujamiento: escribir / dibujar / describir con reloj, y al final la película de cada cadena.
import { RITMOS, GRACIA, FRASES, tipoRonda, cadenaDe, autor, rutaDibujo } from './reglas.js';
import { esc } from '../shared/salas.js';
import { crearLienzo } from '../shared/lienzo.js';

let ctx, $, menuEl = null, lzMio, lzVer;
let clave = '', relojT = 0, mandado = '', peliC = -1, peliK = 0, tic = -1;

// ---------- Menú: ritmo ----------
export function menu(el) {
  menuEl = el;
  el.innerHTML = `<div class="pills" role="radiogroup" aria-label="Ritmo">${Object.keys(RITMOS).map(r =>
    `<label class="ancho"><input type="radio" name="dbRitmo" value="${r}"${r === 'normal' ? ' checked' : ''}><span>${r === 'normal' ? '⚡ Normal' : '🐢 Tranqui'}</span></label>`).join('')}</div>
    <p class="note">Normal: ${RITMOS.normal.dibujar} s para dibujar. Tranqui: ${RITMOS.tranqui.dibujar} s.</p>`;
}
export function opciones() {
  const r = menuEl && menuEl.querySelector('input[name="dbRitmo"]:checked');
  return {ritmo: r ? r.value : 'normal'};
}

export function reiniciar() { clave = ''; mandado = ''; peliC = -1; peliK = 0; lzMio?.reset(); lzVer?.reset(); }
export const textoFin = () => ({emoji: '🎬', txt: '¡Qué película!'});

export function sonido(a, e) {
  if (a.fase !== e.fase) return 'entrar';
  if (a.ronda !== e.ronda) return 'cambiar';
  if (a.ver.c !== e.ver.c || a.ver.k !== e.ver.k) return 'carta';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (e.fase === 'pelicula') return '🎬 ¡La película!';
  if (e.listos[yo]) return '⏳ Esperando a los demás';
  if (tipoRonda(e.ronda) === 'dibujar') return '🎨 ¡Dibujá!';
  return e.ronda === 0 ? '✍️ Escribí una frase' : '🤔 ¿Qué es esto?';
}

const datosDe = (e, c, r) => ((ctx.extra.dib || {})[e.pid] || {})[`${c}_${r}`] || {};
const puedoDibujar = () => {
  const e = ctx.estado;
  return !!e && e.fase === 'jugar' && tipoRonda(e.ronda) === 'dibujar' && ctx.listos && e.ganador === -1 && !e.listos[ctx.miAsiento];
};

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `
    <div id="dbJugar">
      <div class="db-top"><div class="db-ronda" id="dbRonda"></div><div class="db-reloj" id="dbReloj"></div></div>
      <div class="db-consigna" id="dbConsigna"></div>
      <div id="dbVer"></div>
      <div id="dbLienzo"></div>
      <div class="db-escribir" id="dbEscribir">
        <div class="row"><input id="dbTxt" maxlength="80" autocomplete="off" placeholder="Escribí acá…" aria-label="Tu frase">
          <button id="dbAzar" class="icono" aria-label="Frase al azar" title="Frase al azar">🎲</button></div>
      </div>
      <button class="main grande" id="dbListo">¡Listo!</button>
      <p class="note db-espera" id="dbEspera"></p>
    </div>
    <div id="dbPeli" hidden>
      <h3 class="db-peli-titulo" id="dbPeliTitulo"></h3>
      <div class="db-pasos" id="dbPasos"></div>
      <button class="main grande" id="dbSig">Siguiente ▶</button>
    </div>`;
  lzMio = crearLienzo($('dbLienzo'), {ctx, ruta: () => rutaDibujo(ctx.estado, cadenaDe(ctx.estado, ctx.miAsiento), ctx.estado.ronda),
                                      puedeDibujar: puedoDibujar, herramientas: true});
  lzVer = crearLienzo($('dbVer'), {ctx});
  $('dbListo').onclick = () => { ctx.sonar('tap'); entregar(); };
  $('dbTxt').addEventListener('keydown', ev => { if (ev.key === 'Enter') entregar(); });
  $('dbAzar').onclick = () => { $('dbTxt').value = FRASES[Math.floor(Math.random() * FRASES.length)]; ctx.sonar('tick'); };
  $('dbSig').onclick = () => { const e = ctx.estado; ctx.jugarLibre({tipo: 'ver', c: e.ver.c, k: e.ver.k}); };
  clearInterval(relojT);
  relojT = setInterval(reloj, 250);
}

async function entregar() {
  const e = ctx.estado;
  if (!e || e.fase !== 'jugar' || e.listos[ctx.miAsiento]) return;
  const escribe = tipoRonda(e.ronda) === 'escribir';
  if (escribe && !$('dbTxt').value.trim() && e.hasta && ctx.ahora() < e.hasta) { ctx.aviso('Escribí algo (o tocá 🎲)'); return; }
  lzMio.mandar();
  await ctx.jugarLibre({tipo: 'entregar', texto: escribe ? $('dbTxt').value : '', t: ctx.ahora()});
}

// Reloj de la ronda: arranca el de la primera, manda lo tuyo al terminar y, si alguien se colgó, sigue sin él
function reloj() {
  const e = ctx && ctx.estado;
  if (!e || !ctx.online || !ctx.listos || e.fase !== 'jugar' || e.ganador !== -1) { if ($('dbReloj')) $('dbReloj').textContent = ''; return; }
  const k = e.pid + e.ronda;
  if (!e.hasta) { if (mandado !== 'reloj' + k) { mandado = 'reloj' + k; ctx.jugarLibre({tipo: 'reloj', t: ctx.ahora()}); } return; }
  const queda = Math.ceil((e.hasta - ctx.ahora()) / 1000);
  $('dbReloj').textContent = `⏱️ ${Math.max(0, queda)}`;
  $('dbReloj').classList.toggle('apurado', queda <= 10);
  if (queda <= 10 && queda > 0 && queda !== tic && !e.listos[ctx.miAsiento]) { tic = queda; ctx.sonar('reloj'); }
  if (queda <= 0 && !e.listos[ctx.miAsiento] && mandado !== 'auto' + k) { mandado = 'auto' + k; entregar(); }
  if (ctx.ahora() >= e.hasta + GRACIA && mandado !== 'forzar' + k) { mandado = 'forzar' + k; ctx.jugarLibre({tipo: 'forzar', t: ctx.ahora()}); }
}

// ---------- Película ----------
function paso(e, c, r) {
  const p = autor(e, c, r), quien = `<span class="dot" style="background:${ctx.color(p)}"></span><b>${esc(ctx.nombre(p))}</b>`;
  const div = document.createElement('div');
  div.className = 'db-paso ' + tipoRonda(r);
  if (tipoRonda(r) === 'escribir') {
    const t = e.textos[c][r];
    div.innerHTML = `<div class="db-quien">${quien} ${r === 0 ? 'escribió' : 'creyó que era'}</div>
      <p class="db-burbuja">${t ? esc(t) : '<i>(no escribió nada)</i>'}</p>`;
  } else div.innerHTML = `<div class="db-quien">${quien} dibujó</div><div class="db-dib"></div>`;
  return div;
}
function pelicula(e) {
  const {c, k} = e.ver;
  if (c !== peliC) { peliC = c; peliK = 0; $('dbPasos').innerHTML = ''; }
  $('dbPeliTitulo').innerHTML = `🎬 La cadena de <span class="dot" style="background:${ctx.color(c)}"></span>${esc(ctx.nombre(c))} <small>(${c + 1} de ${e.n})</small>`;
  const animar = k === peliK + 1;                   // si se agregó un solo paso, se anima; si no (recién entrás), aparece todo
  for (let r = peliK; r < k; r++) {
    const div = paso(e, c, r);
    $('dbPasos').append(div);
    ctx.animar(div);
    if (tipoRonda(r) === 'dibujar') {
      const lz = crearLienzo(div.querySelector('.db-dib'), {ctx});
      requestAnimationFrame(() => (animar ? lz.pelicula(datosDe(e, c, r), 3500) : lz.mostrar(datosDe(e, c, r))));
    }
    div.scrollIntoView?.({behavior: 'smooth', block: 'nearest'});
  }
  peliK = k;
  const ultimo = c === e.n - 1 && k === e.pasos;
  $('dbSig').hidden = e.ganador !== -1;
  $('dbSig').textContent = k < e.pasos ? 'Siguiente ▶' : ultimo ? 'Terminar 🎬' : 'Siguiente cadena ▶';
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  const peli = e.fase === 'pelicula';
  $('dbJugar').hidden = peli;
  $('dbPeli').hidden = !peli;
  if (peli) { pelicula(e); return e.ganador === -1 ? 'Cualquiera puede tocar Siguiente' : ''; }

  // Ronda nueva: se arma la consigna (y el jugador 0 limpia los dibujos de partidas viejas)
  const r = e.ronda, cad = cadenaDe(e, yo), dibuja = tipoRonda(r) === 'dibujar', k = `${e.pid}|${r}`;
  if (k !== clave) {
    clave = k;
    lzMio.reset(); lzVer.reset();
    $('dbTxt').value = '';
    if (yo === 0) {
      const viejos = {};
      for (const pid of Object.keys(ctx.extra.dib || {})) if (pid !== e.pid) viejos['dib/' + pid] = null;
      if (Object.keys(viejos).length) ctx.cambiarExtra(viejos);
    }
  }
  const listo = !!e.listos[yo], antes = r > 0 ? autor(e, cad, r - 1) : -1;
  $('dbRonda').textContent = `Ronda ${r + 1} de ${e.pasos}`;
  $('dbConsigna').innerHTML = r === 0 ? 'Escribí una frase para que el de al lado la dibuje'
    : dibuja ? `Dibujá esto (lo escribió ${esc(ctx.nombre(antes))}):<p class="db-burbuja">${e.textos[cad][r - 1] ? esc(e.textos[cad][r - 1]) : '<i>(no escribió nada: dibujá lo que quieras)</i>'}</p>`
    : `¿Qué dibujó ${esc(ctx.nombre(antes))}?`;
  $('dbVer').hidden = dibuja || r === 0;
  if (!dibuja && r > 0) lzVer.mostrar(datosDe(e, cad, r - 1));
  $('dbLienzo').hidden = !dibuja;
  lzMio.verHerramientas(dibuja && !listo && ctx.listos);
  $('dbEscribir').hidden = dibuja || listo;
  $('dbTxt').placeholder = r === 0 ? 'Ej: un perro manejando un colectivo' : '¿Qué es?';
  $('dbAzar').hidden = r !== 0;
  $('dbListo').hidden = listo || !ctx.listos;
  const faltan = e.listos.map((x, p) => (x ? -1 : p)).filter(p => p >= 0);
  $('dbEspera').textContent = listo ? `✔ Listo. Esperando a ${faltan.map(p => ctx.nombre(p)).join(', ')}…` : '';
  if (!ctx.listos) return '';
  return listo ? '' : dibuja ? 'Dibujá con el dedo o el mouse y tocá Listo' : r === 0 ? 'Algo divertido de dibujar (o tocá 🎲)' : 'Escribí qué creés que es';
}
