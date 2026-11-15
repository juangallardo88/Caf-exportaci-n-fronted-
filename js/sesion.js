// Sesión del usuario (token JWT) guardada en el navegador.
const CLAVE = "cafe-exportacion-sesion";

export const ROLES = {
  ADMINISTRADOR: "Administrador",
  OPERADOR: "Operador",
  AUDITOR: "Auditor",
};

export function obtenerSesion() {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE));
    if (!sesion || new Date(sesion.expira_en) <= new Date()) return null;
    return sesion;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  localStorage.setItem(CLAVE, JSON.stringify(sesion));
}

export function borrarSesion() {
  localStorage.removeItem(CLAVE);
}

export const usuario = () => obtenerSesion()?.usuario ?? null;
export const tieneRol = (...roles) => roles.includes(usuario()?.rol);
export const puedeEditar = () => tieneRol("ADMINISTRADOR", "OPERADOR");
export const esAdmin = () => tieneRol("ADMINISTRADOR");
export const puedeVerReportes = () => tieneRol("ADMINISTRADOR", "AUDITOR");
