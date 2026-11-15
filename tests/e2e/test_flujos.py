"""Pruebas automatizadas de interfaz (end-to-end): el navegador recorre los flujos reales del usuario."""
import uuid

from playwright.sync_api import expect

from tests.e2e.conftest import capturar, iniciar_sesion

ADMIN = ("admin@ritech.co", "Admin123*")
OPERADOR = ("operador@ritech.co", "Operador123*")
AUDITOR = ("auditor@ritech.co", "Auditor123*")


def test_login_con_contrasena_incorrecta_muestra_error(pagina):  # HU-01
    pagina.fill("#correo", "admin@ritech.co")
    pagina.fill("#contrasena", "incorrecta")
    pagina.click("button[type=submit]")
    expect(pagina.get_by_role("alert")).to_contain_text("Correo o contraseña incorrectos")


def test_login_muestra_dashboard_con_indicadores(pagina):  # HU-01 + HU-27 + HU-28
    iniciar_sesion(pagina, *ADMIN)
    expect(pagina.locator(".kpi")).to_have_count(4)
    expect(pagina.get_by_text("Valor exportado", exact=True)).to_be_visible()
    expect(pagina.get_by_text("Productos más exportados")).to_be_visible()
    expect(pagina.locator("svg.grafica rect").first).to_be_visible()
    capturar(pagina, "01-dashboard")


def test_operador_registra_producto(pagina):  # HU-04 + HU-05
    iniciar_sesion(pagina, *OPERADOR)
    pagina.goto(pagina.url.split("#")[0] + "#/productos")
    sku = f"CAF-E2E-{uuid.uuid4().hex[:4].upper()}"
    pagina.get_by_role("button", name="Nuevo producto").click()
    pagina.fill("#campo-sku", sku)
    pagina.fill("#campo-nombre", "Café Geisha de prueba")
    pagina.select_option("#campo-categoria", "CAFE")
    pagina.fill("#campo-precio", "520")
    pagina.fill("#campo-peso_kg", "35")
    pagina.fill("#campo-volumen_m3", "0.06")
    pagina.fill("#campo-stock_inicial", "25")
    pagina.fill("#campo-stock_minimo", "5")
    capturar(pagina, "02-formulario-producto")
    pagina.get_by_role("button", name="Registrar producto").click()
    expect(pagina.locator(".aviso")).to_contain_text("Producto registrado")
    pagina.fill("#filtro-q", sku)
    expect(pagina.locator("tbody tr")).to_have_count(1)
    expect(pagina.locator("tbody")).to_contain_text("Café Geisha de prueba")


def test_formulario_valida_correo_antes_de_enviar(pagina):  # HU-09 / HU-11
    iniciar_sesion(pagina, *OPERADOR)
    pagina.goto(pagina.url.split("#")[0] + "#/proveedores")
    pagina.get_by_role("button", name="Nuevo proveedor").click()
    pagina.fill("#campo-correo", "correo-sin-arroba")
    pagina.get_by_role("button", name="Registrar proveedor").click()
    expect(pagina.locator(".campo.invalido")).not_to_have_count(0)
    expect(pagina.locator("#campo-correo + .error-campo")).to_contain_text("Correo electrónico inválido")
    capturar(pagina, "03-validacion-formulario")


def test_registrar_buscar_y_eliminar_proveedor(pagina):  # HU-09 + HU-10 + HU-12
    iniciar_sesion(pagina, *OPERADOR)
    pagina.goto(pagina.url.split("#")[0] + "#/proveedores")
    nit = f"9{uuid.uuid4().int % 10**8:08d}-1"
    pagina.get_by_role("button", name="Nuevo proveedor").click()
    pagina.fill("#campo-nit", nit)
    pagina.fill("#campo-razon_social", "Finca El Mirador")
    pagina.select_option("#campo-pais_id", label="Colombia")
    pagina.fill("#campo-telefono", "+57 310 555 1234")
    pagina.fill("#campo-correo", "ventas@elmirador.co")
    pagina.fill("#campo-direccion", "Vereda La Plata, Huila")
    pagina.get_by_role("button", name="Registrar proveedor").click()
    expect(pagina.locator(".aviso")).to_contain_text("Proveedor registrado")
    pagina.fill("#filtro-q", nit)
    expect(pagina.locator("tbody")).to_contain_text("Finca El Mirador")
    pagina.get_by_role("button", name="Eliminar Finca El Mirador").click()
    pagina.locator(".modal").get_by_role("button", name="Eliminar").click()
    expect(pagina.locator(".aviso").last).to_contain_text("Proveedor eliminado")
    expect(pagina.locator("tbody")).to_contain_text("No hay proveedores con esos filtros")


def test_flujo_completo_de_exportacion(pagina):  # HU-17 + HU-18 + HU-20 a HU-23 + HU-25
    iniciar_sesion(pagina, *OPERADOR)
    base = pagina.url.split("#")[0]
    pagina.goto(base + "#/exportaciones")
    pagina.get_by_role("button", name="Nueva exportación").click()
    pagina.select_option("#campo-cliente_id", label="Café de Madrid SL · España")
    expect(pagina.locator("#campo-pais_destino_id")).not_to_have_value("")
    pagina.select_option("#campo-incoterm", "FOB")
    pagina.fill("#campo-puerto_salida", "Cartagena")
    pagina.get_by_role("button", name="Crear exportación").click()
    expect(pagina.locator(".insignia").first).to_have_text("Borrador")

    pagina.select_option("#campo-producto_id", index=1)
    pagina.fill("#campo-cantidad", "10")
    pagina.get_by_role("button", name="Agregar producto").click()
    expect(pagina.get_by_text("1 referencia")).to_be_visible()

    pagina.fill("#campo-fecha_embarque", "2026-12-01")
    pagina.fill("#campo-fecha_estimada_llegada", "2026-12-20")
    pagina.get_by_role("button", name="Guardar fechas").click()
    expect(pagina.locator(".aviso").last).to_contain_text("Fechas registradas")

    pagina.select_option("#campo-tipo", "MARITIMO")
    pagina.fill("#campo-empresa", "Hapag-Lloyd")
    pagina.fill("#campo-numero_guia", "HLCU-CTG-000777")
    pagina.get_by_role("button", name="Registrar transporte").click()
    expect(pagina.locator(".aviso").last).to_contain_text("Transporte registrado")

    pagina.get_by_role("button", name="Confirmar exportación").click()
    pagina.locator(".modal").get_by_role("button", name="Confirmar exportación").click()
    expect(pagina.locator(".encabezado .insignia")).to_have_text("Confirmada")
    capturar(pagina, "04-exportacion-confirmada")

    pagina.get_by_role("button", name="Marcar en tránsito").click()
    pagina.locator(".modal").get_by_role("button", name="Marcar en tránsito").click()
    expect(pagina.locator(".encabezado .insignia")).to_have_text("En tránsito")


def test_fecha_de_llegada_anterior_se_marca_en_el_formulario(pagina):  # HU-22
    iniciar_sesion(pagina, *OPERADOR)
    pagina.goto(pagina.url.split("#")[0] + "#/exportaciones/4")
    pagina.fill("#campo-fecha_embarque", "2026-12-10")
    pagina.fill("#campo-fecha_estimada_llegada", "2026-12-01")
    pagina.get_by_role("button", name="Guardar fechas").click()
    expect(pagina.locator("#campo-fecha_estimada_llegada + .error-campo")).to_contain_text("anterior")


def test_pestana_stock_bajo_muestra_alerta(pagina):  # HU-24 + HU-26
    iniciar_sesion(pagina, *ADMIN)
    pagina.goto(pagina.url.split("#")[0] + "#/inventario")
    pagina.get_by_role("tab", name="Stock bajo").click()
    expect(pagina.locator(".alerta-caja")).to_contain_text("por debajo de su stock mínimo")
    expect(pagina.locator("tbody .insignia.i-alerta").first).to_be_visible()
    capturar(pagina, "05-stock-bajo")


def test_registrar_entrada_de_inventario(pagina):  # HU-25
    iniciar_sesion(pagina, *OPERADOR)
    pagina.goto(pagina.url.split("#")[0] + "#/inventario")
    pagina.get_by_role("button", name="Registrar movimiento").click()
    pagina.select_option("#campo-producto_id", index=1)
    pagina.select_option("#campo-tipo", "ENTRADA")
    pagina.fill("#campo-cantidad", "15")
    pagina.fill("#campo-motivo", "Compra a cooperativa (prueba e2e)")
    pagina.locator(".modal").get_by_role("button", name="Registrar movimiento").click()
    expect(pagina.locator(".aviso")).to_contain_text("ahora hay")
    pagina.get_by_role("tab", name="Movimientos").click()
    expect(pagina.locator("tbody tr").first).to_contain_text("Compra a cooperativa (prueba e2e)")


def test_auditor_solo_consulta_y_descarga_reportes(pagina):  # HU-03 + HU-30
    iniciar_sesion(pagina, *AUDITOR)
    base = pagina.url.split("#")[0]
    pagina.goto(base + "#/productos")
    expect(pagina.locator("tbody tr").first).to_be_visible()
    expect(pagina.get_by_role("button", name="Nuevo producto")).to_have_count(0)
    expect(pagina.locator("button[title^='Editar']")).to_have_count(0)
    pagina.goto(base + "#/reportes")
    with pagina.expect_download() as descarga:
        pagina.get_by_role("button", name="Descargar CSV").first.click()
    assert descarga.value.suggested_filename.startswith("reporte-exportaciones")
    capturar(pagina, "06-reportes")


def test_operador_no_ve_reportes_ni_usuarios(pagina):  # HU-03
    iniciar_sesion(pagina, *OPERADOR)
    expect(pagina.locator(".menu")).not_to_contain_text("Usuarios")
    expect(pagina.locator(".menu")).not_to_contain_text("Reportes")
    pagina.goto(pagina.url.split("#")[0] + "#/usuarios")
    pagina.wait_for_url("**/#/dashboard")  # la ruta protegida lo devuelve al dashboard


def test_busqueda_global(pagina):  # HU-29
    iniciar_sesion(pagina, *ADMIN)
    caja = pagina.get_by_label("Búsqueda global")
    caja.fill("hamburg")
    caja.press("Enter")
    expect(pagina.locator("h1")).to_contain_text("Resultados para")
    expect(pagina.locator(".resultado-grupo").filter(has_text="Clientes")).to_contain_text("Hamburg Kaffee Import GmbH")
    capturar(pagina, "07-busqueda")


def test_diseno_responsive_con_menu_movil(nueva_pagina):
    pagina = nueva_pagina(390, 844)
    iniciar_sesion(pagina, *OPERADOR)
    menu = pagina.locator(".lateral")
    expect(menu).not_to_be_in_viewport()
    pagina.get_by_role("button", name="Abrir menú").click()
    expect(menu).to_be_in_viewport()
    pagina.locator(".menu").get_by_role("link", name="Inventario").click()
    expect(pagina.locator("h1")).to_have_text("Inventario")
    expect(menu).not_to_be_in_viewport()
    capturar(pagina, "08-movil")


def test_cerrar_sesion(pagina):  # HU-02
    iniciar_sesion(pagina, *ADMIN)
    pagina.get_by_role("button", name="Cerrar sesión").click()
    expect(pagina.locator("#correo")).to_be_visible()
    pagina.goto(pagina.url.split("#")[0] + "#/dashboard")
    expect(pagina.locator("#correo")).to_be_visible()
