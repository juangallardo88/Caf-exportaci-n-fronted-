// Clima actual en los puertos de salida, desde Open-Meteo (gratuito, sin clave, CC BY 4.0).
// La consulta la hace el navegador; si falla o tarda, el tablero sigue funcionando y se muestra un aviso.
import { h } from "./ui.js";

const PRONOSTICO = "https://api.open-meteo.com/v1/forecast";
const MARINO = "https://marine-api.open-meteo.com/v1/marine";
const CLAVE_CACHE = "cafe.clima.v1";
const VIGENCIA = 30 * 60 * 1000; // media hora
const ESPERA_MAX = 7000;

// [latitud, longitud] en tierra para el clima y mar afuera para el oleaje (la API marina no tiene datos en tierra).
export const PUERTOS_CLIMA = {
  Buenaventura: { tierra: [3.88, -77.03], mar: [3.85, -77.25] },
  Cartagena: { tierra: [10.39, -75.51], mar: [10.39, -75.62] },
  "Santa Marta": { tierra: [11.24, -74.2], mar: [11.25, -74.26] },
  Barranquilla: { tierra: [10.96, -74.8], mar: [11.1, -74.85] },
};

// Códigos WMO que usa Open-Meteo, agrupados en lo que importa para un embarque.
function condicion(codigo) {
  if (codigo === 0) return ["sol", "Despejado"];
  if (codigo <= 2) return ["parcial", "Parcialmente nublado"];
  if (codigo === 3) return ["nube", "Nublado"];
  if (codigo === 45 || codigo === 48) return ["niebla", "Niebla"];
  if (codigo >= 51 && codigo <= 57) return ["lluvia", "Llovizna"];
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return ["lluvia", codigo >= 80 ? "Chubascos" : "Lluvia"];
  if (codigo >= 95) return ["tormenta", "Tormenta eléctrica"];
  return ["nube", "Nublado"];
}

/** Riesgo orientativo para zarpar según tormenta, viento y oleaje. */
export function riesgo({ codigo, viento, rafagas, ola }) {
  if (codigo >= 95) return ["alto", "Tormenta: posible demora en el zarpe"];
  if (viento >= 50 || rafagas >= 65 || ola >= 3) return ["alto", "Mar agitado: posible demora en el zarpe"];
  if (viento >= 30 || rafagas >= 45 || ola >= 2) return ["medio", "Viento u oleaje moderado"];
  return ["bajo", "Condiciones normales"];
}

const ICONOS = {
  sol: '<circle cx="12" cy="12" r="4.5" fill="#E8A33D"/><g stroke="#E8A33D" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g>',
  parcial: '<circle cx="9" cy="9" r="3.6" fill="#E8A33D"/><g stroke="#E8A33D" stroke-width="1.8" stroke-linecap="round"><path d="M9 2.5v1.6M2.5 9h1.6M4.4 4.4l1.1 1.1M13.6 4.4l-1.1 1.1"/></g><path d="M8 19.5h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.4 1.4A2.8 2.8 0 0 0 8 19.5z" fill="#E9DFD3" stroke="#8C7A68" stroke-width="1.4"/>',
  nube: '<path d="M6.5 19h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.6A3.2 3.2 0 0 0 6.5 19z" fill="#E9DFD3" stroke="#8C7A68" stroke-width="1.5"/>',
  niebla: '<path d="M6.5 13h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.6A3.2 3.2 0 0 0 6.5 13z" fill="#E9DFD3" stroke="#8C7A68" stroke-width="1.4"/><g stroke="#8C7A68" stroke-width="1.8" stroke-linecap="round"><path d="M4 16.5h16M6 20h12"/></g>',
  lluvia: '<path d="M6.5 14h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.6A3.2 3.2 0 0 0 6.5 14z" fill="#D9D3CC" stroke="#6F6459" stroke-width="1.4"/><g stroke="#1F5FA8" stroke-width="2" stroke-linecap="round"><path d="M8 17l-1 3M12.5 17l-1 3M17 17l-1 3"/></g>',
  tormenta: '<path d="M6.5 13h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.6A3.2 3.2 0 0 0 6.5 13z" fill="#B8B0A8" stroke="#5A4E44" stroke-width="1.4"/><path d="M12.5 13l-3 5h3l-1.5 4.5 4.5-6.5h-3l1.5-3z" fill="#E8A33D" stroke="#9A4F14" stroke-width=".8" stroke-linejoin="round"/>',
};
const iconoClima = (tipo) => {
  const s = h("span", { class: "clima-icono", "aria-hidden": "true" });
  s.innerHTML = `<svg viewBox="0 0 24 24" width="34" height="34">${ICONOS[tipo]}</svg>`;
  return s;
};

const leerCache = () => {
  try {
    const c = JSON.parse(sessionStorage.getItem(CLAVE_CACHE) || "null");
    return c && Date.now() - c.t < VIGENCIA ? c : null;
  } catch { return null; }
};
const guardarCache = (datos) => {
  try { sessionStorage.setItem(CLAVE_CACHE, JSON.stringify({ t: Date.now(), datos })); } catch { /* sin almacenamiento: no pasa nada */ }
};

async function pedir(base, coordenadas, campos, senal) {
  const url = `${base}?latitude=${coordenadas.map((c) => c[0]).join(",")}&longitude=${coordenadas.map((c) => c[1]).join(",")}`
    + `&current=${campos}&wind_speed_unit=kmh&timezone=America%2FBogota`;
  const r = await fetch(url, { signal: senal });
  if (!r.ok) throw new Error(`Open-Meteo respondió ${r.status}`);
  const json = await r.json();
  return Array.isArray(json) ? json : [json]; // con una sola ubicación responde un objeto
}

/** Consulta el clima de los puertos indicados. Devuelve [{ puerto, codigo, temperatura, viento, rafagas, ola, hora }]. */
export async function consultarClima(nombres = Object.keys(PUERTOS_CLIMA)) {
  const cache = leerCache();
  if (cache && nombres.every((n) => cache.datos.some((d) => d.puerto === n))) return cache.datos.filter((d) => nombres.includes(d.puerto));
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MAX);
  try {
    const [clima, mar] = await Promise.all([
      pedir(PRONOSTICO, nombres.map((n) => PUERTOS_CLIMA[n].tierra), "temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m", control.signal),
      // El oleaje es un dato extra: si esa consulta falla, se muestra el resto.
      pedir(MARINO, nombres.map((n) => PUERTOS_CLIMA[n].mar), "wave_height", control.signal).catch(() => []),
    ]);
    const datos = nombres.map((puerto, i) => ({
      puerto,
      codigo: clima[i]?.current?.weather_code,
      temperatura: clima[i]?.current?.temperature_2m,
      viento: clima[i]?.current?.wind_speed_10m,
      rafagas: clima[i]?.current?.wind_gusts_10m,
      ola: mar[i]?.current?.wave_height ?? null,
      hora: clima[i]?.current?.time,
    }));
    if (datos.some((d) => typeof d.temperatura !== "number")) throw new Error("Respuesta incompleta");
    guardarCache(datos);
    return datos;
  } finally {
    clearTimeout(reloj);
  }
}

const decimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function tarjetaPuerto(d, porZarpar) {
  const [tipo, descripcion] = condicion(d.codigo);
  const [nivel, texto] = riesgo(d);
  const detalle = [`Viento ${Math.round(d.viento)} km/h`];
  if (typeof d.ola === "number") detalle.push(`oleaje ${decimal.format(d.ola)} m`);
  return h("li", { class: `clima-puerto clima-${nivel}`, "aria-label": `${d.puerto}: ${descripcion}, ${Math.round(d.temperatura)} grados. ${texto}.` },
    iconoClima(tipo),
    h("div", { class: "clima-datos" },
      h("div", { class: "clima-cabeza" }, h("span", { class: "fuerte" }, d.puerto), h("span", { class: "clima-temp" }, `${Math.round(d.temperatura)} °C`)),
      h("div", { class: "secundario" }, `${descripcion} · ${detalle.join(" · ")}`),
      h("div", { class: "clima-estado" }, h("span", { class: "clima-aviso" }, h("span", { class: "clima-punto", "aria-hidden": "true" }), texto),
        porZarpar ? h("span", { class: "clima-zarpe" }, plural(porZarpar, "embarque por zarpar", "embarques por zarpar")) : null)));
}

/** Franja con el clima de los puertos de salida. Se llena sola cuando llega la respuesta. */
export function climaPuertos(exportaciones = []) {
  const porZarpar = {};
  exportaciones.filter((e) => e.estado === "CONFIRMADA").forEach((e) => { porZarpar[e.puerto_salida] = (porZarpar[e.puerto_salida] || 0) + 1; });
  // Primero los puertos con embarques por zarpar; después el resto.
  const nombres = Object.keys(PUERTOS_CLIMA).sort((a, b) => (porZarpar[b] || 0) - (porZarpar[a] || 0));

  const cuerpo = h("div", { class: "clima-cuerpo", "aria-live": "polite" });
  const seccion = h("section", { class: "clima", "aria-label": "Clima en los puertos de salida" },
    h("div", { class: "clima-titulo" }, h("h3", {}, "Clima ahora en los puertos de salida"),
      h("span", { class: "secundario" }, "Indicador orientativo para planear el zarpe")),
    cuerpo);

  const cargar = () => {
    cuerpo.replaceChildren(h("ul", { class: "clima-lista clima-cargando" },
      nombres.map(() => h("li", { class: "clima-puerto clima-esqueleto" }))));
    consultarClima(nombres).then((datos) => {
      const hora = datos[0]?.hora ? datos[0].hora.slice(11, 16) : "";
      cuerpo.replaceChildren(
        h("ul", { class: "clima-lista" }, datos.map((d) => tarjetaPuerto(d, porZarpar[d.puerto] || 0))),
        h("p", { class: "clima-fuente" }, `Actualizado ${hora ? `a las ${hora} · ` : ""}Datos: `,
          h("a", { href: "https://open-meteo.com/", target: "_blank", rel: "noopener" }, "Open-Meteo.com"), " (CC BY 4.0)"));
    }).catch(() => {
      cuerpo.replaceChildren(h("div", { class: "clima-error", role: "status" },
        h("span", {}, "No se pudo consultar el clima en este momento."),
        h("button", { type: "button", class: "boton boton-chico", onclick: cargar }, "Reintentar")));
    });
  };
  cargar();
  return seccion;
}
