// =====================================================================
//  EFECTOS: sonidos sintetizados (Web Audio, sin archivos) y confeti.
//  sonar(nombre, jugador) -> el jugador cambia un poco el tono.
// =====================================================================
const CLAVE = 'minijuegos-mudo';
let ac = null, salida = null, bufRuido = null;
let mudo = (() => { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } })();

function audio() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ac = new C();
    const comp = ac.createDynamicsCompressor();
    salida = ac.createGain(); salida.gain.value = .55;
    salida.connect(comp); comp.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// Los navegadores solo dejan sonar después de un toque: despertamos el audio con el primero.
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => audio(), {once: true, capture: true});

function envolvente(a, g, t0, d, vol) {
  g.gain.setValueAtTime(.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + .008);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
}
function tono(a, {f, f2 = f, t = 0, d = .12, tipo = 'triangle', vol = .25}) {
  const t0 = a.currentTime + t, o = a.createOscillator(), g = a.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t0);
  if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  envolvente(a, g, t0, d, vol);
  o.connect(g).connect(salida);
  o.start(t0); o.stop(t0 + d + .03);
}
function ruido(a, {t = 0, d = .1, vol = .2, f = 1200, f2 = f, q = 1, filtro = 'bandpass'}) {
  if (!bufRuido) {
    bufRuido = a.createBuffer(1, a.sampleRate * .5, a.sampleRate);
    const c = bufRuido.getChannelData(0);
    for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1;
  }
  const t0 = a.currentTime + t, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
  s.buffer = bufRuido; fl.type = filtro; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t0);
  if (f2 !== f) fl.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  envolvente(a, g, t0, d, vol);
  s.connect(fl).connect(g).connect(salida);
  s.start(t0); s.stop(t0 + d + .03);
}

const NOTA = [523.25, 659.25, 783.99, 587.33];   // un tono por jugador: do, mi, sol, re
const SONIDOS = {
  tap:      a => tono(a, {f: 700, f2: 1000, d: .06, vol: .1}),
  tick:     a => tono(a, {f: 1250, d: .045, tipo: 'sine', vol: .12}),
  colocar:  (a, j) => { tono(a, {f: NOTA[j] / 2, f2: NOTA[j], d: .14, vol: .3}); ruido(a, {d: .03, f: 3000, vol: .08}); },
  mover:    (a, j) => { tono(a, {f: NOTA[j] * .6, f2: NOTA[j] * 1.25, d: .09, tipo: 'square', vol: .07});
                        tono(a, {f: NOTA[j] * 1.25, f2: NOTA[j] * .9, t: .08, d: .09, vol: .16}); },
  muro:     a => { ruido(a, {d: .16, f: 500, f2: 120, filtro: 'lowpass', vol: .55}); tono(a, {f: 150, f2: 55, d: .2, tipo: 'sine', vol: .5}); },
  linea:    (a, j) => { tono(a, {f: NOTA[j] * .75, f2: NOTA[j] * 2, d: .12, tipo: 'sawtooth', vol: .05});
                        ruido(a, {d: .1, f: 2000, f2: 6000, vol: .07}); },
  punto:    a => { tono(a, {f: 987.77, d: .08, tipo: 'square', vol: .09}); tono(a, {f: 1318.5, t: .08, d: .32, tipo: 'square', vol: .09}); },
  ganar:    a => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tono(a, {f, t: i * .11, d: .16, tipo: 'square', vol: .08}));
                   [523.25, 659.25, 783.99, 1046.5].forEach(f => tono(a, {f, t: .46, d: .9, vol: .12})); },
  perder:   a => [392, 369.99, 349.23, 329.63].forEach((f, i) =>
                   tono(a, {f, f2: i === 3 ? f * .92 : f, t: i * .28, d: i === 3 ? .8 : .26, tipo: 'sawtooth', vol: .06})),
  empate:   a => { tono(a, {f: 587.33, d: .16, vol: .2}); tono(a, {f: 587.33, t: .2, d: .35, vol: .2}); },
  turno:    a => { tono(a, {f: 880, d: .3, tipo: 'sine', vol: .16}); tono(a, {f: 1318.5, t: .1, d: .45, tipo: 'sine', vol: .12}); },
  entrar:   a => { tono(a, {f: 587.33, d: .1, vol: .2}); tono(a, {f: 880, t: .09, d: .2, vol: .2}); },
  error:    a => tono(a, {f: 190, f2: 140, d: .2, tipo: 'square', vol: .07}),
  carta:    a => ruido(a, {d: .08, f: 2600, f2: 900, vol: .3, q: .7}),
  pregunta: a => tono(a, {f: 380, f2: 760, d: .28, tipo: 'sine', vol: .25}),
  si:       a => { tono(a, {f: 659.25, d: .1, vol: .22}); tono(a, {f: 987.77, t: .1, d: .22, vol: .22}); },
  no:       a => { tono(a, {f: 392, d: .12, vol: .22}); tono(a, {f: 261.63, t: .12, d: .28, vol: .22}); },
  cambiar:  a => ruido(a, {d: .32, f: 300, f2: 3200, vol: .3, q: 2}),
  pasar:    a => tono(a, {f: 520, f2: 340, d: .2, tipo: 'sine', vol: .2}),
  agua:     a => { ruido(a, {d: .45, f: 1400, f2: 250, filtro: 'lowpass', vol: .45}); tono(a, {f: 320, f2: 110, d: .3, tipo: 'sine', vol: .2});
                   [0, 1, 2].forEach(k => tono(a, {f: 700 + k * 180, f2: 1100 + k * 150, t: .18 + k * .07, d: .06, tipo: 'sine', vol: .08})); },
  boom:     a => { ruido(a, {d: .55, f: 1800, f2: 70, filtro: 'lowpass', vol: .7}); tono(a, {f: 130, f2: 38, d: .55, tipo: 'sine', vol: .6}); },
  hundido:  a => { SONIDOS.boom(a);
                   [520, 440, 370, 300, 250].forEach((f, k) => tono(a, {f, f2: f * 1.35, t: .35 + k * .09, d: .07, tipo: 'sine', vol: .12}));
                   tono(a, {f: 987.77, t: .85, d: .08, tipo: 'square', vol: .08}); tono(a, {f: 1318.5, t: .93, d: .3, tipo: 'square', vol: .08}); },
  chat:     a => { tono(a, {f: 880, f2: 1180, d: .07, tipo: 'sine', vol: .18}); tono(a, {f: 1320, t: .07, d: .14, tipo: 'sine', vol: .14}); },
  enviar:   a => tono(a, {f: 500, f2: 950, d: .09, tipo: 'sine', vol: .13}),
};

export function sonar(nombre, jugador = 0) {
  if (mudo || !SONIDOS[nombre]) return;
  const a = audio();
  if (!a) return;
  try { SONIDOS[nombre](a, ((jugador % 4) + 4) % 4); } catch {}
}
export const estaMudo = () => mudo;
export function alternarMudo() {
  mudo = !mudo;
  try { localStorage.setItem(CLAVE, mudo ? '1' : '0'); } catch {}
  if (!mudo) sonar('tap');
  return mudo;
}
// Conecta todos los botones .b-sonido de la página (pueden ser varios)
export function botonesSonido() {
  const pintar = () => document.querySelectorAll('.b-sonido').forEach(b => {
    b.textContent = mudo ? '🔇' : '🔊';
    b.setAttribute('aria-label', mudo ? 'Activar sonido' : 'Silenciar');
  });
  document.querySelectorAll('.b-sonido').forEach(b => { b.onclick = () => { alternarMudo(); pintar(); }; });
  pintar();
}

// Reinicia una animación CSS aunque la clase ya estuviera puesta
export function animar(el, clase = 'pop') {
  if (!el) return;
  el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase);
}

// Para tableros SVG que se redibujan enteros: marcar(clave) cuando aparece algo nuevo y
// envolver(clave, svg) en cada dibujo. La animación sigue donde iba aunque se rearme el SVG.
export function animaciones(dur = 450) {
  const desde = new Map();
  return {
    marcar(clave) { desde.set(clave, performance.now()); },
    envolver(clave, contenido, clase = 'svg-pop') {
      const t = desde.get(clave);
      if (t == null) return contenido;
      const pasado = performance.now() - t;
      if (pasado > dur) { desde.delete(clave); return contenido; }
      return `<g class="${clase}" style="animation-delay:-${Math.round(pasado)}ms">${contenido}</g>`;
    },
  };
}

export function confeti(colores) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'confeti';
  document.body.append(cv);
  const dpr = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const ps = Array.from({length: 150}, () => ({
    x: W / 2 + (Math.random() - .5) * W * .4, y: H * .4,
    vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 5,
    r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
    w: 7 + Math.random() * 6, h: 9 + Math.random() * 8,
    c: colores[Math.floor(Math.random() * colores.length)],
  }));
  let antes = performance.now();
  requestAnimationFrame(function cuadro(ahora) {
    const dt = Math.min(32, ahora - antes) / 16; antes = ahora;
    g.clearRect(0, 0, W, H);
    let vivos = 0;
    for (const p of ps) {
      p.vy += .38 * dt; p.vx *= .99; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.y > H + 30) continue;
      vivos++;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r);
      g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.cos(p.r * 2));
      g.restore();
    }
    if (vivos) requestAnimationFrame(cuadro); else cv.remove();
  });
}
