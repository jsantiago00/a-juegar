# Minijuegos

Juegos de mesa por turnos, local u online (Firebase Realtime Database + GitHub Pages).

## Estructura
```
index.html            portada: crear partida (elegís juego) y unirte con código
icono.svg             ícono (+ icono-180/512.png y manifest.webmanifest)
shared/
  firebase.js         config de Firebase (una sola para todos)
  salas.js            motor: menú, salas, turnos, invitar, revancha, sonidos y festejo
  efectos.js          sonidos sintetizados (Web Audio), confeti y animaciones
  iconos.js           ícono SVG de cada juego
  estilo.css          estilos comunes
  juegos.js           lista de juegos de la portada
al-centro/            un juego = index.html + reglas.js + juego.js
juegardium/           puntos y cajas (2 a 4)
tateti-cuadrado/      Ta-te-ti² (2)
lameloide/            Hex (2)
quien-soy/            ¿Quién soy? + editor de mazos (mazos.html)
ta-te-ti/             juego mínimo, sirve de plantilla
```

## Agregar un juego
1. Copiá la carpeta `ta-te-ti/` con otro nombre (ej. `conecta-4/`).
2. En `reglas.js`: cambiá `info.id` (igual a la carpeta), nombre, jugadores y reglas;
   escribí `nuevoJuego`, `normalizar` y `aplicar`.
3. En `juego.js`: armá el tablero en `iniciar` y actualizalo en `dibujar`.
4. Sumá una línea en `shared/juegos.js` (con su `color`) y, si querés, su ícono en `shared/iconos.js`.
5. (Opcional) En `juego.js` exportá `sonido(antes, despues, ctx)` para elegir qué suena en cada jugada
   (`'colocar'`, `'mover'`, `'linea'`, `'punto'`, `'muro'`, `'carta'`…; ver `shared/efectos.js`).

El estado siempre lleva `n`, `turno`, `ganador` (-1 en juego, -2 empate) y `ultima`.
Lo online sale solo: cada juego guarda sus salas en `juegos/<id>/salas/<código>`.
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
