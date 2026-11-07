# Minijuegos

Juegos de mesa por turnos, local u online (Firebase Realtime Database + GitHub Pages).

## Estructura
```
index.html            portada: grilla de juegos (con filtro por cantidad); tocás uno y armás la partida; Unirme y perfil arriba
icono.svg             ícono (+ icono-180/192/512.png y manifest.webmanifest)
sw.js                 service worker: hace que se pueda instalar como app (PWA) y abrir sin conexión
capturas/             imagen de muestra de cada juego (<id>.webp) para las tarjetas
shared/
  firebase.js         config de Firebase (una sola para todos)
  salas.js            motor: menú, salas, turnos, invitar, revancha, sonidos y festejo
  efectos.js          sonidos sintetizados (Web Audio), confeti y animaciones
  iconos.js           ícono SVG de cada juego
  lienzo.js           lienzo de dibujo con herramientas y trazos sincronizados (Pinturillo, Dibujamiento)
  cuenta.js           cuentas con nick + contraseña (Firebase Auth) y victorias sincronizadas
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
espia/                Espía: la mayoría con la misma palabra, impostores con una parecida y espías sin palabra (más cuantos más juegan); pistas y votación (3 a 8, solo online)
criptico/             Críptico: cada uno escribe palabra + críptico y los demás tienen 3 intentos para adivinarla (2 a 6, solo online)
codigo-secreto/       Código secreto: cada uno esconde 4 números (0-9) o 4 colores (6) y descifra el del otro por turnos con pistas de bien/errados (2, solo online)
alto-bajo/            Más alto o más bajo: cada uno esconde un número (hasta 100, 1.000, 10.000 o 1.000.000) y busca el del otro por turnos (2, solo online)
cuatro-en-linea/      Cuatro en línea (2): tablero de 7×6, las fichas caen
mancala/              Mancala (Kalah, 2): 6 hoyos y un granero por lado; volver a jugar y robar las de enfrente
duelo-de-palabras/    Duelo de palabras: cada uno esconde una palabra de 4, 5 o 6 letras y adivina la del otro por turnos (2, solo online)
dados-mentirosos/     Dados mentirosos (Dudo): apuestas sobre los dados de toda la mesa y ¡Dudo!; comodines opcionales (2 a 6, solo online)
ordenados/            Ordenados: número secreto del 1 al 100, una pista por tema y entre todos las ordenan (3 a 8, cooperativo, solo online)
dos-verdades/         Dos verdades y una mentira: cada uno escribe tres frases y los demás votan la mentira (3 a 8, solo online)
quien-es-mas/         ¿Quién es más probable?: frase, voto secreto, punto si votaste al más votado (3 a 8, solo online)
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
Con 🔄 Cambiar juego o jugadores, la sala se muda a otro juego con el mismo código, los mismos jugadores y el chat
(se crea la sala nueva y la vieja queda con `siguiente`, que redirige a todos). Ahí también se elige cuántos juegan:
si se achica, quien creó la sala (`dueno`, 👑) elige quiénes siguen (los demás quedan en `siguiente.fuera` y vuelven al menú).
Eligiendo el mismo juego, se cambia la cantidad en la misma sala. Quien creó la sala también puede sacar a alguien
con la ✕ de su nombre: deja el lugar libre o sigue con uno menos (partida nueva).
Reloj por turno: un juego con `info.reloj: 60` muestra el selector (sin reloj, 30 s, 1 o 2 min) y el motor lleva la cuenta
(`opciones.reloj` y `limite` en el estado). Si se acaba, llama `reglas.sinTiempo(estado, nombre)`;
`reglas.conReloj(estado)` dice en qué momentos corre. Lo tienen ¿Quién soy?, Minigolf, Truco y Espía.
`reglas.quienReloj(estado)` dice de quién es el reloj (si no, del que tiene el turno; -1 = de todos, como mientras
cada uno esconde su código en Código secreto y Más alto o más bajo). Si cambia, el reloj vuelve a arrancar.
Las salas que pasan 24 h sin actividad se borran solas: cada sala anota su última actividad en
`actividad/<juego>/<código>` y la portada (o crear una sala) limpia las viejas, una vez por hora como mucho.
Los códigos son únicos entre todos los juegos: desde la portada (o desde cualquier juego) ponés el código
y te lleva solo al juego correcto. El link de invitación (`<juego>/?sala=ABCD`) te mete directo a la sala.

## Victorias
- **Marcador de la sala**: cada partida tiene un id (`estado.pid`). Cuando termina, se anota en
  `juegos/<id>/salas/<código>/marcador/<pid>` = `{<id del jugador>: 1}` con los ganadores (los empates no cuentan).
  Se ve como 🏆 en cada nombre y en el cartel de fin ("Van: Ana 3 · Juan 1"); sigue con la revancha y al cambiar de juego.
  En modo local se cuenta en el dispositivo mientras dure la partida.
- **Cuentas** (`shared/cuenta.js`): nick + contraseña desde la portada. Por dentro es Firebase Authentication con
  Correo/contraseña (el nick se vuelve `nick@<authDomain>`), así que hay que activarlo una vez en la consola:
  *Authentication → Sign-in method → Correo electrónico/contraseña*. Las victorias y partidas online van a
  `usuarios/<uid>` (`g`, `j` y `juegos/<id>/{g, j}`); cada uno anota las suyas.
  También el historial contra cada rival en `rivales/<clave>` = `{nick, g: le ganaste, p: te ganó, j: partidas juntos}`:
  la clave es el uid del rival si tiene cuenta (cada asiento guarda `uid` y `nick` si esa persona tenía la sesión abierta)
  o `n_<nombre>` si no. En equipos, el compañero suma partida pero no victoria ni derrota. No hay recuperación de contraseña.

## Reglas sugeridas de Firebase
```json
{
  "rules": {
    "juegos": { "$juego": { "salas": { "$sala": { ".read": true, ".write": true } } } },
    "actividad": { ".read": true, "$juego": { "$sala": { ".write": true, ".validate": "newData.isNumber()" } } },
    "mazos": { ".read": true, ".write": true },
    "usuarios": { ".read": true, "$uid": { ".write": "auth != null && auth.uid === $uid" } }
  }
}
```

## Probar en la compu
Usa módulos de JS, así que no anda abriendo el archivo directo: levantá un servidor,
por ejemplo `npx serve .` o `python -m http.server`.

## Mazos de ¿Quién soy?
Se arman desde `quien-soy/mazos.html` y se guardan en Firebase (`mazos/indice` y `mazos/cartas`),
no en el repo. Cada foto se recorta cuadrada y se achica a 240px (~15 KB).
