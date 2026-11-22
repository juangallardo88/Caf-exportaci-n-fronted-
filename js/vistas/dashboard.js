// HU-27 (dashboard) y HU-28 (estadísticas).
import { api } from "../api.js";
import { barrasHorizontales, columnas } from "../graficas.js";
import { icono } from "../iconos.js";
import { usuario } from "../sesion.js";
import { ESTADOS_EXPORTACION, fecha, h, insigniaExportacion, moneda, numero, tabla } from "../ui.js";

const COLOR_ESTADO = { BORRADOR: "#9C8F84", CONFIRMADA: "#1F5FA8", EN_TRANSITO: "#9A4F14", ENTREGADA: "#2E7D4F", CANCELADA: "#B3261E" };
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const compacto = (v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`);

const kpi = (ic, valor, etiqueta, explicacion, clase = "") =>
  h("div", { class: `tarjeta kpi ${clase}` }, h("div", { class: "kpi-icono" }, icono(ic)),
    h("div", { class: `kpi-valor${String(valor).length > 10 ? " kpi-valor-largo" : ""}` }, valor), h("div", { class: "kpi-etiqueta" }, etiqueta),
    h("div", { class: "kpi-explicacion" }, explicacion));

const DIA = 86400000;
const diasHasta = (iso) => Math.round((new Date(`${iso}T00:00:00`) - new Date(new Date().toDateString())) / DIA);
const plural = (n, uno, varios) => `${numero(n)} ${n === 1 ? uno : varios}`;

// Lista de pendientes: cada fila dice qué pasa, por qué importa y lleva a la pantalla donde se resuelve.
function pendientes(d, enTransito) {
  const filas = [];
  if (d.inventario.bajo_stock) filas.push(["alerta", "alta", `${plural(d.inventario.bajo_stock, "producto está", "productos están")} en su stock mínimo o por debajo`,
    "Programa su reposición antes de confirmar nuevas exportaciones.", "#/inventario?vista=bajo", "Ver productos"]);
  const borradores = d.exportaciones.por_estado.BORRADOR || 0;
  if (borradores) filas.push(["documento", "media", `${plural(borradores, "exportación sigue", "exportaciones siguen")} en borrador`,
    "Revisa los productos y confírmalas para reservar el inventario.", "#/exportaciones?estado=BORRADOR", "Revisar"]);
  const confirmadas = d.exportaciones.por_estado.CONFIRMADA || 0;
  if (confirmadas) filas.push(["camion", "media", `${plural(confirmadas, "exportación confirmada espera", "exportaciones confirmadas esperan")} despacho`,
    "Registra el transporte y márcalas en tránsito cuando salgan del puerto.", "#/exportaciones?estado=CONFIRMADA", "Ver"]);
  for (const x of enTransito) {
    if (!x.fecha_estimada_llegada) continue;
    const dias = diasHasta(x.fecha_estimada_llegada);
    const cuando = dias < 0 ? `debió llegar hace ${plural(-dias, "día", "días")}` : dias === 0 ? "llega hoy" : `llega en ${plural(dias, "día", "días")}`;
    filas.push(["barco", dias < 0 ? "alta" : "baja", `${x.consecutivo} a ${x.cliente} ${cuando}`,
      dias < 0 ? "Confirma con el cliente si la recibió y márcala como entregada." : `Llegada estimada el ${fecha(x.fecha_estimada_llegada)}.`,
      `#/exportaciones/${x.id}`, "Abrir"]);
  }
  const cuerpo = filas.length
    ? h("ul", { class: "pendientes" }, filas.map(([ic, nivel, titulo, detalle, enlace, accion]) =>
        h("li", { class: `pendiente pendiente-${nivel}` },
          h("div", { class: "pendiente-icono" }, icono(ic)),
          h("div", { class: "pendiente-texto" }, h("div", { class: "fuerte" }, titulo), h("div", { class: "secundario" }, detalle)),
          h("a", { class: "boton boton-chico", href: enlace }, accion))))
    : h("div", { class: "pendientes-vacio" }, icono("check"), "Todo al día: no hay alertas de inventario ni exportaciones pendientes.");
  return h("div", { class: "tarjeta", style: "margin-bottom:20px" },
    h("div", { class: "tarjeta-titulo" }, h("h2", {}, "Qué requiere atención"),
      h("span", {}, filas.length ? plural(filas.length, "pendiente", "pendientes") : "Sin pendientes")),
    h("div", { class: "tarjeta-cuerpo" }, cuerpo));
}

const panel = (titulo, subtitulo, contenido) =>
  h("div", { class: "tarjeta" }, h("div", { class: "tarjeta-titulo" }, h("h2", {}, titulo), h("span", {}, subtitulo)),
    h("div", { class: "tarjeta-cuerpo" }, contenido));

export async function vistaDashboard() {
  const [d, e, enTransito] = await Promise.all([api.get("/dashboard"), api.get("/estadisticas"),
    api.get("/exportaciones", { estado: "EN_TRANSITO" })]);
  const nombre = usuario().nombre.split(" ")[0];

  return h("div", {},
    h("div", { class: "encabezado" }, h("div", {}, h("h1", {}, `Hola, ${nombre}`),
      h("p", {}, "Esto es lo que pasa hoy con las exportaciones y el inventario de RiTech SAS"))),
    pendientes(d, enTransito),
    h("div", { class: "rejilla rejilla-4", style: "margin-bottom:20px" },
      kpi("barco", numero(d.exportaciones.activas), "Exportaciones activas", "Confirmadas o en tránsito: aún no llegan al cliente"),
      kpi("dinero", moneda(d.exportaciones.valor_exportado), "Valor exportado", "Total de exportaciones confirmadas, en tránsito y entregadas"),
      kpi("alerta", numero(d.inventario.bajo_stock), "Productos con stock bajo", "Están en su stock mínimo o por debajo", d.inventario.bajo_stock ? "kpi-alerta" : ""),
      kpi("usuarios", numero(d.clientes), "Clientes", `Compradores en el exterior · ${plural(d.proveedores, "proveedor", "proveedores")}`)),
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
