// URL del backend. En local apunta a Flask; en Vercel, al servicio de Render.
// Cambia API_PRODUCCION por la URL real de tu servicio en Render.
(function () {
  const API_PRODUCCION = "https://cafe-exportacion-backend.onrender.com/api";
  const esLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  window.APP_CONFIG = {
    API_URL: window.__API_URL__ || (esLocal ? "http://127.0.0.1:5000/api" : API_PRODUCCION),
  };
})();
