import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Input,
  Link,
  Spinner,
  Table,
  Tag,
  Text,
  Title,
} from "@nimbus-ds/components";
import { api, resolveStoreId, irAlAdmin } from "./api";

const FRASES_CARGA = [
  "Visitando la tienda de tu competencia…",
  "Analizando sus precios…",
  "Comparando productos y catálogo…",
  "Detectando oportunidades para tu tienda…",
];

// Limpia "GMNIMPORTADOS.MITIENDANUBE.COM" → "Gmnimportados"
function nombreLindo(dominio) {
  let base = String(dominio || "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(".")[0];
  if (!base) return dominio || "";
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
}

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR");
}

export default function App() {
  const [storeId, setStoreId] = useState(null);
  const [vista, setVista] = useState("cargando");
  const [competidores, setCompetidores] = useState([]);
  const [data, setData] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [fraseIdx, setFraseIdx] = useState(0);
  const [tema, setTema] = useState("claro");
  const [ultimoAnalisis, setUltimoAnalisis] = useState(null);

  const oscuro = tema === "oscuro";
  const bg = oscuro ? "#14161a" : "transparent";
  const textoColor = oscuro ? "#e8eaed" : undefined;

  useEffect(() => {
    (async () => {
      try {
        const id = await resolveStoreId();
        if (!id) return setVista("sin-tienda");
        setStoreId(id);

        const TIENDAS_LIBERADAS = ["7818119", "4265771"];
        if (!TIENDAS_LIBERADAS.includes(String(id))) {
          try {
            const sus = await api.suscripcion(id);
            if (!sus.activa && sus.estado !== "desconocido") {
              return setVista("bloqueada");
            }
          } catch (_) {}
        }

        const comps = await api.competidores(id);
        setCompetidores(comps);
        if (comps.length === 0) {
          setVista("onboarding");
        } else {
          setVista("espiando");
          cargarComparacion(id, comps);
        }
      } catch (e) {
        setError(e.message);
        setVista("sin-tienda");
      }
    })();
  }, []);

  useEffect(() => {
    if (vista !== "espiando") return;
    const t = setInterval(
      () => setFraseIdx((i) => (i + 1) % FRASES_CARGA.length),
      3500
    );
    return () => clearInterval(t);
  }, [vista]);

  async function cargarComparacion(id = storeId, compsActuales = competidores) {
    setVista("espiando");
    setError("");
    try {
      const resultado = await api.comparacion(id);
      setData(resultado);
      setUltimoAnalisis(new Date());
      setVista("dashboard");
    } catch (e) {
      setData(null);
      setError("No pudimos cargar el análisis. Probá actualizar de nuevo o quitar un competidor.");
      setVista(compsActuales.length > 0 ? "dashboard" : "onboarding");
    }
  }

  async function agregar() {
    if (!urlInput.trim()) return;
    setError("");
    try {
      const nuevo = await api.agregarCompetidor(storeId, urlInput.trim());
      const nuevos = [...competidores, nuevo];
      setCompetidores(nuevos);
      setUrlInput("");
      cargarComparacion(storeId, nuevos);
    } catch (e) {
      setError(e.message);
    }
  }

  async function borrar(id) {
    try {
      await api.borrarCompetidor(storeId, id);
      const restantes = competidores.filter((c) => c.id !== id);
      setCompetidores(restantes);
      if (restantes.length === 0) {
        setData(null);
        setVista("onboarding");
      } else {
        cargarComparacion(storeId, restantes);
      }
    } catch (e) {
      setError("No pudimos eliminar el competidor.");
    }
  }

  const contenido = (() => {
    if (vista === "cargando") {
      return (
        <PantallaCentro>
          <Spinner size="large" />
          <Box marginTop="4">
            <Title as="h4" textAlign="center">Preparando SpyReport</Title>
          </Box>
          <Text color="neutral-textLow">Cargando información de tu tienda…</Text>
        </PantallaCentro>
      );
    }

    if (vista === "sin-tienda") {
      return (
        <PantallaCentro>
          <Box maxWidth="420px" width="100%">
            <Alert appearance="warning" title="No encontramos tu tienda">
              Abrí SpyReport desde el panel de aplicaciones de Tiendanube. {error}
            </Alert>
          </Box>
        </PantallaCentro>
      );
    }

    if (vista === "bloqueada") {
      return (
        <PantallaCentro>
          <Box maxWidth="420px" width="100%">
            <Card>
              <Card.Body>
                <Box display="flex" flexDirection="column" gap="4" alignItems="center">
                  <Text fontWeight="bold" color="neutral-textLow">🕵️ SpyReport</Text>
                  <Title as="h3" textAlign="center">Activá tu plan para seguir espiando</Title>
                  <Text color="neutral-textLow" textAlign="center">
                    Tu período de prueba terminó. Activá tu suscripción para volver a analizar tu competencia.
                  </Text>
                  <Button appearance="primary" onClick={() => irAlAdmin("/apps")}>
                    Activar mi plan
                  </Button>
                  <Text fontSize="caption" color="neutral-textLow" textAlign="center">
                    ¿Ya lo activaste? Cerrá y volvé a abrir SpyReport.
                  </Text>
                </Box>
              </Card.Body>
            </Card>
          </Box>
        </PantallaCentro>
      );
    }

    if (vista === "onboarding") {
      return (
        <PantallaCentro>
          <Box maxWidth="480px" width="100%">
            <Card>
              <Card.Body>
                <Box display="flex" flexDirection="column" gap="4" alignItems="center">
                  <Text fontSize="featured" fontWeight="bold">🕵️</Text>
                  <Title as="h3" textAlign="center">Empezá a monitorear tu competencia</Title>
                  <Text color="neutral-textLow" textAlign="center">
                    Pegá la dirección de una tienda competidora y en menos de un minuto vas a ver
                    sus precios y stock al lado de los tuyos. Podés vigilar hasta 3.
                  </Text>
                  <Box display="flex" gap="2" width="100%">
                    <Box flex="1">
                      <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregar()}
                        placeholder="tiendadelacompetencia.com.ar"
                      />
                    </Box>
                    <Button appearance="primary" onClick={agregar}>Espiar</Button>
                  </Box>
                  {error && <Alert appearance="danger" title="Ups">{error}</Alert>}
                </Box>
              </Card.Body>
            </Card>
          </Box>
        </PantallaCentro>
      );
    }

    if (vista === "espiando") {
      return (
        <PantallaCentro>
          <Box maxWidth="420px" width="100%">
            <Card>
              <Card.Body>
                <Box display="flex" flexDirection="column" gap="4" alignItems="center">
                  <Spinner size="large" />
                  <Title as="h4" textAlign="center">{FRASES_CARGA[fraseIdx]}</Title>
                  <Text color="neutral-textLow" textAlign="center">
                    Esto tarda menos de un minuto la primera vez.
                  </Text>
                </Box>
              </Card.Body>
            </Card>
          </Box>
        </PantallaCentro>
      );
    }

    // ---- Dashboard ----
    return (
      <Box padding="6">
        <HeaderDashboard
          data={data}
          competidores={competidores}
          ultimoAnalisis={ultimoAnalisis}
          onActualizar={() => cargarComparacion()}
          tema={tema}
          setTema={setTema}
        />

        {error && (
          <Box marginBottom="4">
            <Alert appearance="warning" title="Atención">{error}</Alert>
          </Box>
        )}

        {data && <Insights data={data} />}
        {data && <ResumenMetricas data={data} />}

        <SeccionCompetidores
          competidores={competidores}
          onBorrar={borrar}
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          onAgregar={agregar}
        />

        {data && data.competidores.map((c) => <TablaCompetidor key={c.id} comp={c} />)}
      </Box>
    );
  })();

  return (
    <div style={{ background: bg, minHeight: "100vh", color: textoColor }}>
      {contenido}
    </div>
  );
}

function PantallaCentro({ children }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap="2"
      minHeight="80vh"
      padding="6"
    >
      {children}
    </Box>
  );
}

function tiempoRelativo(fecha) {
  if (!fecha) return "recién";
  const seg = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (seg < 60) return "hace unos segundos";
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  return `hace ${hs} h`;
}

function HeaderDashboard({ data, competidores, ultimoAnalisis, onActualizar, tema, setTema }) {
  const totalProductosComp = (data?.competidores || []).reduce(
    (acc, c) => acc + (c.productos ? c.productos.length : 0),
    0
  );
  return (
    <Box marginBottom="6">
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="4">
        <Box display="flex" flexDirection="column" gap="1">
          <Title as="h3">🕵️ SpyReport</Title>
          <Text color="neutral-textLow">Inteligencia competitiva para tu tienda</Text>
        </Box>
        <Box display="flex" gap="2" alignItems="center">
          <Button
            appearance="neutral"
            onClick={() => setTema(tema === "oscuro" ? "claro" : "oscuro")}
          >
            {tema === "oscuro" ? "☀️ Claro" : "🌙 Oscuro"}
          </Button>
          <Button appearance="primary" onClick={onActualizar}>
            Actualizar análisis
          </Button>
        </Box>
      </Box>

      <Box display="flex" gap="4" marginTop="4" flexWrap="wrap">
        <MiniStat etiqueta="Último análisis" valor={tiempoRelativo(ultimoAnalisis)} />
        <MiniStat etiqueta="Competidores activos" valor={String(competidores.length)} />
        <MiniStat etiqueta="Productos analizados" valor={String(totalProductosComp)} />
      </Box>
    </Box>
  );
}

function MiniStat({ etiqueta, valor }) {
  return (
    <Box display="flex" flexDirection="column">
      <Text fontSize="caption" color="neutral-textLow">{etiqueta}</Text>
      <Text fontWeight="bold">{valor}</Text>
    </Box>
  );
}

// Insights REALES: todo sale de comparar precios promedio y contar stock.
// Sin números de ejemplo hardcodeados — si un dato no existe, no se muestra.
function calcularInsights(data) {
  const r = data.resumen;
  const mio = r.mi_precio_promedio || 0;
  let masBaratos = 0;
  let masCaros = 0;
  let sinStock = 0;

  (data.competidores || []).forEach((c) => {
    (c.productos || []).forEach((p) => {
      if (p.stock !== "InStock") sinStock += 1;
    });
  });

  (r.competidores || []).forEach((c) => {
    if (c.precio_promedio > 0 && mio > 0) {
      if (c.precio_promedio < mio) masBaratos += 1;
      else if (c.precio_promedio > mio) masCaros += 1;
    }
  });

  return { masBaratos, masCaros, sinStock };
}

function Insights({ data }) {
  const { masBaratos, masCaros, sinStock } = calcularInsights(data);
  const items = [];
  if (masBaratos > 0)
    items.push({
      tono: "danger",
      texto: `${masBaratos} competidor${masBaratos > 1 ? "es tienen" : " tiene"} un precio promedio más bajo que el tuyo. Revisá dónde podés estar perdiendo ventas.`,
    });
  if (masCaros > 0)
    items.push({
      tono: "success",
      texto: `Estás por debajo de ${masCaros} competidor${masCaros > 1 ? "es" : ""} en precio promedio. Ahí tenés margen para subir sin perder competitividad.`,
    });
  if (sinStock > 0)
    items.push({
      tono: "warning",
      texto: `${sinStock} producto${sinStock > 1 ? "s están" : " está"} sin stock en tus competidores. Es demanda que podrías captar vos.`,
    });
  if (items.length === 0)
    items.push({ tono: "neutral", texto: "Agregá competidores y actualizá para ver oportunidades de precio y stock." });

  return (
    <Box marginBottom="5">
      <Card>
        <Card.Header>
          <Title as="h4">Insights de mercado</Title>
        </Card.Header>
        <Card.Body>
          <Box display="flex" flexDirection="column" gap="3">
            {items.map((it, i) => (
              <Box key={i} display="flex" gap="2" alignItems="flex-start">
                <Tag appearance={it.tono === "neutral" ? "neutral" : it.tono}>
                  {it.tono === "danger" ? "Atención" : it.tono === "success" ? "Oportunidad" : it.tono === "warning" ? "Revisar" : "Info"}
                </Tag>
                <Text>{it.texto}</Text>
              </Box>
            ))}
          </Box>
        </Card.Body>
      </Card>
    </Box>
  );
}

function ResumenMetricas({ data }) {
  const r = data.resumen;
  return (
    <Box display="flex" gap="4" marginBottom="6" flexWrap="wrap">
      <MetricCard
        titulo="Tu tienda"
        valor={r.mis_productos}
        sub="productos analizados"
        detalle={`Precio promedio $${fmt(r.mi_precio_promedio)}`}
      />
      {r.competidores.map((c) => {
        const diff =
          r.mi_precio_promedio > 0 && c.precio_promedio > 0
            ? ((r.mi_precio_promedio - c.precio_promedio) / c.precio_promedio) * 100
            : null;
        return (
          <MetricCard
            key={c.nombre}
            titulo={nombreLindo(c.nombre)}
            valor={c.productos}
            sub="productos"
            detalle={`Precio promedio $${fmt(c.precio_promedio)}`}
            tag={
              diff === null
                ? null
                : diff <= 0
                ? `${Math.abs(diff).toFixed(0)}% más barato que vos`
                : `${diff.toFixed(0)}% más caro que vos`
            }
            tagAppearance={diff === null ? "neutral" : diff <= 0 ? "success" : "danger"}
          />
        );
      })}
    </Box>
  );
}

function MetricCard({ titulo, valor, sub, detalle, tag, tagAppearance }) {
  return (
    <Box flex="1" minWidth="180px">
      <Card>
        <Card.Body>
          <Box display="flex" flexDirection="column" gap="1">
            <Text fontSize="caption" color="neutral-textLow">{titulo}</Text>
            <Title as="h2">{valor}</Title>
            {sub && <Text fontSize="caption" color="neutral-textLow">{sub}</Text>}
            <Box marginTop="1"><Text color="neutral-textLow">{detalle}</Text></Box>
            {tag && <Box marginTop="2"><Tag appearance={tagAppearance || "neutral"}>{tag}</Tag></Box>}
          </Box>
        </Card.Body>
      </Card>
    </Box>
  );
}

function SeccionCompetidores({ competidores, onBorrar, urlInput, setUrlInput, onAgregar }) {
  return (
    <Box marginBottom="6">
      <Card>
        <Card.Header>
          <Title as="h4">Competidores vigilados</Title>
        </Card.Header>
        <Card.Body>
          <Box display="flex" flexDirection="column" gap="4">
            <Box display="flex" gap="4" flexWrap="wrap">
              {competidores.map((c) => (
                <Box key={c.id} flex="1" minWidth="200px">
                  <Card>
                    <Card.Body>
                      <Box display="flex" flexDirection="column" gap="2">
                        <Text fontWeight="bold">🏪 {nombreLindo(c.nombre)}</Text>
                        <Text fontSize="caption" color="neutral-textLow">Catálogo monitoreado</Text>
                        <Link appearance="danger" onClick={() => onBorrar(c.id)}>Eliminar</Link>
                      </Box>
                    </Card.Body>
                  </Card>
                </Box>
              ))}
            </Box>
            {competidores.length < 3 && (
              <Box display="flex" gap="2">
                <Box flex="1">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onAgregar()}
                    placeholder="Agregar otro competidor (URL)"
                  />
                </Box>
                <Button appearance="primary" onClick={onAgregar}>Agregar</Button>
              </Box>
            )}
          </Box>
        </Card.Body>
      </Card>
    </Box>
  );
}

function TablaCompetidor({ comp }) {
  const [filtro, setFiltro] = useState("");
  const productos = useMemo(() => {
    const lista = [...comp.productos].sort((a, b) => a.precio - b.precio);
    if (!filtro) return lista;
    return lista.filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()));
  }, [comp.productos, filtro]);

  return (
    <Box marginBottom="5">
      <Card>
        <Card.Header>
          <Title as="h4">Precios de {nombreLindo(comp.nombre)}</Title>
        </Card.Header>
        <Card.Body>
          <Box display="flex" flexDirection="column" gap="3">
            <Input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar producto…"
            />
            {comp.error && (
              <Alert appearance="danger" title="No pudimos leer esta tienda">{comp.error}</Alert>
            )}
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Cell as="th">Producto</Table.Cell>
                  <Table.Cell as="th">Precio</Table.Cell>
                  <Table.Cell as="th">Stock</Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {productos.map((p, i) => (
                  <Table.Row key={i}>
                    <Table.Cell><NombreProducto producto={p} /></Table.Cell>
                    <Table.Cell><Text fontWeight="bold">${fmt(p.precio)}</Text></Table.Cell>
                    <Table.Cell>
                      <Tag appearance={p.stock === "InStock" ? "success" : "neutral"}>
                        {p.stock === "InStock" ? "● Disponible" : "○ Sin stock"}
                      </Tag>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Box>
        </Card.Body>
      </Card>
    </Box>
  );
}

function NombreProducto({ producto }) {
  if (!producto.url) {
    return React.createElement(React.Fragment, null, producto.nombre);
  }
  return React.createElement(
    "a",
    {
      href: producto.url,
      target: "_blank",
      rel: "noopener noreferrer",
      style: { color: "inherit", textDecoration: "underline" },
    },
    producto.nombre
  );
}
