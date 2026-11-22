"""Pruebas automatizadas de interfaz (end-to-end): el navegador recorre los flujos reales del usuario."""
import re
import uuid

import pytest
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


# ---------- Paquete 1 de mejoras: progreso, servidor dormido y tablas en celular ----------

RETRASAR_FETCH = """
  const original = window.fetch.bind(window);
  window.fetch = (url, opciones) => {
    const ruta = String(url);
    const espera = ruta.includes('/salud') ? %d : ruta.includes('/auth/login') ? %d : 0;
    return new Promise((listo) => setTimeout(listo, espera)).then(() => original(url, opciones));
  };
"""


def ir(pagina, ruta):
    pagina.goto(pagina.url.split("#")[0] + "#" + ruta)


def test_exportacion_entregada_muestra_todos_los_pasos_completados(pagina):  # HU-23
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/exportaciones/1")
    expect(pagina.locator("h1")).to_have_text("EXP-2026-0001")
    expect(pagina.locator(".paso.hecho")).to_have_count(4)
    expect(pagina.locator(".paso.actual")).to_have_count(0)


def test_exportacion_cancelada_muestra_aviso_y_ningun_paso_activo(pagina):  # HU-23
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/exportaciones/5")
    expect(pagina.locator("h1")).to_have_text("EXP-2026-0005")
    expect(pagina.get_by_role("status").filter(has_text="Exportación cancelada")).to_be_visible()
    expect(pagina.locator(".pasos-cancelados .paso")).to_have_count(4)
    expect(pagina.locator(".paso.hecho, .paso.actual")).to_have_count(0)


def test_login_indica_que_el_servidor_esta_listo(pagina):  # HU-01
    expect(pagina.locator(".estado-servidor")).to_have_text("Servidor listo")


def test_login_explica_la_espera_cuando_el_servidor_esta_dormido(pagina):  # HU-01
    pagina.context.add_init_script(RETRASAR_FETCH % (8000, 8000))
    pagina.reload()
    expect(pagina.locator(".estado-servidor")).to_have_text("Conectando con el servidor…")
    pagina.fill("#correo", ADMIN[0])
    pagina.fill("#contrasena", ADMIN[1])
    pagina.click("button[type=submit]")
    expect(pagina.locator(".login-espera")).to_contain_text("El servidor estaba en pausa", timeout=6000)
    expect(pagina.locator(".kpi-valor").first).to_be_visible(timeout=20000)


def test_tablas_se_ven_como_tarjetas_en_celular(nueva_pagina):  # HU-17 + diseño responsive
    pagina = nueva_pagina(390, 844)
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/exportaciones")
    tarjeta = pagina.locator(".tabla-contenedor tbody tr").first
    expect(tarjeta).to_be_visible()
    ancho_pagina = pagina.evaluate("document.documentElement.scrollWidth")
    assert ancho_pagina <= 390, f"La página se desborda: {ancho_pagina}px"
    # El estado y el total quedan dentro de la pantalla, con su etiqueta.
    for etiqueta in ("Estado", "Total"):
        celda = tarjeta.locator(f'td[data-etiqueta="{etiqueta}"]')
        expect(celda).to_be_in_viewport()
    expect(pagina.locator(".tabla-contenedor thead")).not_to_be_in_viewport()
    capturar(pagina, "09-tarjetas-movil")


def test_tablas_siguen_como_tabla_en_escritorio(pagina):
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/productos")
    expect(pagina.locator(".tabla-contenedor thead")).to_be_visible()
    assert pagina.locator(".tabla-contenedor tbody tr").first.evaluate("e => getComputedStyle(e).display") == "table-row"


# ---------- Paquete Claridad: pendientes, siguiente paso, ayudas y guía ----------

def test_dashboard_muestra_pendientes_y_explica_indicadores(pagina):  # HU-27
    iniciar_sesion(pagina, *ADMIN)
    panel = pagina.locator(".tarjeta", has=pagina.get_by_role("heading", name="Qué requiere atención"))
    expect(panel).to_be_visible()
    expect(panel.locator(".pendiente").first).to_be_visible()
    expect(pagina.locator(".kpi-explicacion")).to_have_count(4)
    capturar(pagina, "10-pendientes")


def test_pendiente_de_stock_bajo_abre_la_pestana_filtrada(pagina):  # HU-26 + HU-27
    iniciar_sesion(pagina, *ADMIN)
    pagina.get_by_role("link", name="Ver productos").click()
    expect(pagina.locator("h1")).to_have_text("Inventario")
    expect(pagina.get_by_role("tab", name="Stock bajo")).to_have_attribute("aria-selected", "true")


def test_enlace_filtrado_abre_exportaciones_por_estado(pagina):  # HU-17
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/exportaciones?estado=BORRADOR")
    expect(pagina.locator("#filtro-estado")).to_have_value("BORRADOR")
    expect(pagina.locator(".tabla-contenedor tbody tr").first.get_by_text("Borrador")).to_be_visible()


def test_detalle_explica_el_estado_y_el_siguiente_paso(pagina):  # HU-20 + HU-21
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/exportaciones/4")
    recuadro = pagina.locator(".que-sigue")
    expect(recuadro).to_contain_text("aún no descuenta inventario")
    expect(recuadro).to_contain_text("Siguiente paso")
    expect(recuadro).to_contain_text("Confirmar exportación")
    ayuda = pagina.locator(".dato .termino-ayuda").first
    expect(ayuda).to_have_attribute("data-ayuda", re.compile("Regla internacional"))
    expect(pagina.get_by_text("Entregado con derechos pagados")).to_be_visible()


def test_auditor_ve_el_estado_sin_instrucciones(pagina):  # HU-03 + HU-20
    iniciar_sesion(pagina, *AUDITOR)
    ir(pagina, "/exportaciones/3")
    recuadro = pagina.locator(".que-sigue")
    expect(recuadro).to_contain_text("descontaron del inventario")
    expect(recuadro).not_to_contain_text("Siguiente paso")


def test_formulario_explica_el_incoterm_elegido(pagina):  # HU-17
    iniciar_sesion(pagina, *OPERADOR)
    ir(pagina, "/exportaciones")
    pagina.get_by_role("button", name="Nueva exportación").click()
    ayuda = pagina.locator("#campo-incoterm").locator("xpath=ancestor::div[contains(@class,'campo')]").locator(".ayuda")
    expect(ayuda).to_contain_text("Regla internacional")
    pagina.select_option("#campo-incoterm", "CIF")
    expect(ayuda).to_contain_text("paga el flete y el seguro hasta el puerto de destino")


def test_guia_de_uso_explica_proceso_roles_y_terminos(pagina):
    iniciar_sesion(pagina, *OPERADOR)
    pagina.locator(".menu").get_by_role("link", name="Guía de uso").click()
    expect(pagina.locator("h1")).to_have_text("Guía de uso")
    expect(pagina.locator(".recorrido-paso")).to_have_count(6)
    expect(pagina.locator(".columna-propia")).to_have_text("Operador")
    expect(pagina.locator(".lista-terminos").first).to_contain_text("Franco a bordo")
    capturar(pagina, "11-guia")


# ---------- Video de marca: inicio de sesión y fondo de las pantallas internas ----------

VIDEO_AVANZA = """async (selector) => {
  const v = document.querySelector(selector);
  if (!v || v.paused) return false;
  const inicio = v.currentTime;
  await new Promise((listo) => setTimeout(listo, 600));
  return v.currentTime > inicio;
}"""


def test_inicio_reproduce_el_video_de_marca(pagina):
    expect(pagina.locator(".video-login video")).to_have_count(1)
    pagina.wait_for_function("document.querySelector('.video-login video').readyState >= 2")
    assert pagina.evaluate(VIDEO_AVANZA, ".video-login video"), "El video del inicio no se está reproduciendo"
    expect(pagina.locator(".video-login video")).to_have_js_property("muted", True)
    expect(pagina.locator(".video-control")).to_have_count(0)


def test_video_de_fondo_sigue_al_cambiar_de_pantalla(pagina):
    iniciar_sesion(pagina, *ADMIN)
    pagina.wait_for_function("document.querySelector('.video-app video').readyState >= 2")
    pagina.evaluate("window.__videoInicial = document.querySelector('.video-app video')")
    ir(pagina, "/exportaciones")
    expect(pagina.locator("h1")).to_have_text("Exportaciones")
    ir(pagina, "/guia")
    expect(pagina.locator("h1")).to_have_text("Guía de uso")
    assert pagina.evaluate("document.querySelector('.video-app video') === window.__videoInicial"), "El video se reinició"
    assert pagina.evaluate(VIDEO_AVANZA, ".video-app video"), "El video de fondo no se está reproduciendo"


def test_video_de_fondo_no_tiene_boton_y_sigue_aunque_antes_se_hubiera_pausado(pagina):
    # Quien pausó con la versión anterior no debe quedar con el video detenido.
    pagina.evaluate("localStorage.setItem('cafe.video.pausado', '1')")
    pagina.reload()
    iniciar_sesion(pagina, *ADMIN)
    pagina.wait_for_function("document.querySelector('.video-app video').readyState >= 2")
    assert pagina.evaluate(VIDEO_AVANZA, ".video-app video"), "El video quedó pausado por la preferencia antigua"
    expect(pagina.locator(".video-control")).to_have_count(0)
    assert pagina.evaluate("localStorage.getItem('cafe.video.pausado')") is None


def test_con_movimiento_reducido_el_video_queda_quieto(pagina):
    pagina.emulate_media(reduced_motion="reduce")
    pagina.reload()
    video = pagina.locator(".video-login video")
    expect(video).to_have_attribute("poster", "media/cafe-inicio.jpg")
    pagina.wait_for_timeout(800)
    assert pagina.evaluate("document.querySelector('.video-login video').paused")


def test_cifras_del_dashboard_caben_en_su_tarjeta(nueva_pagina):
    for ancho in (1280, 1440):
        pagina = nueva_pagina(ancho, 900)
        iniciar_sesion(pagina, *ADMIN)
        cortadas = pagina.evaluate("[...document.querySelectorAll('.kpi-valor')].filter((e) => e.scrollWidth > e.clientWidth).length")
        assert cortadas == 0, f"{cortadas} cifra(s) cortada(s) a {ancho}px"


def test_pantallas_internas_usan_crema_y_dejan_ver_el_video(pagina):
    iniciar_sesion(pagina, *ADMIN)
    fondo_tarjeta = pagina.evaluate("getComputedStyle(document.querySelector('.principal .tarjeta')).backgroundColor")
    r, g, b = [int(float(x)) for x in re.findall(r"[\d.]+", fondo_tarjeta)[:3]]
    assert r + g + b < 3 * 240, f"Las tarjetas siguen casi blancas: {fondo_tarjeta}"
    velo = pagina.evaluate("getComputedStyle(document.querySelector('.video-app'), '::after').backgroundImage")
    opacidades = [float(x) for x in re.findall(r"rgba\([^)]*,\s*([\d.]+)\)", velo)]
    assert opacidades and max(opacidades) <= 0.5, f"El velo tapa demasiado el video: {velo}"
    panel = pagina.evaluate("getComputedStyle(document.querySelector('.principal .encabezado')).backgroundColor")
    assert panel not in ("rgba(0, 0, 0, 0)", "transparent"), "El título no tiene panel para leerse sobre el video"


def test_logo_de_granos_carga_en_inicio_menu_y_pestana(pagina):
    logo_inicio = pagina.locator(".login-arte .marca-logo")
    expect(logo_inicio).to_have_attribute("src", "media/logo.svg")
    pagina.wait_for_function("document.querySelector('.login-arte .marca-logo').naturalWidth > 0")
    icono = pagina.evaluate("document.querySelector('link[rel=icon]').getAttribute('href')")
    assert icono == "media/icono.svg"
    respuesta = pagina.request.get(pagina.url.split("#")[0] + icono)
    assert respuesta.ok and "<svg" in respuesta.text()
    iniciar_sesion(pagina, *ADMIN)
    pagina.wait_for_function("document.querySelector('.lateral .marca-logo')?.naturalWidth > 0")
    ancho = pagina.evaluate("document.querySelector('.lateral .marca-logo').getBoundingClientRect().width")
    assert ancho >= 120, f"El logo del menú se ve muy pequeño: {ancho}px"



# ---------- Arreglos de acabado profesional ----------

def test_auditor_ve_pendientes_como_informacion(pagina):  # HU-03 + HU-27
    iniciar_sesion(pagina, *AUDITOR)
    panel = pagina.locator(".tarjeta", has=pagina.get_by_role("heading", name="Qué requiere atención"))
    expect(panel.locator(".pendiente").first).to_be_visible()
    texto = panel.inner_text().lower()
    for instruccion in ("confírma", "márca", "registra el transporte", "revisar"):
        assert instruccion not in texto, f"El auditor ve una instrucción que no puede ejecutar: {instruccion}"


def test_menu_lateral_cabe_sin_desplazamiento_en_portatil(nueva_pagina):
    pagina = nueva_pagina(1366, 768)
    iniciar_sesion(pagina, *ADMIN)
    cabe = pagina.evaluate("(() => { const m = document.querySelector('.menu'); return m.scrollHeight <= m.clientHeight + 1; })()")
    assert cabe, "El menú lateral necesita desplazamiento en una pantalla de 1366 × 768"
    expect(pagina.locator(".menu").get_by_role("link", name="Guía de uso")).to_be_in_viewport()


def test_grafica_mensual_no_salta_meses(pagina):  # HU-28
    iniciar_sesion(pagina, *ADMIN)
    grafica = pagina.get_by_role("img", name="Valor exportado por mes")
    etiquetas = grafica.evaluate("g => [...g.querySelectorAll('text')].map((t) => t.textContent)")
    meses = [t for t in etiquetas if t[:3] in ("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")]
    nombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    indices = [nombres.index(m[:3]) + 12 * int(m[-2:]) for m in meses]
    assert indices == list(range(indices[0], indices[0] + len(indices))), f"Faltan meses en la gráfica: {meses}"


def test_codigos_usan_la_fuente_del_sitio(pagina):
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/exportaciones")
    fuente = pagina.locator("td .mono").first.evaluate("e => getComputedStyle(e).fontFamily")
    assert fuente.startswith("Inter"), f"Los códigos usan otra fuente: {fuente}"


def test_tablas_se_ordenan_y_muestran_contador(pagina):  # HU-17
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/productos")
    expect(pagina.locator(".tabla-contador")).to_contain_text("Mostrando 1–")
    encabezado = pagina.locator("th", has=pagina.locator(".orden", has_text="Precio"))
    encabezado.locator(".orden").click()
    expect(encabezado).to_have_attribute("aria-sort", "ascending")
    encabezado.locator(".orden").click()
    expect(encabezado).to_have_attribute("aria-sort", "descending")
    precios = pagina.locator("tbody tr td:nth-child(4)").all_inner_texts()
    valores = [float(p.replace("US$", "").replace(".", "").replace(",", ".").strip()) for p in precios]
    assert valores == sorted(valores, reverse=True), f"No quedó ordenado de mayor a menor: {precios}"


def test_formulario_de_producto_agrupa_campos_y_muestra_unidades(pagina):  # HU-04
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/productos")
    pagina.get_by_role("button", name="Nuevo producto").click()
    modal = pagina.get_by_role("dialog")
    for seccion in ("Identificación", "Empaque y transporte", "Inventario inicial", "Detalle"):
        expect(modal.locator(".formulario-seccion", has_text=seccion)).to_be_visible()
    expect(modal.locator("#campo-sku")).to_have_attribute("placeholder", "Ej.: CAF-NAR-70")
    expect(modal.locator(".sufijo", has_text="kg")).to_be_visible()
    expect(modal.locator("#campo-precio")).to_have_attribute("aria-label", "Precio unitario en dólares")


def test_inicio_permite_ver_la_contrasena_y_marca_la_demo(pagina):  # HU-01
    pagina.fill("#contrasena", "secreto")
    boton = pagina.get_by_role("button", name="Mostrar contraseña")
    boton.click()
    expect(pagina.locator("#contrasena")).to_have_attribute("type", "text")
    pagina.get_by_role("button", name="Ocultar contraseña").click()
    expect(pagina.locator("#contrasena")).to_have_attribute("type", "password")
    expect(pagina.locator(".demo-etiqueta")).to_have_text("Modo demostración")


# ---------- Mejoras nuevas: mapa de rutas, seguimiento del embarque y búsqueda rápida ----------

def test_dashboard_muestra_mapa_de_rutas(pagina):  # HU-28
    iniciar_sesion(pagina, *ADMIN)
    mapa = pagina.locator(".mapa-rutas")
    expect(mapa).to_be_visible()
    assert mapa.locator(".mapa-arco").count() >= 1
    # EXP-2026-0001 (entregada, Buenaventura → Alemania) no cambia durante las pruebas.
    expect(mapa).to_have_attribute("aria-label", re.compile("Buenaventura a Alemania"))
    leyenda = pagina.locator(".mapa-leyenda")
    expect(leyenda).to_contain_text("Buenaventura → Alemania")
    # Cada exportación en tránsito se marca en la leyenda.
    en_transito = pagina.evaluate("document.querySelectorAll('.mapa-arco.en-transito').length")
    assert leyenda.locator(".mapa-chip", has_text="En tránsito").count() == en_transito


def test_detalle_en_transito_muestra_el_barco_en_la_ruta(pagina):  # HU-21 + HU-23
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/exportaciones/2")
    trayecto = pagina.get_by_role("region", name="Seguimiento del embarque")
    expect(trayecto).to_be_visible()
    expect(trayecto).to_contain_text("Cartagena")
    expect(trayecto).to_contain_text("Bélgica")
    avance = int(trayecto.get_by_role("progressbar").get_attribute("aria-valuenow"))
    assert 0 <= avance <= 100
    expect(trayecto.locator(".trayecto-barco svg")).to_be_visible()


def test_entregada_muestra_el_viaje_completo(pagina):
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/exportaciones/1")
    trayecto = pagina.get_by_role("region", name="Seguimiento del embarque")
    expect(trayecto.get_by_role("progressbar")).to_have_attribute("aria-valuenow", "100")
    expect(trayecto).to_contain_text("Viaje de 26 días completado")


def test_ctrl_k_busca_y_abre_un_registro(pagina):  # HU-29
    iniciar_sesion(pagina, *ADMIN)
    pagina.keyboard.press("Control+k")
    dialogo = pagina.get_by_role("dialog", name="Búsqueda rápida")
    expect(dialogo).to_be_visible()
    pagina.keyboard.type("hamburg")
    expect(dialogo.get_by_role("option", name=re.compile("EXP-2026-0001"))).to_be_visible()
    pagina.keyboard.press("Enter")
    expect(pagina.locator("h1")).to_have_text("EXP-2026-0001")
    expect(dialogo).to_have_count(0)


def test_ctrl_k_ejecuta_accion_nueva_exportacion(pagina):
    iniciar_sesion(pagina, *OPERADOR)
    pagina.get_by_role("button", name="Abrir búsqueda rápida (Ctrl + K)").click()
    pagina.keyboard.type("nueva exportación")
    pagina.keyboard.press("Enter")
    expect(pagina.get_by_role("dialog", name="Nueva exportación")).to_be_visible()


def test_auditor_no_ve_acciones_en_la_busqueda_rapida(pagina):
    iniciar_sesion(pagina, *AUDITOR)
    pagina.keyboard.press("Control+k")
    dialogo = pagina.get_by_role("dialog", name="Búsqueda rápida")
    expect(dialogo.get_by_role("group", name="Pantallas")).to_be_visible()
    expect(dialogo.get_by_role("group", name="Acciones")).to_have_count(0)
    pagina.keyboard.press("Escape")
    expect(dialogo).to_have_count(0)


def test_hoja_de_embarque_se_imprime_sin_el_resto_de_la_app(pagina):  # HU-20
    iniciar_sesion(pagina, *AUDITOR)  # cualquier rol puede sacar la hoja
    ir(pagina, "/exportaciones/2")
    expect(pagina.locator("h1")).to_have_text("EXP-2026-0002")
    pagina.evaluate("() => { window.__impresiones = 0; window.print = () => { window.__impresiones++; }; }")
    pagina.get_by_role("button", name="Hoja de embarque (PDF)").click()
    pagina.wait_for_function("window.__impresiones === 1")
    expect(pagina).to_have_title("Hoja de embarque EXP-2026-0002")
    pagina.emulate_media(media="print")
    hoja = pagina.get_by_role("article", name="Hoja de embarque EXP-2026-0002")
    expect(hoja).to_be_visible()
    expect(hoja).to_contain_text("Antwerp Cocoa Traders BV")
    expect(hoja).to_contain_text("Cartagena, Colombia")
    expect(hoja).to_contain_text("Recibí conforme")
    expect(pagina.locator(".app")).to_be_hidden()
    pagina.emulate_media(media="screen")
    pagina.evaluate("window.dispatchEvent(new Event('afterprint'))")
    expect(hoja).to_have_count(0)
    expect(pagina).to_have_title(re.compile("Café Exportación"))


def test_hoja_de_exportacion_cancelada_lleva_marca_de_agua(pagina):
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/exportaciones/5")
    pagina.evaluate("() => { window.print = () => {}; }")
    pagina.get_by_role("button", name="Hoja de embarque (PDF)").click()
    expect(pagina.locator(".hoja-marca")).to_have_text("Cancelada")


def test_tabla_sin_resultados_muestra_ilustracion_y_pista(pagina):
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/productos")
    pagina.get_by_label("Buscar").first.fill("zzzz-no-existe")
    vacio = pagina.locator(".vacio-buscar")
    expect(vacio).to_contain_text("No hay productos con esos filtros")
    expect(vacio).to_contain_text("quita algún filtro")
    expect(vacio.locator(".ilustracion svg")).to_be_visible()


def test_busqueda_global_sin_resultados_orienta_al_usuario(pagina):  # HU-29
    iniciar_sesion(pagina, *ADMIN)
    ir(pagina, "/buscar?q=zzzz-no-existe")
    vacio = pagina.locator(".vacio-buscar")
    expect(vacio).to_contain_text("No encontramos nada")
    expect(vacio.get_by_role("link", name="Volver al inicio")).to_be_visible()


CLIMA_TIERRA = {"3.88": (26.4, 63, 14, 27), "10.39": (31.2, 2, 22, 35), "11.24": (32.0, 0, 34, 48), "10.96": (29.1, 95, 28, 52)}


def simular_clima(pagina, falla=False):
    from urllib.parse import parse_qs, urlparse

    def responder(ruta):
        if falla:
            return ruta.abort()
        consulta = parse_qs(urlparse(ruta.request.url).query)
        lats = consulta["latitude"][0].split(",")
        if "marine" in ruta.request.url:
            return ruta.fulfill(json=[{"current": {"wave_height": 1.5}} for _ in lats])
        datos = []
        for lat in lats:
            t, codigo, viento, rafagas = CLIMA_TIERRA[lat]
            datos.append({"current": {"time": "2026-11-22T11:45", "temperature_2m": t, "weather_code": codigo,
                                      "wind_speed_10m": viento, "wind_gusts_10m": rafagas}})
        return ruta.fulfill(json=datos)

    pagina.route(re.compile(r"https://(marine-)?api\.open-meteo\.com/.*"), responder)


def test_dashboard_muestra_clima_y_alerta_en_los_puertos(pagina):
    simular_clima(pagina)
    iniciar_sesion(pagina, *ADMIN)
    clima = pagina.get_by_role("region", name="Clima en los puertos de salida")
    expect(clima.locator(".clima-puerto")).to_have_count(4)
    barranquilla = clima.locator(".clima-puerto", has_text="Barranquilla")
    expect(barranquilla).to_have_class(re.compile("clima-alto"))
    expect(barranquilla).to_contain_text("Tormenta: posible demora en el zarpe")
    expect(clima.locator(".clima-puerto", has_text="Buenaventura")).to_contain_text("26 °C")
    expect(clima.locator(".clima-puerto", has_text="Santa Marta")).to_have_class(re.compile("clima-medio"))
    expect(clima).to_contain_text("Open-Meteo.com")


def test_si_el_clima_falla_el_dashboard_sigue_y_ofrece_reintentar(pagina):
    simular_clima(pagina, falla=True)
    iniciar_sesion(pagina, *ADMIN)
    clima = pagina.get_by_role("region", name="Clima en los puertos de salida")
    expect(clima).to_contain_text("No se pudo consultar el clima")
    expect(clima.get_by_role("button", name="Reintentar")).to_be_visible()
    expect(pagina.locator(".mapa-rutas")).to_be_visible()


# --- Política de seguridad de contenido (CSP) de vercel.json ---
VIGILAR_CSP = """
window.__violaciones = [];
document.addEventListener('securitypolicyviolation', (e) =>
  window.__violaciones.push(e.violatedDirective + ' -> ' + (e.blockedURI || 'inline')));
"""


@pytest.fixture
def pagina_con_csp(navegador, servidores, web_con_cabeceras):
    contexto = navegador.new_context(viewport={"width": 1440, "height": 900})
    contexto.add_init_script(f"window.__API_URL__ = '{servidores['api']}'")
    contexto.add_init_script(VIGILAR_CSP)
    contexto.set_default_timeout(10_000)
    pagina = contexto.new_page()
    simular_clima(pagina)
    respuesta = pagina.goto(web_con_cabeceras + "/#/login")
    pagina.respuesta_inicial = respuesta
    yield pagina
    contexto.close()


def violaciones(pagina):
    return pagina.evaluate("window.__violaciones")


def test_vercel_envia_politica_de_seguridad_estricta(pagina_con_csp):
    csp = pagina_con_csp.respuesta_inicial.headers["content-security-policy"]
    script_src = next(d for d in csp.split(";") if d.strip().startswith("script-src"))
    assert "'unsafe-inline'" not in script_src and "'unsafe-eval'" not in script_src
    assert "frame-ancestors 'none'" in csp
    assert "object-src 'none'" in csp
    assert "https://api.open-meteo.com" in csp


def test_la_app_completa_funciona_con_la_politica_de_seguridad(pagina_con_csp):
    pagina = pagina_con_csp
    expect(pagina.locator(".estado-servidor")).to_have_text("Servidor listo")
    iniciar_sesion(pagina, *ADMIN)
    expect(pagina.locator(".mapa-rutas")).to_be_visible()
    expect(pagina.locator(".clima-puerto")).to_have_count(4)  # Open-Meteo permitido en connect-src
    # Fuentes, estilos e imágenes propias cargan
    assert pagina.evaluate("getComputedStyle(document.querySelector('.tarjeta')).borderRadius") != "0px"
    ir(pagina, "/exportaciones/2")
    expect(pagina.get_by_role("region", name="Seguimiento del embarque")).to_be_visible()
    pagina.evaluate("() => { window.print = () => {}; }")
    pagina.get_by_role("button", name="Hoja de embarque (PDF)").click()
    expect(pagina.locator(".hoja-impresion img")).to_have_js_property("complete", True)
    ir(pagina, "/productos")
    pagina.get_by_label("Buscar").first.fill("zzzz-no-existe")
    expect(pagina.locator(".vacio-buscar .ilustracion svg")).to_be_visible()
    pagina.keyboard.press("Control+k")
    expect(pagina.get_by_role("dialog", name="Búsqueda rápida")).to_be_visible()
    assert violaciones(pagina) == []


def test_la_politica_bloquea_un_script_inyectado(pagina_con_csp):
    pagina = pagina_con_csp
    pagina.evaluate("""() => {
        const s = document.createElement('script');
        s.textContent = 'window.__inyectado = true';
        document.body.append(s);
    }""")
    assert pagina.evaluate("window.__inyectado") is None
    assert any(v.startswith("script-src") for v in violaciones(pagina))


def test_la_politica_bloquea_estilos_inyectados(pagina_con_csp):
    pagina = pagina_con_csp
    pagina.evaluate("""() => {
        const s = document.createElement('style');
        s.textContent = 'body { display: none !important; }';
        document.head.append(s);
    }""")
    expect(pagina.locator("body")).to_be_visible()
    assert any(v.startswith("style-src") for v in violaciones(pagina))
