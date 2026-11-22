// Generador de códigos QR (modelo 2, modo byte, corrección de errores nivel M, versiones 1 a 10).
// Escrito a mano para no cargar librerías externas (la política de seguridad solo permite scripts propios).
// Referencia: ISO/IEC 18004. Alcanza para URLs de hasta 213 bytes.

// Por versión: [codewords totales, codewords de corrección por bloque, [[bloques, datos por bloque], ...]]
const VERSIONES_M = [
  null,
  [26, 10, [[1, 16]]],
  [44, 16, [[1, 28]]],
  [70, 26, [[1, 44]]],
  [100, 18, [[2, 32]]],
  [134, 24, [[2, 43]]],
  [172, 16, [[4, 27]]],
  [196, 18, [[4, 31]]],
  [242, 22, [[2, 38], [2, 39]]],
  [292, 22, [[3, 36], [2, 37]]],
  [346, 26, [[4, 43], [1, 44]]],
];
const ALINEACION = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

// --- Aritmética en GF(256) con el polinomio 0x11D ---
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function generador(grado) {
  let g = [1];
  for (let i = 0; i < grado; i++) {
    const siguiente = new Array(g.length + 1).fill(0);
    g.forEach((c, j) => { siguiente[j] ^= c; siguiente[j + 1] ^= mul(c, EXP[i]); });
    g = siguiente;
  }
  return g;
}

function reedSolomon(datos, grado) {
  const g = generador(grado);
  const resto = [...datos, ...new Array(grado).fill(0)];
  for (let i = 0; i < datos.length; i++) {
    const factor = resto[i];
    if (factor) for (let j = 0; j < g.length; j++) resto[i + j] ^= mul(g[j], factor);
  }
  return resto.slice(datos.length);
}

const datosDe = (v) => VERSIONES_M[v][2].reduce((n, [bloques, d]) => n + bloques * d, 0);

// --- Codificación de los datos ---
function codewords(bytes, version) {
  const capacidad = datosDe(version);
  const bits = [];
  const poner = (valor, largo) => { for (let i = largo - 1; i >= 0; i--) bits.push((valor >>> i) & 1); };
  poner(0b0100, 4); // modo byte
  poner(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((b) => poner(b, 8));
  poner(0, Math.min(4, capacidad * 8 - bits.length)); // terminador
  while (bits.length % 8) bits.push(0);
  const datos = [];
  for (let i = 0; i < bits.length; i += 8) datos.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let relleno = 0; datos.length < capacidad; relleno++) datos.push(relleno % 2 ? 0x11 : 0xec);

  // División en bloques, corrección por bloque y entrelazado
  const [, grado, grupos] = VERSIONES_M[version];
  const bloques = [];
  let pos = 0;
  grupos.forEach(([cantidad, tam]) => {
    for (let i = 0; i < cantidad; i++) {
      const d = datos.slice(pos, pos + tam);
      pos += tam;
      bloques.push({ d, ec: reedSolomon(d, grado) });
    }
  });
  const salida = [];
  const maxDatos = Math.max(...bloques.map((b) => b.d.length));
  for (let i = 0; i < maxDatos; i++) bloques.forEach((b) => { if (i < b.d.length) salida.push(b.d[i]); });
  for (let i = 0; i < grado; i++) bloques.forEach((b) => salida.push(b.ec[i]));
  return salida;
}

// --- Matriz ---
function bitsFormato(mascara) {
  const datos = (0b00 << 3) | mascara; // nivel M = 00
  let resto = datos;
  for (let i = 0; i < 10; i++) resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
  return ((datos << 10) | resto) ^ 0x5412;
}

function bitsVersion(version) {
  let resto = version;
  for (let i = 0; i < 12; i++) resto = (resto << 1) ^ ((resto >>> 11) * 0x1f25);
  return (version << 12) | resto;
}

const MASCARAS = [
  (f, c) => (f + c) % 2 === 0,
  (f) => f % 2 === 0,
  (f, c) => c % 3 === 0,
  (f, c) => (f + c) % 3 === 0,
  (f, c) => (Math.floor(f / 2) + Math.floor(c / 3)) % 2 === 0,
  (f, c) => ((f * c) % 2) + ((f * c) % 3) === 0,
  (f, c) => (((f * c) % 2) + ((f * c) % 3)) % 2 === 0,
  (f, c) => (((f + c) % 2) + ((f * c) % 3)) % 2 === 0,
];

function construir(version, datos, mascara) {
  const n = 17 + version * 4;
  const m = Array.from({ length: n }, () => new Array(n).fill(null)); // null = libre
  const fijo = Array.from({ length: n }, () => new Array(n).fill(false));
  const poner = (f, c, v) => { m[f][c] = v; fijo[f][c] = true; };

  // Patrones de posición con su separador
  [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([f0, c0]) => {
    for (let f = -1; f <= 7; f++) for (let c = -1; c <= 7; c++) {
      const ff = f0 + f, cc = c0 + c;
      if (ff < 0 || cc < 0 || ff >= n || cc >= n) continue;
      const borde = f === 0 || f === 6 || c === 0 || c === 6;
      const centro = f >= 2 && f <= 4 && c >= 2 && c <= 4;
      poner(ff, cc, f >= 0 && f <= 6 && c >= 0 && c <= 6 && (borde || centro));
    }
  });
  // Patrones de alineación
  const pos = ALINEACION[version];
  pos.forEach((f) => pos.forEach((c) => {
    if (fijo[f][c]) return; // se cruza con un patrón de posición
    for (let df = -2; df <= 2; df++) for (let dc = -2; dc <= 2; dc++) {
      poner(f + df, c + dc, Math.max(Math.abs(df), Math.abs(dc)) !== 1);
    }
  }));
  // Líneas de sincronización
  for (let i = 8; i < n - 8; i++) {
    if (!fijo[6][i]) poner(6, i, i % 2 === 0);
    if (!fijo[i][6]) poner(i, 6, i % 2 === 0);
  }
  // Reserva de información de formato y versión (se escribe al final)
  for (let i = 0; i < 9; i++) { if (!fijo[8][i]) poner(8, i, false); if (!fijo[i][8]) poner(i, 8, false); }
  for (let i = 0; i < 8; i++) poner(8, n - 1 - i, false);
  for (let i = 0; i < 7; i++) poner(n - 1 - i, 8, false);
  poner(n - 8, 8, true); // módulo oscuro
  if (version >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { poner(i, n - 11 + j, false); poner(n - 11 + j, i, false); }

  // Datos en zigzag, de abajo hacia arriba y de derecha a izquierda, en pares de columnas
  const bits = [];
  datos.forEach((b) => { for (let i = 7; i >= 0; i--) bits.push((b >>> i) & 1); });
  let k = 0;
  for (let c = n - 1, subiendo = true; c > 0; c -= 2, subiendo = !subiendo) {
    if (c === 6) c = 5; // la columna de sincronización no cuenta
    for (let i = 0; i < n; i++) {
      const f = subiendo ? n - 1 - i : i;
      for (const cc of [c, c - 1]) {
        if (fijo[f][cc]) continue;
        const bit = k < bits.length ? bits[k++] === 1 : false;
        m[f][cc] = MASCARAS[mascara](f, cc) ? !bit : bit;
      }
    }
  }

  // Información de formato (dos copias)
  const formato = bitsFormato(mascara);
  const bit = (valor, i) => ((valor >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) m[i][8] = bit(formato, i);
  m[7][8] = bit(formato, 6);
  m[8][8] = bit(formato, 7);
  m[8][7] = bit(formato, 8);
  for (let i = 9; i < 15; i++) m[8][14 - i] = bit(formato, i);
  for (let i = 0; i < 8; i++) m[8][n - 1 - i] = bit(formato, i);
  for (let i = 8; i < 15; i++) m[n - 15 + i][8] = bit(formato, i);
  // Información de versión (desde la versión 7), dos bloques de 6×3
  if (version >= 7) {
    const info = bitsVersion(version);
    for (let i = 0; i < 18; i++) {
      const a = Math.floor(i / 3), b = n - 11 + (i % 3);
      m[a][b] = bit(info, i);
      m[b][a] = bit(info, i);
    }
  }
  return m;
}

// Penalización estándar para elegir la máscara más legible
function penalizacion(m) {
  const n = m.length;
  let p = 0;
  const lineas = (obtener) => {
    for (let i = 0; i < n; i++) {
      let racha = 1;
      for (let j = 1; j < n; j++) {
        if (obtener(i, j) === obtener(i, j - 1)) {
          racha++;
          if (racha === 5) p += 3; else if (racha > 5) p += 1;
        } else racha = 1;
      }
    }
  };
  lineas((i, j) => m[i][j]);
  lineas((i, j) => m[j][i]);
  for (let f = 0; f < n - 1; f++) for (let c = 0; c < n - 1; c++) {
    const v = m[f][c];
    if (v === m[f][c + 1] && v === m[f + 1][c] && v === m[f + 1][c + 1]) p += 3;
  }
  const patron = [true, false, true, true, true, false, true, false, false, false, false];
  const inverso = [...patron].reverse();
  for (let f = 0; f < n; f++) for (let c = 0; c <= n - 11; c++) {
    for (const pat of [patron, inverso]) {
      if (pat.every((v, k) => m[f][c + k] === v)) p += 40;
      if (pat.every((v, k) => m[c + k][f] === v)) p += 40;
    }
  }
  const oscuros = m.reduce((s, fila) => s + fila.filter(Boolean).length, 0);
  p += Math.floor(Math.abs((oscuros * 100) / (n * n) - 50) / 5) * 10;
  return p;
}

/** Matriz de booleanos (true = módulo oscuro) para el texto dado. `mascara` fuerza una (para pruebas). */
export function matrizQR(texto, { mascara: forzada } = {}) {
  const bytes = [...new TextEncoder().encode(texto)];
  let version = 1;
  while (version <= 10 && datosDe(version) < bytes.length + (version < 10 ? 2 : 3)) version++;
  if (version > 10) throw new Error("Texto demasiado largo para el código QR");
  const datos = codewords(bytes, version);
  let mejor = null;
  for (let mascara = 0; mascara < 8; mascara++) {
    if (forzada !== undefined && mascara !== forzada) continue;
    const m = construir(version, datos, mascara);
    const p = penalizacion(m);
    if (!mejor || p < mejor.p) mejor = { m, p };
  }
  return mejor.m;
}

/** SVG del código QR, con el margen blanco de 4 módulos que exige el estándar. */
export function svgQR(texto, { tam = 120, titulo = texto } = {}) {
  const m = matrizQR(texto);
  const n = m.length, borde = 4, total = n + borde * 2;
  let d = "";
  m.forEach((fila, f) => fila.forEach((v, c) => { if (v) d += `M${c + borde} ${f + borde}h1v1h-1z`; }));
  const NS = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(NS, "svg");
  el.setAttribute("viewBox", `0 0 ${total} ${total}`);
  el.setAttribute("width", tam);
  el.setAttribute("height", tam);
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", titulo);
  el.setAttribute("shape-rendering", "crispEdges");
  const fondo = document.createElementNS(NS, "rect");
  fondo.setAttribute("width", total);
  fondo.setAttribute("height", total);
  fondo.setAttribute("fill", "#fff");
  const modulos = document.createElementNS(NS, "path");
  modulos.setAttribute("d", d);
  modulos.setAttribute("fill", "#000");
  el.append(fondo, modulos);
  return el;
}
