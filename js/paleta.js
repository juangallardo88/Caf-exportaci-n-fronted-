// Búsqueda rápida (Ctrl + K): saltar a cualquier pantalla, registro o acción sin usar el ratón.
import { api } from "./api.js";
import { grano } from "./ilustraciones.js";
import { icono } from "./iconos.js";
import { puedeEditar } from "./sesion.js";
import { h, insigniaExportacion } from "./ui.js";

let abierta = null;

const ACCIONES = () => (puedeEditar() ? [
  { texto: "Nueva exportación", detalle: "Crear un envío en borrador", icono: "mas", destino: "#/exportaciones?nueva=1" },
  { texto: "Nuevo producto", detalle: "Registrar café o cacao en el catálogo", icono: "mas", destino: "#/productos?nuevo=1" },
] : []);

/** menu: [{ ruta, texto, icono, visible? }] (los grupos se ignoran) */
export function abrirPaleta(menu) {
  if (abierta) { abierta.querySelector("input").focus(); return; }
  const paginas = menu.filter((m) => m.ruta && (!m.visible || m.visible()))
    .map((m) => ({ texto: m.texto, detalle: "Ir a la pantalla", icono: m.icono, destino: `#${m.ruta}` }));
  const entrada = h("input", { type: "search", class: "paleta-entrada", placeholder: "Busca una exportación, producto, cliente o pantalla…",
    "aria-label": "Buscar en todo el sistema", "aria-controls": "paleta-lista", "aria-autocomplete": "list", autocomplete: "off" });
  const lista = h("div", { class: "paleta-lista", id: "paleta-lista", role: "listbox", "aria-label": "Resultados" });
  const estado = h("div", { class: "paleta-estado", role: "status", "aria-live": "polite" });
  let opciones = [];
  let activa = 0;
  let consulta = 0;

  const cerrar = () => {
    fondo.remove();
    abierta = null;
    document.removeEventListener("keydown", teclas, true);
  };
  const ir = (op) => { cerrar(); location.hash = op.destino; };

  const marcar = (i) => {
    activa = Math.max(0, Math.min(i, opciones.length - 1));
    lista.querySelectorAll(".paleta-opcion").forEach((el, j) => {
      el.classList.toggle("activa", j === activa);
      el.setAttribute("aria-selected", String(j === activa));
      if (j === activa) { el.scrollIntoView({ block: "nearest" }); entrada.setAttribute("aria-activedescendant", el.id); }
    });
  };

  const pintar = (grupos) => {
    opciones = [];
    lista.replaceChildren(...grupos.filter((g) => g.elementos.length).map((g) =>
      h("div", { class: "paleta-grupo", role: "group", "aria-label": g.titulo },
        h("div", { class: "paleta-grupo-titulo" }, g.titulo),
        g.elementos.map((op) => {
          const i = opciones.push(op) - 1;
          return h("div", { class: "paleta-opcion", id: `paleta-op-${i}`, role: "option", "aria-selected": "false",
            onclick: () => ir(op), onmousemove: () => activa !== i && marcar(i) },
          h("span", { class: "paleta-icono" }, icono(op.icono || "buscar")),
          h("span", { class: "paleta-texto" }, h("span", { class: "fuerte" }, op.texto), h("span", { class: "secundario" }, op.detalle)),
          op.extra || null);
        }))));
    if (!opciones.length) lista.append(h("div", { class: "paleta-vacio" }, grano("buscar", 56), h("span", {}, "Sin coincidencias. Prueba con otra palabra.")));
    estado.textContent = opciones.length ? `${opciones.length} resultado(s)` : "Sin resultados";
    marcar(0);
  };

  const filtrar = (lista0, q) => lista0.filter((o) => o.texto.toLowerCase().includes(q));

  const buscar = async () => {
    const q = entrada.value.trim().toLowerCase();
    const yo = ++consulta;
    const fijos = [{ titulo: "Acciones", elementos: filtrar(ACCIONES(), q) }, { titulo: "Pantallas", elementos: filtrar(paginas, q) }];
    if (q.length < 2) { pintar(q ? fijos : [{ titulo: "Acciones", elementos: ACCIONES() }, { titulo: "Pantallas", elementos: paginas }]); return; }
    pintar(fijos);
    try {
      const r = await api.get("/busqueda", { q });
      if (yo !== consulta) return;   // llegó una respuesta vieja: se descarta
      pintar([
        { titulo: "Exportaciones", elementos: r.exportaciones.map((e) => ({ texto: e.consecutivo, detalle: e.cliente, icono: "barco", destino: `#/exportaciones/${e.id}`, extra: insigniaExportacion(e.estado) })) },
        { titulo: "Productos", elementos: r.productos.map((p) => ({ texto: p.nombre, detalle: p.sku, icono: "grano", destino: "#/productos" })) },
        { titulo: "Clientes", elementos: r.clientes.map((c) => ({ texto: c.razon_social, detalle: c.tax_id, icono: "usuarios", destino: "#/clientes" })) },
        { titulo: "Proveedores", elementos: r.proveedores.map((p) => ({ texto: p.razon_social, detalle: p.nit, icono: "edificio", destino: "#/proveedores" })) },
        ...fijos,
      ]);
    } catch { /* si la búsqueda falla, quedan las pantallas y acciones */ }
  };

  let espera;
  entrada.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(buscar, 180); });

  function teclas(e) {
    if (e.key === "Escape") { e.preventDefault(); cerrar(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); marcar(activa + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); marcar(activa - 1); }
    else if (e.key === "Enter" && opciones[activa]) { e.preventDefault(); ir(opciones[activa]); }
  }
  document.addEventListener("keydown", teclas, true);

  const fondo = h("div", { class: "paleta-fondo", onclick: (e) => e.target === fondo && cerrar() },
    h("div", { class: "paleta", role: "dialog", "aria-modal": "true", "aria-label": "Búsqueda rápida" },
      h("div", { class: "paleta-cabecera" }, icono("buscar"), entrada, h("kbd", {}, "Esc")),
      lista, estado,
      h("div", { class: "paleta-pie" }, h("span", {}, h("kbd", {}, "↑"), h("kbd", {}, "↓"), " para moverte"),
        h("span", {}, h("kbd", {}, "Enter"), " para abrir"), h("span", {}, h("kbd", {}, "Esc"), " para cerrar"))));
  abierta = fondo;
  document.body.append(fondo);
  buscar();
  entrada.focus();
}
