// =====================================================================
//  Dos verdades y una mentira: cada uno escribe tres cosas sobre sí mismo (una es mentira).
//  Después, de a uno, los demás votan cuál es la mentira.
//  Puntos: +1 si descubrís la mentira; el autor gana +1 por cada uno que engañó.
//  Fases: 'escribir' (todos a la vez) -> 'votar' (las frases de e.autor) -> 'ver' -> 'votar' (el siguiente)…
// =====================================================================
export const MAX_FRASE = 90;

export const info = {
  id: 'dos-verdades',          // = nombre de la carpeta
  nombre: 'Dos verdades y una mentira',
  desc: 'Contá tres cosas de vos: ¿descubren cuál es mentira?',
  min: 3, max: 8,
  soloOnline: true,            // cada uno escribe y vota en su pantalla
  sinTurnos: true,             // escriben todos a la vez
  reglas: [
    'Cada uno escribe tres cosas sobre sí mismo: dos verdaderas y una mentira (que suene creíble).',
    'Las frases se mezclan y, de a uno, se muestran las de cada jugador. Los demás votan cuál creen que es la mentira.',
    'Sumás 1 punto por cada mentira que descubrís, y 1 punto por cada persona que se creyó tu mentira.',
    'Cuando pasaron todos, gana quien tiene más puntos.',
  ],
};

const mezclar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function nuevoJuego(n) {
  return {n, fase: 'escribir', frases: Array.from({length: n}, () => ['', '', '']), mentira: Array(n).fill(-1),
          autor: 0, votos: Array(n).fill(-1), puntos: Array(n).fill(0), turno: -1, ganador: -1, ultima: ''};
}
export function normalizar(e) {
  const de = (x, f) => Array.from({length: e.n}, (_, i) => f((x || {})[i]));
  e.frases = de(e.frases, f => [0, 1, 2].map(k => String((f || {})[k] || '')));
  e.mentira = de(e.mentira, x => (x == null ? -1 : +x));
  e.votos = de(e.votos, x => (x == null ? -1 : +x));
  e.puntos = de(e.puntos, x => +x || 0);
  e.autor = +e.autor || 0;
  e.turno = e.turno == null ? -1 : +e.turno;
  e.ultima = e.ultima || '';
  return e;
}
export const escribio = (e, i) => e.mentira[i] >= 0;
export const votantes = e => Array.from({length: e.n}, (_, i) => i).filter(i => i !== e.autor);
export function detalle(e, i) {
  const pts = `${e.puntos[i]} pts`;
  if (e.fase === 'escribir') return escribio(e, i) ? '✔ listo' : '✍️';
  if (e.fase === 'votar' && i !== e.autor) return `${pts}${e.votos[i] >= 0 ? ' · ✔' : ''}`;
  return pts;
}
// Los que tienen más puntos (puede haber empate)
export const ganadores = e => {
  if (e.ganador === -1) return [];
  const max = Math.max(...e.puntos);
  return e.puntos.map((x, i) => (x === max ? i : -1)).filter(i => i >= 0);
};

function contar(e, nombre) {
  const m = e.mentira[e.autor];
  let engano = 0;
  for (const q of votantes(e)) {
    if (e.votos[q] === m) e.puntos[q]++;
    else { e.puntos[e.autor]++; engano++; }
  }
  e.fase = 'ver';
  e.ultima = engano ? `${nombre(e.autor)} engañó a ${engano} ${engano === 1 ? 'persona' : 'personas'}` : `¡Todos descubrieron la mentira de ${nombre(e.autor)}!`;
  if (e.autor === e.n - 1) {                       // pasaron todos: termina
    const g = ganadores({...e, ganador: 0});
    e.ganador = g[0];
    e.turno = -1;
  }
}

// Todo es a la vez: {tipo:'escribir', f:[verdad, verdad, mentira]}  {tipo:'votar', k}  {tipo:'seguir'}
export function libre(e, j, yo, nombre = i => 'Jugador ' + (i + 1)) {
  switch (j.tipo) {
    case 'escribir': {
      const f = (Array.isArray(j.f) ? j.f : []).map(x => String(x || '').trim().slice(0, MAX_FRASE));
      if (e.fase !== 'escribir' || escribio(e, yo) || f.length !== 3 || f.some(x => x.length < 3)) return null;
      const orden = mezclar([0, 1, 2]);              // la mentira (la tercera) queda en un lugar al azar
      e.frases[yo] = orden.map(k => f[k]);
      e.mentira[yo] = orden.indexOf(2);
      e.ultima = `${nombre(yo)} ya escribió`;
      if (e.mentira.every(x => x >= 0)) {
        e.fase = 'votar'; e.autor = 0; e.turno = 0; e.votos = Array(e.n).fill(-1);
        e.ultima = `¡Arrancamos! Primero, las de ${nombre(0)}`;
      }
      return e;
    }
    case 'votar': {
      const k = +j.k;
      if (e.fase !== 'votar' || yo === e.autor || !(k >= 0 && k <= 2)) return null;
      e.votos[yo] = k;
      if (votantes(e).every(q => e.votos[q] >= 0)) contar(e, nombre);
      return e;
    }
    case 'seguir': {
      if (e.fase !== 'ver' || e.ganador !== -1) return null;
      e.autor++; e.turno = e.autor; e.votos = Array(e.n).fill(-1); e.fase = 'votar';
      e.ultima = `Ahora, las de ${nombre(e.autor)}`;
      return e;
    }
  }
  return null;
}
// No hay jugadas por turno
export const aplicar = () => null;
