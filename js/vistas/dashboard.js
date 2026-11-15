// HU-27 (dashboard) y HU-28 (estadísticas).
import { api } from "../api.js";
import { barrasHorizontales, columnas } from "../graficas.js";
import { icono } from "../iconos.js";
import { usuario } from "../sesion.js";
import { ESTADOS_EXPORTACION, fecha, h, insigniaExportacion, moneda, numero, tabla } from "../ui.js";

const COLOR_ESTADO = { BORRADOR: "#9C8F84", CONFIRMADA: "#1F5FA8", EN_TRANSITO: "#9A4F14", ENTREGADA: "#2E7D4F", CANCELADA: "#B3261E" };
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const compacto = (v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`);

const kpi = (ic, valor, etiqueta, clase = "") =>
  h("div", { class: `tarjeta kpi ${clase}` }, h("div", { class: "kpi-icono" }, icono(ic)),
    h("div", { class: "kpi-valor" }, valor), h("div", { class: "kpi-etiqueta" }, etiqueta));

const panel = (titulo, subtitulo, contenido) =>
  h("div", { class: "tarjeta" }, h("div", { class: "tarjeta-titulo" }, h("h2", {}, titulo), h("span", {}, subtitulo)),
    h("div", { class: "tarjeta-cuerpo" }, contenido));

export async function vistaDashboard() {
  const [d, e] = await Promise.all([api.get("/dashboard"), api.get("/estadisticas")]);
  const nombre = usuario().nombre.split(" ")[0];

  return h("div", {},
    h("div", { class: "encabezado" }, h("div", {}, h("h1", {}, `Hola, ${nombre}`),
      h("p", {}, "Resumen de exportaciones e inventario de RiTech SAS"))),
    h("div", { class: "rejilla rejilla-4", style: "margin-bottom:20px" },
      kpi("barco", numero(d.exportaciones.activas), "Exportaciones activas"),
      kpi("dinero", moneda(d.exportaciones.valor_exportado), "Valor exportado"),
      kpi("alerta", numero(d.inventario.bajo_stock), "Productos con stock bajo", d.inventario.bajo_stock ? "kpi-alerta" : ""),
      kpi("usuarios", numero(d.clientes), `Clientes · ${numero(d.proveedores)} proveedores`)),
    h("div", { class: "rejilla rejilla-2", style: "margin-bottom:20px" },
      panel("Valor exportado por mes", "Confirmadas, en tránsito y entregadas",
        columnas(e.por_mes.map((m) => ({ etiqueta: `${MESES[Number(m.mes.slice(5)) - 1]} ${m.mes.slice(2, 4)}`, valor: m.valor })),
          { formato: compacto, titulo: "Valor exportado por mes" })),
      panel("Exportaciones por estado", `${numero(d.exportaciones.total)} en total`,
        barrasHorizontales(Object.entries(d.exportaciones.por_estado).map(([estado, valor]) =>
          ({ etiqueta: ESTADOS_EXPORTACION[estado][0], valor, color: COLOR_ESTADO[estado] }))))),
    h("div", { class: "rejilla rejilla-2", style: "margin-bottom:20px" },
      panel("Productos más exportados", "Unidades (sacos)",
        barrasHorizontales(e.top_productos.map((p) => ({ etiqueta: p.nombre, valor: p.unidades })), { formato: numero })),
      panel("Destinos", "Valor exportado por país",
        barrasHorizontales(e.por_destino.map((p) => ({ etiqueta: p.pais, valor: p.valor, color: "#5A4232" })), { formato: compacto }))),
    h("div", { class: "tarjeta" },
      h("div", { class: "tarjeta-titulo" }, h("h2", {}, "Últimas exportaciones"), h("a", { href: "#/exportaciones" }, "Ver todas")),
      h("div", { style: "margin-top:12px" }, tabla([
        { titulo: "Consecutivo", render: (x) => h("span", { class: "fuerte" }, x.consecutivo) },
        { titulo: "Cliente", campo: "cliente" },
        { titulo: "Destino", campo: "pais_destino" },
        { titulo: "Estado", render: (x) => insigniaExportacion(x.estado) },
        { titulo: "Embarque", render: (x) => fecha(x.fecha_embarque) },
        { titulo: "Total", clase: "num", render: (x) => moneda(x.total) },
      ], d.ultimas_exportaciones, { alClic: (x) => (location.hash = `#/exportaciones/${x.id}`) }))));
}
