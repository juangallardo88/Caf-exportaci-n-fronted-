// HU-16: registrar países (solo administrador).
import { api } from "../api.js";
import { esAdmin } from "../sesion.js";
import { abrirModal, avisar, boton, botonIcono, formulario, h } from "../ui.js";
import { crearListado, olvidarPaises } from "./comun.js";

const CAMPOS = [
  { nombre: "nombre", etiqueta: "Nombre oficial", requerido: true, completo: true, max: 100 },
  { nombre: "codigo_iso2", etiqueta: "Código ISO (2 letras)", requerido: true, patron: "[A-Za-z]{2}", mensaje: "Exactamente 2 letras", placeholder: "DE" },
  { nombre: "codigo_iso3", etiqueta: "Código ISO (3 letras)", requerido: true, patron: "[A-Za-z]{3}", mensaje: "Exactamente 3 letras", placeholder: "DEU" },
  { nombre: "region", etiqueta: "Región comercial", requerido: true, completo: true, max: 80, placeholder: "Unión Europea" },
];

function abrirFormulario(pais, recargar) {
  const nuevo = !pais;
  abrirModal(nuevo ? "Nuevo país" : `Editar ${pais.nombre}`, (cerrar) =>
    formulario(CAMPOS, pais || {}, async (datos) => {
      if (nuevo) await api.post("/paises", datos);
      else await api.put(`/paises/${pais.id}`, datos);
      olvidarPaises();
      cerrar();
      avisar(nuevo ? "País registrado" : "País actualizado");
      recargar();
    }, { alCancelar: cerrar, textoBoton: nuevo ? "Registrar país" : "Guardar cambios" }), { pequeno: true });
}

export async function vistaPaises() {
  const admin = esAdmin();
  return crearListado({
    titulo: "Países",
    descripcion: "Países de origen de proveedores y destino de exportaciones",
    acciones: (recargar) => admin ? [boton("Nuevo país", { icono: "mas", clase: "boton-acento", onclick: () => abrirFormulario(null, recargar) })] : [],
    cargar: () => api.get("/paises"),
    columnas: (recargar) => [
      { titulo: "País", ordenar: "nombre", render: (p) => h("span", { class: "fuerte" }, p.nombre) },
      { titulo: "ISO 2", ordenar: "codigo_iso2", render: (p) => h("span", { class: "mono" }, p.codigo_iso2) },
      { titulo: "ISO 3", render: (p) => h("span", { class: "mono" }, p.codigo_iso3) },
      { titulo: "Región", campo: "region" },
      ...(admin ? [{ titulo: "", clase: "num", render: (p) => h("div", { class: "acciones" },
        botonIcono("editar", `Editar ${p.nombre}`, () => abrirFormulario(p, recargar))) }] : []),
    ],
  }).vista;
}
