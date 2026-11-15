// Cliente HTTP del backend: añade el token, traduce errores y cierra la sesión si expira.
import { borrarSesion, obtenerSesion } from "./sesion.js";

export class ErrorApi extends Error {
  constructor(estado, cuerpo) {
    super(cuerpo?.error?.mensaje || "No se pudo completar la operación");
    this.estado = estado;
    this.codigo = cuerpo?.error?.codigo;
    this.detalles = cuerpo?.error?.detalles || [];
  }
}

const base = () => window.APP_CONFIG.API_URL;

async function peticion(metodo, ruta, cuerpo, { comoArchivo = false } = {}) {
  const cabeceras = {};
  const sesion = obtenerSesion();
  if (sesion) cabeceras.Authorization = `Bearer ${sesion.token}`;
  if (cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";

  let respuesta;
  try {
    respuesta = await fetch(base() + ruta, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, {
      error: { mensaje: "No hay conexión con el servidor. Si es el primer acceso del día, espera unos segundos e intenta de nuevo." },
    });
  }

  if (respuesta.status === 401 && ruta !== "/auth/login") {
    borrarSesion();
    location.hash = "#/login";
  }
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null);
    throw new ErrorApi(respuesta.status, datos);
  }
  if (respuesta.status === 204) return null;
  if (comoArchivo) {
    const nombre = /filename="([^"]+)"/.exec(respuesta.headers.get("Content-Disposition") || "")?.[1];
    return { blob: await respuesta.blob(), nombre: nombre || "reporte.csv" };
  }
  return respuesta.json();
}

function consulta(params = {}) {
  const limpio = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return limpio.length ? "?" + new URLSearchParams(limpio).toString() : "";
}

export const api = {
  get: (ruta, params) => peticion("GET", ruta + consulta(params)),
  post: (ruta, cuerpo = {}) => peticion("POST", ruta, cuerpo),
  put: (ruta, cuerpo) => peticion("PUT", ruta, cuerpo),
  patch: (ruta, cuerpo) => peticion("PATCH", ruta, cuerpo),
  delete: (ruta) => peticion("DELETE", ruta),
  archivo: (ruta, params) => peticion("GET", ruta + consulta(params), undefined, { comoArchivo: true }),
};
