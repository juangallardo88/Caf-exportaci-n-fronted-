// HU-09 a HU-12: registrar, consultar, editar y eliminar proveedores.
import { api } from "../api.js";
import { TERMINOS } from "../glosario.js";
import { puedeEditar } from "../sesion.js";
import { abrirModal, avisar, boton, botonIcono, confirmar, formulario, h } from "../ui.js";
import { crearListado, opcionesPaises } from "./comun.js";

const campos = (paises) => [
  { nombre: "nit", etiqueta: "NIT / RUT", requerido: true, patron: "[0-9A-Za-z.\\-]{5,30}", mensaje: "5 a 30 caracteres: números, letras, puntos o guiones", placeholder: "891100345-1" },
  { nombre: "razon_social", etiqueta: "Razón social", requerido: true, max: 160 },
  { nombre: "pais_id", etiqueta: "País de origen", tipo: "select", requerido: true, opciones: paises, entero: true },
  { nombre: "telefono", etiqueta: "Teléfono", requerido: true, patron: "\\+?[0-9][0-9 \\(\\)\\-]{6,19}", mensaje: "Solo números, espacios, +, - y paréntesis", placeholder: "+57 608 871 2233" },
  { nombre: "correo", etiqueta: "Correo", tipo: "email", requerido: true, mensaje: "Correo electrónico inválido" },
  { nombre: "direccion", etiqueta: "Dirección", requerido: true, max: 200 },
  { nombre: "condiciones_comerciales", etiqueta: "Condiciones comerciales", tipo: "textarea", completo: true, max: 500, placeholder: "Pago a 30 días" },
];

async function abrirFormulario(proveedor, recargar) {
  const paises = await opcionesPaises();
  const nuevo = !proveedor;
  abrirModal(nuevo ? "Nuevo proveedor" : `Editar ${proveedor.razon_social}`, (cerrar) =>
    formulario(campos(paises), proveedor || {}, async (datos) => {
      if (nuevo) await api.post("/proveedores", datos);
      else await api.put(`/proveedores/${proveedor.id}`, datos);
      cerrar();
      avisar(nuevo ? "Proveedor registrado" : "Proveedor actualizado");
      recargar();
    }, { alCancelar: cerrar, textoBoton: nuevo ? "Registrar proveedor" : "Guardar cambios" }));
}

async function eliminar(proveedor, recargar) {
  const ok = await confirmar(`¿Eliminar a "${proveedor.razon_social}"? Esta acción no se puede deshacer.`,
    { titulo: "Eliminar proveedor", textoBoton: "Eliminar", peligro: true });
  if (!ok) return;
  try {
    await api.delete(`/proveedores/${proveedor.id}`);
    avisar("Proveedor eliminado");
    recargar();
  } catch (err) { avisar(err.message, "error"); }
}

export async function vistaProveedores() {
  const editar = puedeEditar();
  const paises = await opcionesPaises();
  return crearListado({
    titulo: "Proveedores",
    descripcion: "Productores y cooperativas de café y cacao",
    acciones: (recargar) => editar ? [boton("Nuevo proveedor", { icono: "mas", clase: "boton-acento", onclick: () => abrirFormulario(null, recargar) })] : [],
    filtros: [
      { nombre: "q", etiqueta: "Buscar", tipo: "busqueda", placeholder: "Nombre o NIT" },
      { nombre: "pais_id", etiqueta: "País", tipo: "select", opciones: paises },
    ],
    cargar: (f) => api.get("/proveedores", f),
    vacio: "No hay proveedores con esos filtros",
    columnas: (recargar) => [
      { titulo: "NIT / RUT", ayuda: TERMINOS.nit, render: (p) => h("span", { class: "mono" }, p.nit) },
      { titulo: "Razón social", principal: true, render: (p) => h("div", {}, h("div", { class: "fuerte" }, p.razon_social), h("div", { class: "secundario" }, p.direccion)) },
      { titulo: "País", campo: "pais" },
      { titulo: "Contacto", render: (p) => h("div", {}, h("div", {}, p.telefono), h("div", { class: "secundario" }, p.correo)) },
      { titulo: "Condiciones", render: (p) => h("span", { class: "secundario" }, p.condiciones_comerciales || "—") },
      ...(editar ? [{ titulo: "", clase: "num", render: (p) => h("div", { class: "acciones" },
        botonIcono("editar", `Editar ${p.razon_social}`, () => abrirFormulario(p, recargar)),
        botonIcono("basura", `Eliminar ${p.razon_social}`, () => eliminar(p, recargar), "peligro")) }] : []),
    ],
  }).vista;
}
