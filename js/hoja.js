// Hoja de embarque imprimible: resumen de una exportación en una página A4.
// Se arma aparte del resto de la app y se imprime con el diálogo del navegador, que permite «Guardar como PDF».
import { DESTINOS } from "./mapa.js";
import { INCOTERMS } from "./glosario.js";
import { usuario } from "./sesion.js";
import { ESTADOS_EXPORTACION, fecha, h, moneda, numero } from "./ui.js";

const MODOS = { MARITIMO: "Marítimo", AEREO: "Aéreo", TERRESTRE: "Terrestre", MULTIMODAL: "Multimodal" };

const dato = (etiqueta, valor, clase = "") =>
  h("div", { class: "hoja-dato" }, h("dt", {}, etiqueta), h("dd", { class: clase }, valor ?? "—"));
const bloque = (titulo, ...contenido) => h("section", { class: "hoja-bloque" }, h("h2", {}, titulo), ...contenido);

export function hojaEmbarque(e, ahora = new Date()) {
  const t = e.transporte;
  const ciudad = DESTINOS[e.pais_destino]?.[2];
  const generado = ahora.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });
  const marca = ["BORRADOR", "CANCELADA"].includes(e.estado) ? ESTADOS_EXPORTACION[e.estado][0] : null;

  return h("article", { class: "hoja-impresion", "aria-label": `Hoja de embarque ${e.consecutivo}` },
    marca ? h("div", { class: "hoja-marca", "aria-hidden": "true" }, marca) : null,
    h("header", { class: "hoja-cabecera" },
      h("img", { src: "media/logo.svg", alt: "", class: "hoja-logo" }),
      h("div", { class: "hoja-empresa" },
        h("div", { class: "hoja-empresa-nombre" }, "RiTech SAS"),
        h("div", {}, "Café Exportación · Gestión logística de café y cacao"),
        h("div", {}, "Colombia")),
      h("div", { class: "hoja-folio" },
        h("div", { class: "hoja-tipo" }, "Hoja de embarque"),
        h("div", { class: "hoja-consecutivo" }, e.consecutivo),
        h("div", { class: "hoja-estado" }, `Estado: ${ESTADOS_EXPORTACION[e.estado]?.[0] || e.estado}`))),

    h("div", { class: "hoja-columnas" },
      bloque("Partes", h("dl", {},
        dato("Exportador", "RiTech SAS (Colombia)"),
        dato("Cliente / consignatario", e.cliente),
        dato("País de destino", e.pais_destino))),
      bloque("Ruta", h("dl", {},
        dato("Puerto de salida", `${e.puerto_salida}, Colombia`),
        dato("Destino", ciudad ? `${ciudad}, ${e.pais_destino}` : e.pais_destino),
        dato("Incoterm", `${e.incoterm}${INCOTERMS[e.incoterm] ? ` · ${INCOTERMS[e.incoterm][0]}` : ""}`)))),

    h("div", { class: "hoja-columnas" },
      bloque("Fechas", h("dl", {},
        dato("Embarque", fecha(e.fecha_embarque)),
        dato("Llegada estimada", fecha(e.fecha_estimada_llegada)),
        dato("Creada", fecha(e.creado_en)))),
      bloque("Transporte", t ? h("dl", {},
        dato("Modo", MODOS[t.tipo] || t.tipo),
        dato("Empresa", t.empresa),
        dato("Guía / BL", t.numero_guia, "mono"),
        dato("Contenedor", t.numero_contenedor || "—", "mono")) : h("p", { class: "hoja-nota" }, "Sin transporte registrado."))),

    bloque("Mercancía",
      h("table", { class: "hoja-tabla" },
        h("thead", {}, h("tr", {},
          h("th", {}, "SKU"), h("th", {}, "Producto"), h("th", { class: "num" }, "Cantidad"),
          h("th", { class: "num" }, "Precio unitario"), h("th", { class: "num" }, "Subtotal"))),
        h("tbody", {}, e.productos.length ? e.productos.map((p) => h("tr", {},
          h("td", { class: "mono" }, p.sku), h("td", {}, p.producto), h("td", { class: "num" }, numero(p.cantidad)),
          h("td", { class: "num" }, moneda(p.precio_unitario)), h("td", { class: "num" }, moneda(p.subtotal))))
          : h("tr", {}, h("td", { colspan: 5, class: "hoja-nota" }, "Sin productos registrados."))),
        h("tfoot", {},
          h("tr", {}, h("td", { colspan: 4 }, "Subtotal productos"), h("td", { class: "num" }, moneda(e.subtotal))),
          h("tr", {}, h("td", { colspan: 4 }, "Impuestos"), h("td", { class: "num" }, moneda(e.impuestos))),
          h("tr", {}, h("td", { colspan: 4 }, "Flete"), h("td", { class: "num" }, moneda(e.flete))),
          h("tr", { class: "hoja-total" }, h("td", { colspan: 4 }, "Total (USD)"), h("td", { class: "num" }, moneda(e.total)))))),

    h("div", { class: "hoja-firmas" },
      ["Elaboró (RiTech SAS)", "Transportador", "Recibí conforme (cliente)"].map((rol) =>
        h("div", { class: "hoja-firma" }, h("div", { class: "hoja-linea" }), rol))),

    h("footer", { class: "hoja-pie" },
      `Generado desde Café Exportación el ${generado}${usuario()?.nombre ? ` por ${usuario().nombre}` : ""}. `
      + "Documento interno de control: no reemplaza el Bill of Lading ni la Declaración de Exportación (DEX)."));
}

/** Muestra el diálogo de impresión con solo la hoja; desde ahí se guarda como PDF. */
export async function imprimirHoja(e) {
  document.querySelector(".hoja-impresion")?.remove();
  const hoja = hojaEmbarque(e);
  document.body.append(hoja);
  document.body.classList.add("imprimiendo-hoja");
  const tituloAnterior = document.title;
  document.title = `Hoja de embarque ${e.consecutivo}`; // nombre sugerido para el PDF
  const limpiar = () => {
    hoja.remove();
    document.body.classList.remove("imprimiendo-hoja");
    document.title = tituloAnterior;
  };
  window.addEventListener("afterprint", limpiar, { once: true });
  try { await hoja.querySelector("img").decode(); } catch { /* sin logo también se imprime */ }
  window.print();
}
