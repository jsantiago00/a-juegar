# Minijuegos

Juegos de mesa por turnos, local u online (Firebase Realtime Database + GitHub Pages).

## Estructura
```
index.html            portada: crear partida (elegís juego) y unirte con código
icono.svg             ícono (+ icono-180/192/512.png y manifest.webmanifest)
sw.js                 service worker: hace que se pueda instalar como app (PWA) y abrir sin conexión
capturas/             imagen de muestra de cada juego (<id>.webp) para las tarjetas
shared/
  firebase.js         config de Firebase (una sola para todos)
  salas.js            motor: menú, salas, turnos, invitar, revancha, sonidos y festejo
  efectos.js          sonidos sintetizados (Web Audio), confeti y animaciones
  iconos.js           ícono SVG de cada juego
  lienzo.js           lienzo de dibujo con herramientas y trazos sincronizados (Pinturillo, Dibujamiento)
  chat.js             chat de sala (está en todos los juegos online; un juego lo apaga con `export const chat = false`)
  estilo.css          estilos comunes
  juegos.js           lista de juegos de la portada
al-centro/            un juego = index.html + reglas.js + juego.js
juegardium/           puntos y cajas (2 a 4)
tateti-cuadrado/      Ta-te-ti² (2)
lameloide/            Hex (2)
acorazado/            Hundiste mi acorazado: batalla naval (2, solo online)
ahorcado/             Ahorcado de a dos: cada uno elige la palabra del otro (2, solo online)
quien-soy/            ¿Quién soy? + editor de mazos (mazos.html) (mazos incluidos con fotos de Wikimedia Commons en quien-soy/fotos/ y sus créditos en quien-soy/creditos.html)
minigolf/             Minigolf (2 a 4): física determinística en reglas.js, 9 canchas
truco/                Truco argentino sin flor, de 2, 4 o 6 en equipos alternados, con punta y hacha a 6 (solo online)
tutti-frutti/         Tutti Frutti / Basta, con votación de respuestas (2 a 6, solo online)
pinturillo/           Uno dibuja y los demás adivinan (2 a 6, solo online; los trazos van en la sala, en extra/trazos)
dibujamiento/         Teléfono descompuesto con dibujos + la película del final (2 a 6, solo online; dibujos en extra/dib)
ta-te-ti/             juego mínimo, sirve de plantilla
```

## Agregar un juego
1. Copiá la carpeta `ta-te-ti/` con otro nombre (ej. `conecta-4/`).
2. En `reglas.js`: cambiá `info.id` (igual a la carpeta), nombre, jugadores y reglas;
   escribí `nuevoJuego`, `normalizar` y `aplicar`.
3. En `juego.js`: armá el tablero en `iniciar` y actualizalo en `dibujar`.
4. Sumá una entrada en `shared/juegos.js` (con su `color` y su `resumen`: las reglas "rapidito" en 2 o 3 pasos),
   una foto del tablero en `capturas/<id>.webp` y, si querés, su ícono en `shared/iconos.js`.
5. (Opcional) En `juego.js` exportá `sonido(antes, despues, ctx)` para elegir qué suena en cada jugada
   (`'colocar'`, `'mover'`, `'linea'`, `'punto'`, `'muro'`, `'carta'`…; ver `shared/efectos.js`).

El estado siempre lleva `n`, `turno`, `ganador` (-1 en juego, -2 empate) y `ultima`.
Quién empieza se sortea: el motor llama `nuevoJuego(n, opciones, quien)` y después pone `turno = empieza = quien`
(los juegos sin turnos, como Ahorcado o Tutti Frutti, ponen `info.sinTurnos: true` y no se sortea).
Lo que no conviene meter en el estado (ej. los trazos de Pinturillo) va en `juegos/<id>/salas/<código>/extra`
con `ctx.guardarExtra`, `ctx.sumarExtra` y `ctx.cambiarExtra`; `ctx.ahora()` da la hora del servidor.
Lo online sale solo: cada juego guarda sus salas en `juegos/<id>/salas/<código>`.
Si el juego tiene chat, los mensajes van en `juegos/<id>/salas/<código>/chat` (se guardan los últimos ~80).
Con 🎮 Otro juego, la sala se muda a otro juego con el mismo código, los mismos jugadores y el chat
(se crea la sala nueva y la vieja queda con `siguiente`, que redirige a todos).
Los códigos son únicos entre todos los juegos: desde la portada (o desde cualquier juego) ponés el código
y te lleva solo al juego correcto. El link de invitación (`<juego>/?sala=ABCD`) te mete directo a la sala.

## Reglas sugeridas de Firebase
```json
{
  "rules": {
    "juegos": { "$juego": { "salas": { "$sala": { ".read": true, ".write": true } } } },
    "mazos": { ".read": true, ".write": true }
  }
}
```

## Probar en la compu
Usa módulos de JS, así que no anda abriendo el archivo directo: levantá un servidor,
por ejemplo `npx serve .` o `python -m http.server`.

## Mazos de ¿Quién soy?
Se arman desde `quien-soy/mazos.html` y se guardan en Firebase (`mazos/indice` y `mazos/cartas`),
no en el repo. Cada foto se recorta cuadrada y se achica a 240px (~15 KB).
