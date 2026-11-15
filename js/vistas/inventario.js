// HU-24 (consultar), HU-25 (actualizar cantidades) y HU-26 (bajo stock).
import { api } from "../api.js";
import { icono } from "../iconos.js";
import { puedeEditar } from "../sesion.js";
import {
  abrirModal, avisar, boton, botonIcono, encabezado, errorPagina, formulario, h, insignia, insigniaStock, numero, tabla, tablaCargando,
} from "../ui.js";

const TIPOS = { ENTRADA: ["Entrada", "i-ok"], SALIDA: ["Salida", "i-error"], AJUSTE: ["Ajuste", "i-info"] };

function abrirMovimiento(productos, recargar, productoId) {
  abrirModal("Registrar movimiento de inventario", (cerrar) => formulario([
    { nombre: "producto_id", etiqueta: "Producto", tipo: "select", requerido: true, completo: true, entero: true,
      opciones: productos.map((p) => [p.producto_id, `${p.nombre} · ${numero(p.cantidad)} en stock`]) },
    { nombre: "tipo", etiqueta: "Tipo", tipo: "select", requerido: true,
      opciones: [["ENTRADA", "Entrada (suma)"], ["SALIDA", "Salida (resta)"], ["AJUSTE", "Ajuste (+ o −)"]] },
    { nombre: "cantidad", etiqueta: "Cantidad", tipo: "number", requerido: true, paso: "1", ayuda: "En ajustes usa un número negativo para restar" },
    { nombre: "motivo", etiqueta: "Motivo", requerido: true, completo: true, max: 200, placeholder: "Compra a Cooperativa del Huila" },
  ], { producto_id: productoId }, async (datos) => {
    const r = await api.post("/inventario/movimientos", datos);
    cerrar();
    avisar(`${r.nombre}: ahora hay ${numero(r.cantidad)} unidades`);
    recargar();
  }, { alCancelar: cerrar, textoBoton: "Registrar movimiento" }));
}

function abrirAjustes(fila, recargar) {
  abrirModal(`Ubicación y stock mínimo · ${fila.nombre}`, (cerrar) => formulario([
    { nombre: "ubicacion", etiqueta: "Ubicación", requerido: true, completo: true, max: 80 },
    { nombre: "stock_minimo", etiqueta: "Stock mínimo", tipo: "number", requerido: true, min: 0, paso: "1", completo: true },
  ], fila, async (datos) => {
    await api.put(`/inventario/${fila.producto_id}`, datos);
    cerrar();
    avisar("Inventario actualizado");
    recargar();
  }, { alCancelar: cerrar }), { pequeno: true });
}

export async function vistaInventario() {
  const editar = puedeEditar();
  let pestana = "inventario";
  let soloBajo = false;
  const zona = h("div", {});
  const pestanas = h("div", { class: "pestanas", role: "tablist" });
  let productos = [];

  async function recargar() {
    zona.replaceChildren(h("div", { class: "tarjeta" }, tablaCargando(6)));
    pestanas.replaceChildren(
      ...[["inventario", "Inventario"], ["bajo", "Stock bajo"], ["movimientos", "Movimientos"]].map(([clave, texto]) =>
        h("button", { type: "button", role: "tab", class: pestana === clave ? "activa" : "", "aria-selected": String(pestana === clave),
          onclick: () => { pestana = clave; soloBajo = clave === "bajo"; recargar(); } }, texto)));
    try {
      productos = await api.get("/inventario");
      if (pestana === "movimientos") {
        const movimientos = await api.get("/inventario/movimientos", { limite: 100 });
        zona.replaceChildren(h("div", { class: "tarjeta" }, tabla([
          { titulo: "Fecha", render: (m) => h("span", { class: "secundario" }, m.fecha.slice(0, 16)) },
          { titulo: "Producto", render: (m) => h("div", {}, h("div", { class: "fuerte" }, m.producto), h("div", { class: "secundario mono" }, m.sku)) },
          { titulo: "Tipo", render: (m) => insignia(...TIPOS[m.tipo]) },
          { titulo: "Cantidad", clase: "num", render: (m) => (m.tipo === "SALIDA" ? "−" : m.cantidad > 0 && m.tipo === "AJUSTE" ? "+" : "") + numero(Math.abs(m.cantidad)) },
          { titulo: "Motivo", campo: "motivo" },
          { titulo: "Usuario", render: (m) => m.usuario || "—" },
        ], movimientos, { vacio: "Aún no hay movimientos" })));
        return;
      }
      const filas = soloBajo ? productos.filter((p) => p.estado_stock !== "DISPONIBLE") : productos;
      const alerta = soloBajo && filas.length
        ? h("div", { class: "alerta-caja aviso-amarillo", style: "margin:20px 24px 0" }, icono("alerta"),
          h("div", {}, `${filas.length} producto(s) están en o por debajo de su stock mínimo. Programa su reposición.`))
        : null;
      zona.replaceChildren(h("div", { class: "tarjeta" }, alerta, tabla([
        { titulo: "Producto", render: (p) => h("div", {}, h("div", { class: "fuerte" }, p.nombre), h("div", { class: "secundario mono" }, p.sku)) },
        { titulo: "Ubicación", campo: "ubicacion" },
        { titulo: "Cantidad", clase: "num", render: (p) => h("span", { class: "fuerte" }, numero(p.cantidad)) },
        { titulo: "Stock mínimo", clase: "num", render: (p) => numero(p.stock_minimo) },
        { titulo: "Estado", render: (p) => insigniaStock(p.estado_stock) },
        ...(editar ? [{ titulo: "", clase: "num", render: (p) => h("div", { class: "acciones" },
          botonIcono("flechas", `Movimiento de ${p.nombre}`, () => abrirMovimiento(productos, recargar, p.producto_id)),
          botonIcono("editar", `Ajustes de ${p.nombre}`, () => abrirAjustes(p, recargar))) }] : []),
      ], filas, { vacio: soloBajo ? "Ningún producto tiene stock bajo" : "No hay productos en inventario" })));
    } catch (err) {
      zona.replaceChildren(errorPagina(err, recargar));
    }
  }

  recargar();
  return h("div", {},
    encabezado("Inventario", "Existencias por producto, alertas de stock bajo y movimientos auditados",
      editar ? boton("Registrar movimiento", { icono: "flechas", clase: "boton-acento", onclick: () => abrirMovimiento(productos, recargar) }) : null),
    pestanas, zona);
}
