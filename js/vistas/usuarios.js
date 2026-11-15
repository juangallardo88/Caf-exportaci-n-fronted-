// HU-03: gestión de usuarios y roles (solo administrador).
import { api } from "../api.js";
import { ROLES, usuario } from "../sesion.js";
import { abrirModal, avisar, boton, formulario, h, insignia } from "../ui.js";
import { crearListado } from "./comun.js";

const OPCIONES_ROL = Object.entries(ROLES);

function nuevoUsuario(recargar) {
  abrirModal("Nuevo usuario", (cerrar) => formulario([
    { nombre: "nombre", etiqueta: "Nombre completo", requerido: true, completo: true, max: 120 },
    { nombre: "correo", etiqueta: "Correo", tipo: "email", requerido: true, completo: true, mensaje: "Correo electrónico inválido" },
    { nombre: "contrasena", etiqueta: "Contraseña temporal", tipo: "password", requerido: true, min: 8, ayuda: "Mínimo 8 caracteres" },
    { nombre: "rol", etiqueta: "Rol", tipo: "select", requerido: true, opciones: OPCIONES_ROL },
  ], {}, async (datos) => {
    if (datos.contrasena.length < 8) throw { detalles: [{ campo: "contrasena", mensaje: "Mínimo 8 caracteres" }] };
    await api.post("/usuarios", datos);
    cerrar();
    avisar("Usuario creado");
    recargar();
  }, { alCancelar: cerrar, textoBoton: "Crear usuario" }));
}

async function cambiar(u, cambios, recargar) {
  try {
    await api.patch(`/usuarios/${u.id}`, cambios);
    avisar("Usuario actualizado");
  } catch (err) {
    avisar(err.message, "error");
  }
  recargar();
}

export async function vistaUsuarios() {
  const yo = usuario();
  return crearListado({
    titulo: "Usuarios",
    descripcion: "Cuentas con acceso al sistema y su rol",
    acciones: (recargar) => [boton("Nuevo usuario", { icono: "mas", clase: "boton-acento", onclick: () => nuevoUsuario(recargar) })],
    cargar: () => api.get("/usuarios"),
    columnas: (recargar) => [
      { titulo: "Nombre", render: (u) => h("div", {}, h("div", { class: "fuerte" }, u.nombre, u.id === yo.id ? " (tú)" : ""), h("div", { class: "secundario" }, u.correo)) },
      { titulo: "Rol", render: (u) => {
        const sel = h("select", { "aria-label": `Rol de ${u.nombre}`, style: "max-width:180px", onchange: () => cambiar(u, { rol: sel.value }, recargar) },
          OPCIONES_ROL.map(([v, t]) => h("option", { value: v, selected: v === u.rol }, t)));
        return sel;
      } },
      { titulo: "Estado", render: (u) => (u.activo ? insignia("Activo", "i-ok") : insignia("Inactivo", "i-gris")) },
      { titulo: "", clase: "num", render: (u) => boton(u.activo ? "Desactivar" : "Activar", {
        clase: "boton-sec", onclick: () => cambiar(u, { activo: !u.activo }, recargar) }) },
    ],
  }).vista;
}
