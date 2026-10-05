// =====================================================================
//  PLANTILLA: la pantalla del juego.
//  iniciar(ctx): se llama una vez; armá el tablero en ctx.tablero y botones en ctx.controles.
//  dibujar(ctx): se llama cada vez que cambia algo; devolvé un texto de ayuda (opcional).
//  reiniciar():  (opcional) limpiá tu estado de pantalla al empezar/salir.
//
//  sonido(antes, despues, ctx): (opcional) qué sonido hace una jugada; si no está, suena 'colocar'.
//
//  ctx trae: estado, online, miAsiento, puedoJugar(), jugar(jugada) -> Promise<bool>,
//            nombre(i), color(i), aviso(texto), sonar(nombre), animar(el), refrescar(), tablero, controles
// =====================================================================
let grilla;

export function iniciar(ctx) {
  grilla = document.createElement('div');
  grilla.className = 'tateti';
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('button');
    b.dataset.i = i;
    b.onclick = () => ctx.jugar({celda: i});
    grilla.append(b);
  }
  ctx.tablero.append(grilla);
}

export function dibujar(ctx) {
  const e = ctx.estado, puedo = ctx.puedoJugar();
  grilla.querySelectorAll('button').forEach(b => {
    const v = e.celdas[+b.dataset.i];
    if (b.dataset.v !== String(v)) { b.dataset.v = v; if (v !== -1) ctx.animar(b); }
    b.textContent = v === -1 ? '' : (v === 0 ? 'X' : 'O');
    b.style.color = v === -1 ? '' : ctx.color(v);
    b.disabled = !puedo || v !== -1;
  });
  return puedo ? 'Tocá una casilla libre' : '';
}
