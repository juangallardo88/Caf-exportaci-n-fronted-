// HU-01: inicio de sesión.
import { api, despertarServidor } from "../api.js";
import { icono } from "../iconos.js";
import { guardarSesion } from "../sesion.js";
import { h, videoFondo } from "../ui.js";

const DEMO = [
  ["admin@ritech.co", "Admin123*", "Administrador"],
  ["operador@ritech.co", "Operador123*", "Operador"],
  ["auditor@ritech.co", "Auditor123*", "Auditor"],
];

export function vistaLogin() {
  const correo = h("input", { id: "correo", type: "email", required: true, autocomplete: "username", placeholder: "nombre@ritech.co" });
  const clave = h("input", { id: "contrasena", type: "password", required: true, autocomplete: "current-password" });
  // Mostrar u ocultar la contraseña, y avisar si las mayúsculas están activadas.
  const verClave = h("button", { type: "button", class: "ver-clave", "aria-label": "Mostrar contraseña", "aria-pressed": "false" }, icono("ojo"));
  verClave.addEventListener("click", () => {
    const visible = clave.type === "password";
    clave.type = visible ? "text" : "password";
    verClave.setAttribute("aria-pressed", String(visible));
    verClave.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
    verClave.replaceChildren(icono(visible ? "ojoCerrado" : "ojo"));
    clave.focus();
  });
  const mayusculas = h("div", { class: "aviso-mayusculas oculto", role: "status" }, icono("alerta"), "Las mayúsculas están activadas");
  const revisarMayusculas = (e) => mayusculas.classList.toggle("oculto", !e.getModifierState?.("CapsLock"));
  clave.addEventListener("keydown", revisarMayusculas);
  clave.addEventListener("keyup", revisarMayusculas);
  const error = h("div", { class: "alerta-caja error oculto", role: "alert" });
  const entrar = h("button", { class: "boton boton-acento", type: "submit", style: "width:100%;padding:12px" }, "Iniciar sesión");
  const servidor = h("div", { class: "estado-servidor", role: "status", "aria-live": "polite" });
  const espera = h("p", { class: "login-espera oculto" });
  let servidorListo = false;

  const pintarServidor = (estado, texto) => {
    servidor.className = `estado-servidor ${estado}`;
    servidor.replaceChildren(h("span", { class: "punto", "aria-hidden": "true" }), texto);
  };
  // Solo se muestra "Conectando…" si la respuesta tarda; si el servidor ya estaba activo, aparece directamente "listo".
  const aviso = setTimeout(() => pintarServidor("conectando", "Conectando con el servidor…"), 700);
  despertarServidor()
    .then(() => { servidorListo = true; pintarServidor("listo", "Servidor listo"); })
    .catch(() => pintarServidor("error", "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."))
    .finally(() => clearTimeout(aviso));

  const form = h("form", { class: "login-caja", novalidate: true },
    h("div", {}, h("h2", {}, "Bienvenido"), h("p", { class: "secundario", style: "margin:6px 0 0" }, "Ingresa con tu cuenta corporativa")),
    error,
    h("div", { class: "campo" }, h("label", { for: "correo" }, "Correo"), correo),
    h("div", { class: "campo" }, h("label", { for: "contrasena" }, "Contraseña"),
      h("div", { class: "campo-con-boton" }, clave, verClave), mayusculas),
    entrar,
    espera,
    servidor,
    h("div", { class: "demo" }, h("span", { class: "demo-etiqueta" }, "Modo demostración"),
      h("span", {}, "Entra con un usuario de prueba: "),
      DEMO.map(([c, p, rol], i) => [i ? " · " : "", h("button", { type: "button", onclick: () => { correo.value = c; clave.value = p; } }, rol)])));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.classList.add("oculto");
    if (!correo.value.trim() || !clave.value) {
      error.replaceChildren(icono("alerta"), h("div", {}, "Escribe tu correo y tu contraseña"));
      error.classList.remove("oculto");
      return;
    }
    entrar.disabled = true;
    entrar.replaceChildren(h("span", { class: "spinner" }), "Ingresando…");
    const lento = setTimeout(() => {
      espera.textContent = servidorListo
        ? "Está tardando más de lo normal. Espera un momento…"
        : "El servidor estaba en pausa y se está activando. La primera vez del día puede tardar hasta un minuto.";
      espera.classList.remove("oculto");
    }, 4000);
    try {
      const sesion = await api.post("/auth/login", { correo: correo.value.trim(), contrasena: clave.value });
      guardarSesion(sesion);
      location.hash = "#/dashboard";
    } catch (err) {
      clearTimeout(lento);
      espera.classList.add("oculto");
      error.replaceChildren(icono("alerta"), h("div", {}, err.message));
      error.classList.remove("oculto");
      entrar.disabled = false;
      entrar.replaceChildren("Iniciar sesión");
    }
  });

  return h("div", { class: "login" },
    videoFondo("cafe-inicio", "video-login"),
    h("section", { class: "login-arte" },
      h("div", { class: "marca" }, h("img", { class: "marca-logo", src: "media/logo.svg", alt: "", width: "248", height: "156" }),
        h("div", {}, h("div", { class: "marca-nombre" }, "Café Exportación"), h("div", { class: "marca-sub" }, "RiTech SAS"))),
      h("div", {}, h("h1", {}, "Del grano al puerto, todo en un solo lugar."),
        h("p", {}, "Gestiona productos, proveedores, clientes, exportaciones e inventario de café y cacao hacia la Unión Europea."))),
    h("section", { class: "login-formulario" }, form));
}
