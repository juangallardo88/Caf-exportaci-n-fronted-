// Gráficas ligeras en SVG, sin librerías externas.
import { h } from "./ui.js";

const NS = "http://www.w3.org/2000/svg";
const svg = (etiqueta, atributos = {}, ...hijos) => {
  const el = document.createElementNS(NS, etiqueta);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  hijos.forEach((hijo) => el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo))));
  return el;
};

/** Columnas verticales: datos [{ etiqueta, valor }] */
export function columnas(datos, { formato = String, alto = 220, titulo = "Gráfica" } = {}) {
  if (!datos.length) return h("div", { class: "vacio" }, "Aún no hay datos para graficar");
  const ancho = 640, margenIzq = 8, margenInf = 28, margenSup = 24;
  const max = Math.max(...datos.map((d) => d.valor), 1);
  const paso = (ancho - margenIzq) / datos.length;
  const barra = Math.min(56, paso * 0.6);
  const area = alto - margenInf - margenSup;
  const grafica = svg("svg", { viewBox: `0 0 ${ancho} ${alto}`, class: "grafica", role: "img", "aria-label": titulo });
  [0.25, 0.5, 0.75, 1].forEach((f) => grafica.append(svg("line", {
    x1: 0, x2: ancho, y1: margenSup + area * (1 - f), y2: margenSup + area * (1 - f), stroke: "#EFE6D8",
  })));
  datos.forEach((d, i) => {
    const altura = Math.max(2, (d.valor / max) * area);
    const x = margenIzq + i * paso + (paso - barra) / 2;
    const y = margenSup + area - altura;
    grafica.append(
      svg("rect", { x, y, width: barra, height: altura, rx: 6, fill: "#9A4F14" }, svg("title", {}, `${d.etiqueta}: ${formato(d.valor)}`)),
      svg("text", { x: x + barra / 2, y: y - 6, "text-anchor": "middle", "font-weight": 600 }, formato(d.valor)),
      svg("text", { x: x + barra / 2, y: alto - 8, "text-anchor": "middle" }, d.etiqueta),
    );
  });
  return grafica;
}

/** Barras horizontales con etiqueta y valor: datos [{ etiqueta, valor, color }] */
export function barrasHorizontales(datos, { formato = String } = {}) {
  if (!datos.length) return h("div", { class: "vacio" }, "Aún no hay datos para graficar");
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return h("div", { class: "barras-h" }, datos.map((d) =>
    h("div", { class: "barra-h-fila" },
      h("span", { class: "fuerte", title: d.etiqueta, style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, d.etiqueta),
      h("div", { class: "barra-h-pista" }, h("div", {
        class: "barra-h-relleno", style: `width:${(d.valor / max) * 100}%;background:${d.color || "#9A4F14"}`,
      })),
      h("span", { class: "num secundario" }, formato(d.valor)))));
}
