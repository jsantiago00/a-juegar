// =====================================================================
//  LIENZO DE DIBUJO compartido (Pinturillo, Dibujamiento).
//  Los trazos se mandan en pedacitos (cada ~120 ms) a extra/<ruta()>/<clave> con ctx.sumarExtra:
//  {s: id del trazo, c: color, w: grosor, p: "x,y,x,y…"} en un lienzo lógico de 400×300.
//
//  const lz = crearLienzo(contenedor, {ctx, ruta: () => 'trazos/abc', puedeDibujar: () => bool, herramientas: true})
//   lz.mostrar(datos)   sincroniza con los pedazos que hay ({clave: pedazo}): dibuja los nuevos y rehace si se borró algo
//   lz.reset()          lienzo en blanco (dibujo nuevo)
//   lz.verHerramientas(bool), lz.mandar() (manda lo pendiente), lz.pelicula(datos, ms) -> Promise (repite el dibujo)
//   lz.capa: un div encima del lienzo para carteles
// =====================================================================
export const W = 400, H = 300;
export const COLORES = ['#1d1449', '#ffffff', '#9a9a9a', '#e8505b', '#ff8c42', '#f4c430', '#5cc480', '#3fa7e0', '#b07cff', '#ff9ecb', '#8a5a2b'];
export const GROSORES = [3, 7, 14, 28];
const puntos = p => String(p || '').split(',').map(Number).filter(x => isFinite(x));

export function crearLienzo(contenedor, {ctx, ruta = () => '', puedeDibujar = () => false, herramientas = false}) {
  contenedor.insertAdjacentHTML('beforeend', `
    <div class="lz"><canvas aria-label="Dibujo"></canvas><div class="lz-capa" hidden></div></div>
    ${herramientas ? `<div class="lz-herr" hidden>
      <div class="lz-colores">${COLORES.map((col, i) => `<button data-col="${i}" style="--c:${col}" aria-label="${i === 1 ? 'Goma' : 'Color'}">${i === 1 ? '🧽' : ''}</button>`).join('')}</div>
      <div class="lz-grosores">${GROSORES.map((w, i) => `<button data-w="${i}" aria-label="Grosor ${w}"><span style="--w:${Math.max(4, w * .7)}px"></span></button>`).join('')}
        <button data-a="deshacer" aria-label="Deshacer">↶</button><button data-a="borrar" aria-label="Borrar todo">🗑️</button></div>
    </div>` : ''}`);
  const raiz = contenedor.querySelectorAll('.lz')[contenedor.querySelectorAll('.lz').length - 1];
  const cv = raiz.querySelector('canvas'), g = cv.getContext('2d'), capa = raiz.querySelector('.lz-capa');
  const herr = herramientas ? raiz.nextElementSibling : null;
  let vistos = new Map(), propios = new Set(), trazo = null, flushT = 0, peli = 0;
  const pincel = {c: 0, w: 1};

  function medir() {
    const dpr = devicePixelRatio || 1, ancho = cv.clientWidth;
    if (!ancho) return;
    cv.width = Math.round(ancho * dpr); cv.height = Math.round(ancho * H / W * dpr);
    g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    repintar();
  }
  function linea(c, w, pts) {
    g.strokeStyle = g.fillStyle = COLORES[c] || COLORES[0];
    g.lineWidth = GROSORES[w] || 7; g.lineCap = g.lineJoin = 'round';
    if (pts.length === 2) { g.beginPath(); g.arc(pts[0], pts[1], g.lineWidth / 2, 0, Math.PI * 2); g.fill(); return; }
    g.beginPath(); g.moveTo(pts[0], pts[1]);
    for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]);
    g.stroke();
  }
  const pedazo = t => { const pts = puntos(t.p); if (pts.length >= 2) linea(+t.c, +t.w, pts); };
  const blanco = () => { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); };
  function repintar() {
    if (peli) return;
    blanco();
    [...vistos.keys()].sort().forEach(k => pedazo(vistos.get(k)));
    if (trazo && trazo.todo.length) linea(trazo.c, trazo.w, trazo.todo);
  }

  // ---------- Dibujar ----------
  const punto = ev => { const b = cv.getBoundingClientRect(); return [Math.round((ev.clientX - b.left) / b.width * W), Math.round((ev.clientY - b.top) / b.height * H)]; };
  cv.addEventListener('pointerdown', ev => {
    if (!puedeDibujar() || peli) return;
    cv.setPointerCapture(ev.pointerId);
    const [x, y] = punto(ev);
    trazo = {s: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), c: pincel.c, w: pincel.w, pend: [x, y], todo: [x, y]};
    linea(trazo.c, trazo.w, [x, y]);
    clearInterval(flushT);
    flushT = setInterval(mandar, 120);
  });
  cv.addEventListener('pointermove', ev => {
    if (!trazo) return;
    const [x, y] = punto(ev), n = trazo.todo.length;
    if (x === trazo.todo[n - 2] && y === trazo.todo[n - 1]) return;
    linea(trazo.c, trazo.w, [trazo.todo[n - 2], trazo.todo[n - 1], x, y]);
    trazo.todo.push(x, y); trazo.pend.push(x, y);
  });
  const soltar = () => { if (!trazo) return; clearInterval(flushT); mandar(); trazo = null; };
  cv.addEventListener('pointerup', soltar);
  cv.addEventListener('pointercancel', soltar);

  // Manda lo pendiente del trazo (repitiendo el último punto, para que los pedazos se peguen)
  function mandar() {
    if (!trazo || trazo.pend.length < 2 || !puedeDibujar()) return;
    const t = {s: trazo.s, c: trazo.c, w: trazo.w, p: trazo.pend.join(',')};
    const n = trazo.pend.length;
    trazo.pend = [trazo.pend[n - 2], trazo.pend[n - 1]];
    const ref = ctx.sumarExtra(ruta(), t);
    if (ref && ref.key) { propios.add(ref.key); vistos.set(ref.key, t); }
  }
  function deshacer() {
    const claves = [...vistos.keys()].sort();
    if (!claves.length) return;
    const s = vistos.get(claves[claves.length - 1]).s, borrar = {};
    for (const k of claves) if (vistos.get(k).s === s) { borrar[`${ruta()}/${k}`] = null; vistos.delete(k); }
    ctx.cambiarExtra(borrar);
    repintar();
  }
  function pintarHerr() {
    herr.querySelectorAll('[data-col]').forEach(b => b.classList.toggle('on', +b.dataset.col === pincel.c));
    herr.querySelectorAll('[data-w]').forEach(b => b.classList.toggle('on', +b.dataset.w === pincel.w));
  }
  herr?.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.col) pincel.c = +b.dataset.col;
    if (b.dataset.w) pincel.w = +b.dataset.w;
    if (b.dataset.a === 'deshacer') deshacer();
    if (b.dataset.a === 'borrar') { vistos.clear(); ctx.guardarExtra(ruta(), null); repintar(); }
    ctx.sonar('tick');
    pintarHerr();
  });
  new ResizeObserver(medir).observe(cv);

  return {
    cv, capa,
    mostrar(datos = {}) {
      if (peli) return;
      let rehacer = false;
      for (const k of [...vistos.keys()]) if (!(k in datos) && !propios.has(k)) { vistos.delete(k); rehacer = true; }   // borrados
      for (const k of Object.keys(datos).sort()) {
        if (!vistos.has(k)) { vistos.set(k, datos[k]); if (!rehacer) pedazo(datos[k]); }
        else propios.delete(k);                           // ya llegó el eco de un pedazo propio
      }
      if (rehacer) repintar();
    },
    reset() { peli = 0; vistos = new Map(); propios = new Set(); trazo = null; clearInterval(flushT); repintar(); },
    verHerramientas(v) { if (!herr) return; herr.hidden = !v; if (v) pintarHerr(); cv.classList.toggle('pincel', v); },
    mandar() { if (trazo) { mandar(); } },
    hayDibujo: () => vistos.size > 0,
    // Repite el dibujo pedazo por pedazo en ms milisegundos
    pelicula(datos = {}, ms = 4000) {
      const claves = Object.keys(datos).sort(), id = ++peli;
      vistos = new Map(claves.map(k => [k, datos[k]])); propios = new Set();
      blanco();
      if (!claves.length) { peli = 0; return Promise.resolve(); }
      return new Promise(fin => {
        const t0 = performance.now();
        let i = 0;
        (function cuadro(t) {
          if (peli !== id) return fin();
          const hasta = Math.min(claves.length, Math.ceil((t - t0) / ms * claves.length));
          for (; i < hasta; i++) pedazo(datos[claves[i]]);
          if (i < claves.length) requestAnimationFrame(cuadro); else { peli = 0; fin(); }
        })(t0);
      });
    },
  };
}
