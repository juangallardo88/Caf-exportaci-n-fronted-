// Proyección de agotamiento de stock: a qué ritmo sale cada producto y cuándo llega al mínimo.
import { fecha, h, numero } from "./ui.js";

const NS = "http://www.w3.org/2000/svg";
const svg = (etiqueta, atributos = {}, ...hijos) => {
  const el = document.createElementNS(NS, etiqueta);
  for (const [k, v] of Object.entries(atributos)) if (v !== null && v !== undefined) el.setAttribute(k, v);
  hijos.forEach((hijo) => hijo != null && el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo))));
  return el;
};

const decimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const plural = (n, uno, varios) => `${numero(n)} ${n === 1 ? uno : varios}`;

export const NIVELES = {
  AGOTADO: ["Agotado", "nivel-alta"],
  ALTA: ["Urgente", "nivel-alta"],
  MEDIA: ["Pronto", "nivel-media"],
  BAJA: ["Con margen", "nivel-baja"],
  SIN_CONSUMO: ["Sin salidas", "nivel-sin"],
};

/** Frase principal: lo que el usuario necesita saber de un vistazo. */
export function titular(p) {
  if (p.nivel === "AGOTADO") return "Agotado";
  if (p.nivel === "SIN_CONSUMO") return `Sin salidas en ${p.dias_ventana} días`;
  if (p.stock <= p.stock_minimo) return "Ya está en el mínimo o por debajo";
  if (p.dias_para_minimo === 0) return "Llega al mínimo hoy";
  return `Llega al mínimo en ${plural(p.dias_para_minimo, "día", "días")}`;
}

function detalle(p) {
  if (p.nivel === "SIN_CONSUMO") return "No hay ritmo de salidas para proyectar.";
  if (p.nivel === "AGOTADO") return "Registra una entrada para volver a tener stock.";
  const ritmo = `≈ ${decimal.format(p.consumo_semanal)} sacos por semana`;
  return `${ritmo} · se agotaría hacia el ${fecha(p.fecha_agotamiento)}`;
}

/** Mini gráfica: stock de la ventana (línea sólida), proyección hasta cero (punteada) y línea del mínimo. */
export function graficoProyeccion(p, { ancho = 280, alto = 72 } = {}) {
  const serie = p.serie || [];
  // Misma escala en todas las filas: la ventana hacia atrás y la misma cantidad de días hacia adelante.
  const futuro = p.dias_ventana;
  const totalDias = serie.length - 1 + futuro;
  const max = Math.max(p.stock_minimo, ...serie.map((s) => s.stock), 1);
  const mx = 4, my = 6;
  const x = (d) => mx + (d / totalDias) * (ancho - mx * 2);
  const y = (v) => my + (1 - v / max) * (alto - my * 2);
  const hoyX = x(serie.length - 1);
  const pasado = serie.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(s.stock).toFixed(1)}`).join(" ");
  const g = svg("svg", { viewBox: `0 0 ${ancho} ${alto}`, class: `proy-grafico ${NIVELES[p.nivel][1]}`, role: "img",
    "aria-label": `Stock de ${p.nombre}: ${titular(p)}` });
  g.append(
    svg("rect", { x: hoyX, y: 0, width: ancho - hoyX, height: alto, class: "proy-futuro" }),
    svg("line", { x1: mx, x2: ancho - mx, y1: y(p.stock_minimo), y2: y(p.stock_minimo), class: "proy-minimo" }),
    svg("path", { d: pasado, class: "proy-linea" }),
  );
  if (p.consumo_diario > 0 && p.stock > 0) {
    const fin = Math.min(futuro, p.stock / p.consumo_diario);
    g.append(svg("path", { d: `M${hoyX} ${y(p.stock)} L${x(serie.length - 1 + fin)} ${y(Math.max(0, p.stock - p.consumo_diario * fin))}`, class: "proy-tendencia" }));
    if (p.stock > p.stock_minimo && p.dias_para_minimo <= futuro) {
      g.append(svg("circle", { cx: x(serie.length - 1 + p.dias_para_minimo), cy: y(p.stock_minimo), r: 3.5, class: "proy-cruce" }));
    }
  }
  g.append(svg("circle", { cx: hoyX, cy: y(p.stock), r: 3.5, class: "proy-hoy" }));
  return g;
}

function fila(p) {
  const [nivel, clase] = NIVELES[p.nivel];
  const reponer = ["ALTA", "MEDIA"].includes(p.nivel) && p.stock > p.stock_minimo
    ? h("div", { class: "proy-accion" }, `Programa la reposición antes del ${fecha(p.fecha_minimo)}`)
    : p.nivel === "ALTA" ? h("div", { class: "proy-accion" }, "Programa la reposición cuanto antes") : null;
  return h("li", { class: `proy-fila ${clase}` },
    h("div", { class: "proy-producto" },
      h("div", { class: "fuerte" }, p.nombre),
      h("div", { class: "secundario" }, h("span", { class: "mono" }, p.sku), ` · ${numero(p.stock)} en stock · mínimo ${numero(p.stock_minimo)}`)),
    h("div", { class: "proy-lienzo" }, graficoProyeccion(p)),
    h("div", { class: "proy-resumen" },
      h("div", { class: "proy-titular" }, h("span", { class: `proy-chip ${clase}` }, nivel), titular(p)),
      h("div", { class: "secundario" }, detalle(p)),
      reponer));
}

/** Tarjeta con la proyección de todos los productos y el selector de ventana. */
export function tarjetaProyeccion(datos, { dias, alCambiar }) {
  const selector = h("div", { class: "proy-ventana", role: "group", "aria-label": "Días de historia para calcular el ritmo" },
    h("span", { class: "secundario" }, "Ritmo de los últimos"),
    ...[30, 90, 180].map((d) => h("button", { type: "button", class: `chip-opcion${d === dias ? " activa" : ""}`, "aria-pressed": String(d === dias),
      onclick: () => alCambiar(d) }, `${d} días`)));
  const urgentes = datos.filter((p) => ["AGOTADO", "ALTA"].includes(p.nivel)).length;
  return h("div", { class: "tarjeta" },
    h("div", { class: "tarjeta-titulo proy-cabecera" },
      h("div", {}, h("h2", {}, "Proyección de agotamiento"),
        h("p", { class: "secundario", style: "margin:4px 0 0" },
          "Si las salidas siguen al mismo ritmo, así evoluciona el stock de cada producto. Es una estimación: compras o pedidos grandes la cambian.")),
      selector),
    h("div", { class: "tarjeta-cuerpo" },
      urgentes ? h("p", { class: "proy-resumen-general" }, `${plural(urgentes, "producto necesita", "productos necesitan")} reposición urgente.`) : null,
      h("ol", { class: "proy-lista" }, datos.map(fila)),
      h("p", { class: "proy-leyenda secundario" },
        h("span", { class: "ley-linea" }), "stock real  ",
        h("span", { class: "ley-tendencia" }), "proyección  ",
        h("span", { class: "ley-minimo" }), "stock mínimo")));
}
