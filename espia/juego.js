// Pantalla del Espía: tu palabra (que se puede tapar), el panel según la fase y las pistas de cada ronda.
import { ROL, MIN_ESPIA, NOMBRE_ROL, textoReparto, acierta, palabraDe, pistasRonda, pistaVale, ordenRonda, vivos } from './reglas.js';
import { esc } from '../shared/salas.js';

let ctx, $, menuEl = null, clave = '', tapada = false;

// ---------- Menú ----------
export function menu(el) {
  menuEl = el;
  el.innerHTML = `<label class="opcion-check"><input type="checkbox" id="esEspia" checked> Con espías (sin palabra)
      <span class="note">(de ${MIN_ESPIA} a 7 jugadores, 1 espía; de 8, 2)</span></label>
    <label class="opcion-check"><input type="checkbox" id="esVoz"> Las pistas se dicen en voz alta
      <span class="note">(si están juntos o en llamada: no se escriben)</span></label>`;
}
export function opciones() {
  const q = id => menuEl && menuEl.querySelector('#' + id);
  return {espia: q('esEspia') ? q('esEspia').checked : true, voz: q('esVoz') ? q('esVoz').checked : false};
}

export function reiniciar() { clave = ''; tapada = false; }

export function sonido(a, e) {
  if (a.fase !== e.fase) return e.fase === 'votar' ? 'basta' : e.fase === 'adivinar' ? 'canto' : e.fase === 'fin' ? null : 'cambiar';
  if (e.pistas.length !== a.pistas.length) return 'colocar';
  if (e.votos.join() !== a.votos.join()) return 'tick';
  return null;
}
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  if (e.fase === 'votar') return !e.vivos[yo] ? '🗳️ Están votando' : e.votos[yo] >= 0 ? '⏳ Esperando los votos' : '🗳️ ¿A quién sacamos?';
  if (e.fase === 'adivinar') return e.turno === yo ? '🕵️ ¡Adiviná la palabra!' : `🕵️ ${ctx.nombre(e.turno)} arriesga`;
  if (e.fase === 'pistas') return e.turno === yo ? '✍️ ¡Tu pista!' : `💭 Pista de ${ctx.nombre(e.turno)}`;
  return '';
}

export function iniciar(c) {
  ctx = c;
  $ = id => document.getElementById(id);
  ctx.tablero.innerHTML = `<div class="es-palabra" id="esPalabra"></div><div class="es-panel" id="esPanel"></div><div class="es-rondas" id="esRondas"></div>`;
  $('esPalabra').addEventListener('click', ev => { if (ev.target.closest('[data-a="tapar"]')) { tapada = !tapada; ctx.sonar('tap'); clave = ''; ctx.refrescar(); } });
  $('esPanel').addEventListener('click', ev => {
    const b = ev.target.closest('[data-a], [data-voto]');
    if (!b || b.disabled) return;
    if (b.dataset.voto) { ctx.jugarLibre({tipo: 'votar', p: +b.dataset.voto}); return; }
    accion(b.dataset.a);
  });
  $('esPanel').addEventListener('keydown', ev => {
    if (ev.key !== 'Enter') return;
    if (ev.target.id === 'esTxt') accion('pista');
    if (ev.target.id === 'esAdiv') accion('adivinar');
  });
}

async function accion(a) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (a === 'pista' || a === 'voz') {
    const t = a === 'voz' ? '' : $('esTxt').value.trim();
    if (a === 'pista' && !t) { ctx.aviso('Escribí tu pista'); return; }
    if (t && !pistaVale(e, yo, t)) { ctx.sonar('error'); ctx.aviso('¡No vale decir tu palabra!'); return; }
    await ctx.jugar({tipo: 'pista', texto: t});
  }
  if (a === 'adivinar') {
    const t = $('esAdiv').value.trim();
    if (!t) { ctx.aviso('Escribí la palabra'); return; }
    await ctx.jugar({tipo: 'adivinar', texto: t});
  }
}

const quien = (ctx, i) => `<span class="dot" style="background:${ctx.color(i)}"></span><b>${esc(ctx.nombre(i))}</b>`;
// Una pista: escrita, en voz alta o sin pista (se le acabó el tiempo)
const textoPista = (e, x) => (x.nada ? '<i>⏱️ sin pista</i>' : e.opciones.voz ? '<i>🗣️ la dijo</i>' : `“${esc(x.t)}”`);

// Cómo votó cada uno: una fila por cada votado (el más votado arriba) con quiénes lo votaron
function tablaVotos(ctx, votos) {
  const por = new Map();
  votos.forEach((v, i) => { if (v >= 0) por.set(v, [...(por.get(v) || []), i]); });
  if (!por.size) return '';
  const filas = [...por].sort((a, b) => b[1].length - a[1].length).map(([v, qs]) =>
    `<li>${quien(ctx, v)} <span class="es-cuenta">${qs.length} ${qs.length === 1 ? 'voto' : 'votos'}</span>
      <span class="es-quienes">← ${qs.map(i => esc(ctx.nombre(i))).join(', ')}</span></li>`);
  return `<ul class="es-tabla-votos">${filas.join('')}</ul>`;
}

export function dibujar(c) {
  ctx = c;
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  const termino = e.ganador !== -1, mia = palabraDe(e, yo), soyEspia = e.roles[yo] === ROL.ESPIA;

  // ---------- Tu palabra ----------
  const kp = [termino, tapada, e.vivos[yo], mia, ctx.listos].join('|');
  if ($('esPalabra').dataset.k !== kp) {
    $('esPalabra').dataset.k = kp;
    let h;
    if (!ctx.listos) h = '<p class="note">Cuando estén todos, a cada uno le llega su palabra.</p>';
    else if (termino) h = `<p class="note">La palabra de la mayoría era</p><b class="es-pal">${esc(e.pal[0])}</b>
      <p class="note">y la de los impostores, <b>${esc(e.pal[1])}</b>.${soyEspia ? ' Vos eras espía.' : e.roles[yo] === ROL.IMPOSTOR ? ' ¡Vos eras impostor!' : ''}</p>`;
    else if (tapada) h = `<p class="note">Tu palabra está tapada</p><button class="chico" data-a="tapar">👀 Ver</button>`;
    else if (soyEspia) h = `<p class="note">No tenés palabra</p><b class="es-pal">🕵️ Sos espía</b>
      <p class="note">Escuchá las pistas, disimulá y tratá de adivinar la palabra.</p><button class="chico" data-a="tapar">🙈 Tapar</button>`;
    else h = `<p class="note">Tu palabra (¿será la de todos?)</p><b class="es-pal">${esc(mia)}</b>
      <button class="chico" data-a="tapar">🙈 Tapar</button>`;
    if (ctx.listos && !termino && !e.vivos[yo]) h += '<p class="es-afuera">Quedaste afuera: mirá cómo sigue.</p>';
    if (ctx.listos && !termino) h += `<p class="note es-reparto">En esta partida: ${textoReparto(e.n, e.roles.includes(ROL.ESPIA))}</p>`;
    $('esPalabra').innerHTML = h;
    $('esPalabra').classList.toggle('espia', soyEspia && !tapada && !termino);
  }

  // ---------- Panel según la fase (se rearma solo si cambia la situación: así no se borra lo que escribís) ----------
  const k = [e.fase, e.turno, e.ronda, e.votos.join(), e.vivos.join(), e.pistas.length, ctx.listos, termino].join('|');
  if (k !== clave) {
    clave = k;
    let h = '';
    if (!ctx.listos || termino) h = '';
    else if (e.fase === 'pistas') {
      const orden = ordenRonda(e), hechas = pistasRonda(e).length;
      const fila = `<p class="note">Ronda ${e.ronda} · pista ${hechas + 1} de ${orden.length}</p>`;
      if (e.turno === yo) h = fila + (e.opciones.voz
        ? `<p>Decí en voz alta tu pista: una palabra o frase relacionada con tu palabra, sin decirla.</p>
           <button class="main grande" data-a="voz">✔ Ya dije mi pista</button>`
        : `<p>Escribí una palabra o frase relacionada con tu palabra (sin decirla).</p>
           <div class="row"><input id="esTxt" maxlength="60" autocomplete="off" placeholder="${soyEspia ? 'Algo que no te delate…' : 'Tu pista'}">
           <button class="main" data-a="pista">Mandar</button></div>`);
      else h = fila + `<p>${quien(ctx, e.turno)} está pensando su pista…</p>`;
    } else if (e.fase === 'votar') {
      const vs = vivos(e), votaron = vs.filter(i => e.votos[i] >= 0).length;
      if (!e.vivos[yo]) h = `<p>Están votando a quién sacar (${votaron}/${vs.length})…</p>`;
      else {
        const pr = pistasRonda(e);
        h = `<p><b>¿Quién te parece que no tiene tu palabra?</b> Votá a quién sacar.</p>
          <div class="es-votos">${vs.filter(i => i !== yo).map(i => {
            const x = pr.find(y => y.p === i);
            return `<button data-voto="${i}" class="${e.votos[yo] === i ? 'elegido' : ''}" style="--c:${ctx.color(i)}">${quien(ctx, i)}
              <span>${x ? textoPista(e, x) : ''}</span></button>`;
          }).join('')}</div>
          <p class="note">${e.votos[yo] >= 0 ? `Votaste a ${esc(ctx.nombre(e.votos[yo]))}: podés cambiar hasta que voten todos. ` : ''}Votaron ${votaron} de ${vs.length}.</p>`;
      }
    } else if (e.fase === 'adivinar') {
      h = e.turno === yo
        ? `<p><b>¡Te descubrieron!</b> Tenés una sola oportunidad: si adivinás la palabra de la mayoría, ganás vos.</p>
           <div class="row"><input id="esAdiv" maxlength="40" autocomplete="off" placeholder="¿Cuál es la palabra?">
           <button class="main" data-a="adivinar">Arriesgar</button></div>`
        : `<p>${quien(ctx, e.turno)} era espía 🕵️ y ahora intenta adivinar la palabra…</p>`;
    }
    $('esPanel').innerHTML = h;
    $('esPanel').hidden = !h;
    // Solo si no estás escribiendo en otro lado (por ejemplo, en el chat)
    if (!document.activeElement || document.activeElement === document.body) $('esTxt')?.focus();
  }

  // ---------- Las rondas: pistas y cómo terminó cada votación ----------
  const rondas = [];
  for (let r = e.ronda; r >= 1; r--) {
    const pr = pistasRonda(e, r), res = e.res.find(x => x.r === r);
    if (!pr.length && !res) continue;
    const votos = res ? `<p class="es-res">🗳️ ${res.out < 0 ? 'Empate: no salió nadie' : `Salió ${quien(ctx, res.out)}: era ${NOMBRE_ROL[e.roles[res.out]]}`}</p>
      ${tablaVotos(ctx, res.votos)}` : '';
    rondas.push(`<section><h3>Ronda ${r}</h3><ul>${pr.map(x => `<li style="--c:${ctx.color(x.p)}">${quien(ctx, x.p)} ${textoPista(e, x)}</li>`).join('')}</ul>${votos}</section>`);
  }
  const intentos = e.intentos.map(x => `<p class="es-res">🕵️ ${quien(ctx, x.p)} arriesgó ${x.t ? `“${esc(x.t)}”` : 'nada'} ${acierta(x.t, e.pal[0]) ? '✅' : '❌'}</p>`).join('');
  const htmlR = intentos + rondas.join('');
  if ($('esRondas').dataset.k !== htmlR) { $('esRondas').dataset.k = htmlR; $('esRondas').innerHTML = htmlR; }

  if (!ctx.listos || termino) return '';
  if (e.fase === 'pistas' && e.turno !== yo) return e.vivos[yo] ? 'Escuchá bien: ¿todos hablan de lo mismo que vos?' : '';
  return '';
}

// Cartel del final: quiénes eran qué
export function resumenFin(ctx) {
  const e = ctx.estado, de = rol => e.roles.map((r, i) => (r === rol ? ctx.nombre(i) : '')).filter(Boolean);
  const imp = de(ROL.IMPOSTOR), esp = de(ROL.ESPIA);
  return `${imp.length > 1 ? 'Impostores' : 'Impostor'}: ${imp.join(' y ')} (${e.pal[1]})` +
    `${esp.length ? ` · ${esp.length > 1 ? 'Espías' : 'Espía'}: ${esp.join(' y ')}` : ''} · Palabra: ${e.pal[0]}`;
}
