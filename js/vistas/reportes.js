// HU-30: generar reportes CSV (se abren en Excel).
import { api } from "../api.js";
import { icono } from "../iconos.js";
import { ESTADOS_EXPORTACION, avisar, boton, descargar, encabezado, h } from "../ui.js";

function tarjetaReporte(titulo, descripcion, controles, alDescargar) {
  const accion = boton("Descargar CSV", { icono: "descargar", clase: "boton-acento" });
  accion.addEventListener("click", async () => {
    accion.disabled = true;
    try {
      descargar(await alDescargar());
      avisar("Reporte descargado");
    } catch (err) {
      avisar(err.message, "error");
    } finally {
      accion.disabled = false;
    }
  });
  return h("div", { class: "tarjeta tarjeta-cuerpo", style: "display:flex;flex-direction:column;gap:16px" },
    h("div", { class: "kpi-icono" }, icono("documento")),
    h("div", {}, h("h2", { style: "font-size:20px" }, titulo), h("p", { class: "secundario", style: "margin:6px 0 0;line-height:1.5" }, descripcion)),
    controles, h("div", {}, accion));
}

export async function vistaReportes() {
  const estado = h("select", { id: "rep-estado" }, h("option", { value: "" }, "Todos"),
    Object.entries(ESTADOS_EXPORTACION).map(([k, [t]]) => h("option", { value: k }, t)));
  const desde = h("input", { id: "rep-desde", type: "date" });
  const hasta = h("input", { id: "rep-hasta", type: "date" });

  return h("div", {},
    encabezado("Reportes", "Descarga la información en CSV para abrirla en Excel"),
    h("div", { class: "rejilla rejilla-2" },
      tarjetaReporte("Exportaciones", "Consecutivo, cliente, destino, estado, fechas, impuestos, flete y total de cada exportación.",
        h("div", { class: "formulario" },
          h("div", { class: "campo completo" }, h("label", { for: "rep-estado" }, "Estado"), estado),
          h("div", { class: "campo" }, h("label", { for: "rep-desde" }, "Embarque desde"), desde),
          h("div", { class: "campo" }, h("label", { for: "rep-hasta" }, "Embarque hasta"), hasta)),
        () => api.archivo("/reportes/exportaciones", { estado: estado.value, desde: desde.value, hasta: hasta.value })),
      tarjetaReporte("Inventario", "Existencias actuales por producto con su ubicación, stock mínimo y estado de disponibilidad.",
        null, () => api.archivo("/reportes/inventario"))));
}
