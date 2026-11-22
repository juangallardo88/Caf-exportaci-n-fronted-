// Ilustraciones de los estados vacíos: el grano de café del logo en tres poses.
//  - buscar: con lupa, cuando un filtro o una búsqueda no encuentra nada
//  - vacio:  encogiéndose de hombros junto a una caja vacía, cuando aún no hay registros
//  - listo:  celebrando, cuando "vacío" es buena noticia (nada pendiente)
import { h } from "./ui.js";

const TINTA = "#2E170A";
let contador = 0;

function cuerpo(id) {
  return `<ellipse cx="60" cy="58" rx="24" ry="32" fill="url(#${id})" stroke="${TINTA}" stroke-width="2.5"/>`
    + `<ellipse cx="51.5" cy="42" rx="6.2" ry="8.4" fill="#fff" opacity=".22" transform="rotate(-20 51.5 42)"/>`
    + `<path d="M59 67 C68.5 72 51.5 78.5 60.5 87" stroke="${TINTA}" stroke-width="2.7" stroke-linecap="round" fill="none"/>`
    + `<ellipse cx="45.5" cy="61" rx="3.8" ry="2.3" fill="#F08A6C" opacity=".85"/>`
    + `<ellipse cx="74.5" cy="61" rx="3.8" ry="2.3" fill="#F08A6C" opacity=".85"/>`;
}

const piernas = `<path d="M53 86 L47 100" stroke="${TINTA}" stroke-width="3.4" stroke-linecap="round"/>`
  + `<ellipse cx="43.5" cy="101.5" rx="7" ry="3.8" fill="${TINTA}"/>`
  + `<path d="M67 86 L73 100" stroke="${TINTA}" stroke-width="3.4" stroke-linecap="round"/>`
  + `<ellipse cx="76.5" cy="101.5" rx="7" ry="3.8" fill="${TINTA}"/>`;

const brazo = (d, mx, my) => `<path d="${d}" stroke="${TINTA}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`
  + `<circle cx="${mx}" cy="${my}" r="4.6" fill="#fff" stroke="${TINTA}" stroke-width="1.6"/>`;

const ojo = (cx, dx = 0, dy = 0) => `<ellipse cx="${cx}" cy="51" rx="4.7" ry="5.9" fill="#fff" stroke="${TINTA}" stroke-width="1.4"/>`
  + `<circle cx="${cx + dx}" cy="${51 + dy}" r="3" fill="${TINTA}"/><circle cx="${cx + dx + 1.2}" cy="${49.7 + dy}" r="1.05" fill="#fff"/>`;

const POSES = {
  buscar: () => brazo("M39 64 Q30 72 31 82", 31, 82)
    + `<circle cx="101" cy="38" r="11" fill="#CFE3F5" fill-opacity=".55" stroke="${TINTA}" stroke-width="3"/>`
    + `<path d="M95 34 Q98 30 103 31" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none"/>`
    + `<path d="M93 47 L87 55" stroke="#5E3016" stroke-width="5" stroke-linecap="round"/>`
    + brazo("M81 62 Q86 60 88 55", 88, 55)
    + `<path d="M47.5 42 Q51.5 39.5 55.5 41" stroke="${TINTA}" stroke-width="1.9" stroke-linecap="round" fill="none"/>`
    + `<path d="M64.5 39 Q68.5 36.5 72.5 39" stroke="${TINTA}" stroke-width="1.9" stroke-linecap="round" fill="none"/>`
    + ojo(51.5, 1.6, -0.6) + ojo(68.5, 1.6, -0.6)
    + `<ellipse cx="61" cy="66" rx="3.2" ry="3.6" fill="${TINTA}"/>`
    + `<text x="22" y="36" font-family="Georgia,serif" font-size="22" font-weight="700" fill="#9A4F14">?</text>`,
  vacio: () => `<path d="M88 86 h24 v18 h-24 z" fill="#E7C9A0" stroke="${TINTA}" stroke-width="2"/>`
    + `<path d="M88 86 l-6 -7 M112 86 l6 -7" stroke="${TINTA}" stroke-width="2" stroke-linecap="round"/>`
    + `<path d="M88 86 l-6 -7 h10 l6 7 z M112 86 l6 -7 h-10 l-6 7 z" fill="#D9B07C" stroke="${TINTA}" stroke-width="1.6" stroke-linejoin="round"/>`
    + brazo("M38 60 Q26 58 20 47", 20, 47) + brazo("M82 60 Q94 58 100 47", 100, 47)
    + `<path d="M46.5 40 Q51.5 36 56 39" stroke="${TINTA}" stroke-width="1.9" stroke-linecap="round" fill="none"/>`
    + `<path d="M64 39 Q68.5 36 73.5 40" stroke="${TINTA}" stroke-width="1.9" stroke-linecap="round" fill="none"/>`
    + ojo(51.5) + ojo(68.5)
    + `<path d="M53 68 Q56.5 65.5 60 68 T67 68" stroke="${TINTA}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`,
  listo: () => brazo("M39 60 Q26 50 22 32", 22, 32) + brazo("M81 60 Q94 50 98 32", 98, 32)
    + `<path d="M47 50 Q51.5 45 56 50" stroke="${TINTA}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`
    + `<path d="M64 50 Q68.5 45 73 50" stroke="${TINTA}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`
    + `<path d="M52.6 60 Q60 75 67.4 60 Z" fill="${TINTA}"/><path d="M56.2 66.4 Q60 63.6 63.8 66.4 Q60 70.6 56.2 66.4" fill="#F08A6C"/>`
    + `<path d="M14 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#C47A3E"/>`
    + `<path d="M104 14 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 z" fill="#C47A3E"/>`,
};

/** SVG del grano en la pose pedida. `tam` es el ancho en píxeles. */
export function grano(pose = "vacio", tam = 104) {
  const id = `grano-cuerpo-${++contador}`;
  const contenedor = h("span", { class: `ilustracion ilustracion-${pose}`, "aria-hidden": "true" });
  contenedor.innerHTML = `<svg viewBox="0 0 124 112" width="${tam}" height="${Math.round(tam * 112 / 124)}" focusable="false">`
    + `<defs><radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#C47A3E"/>`
    + `<stop offset=".55" stop-color="#8E4E24"/><stop offset="1" stop-color="#5E3016"/></radialGradient></defs>`
    + `<ellipse cx="60" cy="106" rx="34" ry="4" fill="#5E3016" opacity=".14"/>`
    + piernas + cuerpo(id) + POSES[pose]() + "</svg>";
  return contenedor;
}

// Elige la pose según el mensaje cuando la vista no la indica.
export function poseSegun(mensaje = "") {
  const m = mensaje.toLowerCase();
  if (/filtro|coincid|resultado|encontr/.test(m)) return "buscar";
  if (/^ning[uú]n|al día|sin pendientes/.test(m)) return "listo";
  return "vacio";
}

const PISTAS = {
  buscar: "Prueba con otro término o quita algún filtro.",
  listo: "Buenas noticias: no hay nada que atender aquí.",
};

/** Bloque completo de estado vacío: ilustración, mensaje y una pista opcional. */
export function estadoVacio(mensaje, { pose = poseSegun(mensaje), pista = PISTAS[pose], accion = null, tam } = {}) {
  return h("div", { class: `vacio vacio-${pose}` }, grano(pose, tam),
    h("div", { class: "vacio-titulo" }, mensaje),
    pista ? h("div", { class: "vacio-pista" }, pista) : null,
    accion);
}
