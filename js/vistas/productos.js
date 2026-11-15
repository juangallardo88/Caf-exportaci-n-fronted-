// HU-04 a HU-08: registrar, consultar, editar, eliminar productos y consultar disponibilidad.
import { api } from "../api.js";
import { puedeEditar } from "../sesion.js";
import { abrirModal, avisar, boton, botonIcono, confirmar, formulario, h, insigniaStock, moneda, numero } from "../ui.js";
import { crearListado } from "./comun.js";

const CATEGORIAS = [["CAFE", "Café"], ["CACAO", "Cacao"]];

const camposProducto = (nuevo) => [
  { nombre: "sku", etiqueta: "SKU", requerido: true, patron: "[A-Za-z0-9\\-]{3,40}", mensaje: "3 a 40 letras, números o guiones", placeholder: "CAF-SUP-70" },
  { nombre: "nombre", etiqueta: "Nombre", requerido: true, max: 120 },
  { nombre: "categoria", etiqueta: "Categoría", tipo: "select", requerido: true, opciones: CATEGORIAS },
  { nombre: "precio", etiqueta: "Precio unitario (USD)", tipo: "number", requerido: true, min: 0, paso: "0.01" },
  { nombre: "peso_kg", etiqueta: "Peso (kg)", tipo: "number", requerido: true, min: 0.01, paso: "0.01" },
  { nombre: "volumen_m3", etiqueta: "Volumen (m³)", tipo: "number", requerido: true, min: 0.001, paso: "0.001" },
  ...(nuevo ? [
    { nombre: "stock_inicial", etiqueta: "Stock inicial", tipo: "number", requerido: true, min: 0, paso: "1" },
    { nombre: "stock_minimo", etiqueta: "Stock mínimo", tipo: "number", requerido: true, min: 0, paso: "1", ayuda: "Por debajo de este valor se alerta stock bajo" },
    { nombre: "ubicacion", etiqueta: "Ubicación", requerido: true, completo: true, max: 80 },
  ] : []),
  { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea", completo: true, max: 500 },
];

function abrirFormulario(producto, recargar) {
  const nuevo = !producto;
  const valores = producto || { stock_inicial: 0, stock_minimo: 0, ubicacion: "Bodega principal" };
  abrirModal(nuevo ? "Nuevo producto" : `Editar ${producto.nombre}`, (cerrar) =>
    formulario(camposProducto(nuevo), valores, async (datos) => {
      if (nuevo) await api.post("/productos", datos);
      else await api.put(`/productos/${producto.id}`, datos);
      cerrar();
      avisar(nuevo ? "Producto registrado" : "Producto actualizado");
      recargar();
    }, { alCancelar: cerrar, textoBoton: nuevo ? "Registrar producto" : "Guardar cambios" }));
}

async function eliminar(producto, recargar) {
  const ok = await confirmar(`¿Eliminar "${producto.nombre}"? Dejará de aparecer en el catálogo, pero se conserva su historial.`,
    { titulo: "Eliminar producto", textoBoton: "Eliminar", peligro: true });
  if (!ok) return;
  try {
    await api.delete(`/productos/${producto.id}`);
    avisar("Producto eliminado");
    recargar();
  } catch (err) { avisar(err.message, "error"); }
}

export async function vistaProductos() {
  const editar = puedeEditar();
  return crearListado({
    titulo: "Productos",
    descripcion: "Catálogo de café y cacao con su disponibilidad",
    acciones: (recargar) => editar ? [boton("Nuevo producto", { icono: "mas", clase: "boton-acento", onclick: () => abrirFormulario(null, recargar) })] : [],
    filtros: [
      { nombre: "q", etiqueta: "Buscar", tipo: "busqueda", placeholder: "Nombre o SKU" },
      { nombre: "categoria", etiqueta: "Categoría", tipo: "select", opciones: CATEGORIAS, todos: "Todas" },
    ],
    cargar: (f) => api.get("/productos", f),
    vacio: "No hay productos con esos filtros",
    columnas: (recargar) => [
      { titulo: "SKU", render: (p) => h("span", { class: "mono" }, p.sku) },
      { titulo: "Producto", render: (p) => h("div", {}, h("div", { class: "fuerte" }, p.nombre), h("div", { class: "secundario" }, p.descripcion || "")) },
      { titulo: "Categoría", render: (p) => (p.categoria === "CAFE" ? "Café" : "Cacao") },
      { titulo: "Precio", clase: "num", render: (p) => moneda(p.precio) },
      { titulo: "Stock", clase: "num", render: (p) => numero(p.stock) },
      { titulo: "Disponibilidad", render: (p) => insigniaStock(p.estado_stock) },
      ...(editar ? [{ titulo: "", clase: "num", render: (p) => h("div", { class: "acciones" },
        botonIcono("editar", `Editar ${p.nombre}`, () => abrirFormulario(p, recargar)),
        botonIcono("basura", `Eliminar ${p.nombre}`, () => eliminar(p, recargar), "peligro")) }] : []),
    ],
  }).vista;
}
