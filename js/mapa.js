// Mapa de rutas de exportación: arcos desde los puertos colombianos hasta cada destino, en SVG y sin librerías.
// El contorno de los continentes es esquemático (pocos puntos): sirve para ubicarse, no para medir distancias.
import { h } from "./ui.js";

const NS = "http://www.w3.org/2000/svg";
const svg = (etiqueta, atributos = {}, ...hijos) => {
  const el = document.createElementNS(NS, etiqueta);
  for (const [k, v] of Object.entries(atributos)) if (v !== null && v !== undefined) el.setAttribute(k, v);
  hijos.forEach((hijo) => hijo != null && el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo))));
  return el;
};

// Puertos de salida en Colombia [latitud, longitud]
export const PUERTOS = {
  Buenaventura: [3.88, -77.03],
  Cartagena: [10.39, -75.51],
  "Santa Marta": [11.24, -74.2],
  Barranquilla: [10.96, -74.8],
};

// Punto de llegada de referencia para cada país destino (puerto o ciudad principal)
export const DESTINOS = {
  Alemania: [53.55, 9.99, "Hamburgo"],
  Bélgica: [51.22, 4.4, "Amberes"],
  "Países Bajos": [51.92, 4.48, "Róterdam"],
  España: [39.47, -0.38, "Valencia"],
  Italia: [44.41, 8.93, "Génova"],
  Francia: [49.49, 0.11, "Le Havre"],
  Japón: [35.68, 139.69, "Tokio"],
  "Estados Unidos": [40.71, -74.0, "Nueva York"],
  Colombia: [6.24, -75.58, "Medellín"],
  "Reino Unido": [51.5, -0.12, "Londres"],
  Suiza: [47.37, 8.54, "Zúrich"],
  Canadá: [43.65, -79.38, "Toronto"],
  "Corea del Sur": [35.1, 129.04, "Busan"],
  China: [31.23, 121.47, "Shanghái"],
  Australia: [-33.87, 151.21, "Sídney"],
};

const CONTINENTES = [
  // Norteamérica y Centroamérica
  [[-168, 65], [-140, 70], [-95, 72], [-80, 63], [-60, 55], [-66, 45], [-75, 35], [-81, 25], [-97, 26], [-97, 18], [-87, 15], [-83, 9], [-78, 8], [-80, 9], [-90, 14], [-105, 20], [-117, 32], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
  // Sudamérica
  [[-78, 8], [-72, 12], [-62, 11], [-52, 5], [-35, -6], [-39, -13], [-48, -26], [-58, -38], [-65, -55], [-74, -50], [-72, -30], [-71, -18], [-81, -6], [-80, 1], [-77, 7]],
  // Europa
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 57], [5, 62], [12, 66], [25, 70], [30, 62], [30, 55], [40, 47], [28, 41], [26, 38], [20, 40], [18, 45], [13, 44], [16, 38], [10, 44], [3, 43], [-1, 37]],
  // Gran Bretaña
  [[-5, 50], [1, 51], [2, 53], [-3, 56], [-5, 58], [-6, 55], [-3, 53]],
  // África
  [[-17, 21], [-10, 30], [-6, 36], [10, 37], [32, 31], [43, 12], [51, 12], [40, -15], [32, -29], [20, -35], [13, -20], [9, -1], [3, 6], [-8, 4], [-17, 14]],
  // Asia
  [[30, 62], [60, 70], [100, 77], [140, 72], [170, 66], [160, 58], [142, 52], [130, 42], [122, 40], [121, 30], [110, 20], [105, 10], [100, 13], [97, 17], [92, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [52, 15], [43, 12], [35, 30], [28, 41], [40, 47], [30, 55]],
  // Japón
  [[130, 31], [135, 34], [140, 35], [141, 38], [142, 41], [141, 45], [139, 41], [136, 36], [132, 34]],
];

const ANCHO = 1000, ALTO = 480;
const ESTIRA = 1.25; // los paralelos se separan un poco más que los meridianos, como en un mapa de Miller

/** Encuadre que contiene todos los puertos y destinos usados, con margen y sin deformar. */
function encuadre(puntos) {
  const lats = puntos.map((p) => p[0]), lons = puntos.map((p) => p[1]);
  let lon0 = Math.min(...lons) - 22, lon1 = Math.max(...lons) + 22;
  let lat0 = Math.min(...lats) - 14, lat1 = Math.max(...lats) + 12;
  const proporcion = ANCHO / ALTO;
  const anchoGrados = lon1 - lon0, altoGrados = (lat1 - lat0) * ESTIRA;
  if (anchoGrados / altoGrados < proporcion) {
    const falta = (altoGrados * proporcion - anchoGrados) / 2; lon0 -= falta; lon1 += falta;
  } else {
    const falta = (anchoGrados / proporcion / ESTIRA - (lat1 - lat0)) / 2; lat0 -= falta; lat1 += falta;
  }
  return {
    x: (lon) => ((lon - lon0) / (lon1 - lon0)) * ANCHO,
    y: (lat) => ((lat1 - lat) / (lat1 - lat0)) * ALTO,
    lon0, lon1, lat0, lat1,
  };
}

/**
 * exportaciones: [{ puerto_salida, pais_destino, total, estado }]
 * Cuenta las confirmadas, en tránsito y entregadas (igual que «Valor exportado»).
 */
export function mapaRutas(exportaciones, { formato = String, reducirMovimiento = false } = {}) {
  const validas = exportaciones.filter((e) => ["CONFIRMADA", "EN_TRANSITO", "ENTREGADA"].includes(e.estado));
  const rutas = new Map();
  const sinUbicar = new Set();
  for (const e of validas) {
    if (!PUERTOS[e.puerto_salida] || !DESTINOS[e.pais_destino]) { sinUbicar.add(e.pais_destino); continue; }
    const clave = `${e.puerto_salida}→${e.pais_destino}`;
    const r = rutas.get(clave) || { puerto: e.puerto_salida, destino: e.pais_destino, valor: 0, envios: 0, enTransito: 0 };
    r.valor += Number(e.total);
    r.envios += 1;
    if (e.estado === "EN_TRANSITO") r.enTransito += 1;
    rutas.set(clave, r);
  }
  const lista = [...rutas.values()].sort((a, b) => b.valor - a.valor);
  if (!lista.length) return h("div", { class: "vacio" }, "Aún no hay exportaciones confirmadas para trazar rutas");
  const max = Math.max(...lista.map((r) => r.valor));
  const { x, y, lon0, lon1, lat0, lat1 } = encuadre([
    ...lista.map((r) => PUERTOS[r.puerto]), ...lista.map((r) => DESTINOS[r.destino])]);

  const mapa = svg("svg", { viewBox: `0 0 ${ANCHO} ${ALTO}`, class: "mapa-rutas", role: "img",
    "aria-label": `Mapa de rutas: ${lista.map((r) => `${r.puerto} a ${r.destino}`).join(", ")}` });
  // Cuadrícula de meridianos y paralelos
  for (let lon = Math.ceil(lon0 / 20) * 20; lon <= lon1; lon += 20) mapa.append(svg("line", { x1: x(lon), x2: x(lon), y1: 0, y2: ALTO, class: "mapa-reticula" }));
  for (let lat = Math.ceil(lat0 / 15) * 15; lat <= lat1; lat += 15) mapa.append(svg("line", { x1: 0, x2: ANCHO, y1: y(lat), y2: y(lat), class: "mapa-reticula" }));
  mapa.append(svg("line", { x1: 0, x2: ANCHO, y1: y(0), y2: y(0), class: "mapa-ecuador" }));
  // Continentes
  CONTINENTES.forEach((puntos) => mapa.append(svg("polygon", {
    points: puntos.map(([lon, lat]) => `${x(lon).toFixed(1)},${y(lat).toFixed(1)}`).join(" "), class: "mapa-tierra" })));

  // Arcos
  lista.forEach((r, i) => {
    const [la0, lo0] = PUERTOS[r.puerto];
    const [la1, lo1] = DESTINOS[r.destino];
    const x0 = x(lo0), y0 = y(la0), x1 = x(lo1), y1 = y(la1);
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - dist * 0.28;
    const d = `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    const grosor = 2 + (r.valor / max) * 6;
    const id = `ruta-${i}`;
    mapa.append(svg("path", { d, id, class: `mapa-arco${r.enTransito ? " en-transito" : ""}`, "stroke-width": grosor.toFixed(1) },
      svg("title", {}, `${r.puerto} → ${r.destino}: ${formato(r.valor)} en ${r.envios} envío(s)`)));
    if (r.enTransito && !reducirMovimiento) {
      // Un punto que recorre el arco indica que hay carga en camino por esa ruta.
      mapa.append(svg("circle", { r: 6, class: "mapa-barco" },
        svg("animateMotion", { dur: "6s", repeatCount: "indefinite", rotate: "auto" }, svg("mpath", { href: `#${id}` }))));
    }
  });

  // Puertos y destinos
  const usados = new Set(lista.map((r) => r.puerto));
  for (const nombre of usados) {
    const [la, lo] = PUERTOS[nombre];
    mapa.append(svg("circle", { cx: x(lo), cy: y(la), r: 6, class: "mapa-puerto" }));
  }
  const etiquetaPuertos = [...usados].join(" · ");
  const [laC, loC] = PUERTOS.Cartagena;
  mapa.append(svg("text", { x: x(loC) + 12, y: y(laC) + 34, class: "mapa-texto mapa-texto-origen" }, "Colombia"));
  mapa.append(svg("text", { x: x(loC) + 12, y: y(laC) + 52, class: "mapa-texto-sub" }, etiquetaPuertos));
  const destinosUsados = [...new Set(lista.map((r) => r.destino))];
  destinosUsados.forEach((pais) => {
    const [la, lo, ciudad] = DESTINOS[pais];
    const px = x(lo), py = y(la);
    mapa.append(svg("circle", { cx: px, cy: py, r: 5, class: "mapa-destino" }));
    // En Europa los destinos están muy juntos: las etiquetas se escalonan a la izquierda para no montarse.
    const enEuropa = lo > -15 && lo < 30 && la > 35;
    const europeos = destinosUsados.filter((d) => { const [a, b] = DESTINOS[d]; return b > -15 && b < 30 && a > 35; });
    const k = europeos.indexOf(pais);
    const ty = enEuropa ? 34 + k * 24 : py - 12;
    const tx = enEuropa ? x(-12) : px + 10;
    if (enEuropa) mapa.append(svg("path", { d: `M${px} ${py} L${tx + 4} ${ty - 5}`, class: "mapa-guia" }));
    mapa.append(svg("text", { x: tx, y: ty, class: "mapa-texto", "text-anchor": enEuropa ? "end" : "start" }, `${pais}`));
    if (!enEuropa) mapa.append(svg("text", { x: tx, y: ty + 16, class: "mapa-texto-sub" }, ciudad));
  });

  const leyenda = h("ol", { class: "mapa-leyenda" }, lista.map((r) =>
    h("li", {},
      h("span", { class: "mapa-leyenda-ruta" }, `${r.puerto} → ${r.destino}`, r.enTransito ? h("span", { class: "mapa-chip" }, "En tránsito") : null),
      h("span", { class: "mapa-leyenda-barra" }, h("span", { style: `width:${(r.valor / max) * 100}%` })),
      h("span", { class: "num fuerte" }, formato(r.valor)))));
  return h("div", { class: "mapa-contenedor" },
    h("div", { class: "mapa-lienzo" }, mapa),
    leyenda,
    sinUbicar.size ? h("p", { class: "secundario", style: "margin:8px 0 0;font-size:13px" },
      `Sin ubicación en el mapa: ${[...sinUbicar].join(", ")}.`) : null);
}
