// Guía de uso: explica el proceso completo, los estados, los roles y los términos del sistema.
import { ESTADOS_EXPLICADOS, INCOTERMS, TERMINOS } from "../glosario.js";
import { icono } from "../iconos.js";
import { ROLES, usuario } from "../sesion.js";
import { encabezado, h, insigniaExportacion } from "../ui.js";

const RECORRIDO = [
  ["edificio", "Registra proveedores y productos", "Da de alta las cooperativas que te venden y cada producto con su SKU, precio, peso y stock mínimo.", "#/productos", "Ir a Productos"],
  ["caja", "Carga el inventario", "Registra las entradas de mercancía en bodega. El sistema avisa cuando un producto llega a su stock mínimo.", "#/inventario", "Ir a Inventario"],
  ["usuarios", "Registra al cliente", "Guarda los datos del comprador en el exterior: identificación tributaria, país, ciudad y contacto de compras.", "#/clientes", "Ir a Clientes"],
  ["documento", "Crea la exportación", "Elige cliente, destino, Incoterm y puerto de salida, y agrega los productos. Queda en borrador mientras la preparas.", "#/exportaciones", "Ir a Exportaciones"],
  ["check", "Confírmala y registra el transporte", "Al confirmar se descuenta el inventario. Luego registra la naviera o transportadora y el número de guía.", null, null],
  ["barco", "Haz seguimiento hasta la entrega", "Márcala en tránsito cuando salga del puerto y entregada cuando el cliente la reciba.", null, null],
];

const PERMISOS = [
  ["Ver dashboard, exportaciones, inventario y catálogos", true, true, true],
  ["Crear y editar productos, proveedores, clientes y países", true, true, false],
  ["Crear exportaciones y cambiar su estado", true, true, false],
  ["Registrar movimientos de inventario", true, true, false],
  ["Descargar reportes", true, false, true],
  ["Administrar usuarios", true, false, false],
];

const marca = (si) => h("td", { class: "centro" }, si
  ? h("span", { class: "permiso-si", "aria-label": "Sí" }, icono("check"))
  : h("span", { class: "permiso-no", "aria-label": "No" }, "—"));

export function vistaGuia() {
  const rol = usuario().rol;
  return h("div", { class: "guia" },
    encabezado("Guía de uso", "Cómo funciona el sistema, de la compra del grano a la entrega en el exterior"),

    h("section", { class: "tarjeta" },
      h("div", { class: "tarjeta-titulo" }, h("h2", {}, "El recorrido de una exportación"), h("span", {}, "Seis pasos, en este orden")),
      h("div", { class: "tarjeta-cuerpo" }, h("ol", { class: "recorrido" }, RECORRIDO.map(([ic, titulo, texto, enlace, accion], i) =>
        h("li", { class: "recorrido-paso" },
          h("div", { class: "recorrido-numero", "aria-hidden": "true" }, String(i + 1)),
          h("div", { class: "recorrido-icono", "aria-hidden": "true" }, icono(ic)),
          h("div", {}, h("h3", {}, titulo), h("p", { class: "secundario" }, texto),
            enlace ? h("a", { href: enlace, class: "enlace-flecha" }, accion, " →") : null)))))),

    h("div", { class: "rejilla rejilla-2" },
      h("section", { class: "tarjeta" },
        h("div", { class: "tarjeta-titulo" }, h("h2", {}, "Estados de una exportación")),
        h("div", { class: "tarjeta-cuerpo" }, h("dl", { class: "lista-estados" }, Object.entries(ESTADOS_EXPLICADOS).map(([estado, texto]) =>
          h("div", {}, h("dt", {}, insigniaExportacion(estado)), h("dd", {}, texto)))))),
      h("section", { class: "tarjeta" },
        h("div", { class: "tarjeta-titulo" }, h("h2", {}, "Qué puede hacer cada rol"), h("span", {}, `Tu rol: ${ROLES[rol] || rol}`)),
        h("div", { class: "tabla-contenedor tabla-fija" }, h("table", {},
          h("thead", {}, h("tr", {}, h("th", { class: "columna-accion" }, "Acción"), ["ADMINISTRADOR", "OPERADOR", "AUDITOR"].map((r) =>
            h("th", { class: `centro${r === rol ? " columna-propia" : ""}` }, ROLES[r] || r)))),
          h("tbody", {}, PERMISOS.map(([accion, ...si]) => h("tr", {}, h("td", {}, accion), si.map(marca)))))))),

    h("section", { class: "tarjeta" },
      h("div", { class: "tarjeta-titulo" }, h("h2", {}, "Glosario"), h("span", {}, "Términos de comercio exterior que verás en el sistema")),
      h("div", { class: "tarjeta-cuerpo glosario" },
        h("div", {}, h("h3", {}, "Incoterms"), h("p", { class: "secundario" }, TERMINOS.incoterm),
          h("dl", { class: "lista-terminos" }, Object.entries(INCOTERMS).map(([k, [nombre, texto]]) =>
            h("div", {}, h("dt", {}, h("span", { class: "fuerte" }, k), ` · ${nombre}`), h("dd", {}, texto))))),
        h("div", {}, h("h3", {}, "Otros términos"),
          h("dl", { class: "lista-terminos" }, [
            ["SKU", TERMINOS.sku], ["Stock mínimo", TERMINOS.stock_minimo], ["Consecutivo", TERMINOS.consecutivo],
            ["NIT", TERMINOS.nit], ["Tax ID", TERMINOS.tax_id],
          ].map(([t, texto]) => h("div", {}, h("dt", { class: "fuerte" }, t), h("dd", {}, texto))))))));
}
