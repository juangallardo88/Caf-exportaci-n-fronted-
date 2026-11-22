"""Levanta el backend real (con datos de demostración en SQLite temporal) y el frontend estático,
y abre un navegador Chromium controlado por Playwright."""
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

RAIZ_FRONTEND = Path(__file__).resolve().parents[2]
BACKEND = Path(os.getenv("BACKEND_DIR", RAIZ_FRONTEND.parent / "caf-exportaci-n-backend")).resolve()
CAPTURAS = RAIZ_FRONTEND / "tests" / "e2e" / "capturas"


def _puerto_libre() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _esperar(url: str, segundos: int = 30):
    limite = time.time() + segundos
    while time.time() < limite:
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except Exception:
            time.sleep(0.3)
    raise RuntimeError(f"No respondió {url}")


@pytest.fixture(scope="session")
def servidores():
    if not (BACKEND / "wsgi.py").exists():
        pytest.exit(f"No se encontró el backend en {BACKEND}. Define BACKEND_DIR.", returncode=2)
    temporal = tempfile.mkdtemp()
    entorno = {
        **os.environ,
        "DATABASE_URL": f"sqlite:///{temporal}/e2e.db",
        "HASH_METHOD": "pbkdf2:sha256:1000",
        "CORS_ORIGINS": "*",
        "ENTORNO": "desarrollo",
    }
    subprocess.run([sys.executable, "-m", "flask", "--app", "wsgi", "datos-demo"], cwd=BACKEND, env=entorno, check=True)
    p_api, p_web = _puerto_libre(), _puerto_libre()
    api = subprocess.Popen([sys.executable, "-m", "flask", "--app", "wsgi", "run", "--port", str(p_api)],
                           cwd=BACKEND, env=entorno, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    web = subprocess.Popen([sys.executable, "-m", "http.server", str(p_web), "--bind", "127.0.0.1"],
                           cwd=RAIZ_FRONTEND, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        _esperar(f"http://127.0.0.1:{p_api}/api/salud")
        _esperar(f"http://127.0.0.1:{p_web}/")
        yield {"web": f"http://127.0.0.1:{p_web}", "api": f"http://127.0.0.1:{p_api}/api"}
    finally:
        api.terminate()
        web.terminate()


@pytest.fixture(scope="session")
def navegador():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


@pytest.fixture
def nueva_pagina(navegador, servidores):
    contextos = []

    def crear(ancho=1440, alto=900):
        contexto = navegador.new_context(viewport={"width": ancho, "height": alto}, accept_downloads=True)
        contexto.add_init_script(f"window.__API_URL__ = '{servidores['api']}'")
        contexto.set_default_timeout(10_000)
        contextos.append(contexto)
        pagina = contexto.new_page()
        pagina.goto(servidores["web"] + "/#/login")
        return pagina

    yield crear
    for c in contextos:
        c.close()


@pytest.fixture
def pagina(nueva_pagina):
    return nueva_pagina()


def iniciar_sesion(pagina, correo, clave):
    pagina.fill("#correo", correo)
    pagina.fill("#contrasena", clave)
    pagina.click("button[type=submit]")
    pagina.wait_for_selector(".kpi-valor")


def capturar(pagina, nombre):
    CAPTURAS.mkdir(parents=True, exist_ok=True)
    pagina.screenshot(path=str(CAPTURAS / f"{nombre}.png"), full_page=True)


def cabeceras_de_vercel(api: str) -> dict:
    """Las cabeceras de seguridad de vercel.json, ajustadas para servir en local.

    connect-src agrega el backend local y se quita upgrade-insecure-requests, que en local
    convertiría a https las llamadas a http://127.0.0.1. Todo lo demás queda igual que en producción.
    """
    import json
    from urllib.parse import urlparse

    config = json.loads((RAIZ_FRONTEND / "vercel.json").read_text(encoding="utf-8"))
    cabeceras = {c["key"]: c["value"] for bloque in config["headers"] for c in bloque["headers"]}
    origen_api = "{0.scheme}://{0.netloc}".format(urlparse(api))
    directivas = [d.strip() for d in cabeceras["Content-Security-Policy"].split(";")]
    directivas = [f"{d} {origen_api}" if d.startswith("connect-src") else d
                  for d in directivas if d != "upgrade-insecure-requests"]
    cabeceras["Content-Security-Policy"] = "; ".join(directivas)
    return cabeceras


@pytest.fixture(scope="session")
def web_con_cabeceras(servidores):
    """El frontend servido con las mismas cabeceras de seguridad que pone Vercel."""
    import functools
    import threading
    from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

    cabeceras = cabeceras_de_vercel(servidores["api"])

    class Manejador(SimpleHTTPRequestHandler):
        def end_headers(self):
            for clave, valor in cabeceras.items():
                self.send_header(clave, valor)
            super().end_headers()

        def log_message(self, *args):
            pass

    servidor = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Manejador, directory=str(RAIZ_FRONTEND)))
    hilo = threading.Thread(target=servidor.serve_forever, daemon=True)
    hilo.start()
    yield f"http://127.0.0.1:{servidor.server_address[1]}"
    servidor.shutdown()
