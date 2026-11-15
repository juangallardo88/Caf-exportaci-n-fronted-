// HU-29: búsqueda global.
import { api } from "../api.js";
import { encabezado, h, insigniaExportacion } from "../ui.js";

const grupo = (titulo, elementos, render) =>
  h("div", { class: "tarjeta tarjeta-cuerpo resultado-grupo" }, h("h3", {}, `${titulo} (${elementos.length})`),
    elementos.length ? elementos.map(render) : h("p", { class: "secundario", style: "margin:0" }, "Sin coincidencias"));

export async function vistaBusqueda({ params }) {
  const q = params.get("q") || "";
  const r = await api.get("/busqueda", { q });
  const total = Object.values(r).reduce((n, lista) => n + lista.length, 0);
  return h("div", {},
    encabezado(`Resultados para “${q}”`, `${total} coincidencia(s) en todo el sistema`),
    h("div", { class: "rejilla rejilla-2" },
      grupo("Exportaciones", r.exportaciones, (e) => h("a", { class: "resultado", href: `#/exportaciones/${e.id}` },
        h("div", {}, h("div", { class: "fuerte mono" }, e.consecutivo), h("div", { class: "secundario" }, e.cliente)), insigniaExportacion(e.estado))),
      grupo("Productos", r.productos, (p) => h("a", { class: "resultado", href: "#/productos" },
        h("div", { class: "fuerte" }, p.nombre), h("span", { class: "secundario mono" }, p.sku))),
      grupo("Clientes", r.clientes, (c) => h("a", { class: "resultado", href: "#/clientes" },
        h("div", { class: "fuerte" }, c.razon_social), h("span", { class: "secundario mono" }, c.tax_id))),
      grupo("Proveedores", r.proveedores, (p) => h("a", { class: "resultado", href: "#/proveedores" },
        h("div", { class: "fuerte" }, p.razon_social), h("span", { class: "secundario mono" }, p.nit)))));
}
