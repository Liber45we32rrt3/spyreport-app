import { useEffect, useMemo, useState } from "react";
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
  "Anotando sus precios uno por uno…",
  "Contando su catálogo…",
  "Comparando contra tus productos…",
];

export default function App() {
  const [storeId, setStoreId] = useState(null);
  const [vista, setVista] = useState("cargando"); // cargando | sin-tienda | bloqueada | onboarding | espiando | dashboard
  const [competidores, setCompetidores] = useState([]);
  const [data, setData] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [fraseIdx, setFraseIdx] = useState(0);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    (async () => {
      const id = await resolveStoreId();
      if (!id) return setVista("sin-tienda");
      setStoreId(id);

      // Tiendas liberadas de la verificación de suscripción.
      // Requisito de homologación de Tiendanube: la cuenta demo debe estar
      // "liberada de las etapas de suscripción" para que el equipo valide sin
      // trabarse en el paywall. La demo (7818119) entra siempre; las tiendas
      // reales siguen con la verificación normal.
      const TIENDAS_LIBERADAS = ["7818119"];

      if (!TIENDAS_LIBERADAS.includes(String(id))) {
        // Verificar suscripción antes de mostrar la app.
        // "desconocido" deja pasar: mejor entrar con Billing caído
        // que bloquear a un cliente que pagó.
        try {
          const sus = await api.suscripcion(id);
          if (!sus.activa && sus.estado !== "desconocido") {
            return setVista("bloqueada");
          }
        } catch (_) {
          /* si el chequeo falla, dejamos pasar */
        }
      }

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
        <Spinner size="large" />
      </div>
    );
  }

  if (vista === "sin-tienda") {
    return (
      <div className="centro">
        <div className="angosto">
          <Alert appearance="warning" title="No pudimos identificar tu tienda">
            Abrí SpyReport desde el panel de tu Tiendanube, en la sección
            Aplicaciones. {error}
          </Alert>
        </div>
      </div>
    );
  }

  if (vista === "bloqueada") {
    return (
      <div className="centro">
        <div className="angosto">
          <Card>
            <Card.Body>
              <Box
                display="flex"
                flexDirection="column"
                gap="4"
                alignItems="center"
              >
                <Text fontWeight="bold" color="neutral-textLow">
                  🕵️ SpyReport
                </Text>
                <Title as="h2" textAlign="center">
                  Activá tu plan para seguir espiando
                </Title>
                <Text textAlign="center" color="neutral-textLow">
                  Tu período de prueba terminó. Activá la suscripción para
                  volver a ver los precios de tu competencia al lado de los
                  tuyos.
                </Text>
                <Button
                  appearance="primary"
                  onClick={() => irAlAdmin("/apps")}
                >
                  Activar mi plan
                </Button>
                <Text
                  fontSize="caption"
                  color="neutral-textLow"
                  textAlign="center"
                >
                  ¿Ya lo activaste? Cerrá y volvé a abrir SpyReport.
                </Text>
              </Box>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }

  if (vista === "onboarding") {
    return (
      <div className="centro">
        <div className="angosto">
          <Card>
            <Card.Body>
              <Box
                display="flex"
                flexDirection="column"
                gap="4"
                alignItems="center"
              >
                <Text fontWeight="bold" color="neutral-textLow">
                  🕵️ SpyReport
                </Text>
                <Title as="h2" textAlign="center">
                  ¿A qué competidor querés vigilar?
                </Title>
                <Text textAlign="center" color="neutral-textLow">
                  Pegá la dirección de su tienda y en un minuto vas a ver sus
                  precios al lado de los tuyos.
                </Text>
                <Box display="flex" gap="2" width="100%">
                  <Box flex="1">
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && agregar()}
                      placeholder="ejemplo: tiendadelacompetencia.com.ar"
                      autoFocus
                    />
                  </Box>
                  <Button appearance="primary" onClick={agregar}>
                    Espiar
                  </Button>
                </Box>
                {error && (
                  <Alert appearance="danger" title="Ups">
                    {error}
                  </Alert>
                )}
              </Box>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }

  if (vista === "espiando") {
    return (
      <div className="centro">
        <div className="angosto">
          <Card>
            <Card.Body>
              <Box
                display="flex"
                flexDirection="column"
                gap="4"
                alignItems="center"
              >
                <Spinner size="large" />
                <Title as="h4" textAlign="center">
                  {FRASES_CARGA[fraseIdx]}
                </Title>
                <Text color="neutral-textLow">
                  Esto tarda menos de un minuto la primera vez.
                </Text>
              </Box>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }

  // ---- Dashboard ----
  return (
    <div className="panel">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom="4"
      >
        <Title as="h3">🕵️ SpyReport</Title>
        <Button appearance="neutral" onClick={() => cargarComparacion()}>
          Actualizar precios
        </Button>
      </Box>

      {error && (
        <Box marginBottom="4">
          <Alert appearance="danger" title="Hubo un problema">
            {error}
          </Alert>
        </Box>
      )}

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
      <Card>
        <Card.Body>
          <Box display="flex" flexDirection="column" gap="1">
            <Text fontSize="caption" color="neutral-textLow">
              TUS PRODUCTOS
            </Text>
            <Title as="h2">{r.mis_productos}</Title>
            <Text color="neutral-textLow">
              precio promedio ${fmt(r.mi_precio_promedio)}
            </Text>
          </Box>
        </Card.Body>
      </Card>
      {r.competidores.map((c) => {
        const diff =
          r.mi_precio_promedio > 0 && c.precio_promedio > 0
            ? ((r.mi_precio_promedio - c.precio_promedio) /
                c.precio_promedio) *
              100
            : null;
        return (
          <Card key={c.nombre}>
            <Card.Body>
              <Box display="flex" flexDirection="column" gap="1">
                <Text fontSize="caption" color="neutral-textLow">
                  {c.nombre.toUpperCase()}
                </Text>
                <Title as="h2">{c.productos}</Title>
                <Text color="neutral-textLow">
                  precio promedio ${fmt(c.precio_promedio)}
                </Text>
                {diff !== null && (
                  <Box>
                    <Tag appearance={diff <= 0 ? "success" : "danger"}>
                      {diff <= 0
                        ? `Estás ${Math.abs(diff).toFixed(0)}% más barato`
                        : `Estás ${diff.toFixed(0)}% más caro`}
                    </Tag>
                  </Box>
                )}
              </Box>
            </Card.Body>
          </Card>
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
    <Box marginY="4">
      <Card>
        <Card.Header title="Competidores vigilados" />
        <Card.Body>
          <Box display="flex" flexDirection="column" gap="3">
            {competidores.map((c) => (
              <Box
                key={c.id}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text>{c.nombre}</Text>
                <Link appearance="danger" onClick={() => onBorrar(c.id)}>
                  Dejar de vigilar
                </Link>
              </Box>
            ))}
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
                <Button appearance="primary" onClick={onAgregar}>
                  Agregar
                </Button>
              </Box>
            )}
          </Box>
        </Card.Body>
      </Card>
    </Box>
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
    <Box marginBottom="4">
      <Card padding="none">
        <Card.Header padding="base" title={`Precios de ${comp.nombre}`} />
        <Card.Body>
          <Box paddingX="4" paddingBottom="2">
            <Input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar producto…"
            />
          </Box>
          {comp.error && (
            <Box padding="4">
              <Alert appearance="danger" title="No pudimos leer esta tienda">
                {comp.error}
              </Alert>
            </Box>
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
                  <Table.Cell>{p.nombre}</Table.Cell>
                  <Table.Cell>${fmt(p.precio)}</Table.Cell>
                  <Table.Cell>
                    <Tag
                      appearance={p.stock === "InStock" ? "success" : "neutral"}
                    >
                      {p.stock === "InStock" ? "Con stock" : "Sin stock"}
                    </Tag>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card.Body>
      </Card>
    </Box>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString("es-AR");
}
