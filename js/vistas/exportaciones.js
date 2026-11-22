// HU-17 (crear) y HU-19 (consultar y filtrar exportaciones).
import { api } from "../api.js";
import { INCOTERMS, TERMINOS } from "../glosario.js";
import { puedeEditar } from "../sesion.js";
import { ESTADOS_EXPORTACION, abrirModal, avisar, boton, fecha, formulario, h, insigniaExportacion, moneda } from "../ui.js";
import { crearListado, opcionesPaises } from "./comun.js";

async function nuevaExportacion() {
  const [clientes, paises] = await Promise.all([api.get("/clientes"), opcionesPaises()]);
  abrirModal("Nueva exportación", (cerrar) => {
    const form = formulario([
      { nombre: "cliente_id", etiqueta: "Cliente", tipo: "select", requerido: true, completo: true, entero: true,
        opciones: clientes.map((c) => [c.id, `${c.razon_social} · ${c.pais}`]) },
      { nombre: "pais_destino_id", etiqueta: "País de destino", tipo: "select", requerido: true, opciones: paises, entero: true },
      { nombre: "incoterm", etiqueta: "Incoterm", tipo: "select", requerido: true,
        ayuda: TERMINOS.incoterm, opciones: Object.entries(INCOTERMS).map(([k, [nombre]]) => [k, `${k} · ${nombre}`]) },
      { nombre: "puerto_salida", etiqueta: "Puerto o aeropuerto de salida", requerido: true, completo: true, max: 120, placeholder: "Buenaventura" },
    ], {}, async (datos) => {
      const creada = await api.post("/exportaciones", datos);
      cerrar();
      avisar(`Exportación ${creada.consecutivo} creada`);
      location.hash = `#/exportaciones/${creada.id}`;
    }, { alCancelar: cerrar, textoBoton: "Crear exportación" });
    // La explicación del Incoterm cambia con la opción elegida
    const selIncoterm = form.querySelector("#campo-incoterm");
    const ayudaIncoterm = selIncoterm.closest(".campo").querySelector(".ayuda");
    selIncoterm.addEventListener("change", () => { ayudaIncoterm.textContent = INCOTERMS[selIncoterm.value]?.[1] || TERMINOS.incoterm; });
    // Sugerir como destino el país del cliente elegido
    const selCliente = form.querySelector("#campo-cliente_id");
    selCliente.addEventListener("change", () => {
      const cliente = clientes.find((c) => String(c.id) === selCliente.value);
      if (cliente) form.querySelector("#campo-pais_destino_id").value = cliente.pais_id;
    });
    return form;
  });
}

export async function vistaExportaciones({ params } = {}) {
  return crearListado({
    iniciales: { estado: params?.get("estado") || "" },
    titulo: "Exportaciones",
    descripcion: "Envíos de café y cacao a clientes en el exterior",
    acciones: () => puedeEditar() ? [boton("Nueva exportación", { icono: "mas", clase: "boton-acento", onclick: nuevaExportacion })] : [],
    filtros: [
      { nombre: "q", etiqueta: "Buscar", tipo: "busqueda", placeholder: "Consecutivo o cliente" },
      { nombre: "estado", etiqueta: "Estado", tipo: "select", opciones: Object.entries(ESTADOS_EXPORTACION).map(([k, [t]]) => [k, t]) },
      { nombre: "desde", etiqueta: "Embarque desde", tipo: "date" },
      { nombre: "hasta", etiqueta: "Embarque hasta", tipo: "date" },
    ],
    cargar: (f) => api.get("/exportaciones", f),
    alClic: (e) => (location.hash = `#/exportaciones/${e.id}`),
    vacio: "No hay exportaciones con esos filtros",
    columnas: () => [
      { titulo: "Consecutivo", ayuda: TERMINOS.consecutivo, render: (e) => h("span", { class: "fuerte mono" }, e.consecutivo) },
      { titulo: "Cliente", campo: "cliente" },
      { titulo: "Destino", campo: "pais_destino" },
      { titulo: "Incoterm", ayuda: TERMINOS.incoterm, campo: "incoterm" },
      { titulo: "Estado", render: (e) => insigniaExportacion(e.estado) },
      { titulo: "Embarque", render: (e) => fecha(e.fecha_embarque) },
      { titulo: "Total", clase: "num", render: (e) => h("span", { class: "fuerte" }, moneda(e.total)) },
    ],
  }).vista;
}
