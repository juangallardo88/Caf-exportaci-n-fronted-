# Café Exportación · Frontend

Interfaz web del **Sistema de Gestión Logística, Exportaciones y Control de Inventario** de RiTech SAS. Se conecta a la API del [backend](https://github.com/juangallardo88/Caf-exportaci-n-backend) y se despliega en Vercel.

- **Tecnología:** HTML5, CSS3 y JavaScript moderno (módulos ES), sin framework ni paso de compilación
- **Pruebas automatizadas de interfaz:** Playwright + pytest, en GitHub Actions
- **Despliegue:** Vercel (sitio estático)

## Funcionalidades

| Módulo | Historias | Qué permite |
|---|---|---|
| Inicio de sesión | HU-01 a HU-03 | Login con JWT, cierre de sesión, menú y acciones según el rol |
| Dashboard | HU-27, HU-28 | Indicadores, valor exportado por mes, exportaciones por estado, productos más exportados y destinos |
| Productos | HU-04 a HU-08 | Registrar, consultar, filtrar, editar, eliminar y ver disponibilidad |
| Proveedores | HU-09 a HU-12 | Registrar, buscar por nombre o NIT, filtrar por país, editar y eliminar |
| Clientes | HU-13 a HU-15 | Registrar, buscar por nombre o Tax ID, editar |
| Países | HU-16 | Registrar y editar (administrador) |
| Exportaciones | HU-17 a HU-23 | Crear, agregar productos con validación de stock, costos, fechas, transporte y avance por estados |
| Inventario | HU-24 a HU-26 | Existencias, alertas de stock bajo, movimientos auditados |
| Búsqueda y reportes | HU-29, HU-30 | Búsqueda global y descarga de reportes CSV para Excel |

## Estructura

```
index.html            Punto de entrada
config.js             URL del backend (local o producción)
css/estilos.css       Identidad visual y diseño responsive
js/app.js             Enrutador y layout con menú por rol
js/api.js             Cliente HTTP: token, errores y sesión vencida
js/sesion.js          Sesión y permisos del usuario
js/ui.js              Componentes: tablas, formularios con validación, modales, avisos
js/graficas.js        Gráficas en SVG
js/vistas/            Una vista por módulo
tests/e2e/            Pruebas automatizadas de interfaz
```

Todo el contenido dinámico se inserta como texto (nunca como HTML), lo que evita inyección de código (XSS). Los formularios validan en el navegador y además muestran bajo cada campo los errores que devuelve el backend.

## Ejecutar en local

1. Levanta el backend (ver su README) en `http://127.0.0.1:5000`.
2. Sirve esta carpeta:
   ```bash
   python -m http.server 5173
   ```
3. Abre `http://127.0.0.1:5173` e ingresa con `admin@ritech.co / Admin123*`.

## Pruebas automatizadas de interfaz (E2E)

Levantan el backend real con datos de demostración y recorren los flujos en Chromium, como lo haría un usuario: inicio de sesión, registro de productos y proveedores, validación de formularios, flujo completo de una exportación, inventario, permisos del auditor, descarga de reportes, búsqueda, menú móvil y cierre de sesión.

```bash
pip install -r requirements-dev.txt
python -m playwright install chromium
BACKEND_DIR=../Caf-exportaci-n-backend python -m pytest tests/e2e -v
```

Las capturas de pantalla quedan en `tests/e2e/capturas/`. En GitHub se ejecutan en cada push (pestaña **Actions**) y las capturas se descargan como artefacto `evidencias-e2e`.

## Despliegue en Vercel

1. Edita `config.js` y pon en `API_PRODUCCION` la URL de tu backend en Render, terminada en `/api`.
2. En Vercel: **Add New → Project**, importa este repositorio. *Framework Preset:* **Other**, sin comando de build.
3. Copia la URL que te da Vercel (por ejemplo `https://cafe-exportacion.vercel.app`) y ponla en la variable `CORS_ORIGINS` del backend en Render.
