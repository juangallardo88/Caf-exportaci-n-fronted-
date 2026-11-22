// Componentes de interfaz reutilizables. Todo el texto se inserta con textContent (sin riesgo de XSS).
import { icono } from "./iconos.js";

/** Crea un elemento: h("button", { class: "boton", onclick }, "Texto", hijo) */
export function h(etiqueta, atributos = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave.startsWith("on") && typeof valor === "function") el.addEventListener(clave.slice(2), valor);
    else if (clave === "class") el.className = valor;
    else if (clave === "dataset") Object.assign(el.dataset, valor);
    else if (valor === true) el.setAttribute(clave, "");
    else el.setAttribute(clave, valor);
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}

export const boton = (texto, { icono: ic, clase = "", ...resto } = {}) =>
  h("button", { type: "button", class: `boton ${clase}`, ...resto }, ic ? icono(ic) : null, texto);

export const botonIcono = (ic, titulo, onclick, clase = "") =>
  h("button", { type: "button", class: `boton-icono ${clase}`, title: titulo, "aria-label": titulo, onclick }, icono(ic));

// ---------- Formato ----------
const fmtMoneda = new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const fmtNumero = new Intl.NumberFormat("es-CO");
export const moneda = (v) => fmtMoneda.format(v || 0);
export const numero = (v) => fmtNumero.format(v || 0);
export function fecha(v) {
  if (!v) return "—";
  const [a, m, d] = String(v).slice(0, 10).split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(d)} ${meses[Number(m) - 1]} ${a}`;
}

export const ESTADOS_EXPORTACION = {
  BORRADOR: ["Borrador", "i-gris"],
  CONFIRMADA: ["Confirmada", "i-info"],
  EN_TRANSITO: ["En tránsito", "i-cobre"],
  ENTREGADA: ["Entregada", "i-ok"],
  CANCELADA: ["Cancelada", "i-error"],
};
const ESTADOS_STOCK = { DISPONIBLE: ["Disponible", "i-ok"], BAJO: ["Stock bajo", "i-alerta"], AGOTADO: ["Agotado", "i-error"] };

export const insignia = (texto, clase) => h("span", { class: `insignia ${clase}` }, texto);
export const insigniaExportacion = (estado) => insignia(...(ESTADOS_EXPORTACION[estado] || [estado, "i-gris"]));
export const insigniaStock = (estado) => insignia(...(ESTADOS_STOCK[estado] || [estado, "i-gris"]));

// ---------- Avisos ----------
export function avisar(mensaje, tipo = "ok") {
  let zona = document.querySelector(".avisos");
  if (!zona) document.body.append((zona = h("div", { class: "avisos", role: "status", "aria-live": "polite" })));
  const aviso = h("div", { class: `aviso aviso-${tipo}` }, icono(tipo === "ok" ? "check" : "alerta"), mensaje);
  zona.append(aviso);
  setTimeout(() => aviso.remove(), 4000);
}

// ---------- Modal ----------
export function abrirModal(titulo, contenido, { pequeno = false } = {}) {
  const anterior = document.activeElement;
  const cerrar = () => {
    fondo.remove();
    document.removeEventListener("keydown", alTeclado);
    anterior?.focus?.();
  };
  const alTeclado = (e) => e.key === "Escape" && cerrar();
  const fondo = h("div", { class: "fondo-modal", onclick: (e) => e.target === fondo && cerrar() },
    h("div", { class: `tarjeta modal ${pequeno ? "modal-pequeno" : ""}`, role: "dialog", "aria-modal": "true", "aria-label": titulo },
      h("div", { class: "modal-cabecera" }, h("h2", {}, titulo), botonIcono("cerrar", "Cerrar", () => cerrar())),
      h("div", { class: "modal-cuerpo" }, typeof contenido === "function" ? contenido(cerrar) : contenido)));
  document.body.append(fondo);
  document.addEventListener("keydown", alTeclado);
  fondo.querySelector("input, select, textarea, button.boton")?.focus();
  return cerrar;
}

export function confirmar(mensaje, { titulo = "Confirmar", textoBoton = "Confirmar", peligro = false } = {}) {
  return new Promise((resolver) => {
    let respondido = false;
    const responder = (valor, cerrar) => { respondido = true; cerrar(); resolver(valor); };
    abrirModal(titulo, (cerrar) => h("div", {},
      h("p", { style: "margin-top:0;line-height:1.5" }, mensaje),
      h("div", { class: "formulario-acciones" },
        boton("Cancelar", { clase: "boton-sec", onclick: () => responder(false, cerrar) }),
        boton(textoBoton, { clase: peligro ? "boton-peligro" : "boton-acento", onclick: () => responder(true, cerrar) }))),
    { pequeno: true });
    // Si se cierra con Escape o clic fuera, cuenta como "no"
    const vigilar = setInterval(() => {
      if (!document.querySelector(".fondo-modal")) { clearInterval(vigilar); if (!respondido) resolver(false); }
    }, 200);
  });
}

// ---------- Video de fondo ----------
// Video decorativo, sin sonido y en bucle. Con "reducir movimiento" activado queda la imagen fija.
// Incluye un botón para pausarlo: el contenido en movimiento de más de 5 s debe poder detenerse (WCAG 2.2.2).
const reducirMovimiento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const CLAVE_PAUSA = "cafe.video.pausado";
const leerPausa = () => { try { return localStorage.getItem(CLAVE_PAUSA) === "1"; } catch { return false; } };
const guardarPausa = (valor) => { try { localStorage.setItem(CLAVE_PAUSA, valor ? "1" : "0"); } catch { /* sin almacenamiento */ } };
export function videoFondo(nombre, clase = "") {
  const video = h("video", { class: "video-fondo", poster: `media/${nombre}.jpg`, playsinline: true, loop: true, preload: "auto", "aria-hidden": "true", tabindex: "-1" },
    h("source", { src: `media/${nombre}.mp4`, type: "video/mp4" }));
  video.muted = true;
  video.defaultMuted = true;
  const boton = h("button", { type: "button", class: "video-control", "aria-label": "Pausar animación" });
  const pintar = () => {
    const pausado = video.paused;
    boton.replaceChildren(icono(pausado ? "reproducir" : "pausa"));
    boton.setAttribute("aria-label", pausado ? "Reproducir animación" : "Pausar animación");
  };
  boton.addEventListener("click", () => {
    const pausar = !video.paused;
    guardarPausa(pausar);
    if (pausar) video.pause(); else video.play();
  });
  video.addEventListener("play", pintar);
  video.addEventListener("pause", pintar);
  if (!reducirMovimiento() && !leerPausa()) {
    video.autoplay = true;
    video.play?.().catch(() => pintar());
  }
  pintar();
  return h("div", { class: `video-capa ${clase}` }, video, boton);
}

// ---------- Ayuda contextual ----------
// Signo de ayuda junto a un término: muestra la explicación al pasar el cursor, al enfocarlo o al tocarlo.
export const ayudaTermino = (texto) =>
  h("span", { class: "termino-ayuda", tabindex: "0", role: "img", "aria-label": `Qué significa: ${texto}`, dataset: { ayuda: texto } }, "?");

// ---------- Tabla ----------
/** columnas: [{ titulo, campo | render(fila), clase }] */
export function tabla(columnas, filas, { alClic, vacio = "No hay registros todavía" } = {}) {
  // En celular cada fila se muestra como tarjeta; la columna "principal" (por defecto la primera) es su título.
  const principal = Math.max(0, columnas.findIndex((c) => c.principal));
  const cuerpo = filas.length
    ? filas.map((fila) => h("tr", { class: alClic ? "clic" : "", onclick: alClic ? (e) => !e.target.closest("button") && alClic(fila) : null },
        columnas.map((c, i) => h("td", { class: [c.clase, c.titulo ? "" : "td-acciones", i === principal ? "td-principal" : ""].filter(Boolean).join(" "), dataset: { etiqueta: c.titulo || "" } },
          c.render ? c.render(fila) : fila[c.campo] ?? "—"))))
    : [h("tr", {}, h("td", { colspan: columnas.length }, h("div", { class: "vacio" }, icono("caja"), h("div", {}, vacio))))];
  return h("div", { class: "tabla-contenedor" },
    h("table", {}, h("thead", {}, h("tr", {}, columnas.map((c) => h("th", { class: c.clase || "" }, c.titulo, c.ayuda ? ayudaTermino(c.ayuda) : null)))), h("tbody", {}, cuerpo)));
}

export function tablaCargando(columnas = 5, filas = 5) {
  return h("div", { class: "tabla-contenedor" }, h("table", {}, h("tbody", {},
    Array.from({ length: filas }, () => h("tr", { class: "cargando" },
      Array.from({ length: columnas }, () => h("td", {}, h("div", { class: "esqueleto" }))))))));
}

export const cargandoPagina = () => h("div", { class: "cargando-pagina" }, h("div", { class: "spinner" }));

export function errorPagina(err, reintentar) {
  return h("div", { class: "tarjeta tarjeta-cuerpo" },
    h("div", { class: "alerta-caja error" }, icono("alerta"), h("div", {}, err.message)),
    reintentar ? h("div", { style: "margin-top:16px" }, boton("Reintentar", { clase: "boton-sec", onclick: reintentar })) : null);
}

// ---------- Formularios ----------
/**
 * campos: [{ nombre, etiqueta, tipo, opciones:[[valor, texto]], requerido, min, max, paso, ayuda, completo, patron, mensaje }]
 * alEnviar(valores) debe devolver una promesa; los errores 422 del backend se muestran bajo cada campo.
 */
export function formulario(campos, valores = {}, alEnviar, { textoBoton = "Guardar", alCancelar } = {}) {
  const errorGeneral = h("div", { class: "alerta-caja error completo oculto", role: "alert" });
  const refs = {};

  const controles = campos.map((c) => {
    const id = `campo-${c.nombre}`;
    let control;
    if (c.tipo === "select") {
      control = h("select", { id, name: c.nombre, required: c.requerido },
        h("option", { value: "" }, c.vacio || "Selecciona…"),
        (c.opciones || []).map(([v, t]) => h("option", { value: v, selected: String(valores[c.nombre] ?? "") === String(v) }, t)));
    } else if (c.tipo === "textarea") {
      control = h("textarea", { id, name: c.nombre, required: c.requerido, maxlength: c.max }, valores[c.nombre] ?? "");
    } else {
      control = h("input", {
        id, name: c.nombre, type: c.tipo || "text", required: c.requerido, min: c.min, max: c.max,
        step: c.paso, pattern: c.patron, placeholder: c.placeholder, autocomplete: c.autocompletar || "off",
        value: valores[c.nombre] ?? "",
      });
    }
    const error = h("div", { class: "error-campo", "aria-live": "polite" });
    const campo = h("div", { class: `campo ${c.completo ? "completo" : ""}` },
      h("label", { for: id }, c.etiqueta, c.requerido ? " *" : ""), control,
      c.ayuda ? h("div", { class: "ayuda" }, c.ayuda) : null, error);
    refs[c.nombre] = { control, error, campo, def: c };
    control.addEventListener("input", () => { campo.classList.remove("invalido"); error.textContent = ""; });
    return campo;
  });

  const enviar = boton(textoBoton, { clase: "boton-acento", type: "submit" });
  enviar.type = "submit";
  const form = h("form", { class: "formulario", novalidate: true },
    errorGeneral, controles,
    h("div", { class: "formulario-acciones" },
      alCancelar ? boton("Cancelar", { clase: "boton-sec", onclick: alCancelar }) : null, enviar));

  const marcar = (nombre, mensaje) => {
    const r = refs[nombre];
    if (!r) return false;
    r.campo.classList.add("invalido");
    r.error.textContent = mensaje;
    return true;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorGeneral.classList.add("oculto");
    let valido = true;
    const datos = {};
    for (const [nombre, { control, def }] of Object.entries(refs)) {
      const crudo = control.value.trim();
      if (!control.checkValidity()) {
        valido = false;
        marcar(nombre, crudo === "" ? "Este campo es obligatorio" : def.mensaje || control.validationMessage);
        continue;
      }
      if (crudo === "") { datos[nombre] = def.requerido ? "" : null; continue; }
      datos[nombre] = def.tipo === "number" || def.entero ? Number(crudo) : crudo;
    }
    if (!valido) return;
    enviar.disabled = true;
    const textoOriginal = enviar.lastChild.textContent;
    enviar.lastChild.textContent = "Guardando…";
    try {
      await alEnviar(datos);
    } catch (err) {
      const sinCampo = (err.detalles || []).filter((d) => !marcar(d.campo.split(".").pop(), d.mensaje));
      if (!err.detalles?.length || sinCampo.length) {
        errorGeneral.replaceChildren(icono("alerta"), h("div", {}, sinCampo[0]?.mensaje || err.message));
        errorGeneral.classList.remove("oculto");
      }
    } finally {
      enviar.disabled = false;
      enviar.lastChild.textContent = textoOriginal;
    }
  });
  return form;
}

export function encabezado(titulo, descripcion, ...acciones) {
  return h("div", { class: "encabezado" },
    h("div", {}, h("h1", {}, titulo), descripcion ? h("p", {}, descripcion) : null),
    h("div", { style: "display:flex;gap:10px;flex-wrap:wrap" }, acciones));
}

export function descargar({ blob, nombre }) {
  const url = URL.createObjectURL(blob);
  const enlace = h("a", { href: url, download: nombre });
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Retrasa una función mientras el usuario sigue escribiendo. */
export function retrasar(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
