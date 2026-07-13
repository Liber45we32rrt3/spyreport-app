// Conexión con el backend de SpyReport (Railway) y con el panel de Tiendanube (Nexo)
import nexo from "@tiendanube/nexo";
const { connect, iAmReady, getStoreInfo } = nexo;
export const BACKEND = "https://spyreport-scraper-production.up.railway.app";
const instance = nexo.create({ clientId: "33732", log: false });
// Devuelve el ID de la tienda:
// 1. Si la app corre embebida en el panel de Tiendanube → lo pide via Nexo
// 2. Si corre suelta en el navegador (modo prueba) → lo lee de ?store_id=
export async function resolveStoreId() {
  const param = new URLSearchParams(window.location.search).get("store_id");
  try {
    await Promise.race([
      connect(instance),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
    ]);
    iAmReady(instance);
    const info = await getStoreInfo(instance);
    if (info && info.id) return String(info.id);
  } catch (_) {
    /* no estamos dentro del panel: seguimos con el fallback */
  }
  return param;
}
async function req(path, options = {}) {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
export const api = {
  competidores: (storeId) => req(`/api/tiendas/${storeId}/competidores`),
  agregarCompetidor: (storeId, url) =>
    req(`/api/tiendas/${storeId}/competidores`, {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  borrarCompetidor: (storeId, compId) =>
    req(`/api/tiendas/${storeId}/competidores/${compId}`, { method: "DELETE" }),
  comparacion: (storeId) => req(`/api/tiendas/${storeId}/comparacion`),
  suscripcion: (storeId) => req(`/api/tiendas/${storeId}/suscripcion`),
};
