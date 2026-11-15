// Arranque, enrutador por hash y layout principal.
import { api } from "./api.js";
import { icono } from "./iconos.js";
import { ROLES, borrarSesion, esAdmin, obtenerSesion, puedeVerReportes, usuario } from "./sesion.js";
import { avisar, cargandoPagina, errorPagina, h } from "./ui.js";

import { vistaLogin } from "./vistas/login.js";
import { vistaDashboard } from "./vistas/dashboard.js";
import { vistaProductos } from "./vistas/productos.js";
import { vistaProveedores } from "./vistas/proveedores.js";
import { vistaClientes } from "./vistas/clientes.js";
import { vistaPaises } from "./vistas/paises.js";
import { vistaExportaciones } from "./vistas/exportaciones.js";
import { vistaExportacion } from "./vistas/exportacion.js";
import { vistaInventario } from "./vistas/inventario.js";
import { vistaReportes } from "./vistas/reportes.js";
import { vistaUsuarios } from "./vistas/usuarios.js";
import { vistaBusqueda } from "./vistas/busqueda.js";

const RUTAS = [
  { patron: /^\/dashboard$/, vista: vistaDashboard },
  { patron: /^\/productos$/, vista: vistaProductos },
  { patron: /^\/proveedores$/, vista: vistaProveedores },
  { patron: /^\/clientes$/, vista: vistaClientes },
  { patron: /^\/paises$/, vista: vistaPaises },
  { patron: /^\/exportaciones$/, vista: vistaExportaciones },
  { patron: /^\/exportaciones\/(\d+)$/, vista: vistaExportacion },
  { patron: /^\/inventario$/, vista: vistaInventario },
  { patron: /^\/reportes$/, vista: vistaReportes, permitido: puedeVerReportes },
  { patron: /^\/usuarios$/, vista: vistaUsuarios, permitido: esAdmin },
  { patron: /^\/buscar$/, vista: vistaBusqueda },
];

const MENU = [
  { grupo: "General" },
  { ruta: "/dashboard", texto: "Dashboard", icono: "tablero" },
  { ruta: "/exportaciones", texto: "Exportaciones", icono: "barco" },
  { ruta: "/inventario", texto: "Inventario", icono: "caja" },
  { grupo: "Catálogos" },
  { ruta: "/productos", texto: "Productos", icono: "grano" },
  { ruta: "/proveedores", texto: "Proveedores", icono: "edificio" },
  { ruta: "/clientes", texto: "Clientes", icono: "usuarios" },
  { ruta: "/paises", texto: "Países", icono: "globo" },
  { grupo: "Administración", visible: () => puedeVerReportes() },
  { ruta: "/reportes", texto: "Reportes", icono: "documento", visible: puedeVerReportes },
  { ruta: "/usuarios", texto: "Usuarios", icono: "escudo", visible: esAdmin },
];

const raiz = document.getElementById("raiz");

function rutaActual() {
  const [ruta, consulta = ""] = (location.hash.slice(1) || "/dashboard").split("?");
  return { ruta, params: new URLSearchParams(consulta) };
}

async function cerrarSesion() {
  try { await api.post("/auth/logout"); } catch { /* el token pudo haber vencido */ }
  borrarSesion();
  location.hash = "#/login";
  avisar("Sesión cerrada");
}

function layout() {
  const u = usuario();
  const iniciales = u.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const app = h("div", { class: "app" });
  const busqueda = h("input", { type: "search", placeholder: "Buscar productos, clientes, proveedores, exportaciones…", "aria-label": "Búsqueda global" });
  busqueda.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && busqueda.value.trim().length >= 2) location.hash = `#/buscar?q=${encodeURIComponent(busqueda.value.trim())}`;
  });
  const menu = h("nav", { class: "menu", "aria-label": "Menú principal" },
    MENU.filter((m) => !m.visible || m.visible()).map((m) => m.grupo
      ? h("div", { class: "menu-grupo" }, m.grupo)
      : h("a", { href: `#${m.ruta}`, dataset: { ruta: m.ruta } }, icono(m.icono), m.texto)));
  app.append(
    h("aside", { class: "lateral" },
      h("div", { class: "marca" }, h("div", { class: "marca-logo" }, icono("grano")),
        h("div", {}, h("div", { class: "marca-nombre" }, "Café Exportación"), h("div", { class: "marca-sub" }, "RiTech SAS"))),
      menu,
      h("div", { class: "lateral-pie" },
        h("div", { class: "usuario-chip" }, h("div", { class: "avatar" }, iniciales),
          h("div", {}, h("div", { class: "usuario-nombre" }, u.nombre), h("div", { class: "usuario-rol" }, ROLES[u.rol]))),
        h("button", { class: "boton boton-claro", type: "button", onclick: cerrarSesion }, icono("salir"), "Cerrar sesión"))),
    h("div", { class: "principal" },
      h("header", { class: "barra" },
        h("button", { class: "boton boton-sec boton-menu", type: "button", "aria-label": "Abrir menú", onclick: () => app.classList.toggle("menu-abierto") }, icono("menu")),
        h("div", { class: "buscador" }, icono("buscar"), busqueda)),
      h("main", { class: "contenido", id: "contenido" })));
  app.addEventListener("click", (e) => {
    const fueraDelMenu = !e.target.closest(".lateral") && !e.target.closest(".boton-menu");
    if (e.target.closest(".menu a") || fueraDelMenu) app.classList.remove("menu-abierto");
  });
  return app;
}

async function renderizar() {
  const { ruta, params } = rutaActual();
  const sesion = obtenerSesion();

  if (ruta === "/login") {
    if (sesion) { location.hash = "#/dashboard"; return; }
    raiz.replaceChildren(vistaLogin());
    return;
  }
  if (!sesion) { location.hash = "#/login"; return; }

  if (!raiz.querySelector(".app")) raiz.replaceChildren(layout());
  raiz.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("activo", ruta.startsWith(a.dataset.ruta)));

  const contenido = document.getElementById("contenido");
  const definicion = RUTAS.find((r) => r.patron.test(ruta));
  if (!definicion || (definicion.permitido && !definicion.permitido())) {
    location.hash = "#/dashboard";
    return;
  }
  contenido.replaceChildren(cargandoPagina());
  window.scrollTo(0, 0);
  try {
    const coincidencia = ruta.match(definicion.patron);
    const vista = await definicion.vista({ id: coincidencia[1] && Number(coincidencia[1]), params, recargar: renderizar });
    if (rutaActual().ruta === ruta) contenido.replaceChildren(vista);
  } catch (err) {
    contenido.replaceChildren(errorPagina(err, renderizar));
  }
}

window.addEventListener("hashchange", renderizar);
renderizar();
