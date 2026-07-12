import { useEffect, useMemo, useState } from "react";
import { api, resolveStoreId } from "./api";

const FRASES_CARGA = [
  "Visitando la tienda de tu competencia…",
  "Anotando sus precios uno por uno…",
  "Contando su catálogo…",
  "Comparando contra tus productos…",
];

export default function App() {
  const [storeId, setStoreId] = useState(null);
  const [vista, setVista] = useState("cargando"); // cargando | sin-tienda | onboarding | espiando | dashboard
  const [competidores, setCompetidores] = useState([]);
  const [data, setData] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [fraseIdx, setFraseIdx] = useState(0);
  const [filtro, setFiltro] = useState("");

  // Resolver la tienda y su estado inicial
  useEffect(() => {
    (async () => {
      const id = await resolveStoreId();
      if (!id) return setVista("sin-tienda");
      setStoreId(id);
      try {
        const comps = await api.competidores(id);
        setCompetidores(comps);
        if (comps.length === 0) {
          setVista("onboarding");
        } else {
          setVista("espiando");
          cargarComparacion(id);
        }
      } catch (e) {
        setError(e.message);
        setVista("sin-tienda");
      }
    })();
  }, []);

  // Rotar frases mientras se espía
  useEffect(() => {
    if (vista !== "espiando") return;
    const t = setInterval(
      () => setFraseIdx((i) => (i + 1) % FRASES_CARGA.length),
      3500
    );
    return () => clearInterval(t);
  }, [vista]);

  async function cargarComparacion(id = storeId) {
    setVista("espiando");
    setError("");
    try {
      const d = await api.comparacion(id);
      setData(d);
      setVista("dashboard");
    } catch (e) {
      setError(e.message);
      setVista(competidores.length ? "dashboard" : "onboarding");
    }
  }

  async function agregar() {
    if (!urlInput.trim()) return;
    setError("");
    try {
      const nuevo = await api.agregarCompetidor(storeId, urlInput.trim());
      setCompetidores((c) => [...c, nuevo]);
      setUrlInput("");
      cargarComparacion();
    } catch (e) {
      setError(e.message);
    }
  }

  async function borrar(compId) {
    await api.borrarCompetidor(storeId, compId);
    const restantes = competidores.filter((c) => c.id !== compId);
    setCompetidores(restantes);
    if (restantes.length === 0) {
      setData(null);
      setVista("onboarding");
    } else {
      cargarComparacion();
    }
  }

  if (vista === "cargando") {
    return (
      <div className="centro">
        <div className="spinner" />
      </div>
    );
  }

  if (vista === "sin-tienda") {
    return (
      <div className="centro">
        <div className="tarjeta aviso">
          <h2>No pudimos identificar tu tienda</h2>
          <p>
            Abrí SpyReport desde el panel de tu Tiendanube, en la sección
            Aplicaciones.
          </p>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  if (vista === "onboarding") {
    return (
      <div className="centro">
        <div className="tarjeta onboarding">
          <div className="logo">🕵️ SpyReport</div>
          <h1>¿A qué competidor querés vigilar?</h1>
          <p className="sub">
            Pegá la dirección de su tienda y en un minuto vas a ver sus precios
            al lado de los tuyos.
          </p>
          <div className="fila-input">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregar()}
              placeholder="ejemplo: tiendadelacompetencia.com.ar"
              autoFocus
            />
            <button className="btn-primario" onClick={agregar}>
              Espiar
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  if (vista === "espiando") {
    return (
      <div className="centro">
        <div className="tarjeta onboarding">
          <div className="spinner" />
          <h2 className="frase-carga">{FRASES_CARGA[fraseIdx]}</h2>
          <p className="sub">Esto tarda menos de un minuto la primera vez.</p>
        </div>
      </div>
    );
  }

  // ---- Dashboard ----
  return (
    <div className="panel">
      <header className="encabezado">
        <div className="logo">🕵️ SpyReport</div>
        <button className="btn-secundario" onClick={() => cargarComparacion()}>
          Actualizar precios
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      {data && <Resumen data={data} />}

      <SeccionCompetidores
        competidores={competidores}
        onBorrar={borrar}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        onAgregar={agregar}
      />

      {data &&
        data.competidores.map((c) => (
          <TablaCompetidor
            key={c.id}
            comp={c}
            filtro={filtro}
            setFiltro={setFiltro}
          />
        ))}
    </div>
  );
}

function Resumen({ data }) {
  const r = data.resumen;
  return (
    <div className="grilla-resumen">
      <div className="tarjeta metrica">
        <span className="etiqueta">Tus productos</span>
        <span className="numero">{r.mis_productos}</span>
        <span className="detalle">
          precio promedio ${fmt(r.mi_precio_promedio)}
        </span>
      </div>
      {r.competidores.map((c) => {
        const diff =
          r.mi_precio_promedio > 0 && c.precio_promedio > 0
            ? ((r.mi_precio_promedio - c.precio_promedio) /
                c.precio_promedio) *
              100
            : null;
        return (
          <div className="tarjeta metrica" key={c.nombre}>
            <span className="etiqueta">{c.nombre}</span>
            <span className="numero">{c.productos}</span>
            <span className="detalle">
              precio promedio ${fmt(c.precio_promedio)}
            </span>
            {diff !== null && (
              <span className={diff <= 0 ? "chip verde" : "chip rojo"}>
                {diff <= 0
                  ? `Estás ${Math.abs(diff).toFixed(0)}% más barato`
                  : `Estás ${diff.toFixed(0)}% más caro`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SeccionCompetidores({
  competidores,
  onBorrar,
  urlInput,
  setUrlInput,
  onAgregar,
}) {
  return (
    <div className="tarjeta seccion">
      <h3>Competidores vigilados</h3>
      <ul className="lista-comp">
        {competidores.map((c) => (
          <li key={c.id}>
            <span>{c.nombre}</span>
            <button className="btn-texto" onClick={() => onBorrar(c.id)}>
              Dejar de vigilar
            </button>
          </li>
        ))}
      </ul>
      {competidores.length < 3 && (
        <div className="fila-input">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAgregar()}
            placeholder="Agregar otro competidor (URL)"
          />
          <button className="btn-primario" onClick={onAgregar}>
            Agregar
          </button>
        </div>
      )}
    </div>
  );
}

function TablaCompetidor({ comp, filtro, setFiltro }) {
  const productos = useMemo(() => {
    const lista = [...comp.productos].sort((a, b) => a.precio - b.precio);
    if (!filtro) return lista;
    return lista.filter((p) =>
      p.nombre.toLowerCase().includes(filtro.toLowerCase())
    );
  }, [comp.productos, filtro]);

  return (
    <div className="tarjeta seccion">
      <div className="fila-titulo">
        <h3>Precios de {comp.nombre}</h3>
        <input
          className="buscador"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar producto…"
        />
      </div>
      {comp.error && (
        <p className="error">No pudimos leer esta tienda: {comp.error}</p>
      )}
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th className="der">Precio</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p, i) => (
            <tr key={i}>
              <td>{p.nombre}</td>
              <td className="der">${fmt(p.precio)}</td>
              <td>
                <span
                  className={p.stock === "InStock" ? "chip verde" : "chip gris"}
                >
                  {p.stock === "InStock" ? "Con stock" : "Sin stock"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR");
}
