// HU-13 a HU-15: registrar, consultar y editar clientes nacionales e internacionales.
import { api } from "../api.js";
import { puedeEditar } from "../sesion.js";
import { abrirModal, avisar, boton, botonIcono, formulario, h } from "../ui.js";
import { crearListado, opcionesPaises } from "./comun.js";

const campos = (paises) => [
  { nombre: "tax_id", etiqueta: "Tax ID", requerido: true, patron: "[0-9A-Za-z.\\-]{5,40}", mensaje: "5 a 40 caracteres: números, letras, puntos o guiones", placeholder: "DE-HRB-112233" },
  { nombre: "razon_social", etiqueta: "Razón social", requerido: true, max: 160 },
  { nombre: "pais_id", etiqueta: "País", tipo: "select", requerido: true, opciones: paises, entero: true },
  { nombre: "ciudad", etiqueta: "Ciudad", requerido: true, max: 100 },
  { nombre: "direccion_entrega", etiqueta: "Dirección de entrega", requerido: true, completo: true, max: 200 },
  { nombre: "contacto_compras", etiqueta: "Contacto de compras", requerido: true, max: 120 },
  { nombre: "correo", etiqueta: "Correo", tipo: "email", mensaje: "Correo electrónico inválido" },
];

async function abrirFormulario(cliente, recargar) {
  const paises = await opcionesPaises();
  const nuevo = !cliente;
  abrirModal(nuevo ? "Nuevo cliente" : `Editar ${cliente.razon_social}`, (cerrar) =>
    formulario(campos(paises), cliente || {}, async (datos) => {
      if (nuevo) await api.post("/clientes", datos);
      else await api.put(`/clientes/${cliente.id}`, datos);
      cerrar();
      avisar(nuevo ? "Cliente registrado" : "Cliente actualizado");
      recargar();
    }, { alCancelar: cerrar, textoBoton: nuevo ? "Registrar cliente" : "Guardar cambios" }));
}

export async function vistaClientes() {
  const editar = puedeEditar();
  const paises = await opcionesPaises();
  return crearListado({
    titulo: "Clientes",
    descripcion: "Compradores nacionales e internacionales",
    acciones: (recargar) => editar ? [boton("Nuevo cliente", { icono: "mas", clase: "boton-acento", onclick: () => abrirFormulario(null, recargar) })] : [],
    filtros: [
      { nombre: "q", etiqueta: "Buscar", tipo: "busqueda", placeholder: "Nombre o Tax ID" },
      { nombre: "pais_id", etiqueta: "País", tipo: "select", opciones: paises },
    ],
    cargar: (f) => api.get("/clientes", f),
    vacio: "No hay clientes con esos filtros",
    columnas: (recargar) => [
      { titulo: "Tax ID", render: (c) => h("span", { class: "mono" }, c.tax_id) },
      { titulo: "Razón social", principal: true, render: (c) => h("div", { class: "fuerte" }, c.razon_social) },
      { titulo: "Ubicación", render: (c) => h("div", {}, h("div", {}, `${c.ciudad}, ${c.pais}`), h("div", { class: "secundario" }, c.direccion_entrega)) },
      { titulo: "Contacto de compras", render: (c) => h("div", {}, h("div", {}, c.contacto_compras), h("div", { class: "secundario" }, c.correo || "")) },
      ...(editar ? [{ titulo: "", clase: "num", render: (c) => h("div", { class: "acciones" },
        botonIcono("editar", `Editar ${c.razon_social}`, () => abrirFormulario(c, recargar))) }] : []),
    ],
  }).vista;
}
