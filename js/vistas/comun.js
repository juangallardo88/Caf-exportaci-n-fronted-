// Listado reutilizable: encabezado + filtros + tabla que se recarga al filtrar.
import { api } from "../api.js";
import { encabezado, errorPagina, h, retrasar, tabla, tablaCargando } from "../ui.js";

/**
 * filtros: [{ nombre, etiqueta, tipo: "busqueda" | "select" | "date", opciones, placeholder }]
 * cargar(valores) → filas · columnas(recargar) → definición de columnas
 */
export function crearListado({ titulo, descripcion, acciones = [], filtros = [], cargar, columnas, alClic, vacio, iniciales = {} }) {
  const contenedorTabla = h("div", {});
  const controles = {};

  const valores = () => Object.fromEntries(Object.entries(controles).map(([k, el]) => [k, el.value.trim()]));

  async function recargar() {
    contenedorTabla.replaceChildren(tablaCargando(Math.min(columnas(recargar).length, 6)));
    try {
      const filas = await cargar(valores());
      contenedorTabla.replaceChildren(tabla(columnas(recargar), filas, { alClic, vacio }));
    } catch (err) {
      contenedorTabla.replaceChildren(errorPagina(err, recargar));
    }
  }
  const recargarConPausa = retrasar(recargar);

  const barraFiltros = filtros.length ? h("div", { class: "filtros" }, filtros.map((f) => {
    let control;
    if (f.tipo === "select") {
      control = h("select", { id: `filtro-${f.nombre}`, onchange: recargar },
        h("option", { value: "" }, f.todos || "Todos"), (f.opciones || []).map(([v, t]) => h("option", { value: v }, t)));
    } else if (f.tipo === "date") {
      control = h("input", { id: `filtro-${f.nombre}`, type: "date", onchange: recargar });
    } else {
      control = h("input", { id: `filtro-${f.nombre}`, type: "search", placeholder: f.placeholder || "Buscar…", oninput: recargarConPausa });
    }
    if (iniciales[f.nombre]) control.value = iniciales[f.nombre];
    controles[f.nombre] = control;
    return h("div", { class: `campo ${f.tipo === "busqueda" ? "campo-busqueda" : ""}` }, h("label", { for: control.id }, f.etiqueta), control);
  })) : null;

  const vista = h("div", {},
    encabezado(titulo, descripcion, ...acciones(recargar)),
    h("div", { class: "tarjeta" }, barraFiltros, contenedorTabla));
  recargar();
  return { vista, recargar };
}

let cachePaises = null;
export async function opcionesPaises() {
  cachePaises ??= await api.get("/paises");
  return cachePaises.map((p) => [p.id, p.nombre]);
}
export const olvidarPaises = () => { cachePaises = null; };
