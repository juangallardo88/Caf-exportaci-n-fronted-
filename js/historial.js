// Historial de una exportación: quién hizo cada cambio y cuándo, del más reciente al más antiguo.
import { icono } from "./iconos.js";
import { h } from "./ui.js";

// tipo → [ícono, clase de color]
const TIPOS = {
  CREADA: ["documento", "ev-creada"],
  PRODUCTOS: ["grano", "ev-neutro"],
  COSTOS: ["dinero", "ev-neutro"],
  FECHAS: ["calendario", "ev-neutro"],
  TRANSPORTE: ["camion", "ev-neutro"],
};
const ESTADOS = {
  CONFIRMADA: ["check", "ev-confirmada"],
  EN_TRANSITO: ["barco", "ev-transito"],
  ENTREGADA: ["check", "ev-entregada"],
  CANCELADA: ["cerrar", "ev-cancelada"],
};
const MOSTRAR = 6;

/** El backend guarda la hora en UTC; se muestra en hora de Colombia. */
export function horaColombia(fechaUtc) {
  const d = new Date(`${String(fechaUtc).replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? String(fechaUtc)
    : d.toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const ROLES = { ADMINISTRADOR: "Administrador", OPERADOR: "Operador", AUDITOR: "Auditor" };

function evento(ev) {
  const [ic, clase] = ev.tipo === "ESTADO" ? ESTADOS[ev.estado] || ["info", "ev-neutro"] : TIPOS[ev.tipo] || ["info", "ev-neutro"];
  return h("li", { class: `evento ${clase}` },
    h("span", { class: "evento-punto", "aria-hidden": "true" }, icono(ic)),
    h("div", { class: "evento-cuerpo" },
      h("div", { class: "evento-texto" }, ev.descripcion),
      h("div", { class: "evento-meta" },
        ev.usuario ? h("span", { title: ROLES[ev.rol] || "" }, `${ev.usuario} · `) : null,
        h("time", { datetime: `${String(ev.fecha).replace(" ", "T")}Z` }, horaColombia(ev.fecha)))));
}

export function historialExportacion(eventos, exportacion) {
  const recientes = [...eventos].reverse();
  const lista = h("ol", { class: "historial", "aria-label": "Cambios de la exportación, del más reciente al más antiguo" });
  let todos = recientes.length <= MOSTRAR;
  const verMas = h("button", { type: "button", class: "boton boton-chico boton-sec historial-mas" });
  const pintar = () => {
    lista.replaceChildren(...(todos ? recientes : recientes.slice(0, MOSTRAR)).map(evento));
    verMas.textContent = todos ? "Ver menos" : `Ver los ${recientes.length} cambios`;
    verMas.hidden = recientes.length <= MOSTRAR;
  };
  verMas.addEventListener("click", () => { todos = !todos; pintar(); });
  pintar();

  // Exportaciones creadas antes de que existiera el historial: solo se conoce su creación.
  const soloCreacion = eventos.length && eventos.every((ev) => ev.tipo === "CREADA");
  const anterior = soloCreacion && exportacion.estado !== "BORRADOR"
    ? h("p", { class: "historial-nota" }, "Esta exportación es anterior al historial: de antes solo se conoce su creación. Los cambios nuevos sí quedarán registrados.")
    : null;

  return h("section", { class: "tarjeta", "aria-labelledby": "titulo-historial" },
    h("div", { class: "tarjeta-titulo" }, h("h2", { id: "titulo-historial" }, "Historial"),
      h("span", {}, eventos.length === 1 ? "1 cambio" : `${eventos.length} cambios`)),
    h("div", { class: "tarjeta-cuerpo" },
      eventos.length ? lista : h("p", { class: "secundario", style: "margin:0" }, "Aún no hay cambios registrados."),
      anterior, verMas));
}
