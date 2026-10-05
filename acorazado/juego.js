// Pantalla de Hundiste mi acorazado: primero armás tu flota; después, dos mares
// (el del otro, donde tirás, y el tuyo, donde ves lo que te tiran).
import { N, COLS, BARCOS, celdasDe, flotaValida, flotaAlAzar, barcoEn, hundido } from './reglas.js';

let ctx, $, sel = -1, ultVista, bannerT;
export function reiniciar() { sel = -1; }

const claveUlt = e => (e.ult ? `${e.ult.p}:${e.ult.i}:${e.ult.r}` : '');
export function sonido(a, e) {
  if (e.ult && claveUlt(e) !== claveUlt(a)) return {agua: 'agua', tocado: 'boom', hundido: 'hundido'}[e.ult.r];
  if (e.listos.join() !== a.listos.join() || e.fase !== a.fase) return 'entrar';
  return null;           // mover barcos mientras se arma suena desde acá mismo (ver enviar)
}
// Mientras se arma no hay turnos: el cartel de arriba dice otra cosa
export function estado(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (e.fase !== 'armar' || yo < 0) return '';
  return e.listos[yo] ? `⏳ Esperando a ${ctx.nombre(1 - yo)}…` : '⚓ Armá tu flota';
}

function grilla(g) {
  let s = '<span></span>' + [...COLS].map(ch => `<span class="lbl">${ch}</span>`).join('');
  for (let f = 0; f < N; f++) {
    s += `<span class="lbl">${f + 1}</span>`;
    for (let c = 0; c < N; c++) s += `<button class="cel" data-i="${f * N + c}" aria-label="${COLS[c]}${f + 1}"></button>`;
  }
  g.innerHTML = s;
}

export function iniciar(c) {
  ctx = c;
  ctx.tablero.innerHTML = `
    <div class="ac-banner" id="acBanner" hidden></div>
    <div class="ac-mar" id="acRival"><h3 id="acRivalTit"></h3><div class="ac-grilla" id="acGrillaRival"></div></div>
    <div class="ac-mar" id="acMio"><h3 id="acMioTit">⚓ Tu flota</h3><div class="ac-grilla" id="acGrillaMia"></div></div>`;
  $ = id => document.getElementById(id);
  grilla($('acGrillaRival')); grilla($('acGrillaMia'));
  $('acGrillaRival').addEventListener('click', ev => { const b = ev.target.closest('[data-i]'); if (b) tirar(+b.dataset.i); });
  $('acGrillaMia').addEventListener('click', ev => { const b = ev.target.closest('[data-i]'); if (b) tocarMia(+b.dataset.i); });

  // Ocultos hasta que llega el estado de la sala (si no, se podían tocar mientras decía "Conectando…")
  ctx.controles.innerHTML = `<button id="acMezclar" hidden>🎲 Mezclar</button><button id="acGirar" hidden>↻ Girar</button><button class="main" id="acListo" hidden>¡Listo!</button>`;
  $('acMezclar').onclick = () => { if (!armando()) return; sel = -1; enviar(flotaAlAzar()); };
  $('acGirar').onclick = girar;
  $('acListo').onclick = () => { if (!armando()) return; sel = -1; ctx.sonar('tap'); ctx.jugarLibre({tipo: 'listo'}); };
}

const armando = () => { const e = ctx.estado; return e && e.fase === 'armar' && ctx.miAsiento >= 0 && !e.listos[ctx.miAsiento]; };
const miFlota = () => ctx.estado.flotas[ctx.miAsiento].map(b => ({...b}));

async function enviar(flota) {
  ctx.sonar('colocar');
  // Ya se validó acá; si falla es porque la sala cambió en el medio (ej. el otro arrancó)
  if (!(await ctx.jugarLibre({tipo: 'flota', flota}))) { ctx.sonar('error'); ctx.aviso('No se pudo acomodar, probá de nuevo'); }
}
// Ubica el barco k con su origen en (f, c), corriéndolo para que no se salga del mar
function ubicar(flota, k, f, c, o) {
  const b = flota[k], l = b.l;
  b.o = o;
  b.f = Math.min(f, o === 'v' ? N - l : N - 1);
  b.c = Math.min(c, o === 'h' ? N - l : N - 1);
  return flotaValida(flota);
}
function tocarMia(i) {
  if (!armando()) return;
  const k = barcoEn(ctx.estado, ctx.miAsiento, i);
  if (k >= 0) { sel = sel === k ? -1 : k; ctx.sonar('tick'); ctx.refrescar(); return; }
  if (sel < 0) { ctx.aviso('Tocá un barco para elegirlo'); return; }
  const flota = miFlota();
  if (ubicar(flota, sel, Math.floor(i / N), i % N, flota[sel].o)) enviar(flota);
  else { ctx.sonar('error'); ctx.aviso('Ahí se pisa con otro barco'); }
}
// Gira el barco sobre la primera casilla (pivote) en la que entra: esa casilla queda fija
// y el resto rota alrededor. Se prueba la 1ra casilla, después la 2da, y así.
function girar() {
  if (!armando()) return;
  if (sel < 0) { ctx.aviso('Tocá un barco para elegirlo'); return; }
  const b = ctx.estado.flotas[ctx.miAsiento][sel], o = b.o === 'h' ? 'v' : 'h';
  for (let k = 0; k < b.l; k++) {
    const pf = b.o === 'v' ? b.f + k : b.f, pc = b.o === 'h' ? b.c + k : b.c;   // casilla pivote
    const flota = miFlota();
    flota[sel] = {...b, o, f: o === 'v' ? pf - k : pf, c: o === 'h' ? pc - k : pc};
    if (flotaValida(flota)) { enviar(flota); return; }
  }
  ctx.sonar('error'); ctx.aviso('No hay lugar para girarlo');
}
function tirar(i) {
  const e = ctx.estado;
  if (e.fase !== 'disparo' || !ctx.puedoJugar() || e.tiros[ctx.miAsiento][i] !== 0) return;
  ctx.jugar({tipo: 'tiro', i});
}

// Dibuja un mar. barcos: los que se ven (con forma); tiros: lo que le tiraron a ese mar.
function pintar(g, {barcos, tiros, hundidos, elegido, clickable, ult}) {
  const forma = new Map();
  barcos.forEach((b, k) => celdasDe(b).forEach((i, n) => forma.set(i, {k, o: b.o, proa: n === 0, popa: n === b.l - 1})));
  g.querySelectorAll('.cel').forEach(btn => {
    const i = +btn.dataset.i, x = forma.get(i), t = tiros[i];
    const cls = ['cel'];
    if (x) cls.push('barco', x.o, x.proa ? 'proa' : '', x.popa ? 'popa' : '', x.k === elegido ? 'sel' : '', hundidos.includes(x.k) ? 'hundido' : '');
    if (t === 1) cls.push('agua');
    if (t === 2) cls.push('tocado');
    if (clickable(i)) cls.push('libre');
    if (i === ult) cls.push('ult');
    const nuevo = cls.filter(Boolean).join(' ');
    if (btn.className !== nuevo) {
      const antes = btn.dataset.t;
      btn.className = nuevo;
      if (String(t) !== antes && t) ctx.animar(btn);
    }
    btn.dataset.t = t;
    btn.disabled = !clickable(i) && !(g.id === 'acGrillaMia' && armando());
  });
}

function banner(texto) {
  const b = $('acBanner');
  b.textContent = texto; b.hidden = false; ctx.animar(b, 'pop');
  clearTimeout(bannerT); bannerT = setTimeout(() => { b.hidden = true; }, 2000);
}

export function dibujar(ctx) {
  const e = ctx.estado, yo = ctx.miAsiento;
  if (yo < 0) return '';
  const otro = 1 - yo, puedo = ctx.puedoJugar(), termino = e.ganador !== -1;
  const enArmado = e.fase === 'armar';
  if (!armando()) sel = -1;

  // Cartel cuando hunden un barco (no al entrar a una sala que ya venía jugando)
  const k = claveUlt(e);
  if (ultVista !== undefined && k && k !== ultVista && e.ult.r === 'hundido')
    banner(e.ult.p === yo ? `💥 ¡Hundiste su ${e.ult.barco}!` : `😱 ¡Hundiste mi ${e.ult.barco}!`);
  ultVista = k;

  const hundidosDe = p => e.flotas[p].map((_, kk) => kk).filter(kk => hundido(e, p, kk));
  // Mar del rival: solo se ven sus barcos hundidos (y todos al final)
  const hundRival = hundidosDe(otro);
  $('acRival').hidden = enArmado;
  $('acRivalTit').textContent = `🎯 Mar de ${ctx.nombre(otro)}`;
  pintar($('acGrillaRival'), {
    barcos: termino ? e.flotas[otro] : e.flotas[otro].filter((_, kk) => hundRival.includes(kk)),
    hundidos: termino ? hundRival : hundRival.map((_, n) => n),
    tiros: e.tiros[yo], elegido: -1,
    clickable: i => !enArmado && puedo && e.tiros[yo][i] === 0,
    ult: e.ult && e.ult.p === yo ? e.ult.i : -1,
  });
  // Mi mar: mis barcos y lo que me tiraron
  $('acMio').classList.toggle('ac-mini', !enArmado);
  pintar($('acGrillaMia'), {
    barcos: e.flotas[yo], hundidos: hundidosDe(yo), tiros: e.tiros[otro], elegido: sel,
    clickable: () => false, ult: e.ult && e.ult.p === otro ? e.ult.i : -1,
  });

  const arm = armando();
  $('acMezclar').hidden = $('acGirar').hidden = $('acListo').hidden = !arm;
  $('acGirar').disabled = sel < 0;

  if (arm) return sel >= 0 ? `Tocá dónde poner el ${BARCOS[sel].nombre}, o Girar` : 'Tocá un barco para moverlo, o Mezclá. Cuando esté, ¡Listo!';
  if (enArmado) return `Tu flota está lista. Falta que ${ctx.nombre(otro)} arme la suya`;
  if (puedo) return `Tocá una casilla del mar de ${ctx.nombre(otro)} para tirar`;
  return '';
}
