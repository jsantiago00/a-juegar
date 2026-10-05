// Pantalla de ¿Quién soy?: panel según la fase, grilla de cartas e historial de preguntas.
import { conectar, lista, esc } from '../shared/salas.js';
import { dibujitos } from './dibujitos.js';
import { MAZOS_INCLUIDOS } from './famosos.js';

const cache = {};
async function cargarMazo(id) {
  if (cache[id]) return cache[id];
  if (id === 'dibujitos') return (cache[id] = dibujitos());
  if (MAZOS_INCLUIDOS[id]) return (cache[id] = MAZOS_INCLUIDOS[id].crear());
  const fb = await conectar();
  const v = (await fb.get(fb.ref(fb.db, 'mazos/cartas/' + id))).val();
  if (!v) throw new Error('el mazo ya no existe');
  // De Firebase solo se aceptan nombre + imagen (nada de SVG)
  return (cache[id] = {nombre: v.nombre, cartas: lista(v.cartas).map(c => ({nombre: String(c.nombre || '?'), img: String(c.img || '')}))});
}
const imagen = c => (c.svg ? c.svg : `<img src="${esc(c.img)}" alt="">`);

// Chat de sala para charlar (y chicanear) mientras juegan online
export const chat = true;

// Sonido de cada paso. Las cartas que baja el rival no suenan (solo las tuyas).
export function sonido(a, e, ctx) {
  if (a.fase === 'pregunta' && e.fase === 'respuesta') return 'pregunta';
  if (a.fase === 'respuesta' && e.fase === 'pregunta') return e.respuesta === 'Sí' ? 'si' : 'no';
  if (e.ganador !== -1) return null;
  const yo = ctx.miAsiento;
  return JSON.stringify(a.bajadas[yo]) !== JSON.stringify(e.bajadas[yo]) ? 'carta' : null;
}

// ---------- Menú: elegir mazo ----------
export function menu(el) {
  el.innerHTML = `<div class="row"><label for="mazo">Mazo</label>
    <select id="mazo"><option value="dibujitos" data-n="24" data-nombre="Dibujitos">Dibujitos (24)</option>
      ${Object.entries(MAZOS_INCLUIDOS).map(([id, m]) =>
        `<option value="${id}" data-n="${m.cantidad}" data-nombre="${esc(m.nombre)}">${esc(m.nombre)} (${m.cantidad})</option>`).join('')}</select>
    <a href="${new URL('mazos.html', import.meta.url).href}">Crear o editar mazos</a></div>`;
  conectar()
    .then(fb => fb.get(fb.ref(fb.db, 'mazos/indice')))
    .then(snap => {
      const v = snap.val() || {}, sel = document.getElementById('mazo');
      for (const [id, m] of Object.entries(v)) {
        const o = document.createElement('option');
        o.value = id; o.dataset.n = m.cantidad; o.dataset.nombre = m.nombre;
        o.textContent = `${m.nombre} (${m.cantidad})`;
        sel.append(o);
      }
    })
    .catch(() => {});  // sin Firebase: solo dibujitos
}
export function opciones() {
  const o = document.getElementById('mazo').selectedOptions[0];
  return {mazo: o.value, nombre: o.dataset.nombre, cantidad: +o.dataset.n};
}

// ---------- Partida ----------
let ctx, panel, grilla, hist;
let mazoId = null, mazo = null, clave = '', arriesgo = false, elegida = -1, histVisto = null;

export function reiniciar() { arriesgo = false; elegida = -1; clave = ''; }

export function iniciar(c) {
  ctx = c;
  ctx.tablero.innerHTML = '<div class="qs-panel" id="qsPanel"></div><div class="qs-grilla" id="qsGrilla"></div><div class="qs-hist" id="qsHist"></div>';
  panel = document.getElementById('qsPanel');
  grilla = document.getElementById('qsGrilla');
  hist = document.getElementById('qsHist');
  grilla.addEventListener('click', ev => { const t = ev.target.closest('[data-i]'); if (t) tocarCarta(+t.dataset.i); });
  panel.addEventListener('click', ev => { const b = ev.target.closest('[data-a]'); if (b) accion(b.dataset.a); });
  panel.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id === 'qsTexto') accion('preguntar'); });
}

// Bajar o levantar cartas es libre: se puede en cualquier momento, sea o no tu turno
function tocarCarta(i) {
  if (arriesgo) { if (!ctx.puedoJugar()) return; elegida = i; ctx.sonar('tick'); ctx.refrescar(); return; }
  ctx.jugarLibre({tipo: 'bajar', i});
}

async function accion(a) {
  if (a === 'preguntar') {
    const t = document.getElementById('qsTexto').value.trim();
    if (!t) { ctx.aviso('Escribí una pregunta'); return; }
    await ctx.jugar({tipo: 'preguntar', texto: t});
  }
  if (a === 'si' || a === 'no') await ctx.jugar({tipo: 'responder', si: a === 'si'});
  if (a === 'arriesgar') { arriesgo = true; elegida = -1; ctx.sonar('tap'); ctx.refrescar(); }
  if (a === 'cancelar') { arriesgo = false; elegida = -1; ctx.refrescar(); }
  if (a === 'confirmar' && elegida >= 0) {
    const i = elegida; arriesgo = false; elegida = -1;
    await ctx.jugar({tipo: 'arriesgar', i});
    ctx.refrescar();
  }
}

function armarGrilla() {
  grilla.innerHTML = mazo.cartas.map((c, i) =>
    `<button class="carta" data-i="${i}"><span class="cara">${imagen(c)}</span><span class="nom">${esc(c.nombre)}</span></button>`).join('');
}

export function dibujar(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento, otro = 1 - yo, puedo = ctx.puedoJugar();
  const id = (e.opciones && e.opciones.mazo) || 'dibujitos';
  if (mazoId !== id) {
    mazoId = id; mazo = null; grilla.innerHTML = ''; clave = '';
    cargarMazo(id).then(m => { if (mazoId !== id) return; mazo = m; armarGrilla(); clave = ''; ctx.refrescar(); })
                  .catch(err => { panel.innerHTML = `<p>No se pudo cargar el mazo: ${esc(err.message)}</p>`; });
  }
  if (!mazo) { if (!clave) panel.innerHTML = '<p class="note">Cargando mazo…</p>'; return ''; }
  if (yo < 0) return '';
  if (!puedo || e.fase !== 'pregunta') { arriesgo = false; elegida = -1; }

  const carta = i => mazo.cartas[i] || {nombre: '?', svg: ''};
  const nom = i => esc(carta(i).nombre);
  const mini = (i, txt) => `<div class="mini">${imagen(carta(i))}</div><div><span class="note">${txt}</span><br><b>${nom(i)}</b></div>`;
  const mio = e.secretos[yo], rival = esc(ctx.nombre(otro));
  const termino = e.ganador !== -1;

  // Grilla: mis cartas bajadas, la elegida al arriesgar y, al final, el personaje del rival
  const mias = e.bajadas[yo] || [];
  [...grilla.children].forEach((el, i) => {
    el.classList.toggle('bajada', !!mias[i]);
    el.classList.toggle('elegida', arriesgo && i === elegida);
    el.classList.toggle('secreto', termino && i === e.secretos[otro]);
    el.disabled = arriesgo ? !puedo : !(ctx.listos && !termino);
  });

  // Preguntas en dos columnas (una por jugador); la fila r tiene la r-ésima pregunta de cada uno
  const cols = [0, 1].map(p => e.historial.filter(x => x.p === p).map(x =>
    `<p class="q">“${esc(x.q)}”</p><span class="r ${x.r === 'Sí' ? 'si' : 'no'}">${x.r}</span>`));
  if (e.fase === 'respuesta' && e.pregunta && !termino)
    cols[1 - e.turno].push(`<p class="q">“${esc(e.pregunta)}”</p><span class="r espera">⏳</span>`);
  const filas = Math.max(cols[0].length, cols[1].length);
  const htmlHist = filas
    ? `<h3>Preguntas</h3><div class="qs-cols">
         ${[0, 1].map(p => `<div class="cab" style="--c:${ctx.color(p)}">${esc(ctx.nombre(p))}${p === yo ? ' (vos)' : ''}</div>`).join('')}
         ${Array.from({length: filas}, (_, r) => [0, 1].map(p =>
           `<div class="celda${cols[p][r] ? '' : ' vacia'}">${cols[p][r] || ''}</div>`).join('')).join('')}
       </div>`
    : '';
  if (htmlHist !== histVisto) { histVisto = htmlHist; hist.innerHTML = htmlHist; }   // así no se repite la animación

  // El panel solo se rearma cuando cambia la situación (así no se borra lo que estás escribiendo)
  const k = [e.fase, e.turno, e.ganador, ctx.listos, arriesgo, elegida, e.pregunta, e.respuesta, e.historial.length, yo].join('|');
  if (k === clave) return '';
  clave = k;

  let h;
  const tuyo = `<div class="fila">${mini(mio, 'Tu personaje')}</div>`;
  // La última respuesta que recibiste (si la última pregunta fue tuya): para que bajes cartas
  const ult = e.historial[e.historial.length - 1];
  const tuRespuesta = ult && ult.p === yo
    ? `<p class="preg">“${esc(ult.q)}” <span class="r ${ult.r === 'Sí' ? 'si' : 'no'}">${ult.r}</span></p>
       <p class="note">Tocá las cartas que no cumplen para bajarlas (podés hacerlo cuando quieras).</p>` : '';
  if (!ctx.listos) h = `${tuyo}<p class="note">Cuando entre el otro jugador, arranca la partida.</p>`;
  else if (termino) h = `<div class="fila">${mini(mio, 'Tu personaje era')}</div><div class="fila">${mini(e.secretos[otro], 'El de ' + rival + ' era')}</div>`;
  else if (e.fase === 'pregunta') {
    if (puedo && arriesgo) {
      h = elegida < 0
        ? `<p>Tocá la carta que creés que es el personaje de ${rival}.</p><div class="row"><button data-a="cancelar">Cancelar</button></div>`
        : `<p>¿Arriesgás a <b>${nom(elegida)}</b>? Si le errás, perdés.</p><div class="row"><button class="main" data-a="confirmar">Arriesgar</button><button data-a="cancelar">Cancelar</button></div>`;
    } else if (puedo) {
      h = `${tuyo}<div class="row"><input id="qsTexto" placeholder="¿Tiene anteojos?" maxlength="120" autocomplete="off">
           <button class="main" data-a="preguntar">Preguntar</button></div>
           <div class="row"><button data-a="arriesgar">Arriesgar</button><span class="note">Tocá cartas para bajarlas o levantarlas cuando quieras.</span></div>`;
    } else h = tuRespuesta ? `${tuRespuesta}<p>Mientras tanto, ${rival} piensa su pregunta…</p>`
                           : `${tuyo}<p>${rival} está pensando una pregunta…</p>`;
  } else {   // fase 'respuesta'
    h = puedo
      ? `<p class="preg">“${esc(e.pregunta)}”</p><div class="fila">${mini(mio, 'Tu personaje')}</div>
         <div class="row"><button class="main" data-a="si">Sí</button><button class="main" data-a="no">No</button></div>`
      : `${tuyo}<p>Preguntaste <b>“${esc(e.pregunta)}”</b>. Esperando la respuesta de ${rival}…</p>`;
  }
  panel.innerHTML = h;
  return '';
}
