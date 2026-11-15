// HU-18 (productos), HU-20 (detalle), HU-21 (estado), HU-22 (fechas) y HU-23 (transporte).
import { api } from "../api.js";
import { icono } from "../iconos.js";
import { puedeEditar } from "../sesion.js";
import {
  ESTADOS_EXPORTACION, avisar, boton, botonIcono, confirmar, fecha, formulario, h, insigniaExportacion, moneda, numero, tabla,
} from "../ui.js";

const FLUJO = ["BORRADOR", "CONFIRMADA", "EN_TRANSITO", "ENTREGADA"];
const TIPOS_TRANSPORTE = [["MARITIMO", "Marítimo"], ["AEREO", "Aéreo"], ["TERRESTRE", "Terrestre"], ["MULTIMODAL", "Multimodal"]];
const ACCION_ESTADO = {
  CONFIRMADA: ["Confirmar exportación", "boton-acento", "Se descontarán del inventario los productos de esta exportación."],
  EN_TRANSITO: ["Marcar en tránsito", "boton-acento", "La mercancía ya salió del puerto de origen."],
  ENTREGADA: ["Marcar entregada", "boton-acento", "El cliente recibió la mercancía. La exportación quedará cerrada."],
  CANCELADA: ["Cancelar", "boton-sec", "La exportación quedará cancelada. Si estaba confirmada, el inventario se devolverá."],
};

const tarjeta = (titulo, ...contenido) =>
  h("div", { class: "tarjeta" }, h("div", { class: "tarjeta-titulo" }, h("h2", {}, titulo)), h("div", { class: "tarjeta-cuerpo" }, contenido));

function pasos(estado) {
  const indice = FLUJO.indexOf(estado);
  return h("div", { class: "pasos", "aria-label": "Progreso de la exportación" }, FLUJO.map((paso, i) => {
    let clase = "";
    if (estado === "CANCELADA") clase = i === 0 ? "cancelado" : "";
    else if (i < indice) clase = "hecho";
    else if (i === indice) clase = "actual";
    return h("div", { class: `paso ${clase}` },
      h("div", { class: "paso-punto" }, clase === "hecho" ? icono("check") : estado === "CANCELADA" && i === 0 ? "×" : i + 1),
      ESTADOS_EXPORTACION[paso][0]);
  }));
}

export async function vistaExportacion({ id, recargar }) {
  const [e, productos] = await Promise.all([api.get(`/exportaciones/${id}`), api.get("/productos")]);
  const editable = puedeEditar() && !["ENTREGADA", "CANCELADA"].includes(e.estado);
  const borrador = puedeEditar() && e.estado === "BORRADOR";

  const ejecutar = async (accion, mensaje) => {
    try { await accion(); avisar(mensaje); recargar(); } catch (err) { avisar(err.message, "error"); }
  };

  // --- Acciones de estado (HU-21) ---
  const acciones = puedeEditar() ? e.estados_siguientes.map((estado) => {
    const [texto, clase, explicacion] = ACCION_ESTADO[estado];
    return boton(texto, { clase, onclick: async () => {
      if (await confirmar(explicacion, { titulo: texto, textoBoton: texto, peligro: estado === "CANCELADA" })) {
        ejecutar(() => api.patch(`/exportaciones/${id}/estado`, { estado }), `Exportación ${ESTADOS_EXPORTACION[estado][0].toLowerCase()}`);
      }
    } });
  }) : [];

  // --- Productos (HU-18) ---
  const tablaProductos = tabla([
    { titulo: "Producto", render: (p) => h("div", {}, h("div", { class: "fuerte" }, p.producto), h("div", { class: "secundario mono" }, p.sku)) },
    { titulo: "Cantidad", clase: "num", render: (p) => numero(p.cantidad) },
    { titulo: "Precio", clase: "num", render: (p) => moneda(p.precio_unitario) },
    { titulo: "Subtotal", clase: "num", render: (p) => h("span", { class: "fuerte" }, moneda(p.subtotal)) },
    ...(borrador ? [{ titulo: "", clase: "num", render: (p) => botonIcono("basura", `Quitar ${p.producto}`, () =>
      ejecutar(() => api.delete(`/exportaciones/${id}/productos/${p.id}`), "Producto quitado"), "peligro") }] : []),
  ], e.productos, { vacio: "Agrega los productos que se van a exportar" });

  const formProducto = borrador ? h("div", { style: "padding:20px 24px 24px;border-top:1px solid var(--borde)" },
    formulario([
      { nombre: "producto_id", etiqueta: "Producto", tipo: "select", requerido: true, entero: true,
        opciones: productos.map((p) => [p.id, `${p.nombre} · ${numero(p.stock)} disponibles · ${moneda(p.precio)}`]) },
      { nombre: "cantidad", etiqueta: "Cantidad", tipo: "number", requerido: true, min: 1, paso: "1" },
    ], {}, async (datos) => {
      await api.post(`/exportaciones/${id}/productos`, datos);
      avisar("Producto agregado");
      recargar();
    }, { textoBoton: "Agregar producto" })) : null;

  // --- Totales y costos ---
  const totales = h("div", { class: "totales" },
    h("div", {}, h("span", { class: "secundario" }, "Subtotal productos"), h("span", {}, moneda(e.subtotal))),
    h("div", {}, h("span", { class: "secundario" }, "Impuestos"), h("span", {}, moneda(e.impuestos))),
    h("div", {}, h("span", { class: "secundario" }, "Flete"), h("span", {}, moneda(e.flete))),
    h("div", { class: "total" }, h("span", {}, "Total"), h("span", {}, moneda(e.total))));
  const formCostos = editable ? formulario([
    { nombre: "impuestos", etiqueta: "Impuestos (USD)", tipo: "number", requerido: true, min: 0, paso: "0.01" },
    { nombre: "flete", etiqueta: "Flete (USD)", tipo: "number", requerido: true, min: 0, paso: "0.01" },
  ], e, async (datos) => { await api.put(`/exportaciones/${id}/costos`, datos); avisar("Costos actualizados"); recargar(); },
  { textoBoton: "Actualizar costos" }) : null;

  // --- Fechas (HU-22) ---
  const fechas = editable ? formulario([
    { nombre: "fecha_embarque", etiqueta: "Fecha de embarque", tipo: "date", requerido: true },
    { nombre: "fecha_estimada_llegada", etiqueta: "Llegada estimada", tipo: "date", requerido: true },
  ], e, async (datos) => {
    if (datos.fecha_estimada_llegada < datos.fecha_embarque) {
      throw { detalles: [{ campo: "fecha_estimada_llegada", mensaje: "No puede ser anterior a la fecha de embarque" }] };
    }
    await api.put(`/exportaciones/${id}/fechas`, datos);
    avisar("Fechas registradas");
    recargar();
  }, { textoBoton: "Guardar fechas" }) : h("dl", { class: "datos" },
    h("div", { class: "dato" }, h("dt", {}, "Embarque"), h("dd", {}, fecha(e.fecha_embarque))),
    h("div", { class: "dato" }, h("dt", {}, "Llegada estimada"), h("dd", {}, fecha(e.fecha_estimada_llegada))));

  // --- Transporte (HU-23) ---
  const t = e.transporte;
  const transporte = editable ? formulario([
    { nombre: "tipo", etiqueta: "Modo de transporte", tipo: "select", requerido: true, opciones: TIPOS_TRANSPORTE },
    { nombre: "empresa", etiqueta: "Empresa transportadora", requerido: true, max: 120 },
    { nombre: "numero_guia", etiqueta: "Guía / BL", requerido: true, max: 60 },
    { nombre: "numero_contenedor", etiqueta: "Contenedor", max: 60 },
  ], t || {}, async (datos) => { await api.put(`/exportaciones/${id}/transporte`, datos); avisar("Transporte registrado"); recargar(); },
  { textoBoton: t ? "Actualizar transporte" : "Registrar transporte" })
    : t ? h("dl", { class: "datos" },
      h("div", { class: "dato" }, h("dt", {}, "Modo"), h("dd", {}, TIPOS_TRANSPORTE.find(([v]) => v === t.tipo)?.[1])),
      h("div", { class: "dato" }, h("dt", {}, "Empresa"), h("dd", {}, t.empresa)),
      h("div", { class: "dato" }, h("dt", {}, "Guía / BL"), h("dd", { class: "mono" }, t.numero_guia)),
      h("div", { class: "dato" }, h("dt", {}, "Contenedor"), h("dd", { class: "mono" }, t.numero_contenedor || "—")))
      : h("p", { class: "secundario" }, "Sin transporte registrado");

  const avisoTransito = e.estado === "CONFIRMADA" && !t
    ? h("div", { class: "alerta-caja aviso-amarillo", style: "margin-bottom:20px" }, icono("info"),
      h("div", {}, "Registra el transporte para poder marcar la exportación en tránsito."))
    : null;

  return h("div", {},
    h("div", { class: "migas" }, h("a", { href: "#/exportaciones" }, "Exportaciones"), " / ", e.consecutivo),
    h("div", { class: "encabezado" },
      h("div", {}, h("div", { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" },
        h("h1", {}, e.consecutivo), insigniaExportacion(e.estado)),
      h("p", {}, `${e.cliente} · ${e.pais_destino} · creada el ${fecha(e.creado_en)}`)),
      h("div", { style: "display:flex;gap:10px;flex-wrap:wrap" }, acciones)),
    pasos(e.estado),
    avisoTransito,
    h("div", { class: "rejilla rejilla-detalle" },
      h("div", { class: "rejilla" },
        tarjeta("Datos de la exportación", h("dl", { class: "datos" },
          h("div", { class: "dato" }, h("dt", {}, "Cliente"), h("dd", {}, e.cliente)),
          h("div", { class: "dato" }, h("dt", {}, "País de destino"), h("dd", {}, e.pais_destino)),
          h("div", { class: "dato" }, h("dt", {}, "Puerto de salida"), h("dd", {}, e.puerto_salida)),
          h("div", { class: "dato" }, h("dt", {}, "Incoterm"), h("dd", {}, e.incoterm)))),
        h("div", { class: "tarjeta" },
          h("div", { class: "tarjeta-titulo" }, h("h2", {}, "Productos"), h("span", {}, e.productos.length === 1 ? "1 referencia" : `${e.productos.length} referencias`)),
          h("div", { style: "margin-top:12px" }, tablaProductos), formProducto),
        h("div", { class: "rejilla rejilla-2" }, tarjeta("Fechas", fechas), tarjeta("Transporte", transporte))),
      tarjeta("Totales", totales, formCostos ? h("div", { style: "margin-top:20px" }, formCostos) : null)));
}
