import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../backend";
import { Badge, ErrorNotice, Map } from "../components";
import { dateLabel } from "@tuxtla/shared";
import type { Json } from "@tuxtla/types";
export default function Dashboard() {
  const cache = useQueryClient();
  useEffect(
    () => api.reports.subscribeNew(() => void cache.invalidateQueries()),
    [cache],
  );
  const [since, setSince] = useState(""),
    [until, setUntil] = useState("");
  const [bounds, setBounds] = useState<[number, number, number, number]>([
    -93.2, 16.7, -93.05, 16.8,
  ]);
  const metrics = useQuery({
    queryKey: ["metrics", since, until],
    queryFn: () =>
      api.analytics.metrics(
        since ? `${since}T00:00:00-06:00` : undefined,
        until ? `${until}T23:59:59.999-06:00` : undefined,
      ),
  });
  const recent = useQuery({
    queryKey: ["reports", "recent"],
    queryFn: () => api.reports.list(),
    refetchInterval: 30000,
  });
  const map = useQuery({
    queryKey: ["map", bounds],
    queryFn: () => api.reports.bbox(...bounds),
  });
  const m = metrics.data as Record<string, Json> | undefined;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PANORAMA GENERAL</p>
          <h1>El pulso de la ciudad</h1>
          <p>Consulta, coordina y da seguimiento a la atención urbana.</p>
        </div>
        <Link className="button" to="/reports">
          Ver reportes ↗
        </Link>
      </div>
      <ErrorNotice error={metrics.error || recent.error || map.error} />
      <div className="filters">
        <label>
          Indicadores desde
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={until}
            min={since}
            onChange={(e) => setUntil(e.target.value)}
          />
        </label>
      </div>
      <div className="stats">
        {[
          ["total", "Reportes totales", "↗"],
          ["en_revision", "En revisión", "◷"],
          ["en_atencion", "En atención", "↻"],
          ["solucionado", "Solucionados", "✓"],
        ].map(([key, label, icon]) => (
          <article
            className={`stat ${key === "solucionado" ? "green" : ""}`}
            key={key}
          >
            <span>
              {label}
              <i>{icon}</i>
            </span>
            <strong>
              {metrics.isPending ? "—" : String(m?.[key!] ?? "—")}
            </strong>
            <small>
              {key === "total"
                ? `${m?.unassigned ?? "—"} pendientes de asignar`
                : key === "solucionado"
                  ? "Trabajo concluido"
                  : "Seguimiento operativo"}
            </small>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Incidencias en el territorio</h2>
              <p>Reportes en el área visible · hasta 500 puntos</p>
            </div>
            <span className="chip">Tuxtla Gutiérrez</span>
          </div>
          <Map reports={map.data ?? []} onBounds={setBounds} />
        </section>
        <section className="panel">
          <h2>Atención en cifras</h2>
          <p>Indicadores calculados en la base de datos</p>
          <div className="metric-line">
            <span>Últimas 24 horas</span>
            <strong>{String(m?.last24h ?? "—")}</strong>
          </div>
          <div className="metric-line">
            <span>Últimos 7 días</span>
            <strong>{String(m?.last7d ?? "—")}</strong>
          </div>
          <div className="metric-line">
            <span>Últimos 30 días</span>
            <strong>{String(m?.last30d ?? "—")}</strong>
          </div>
          <div className="metric-line">
            <span>Primera asignación</span>
            <strong>
              {typeof m?.assignment_hours === "number"
                ? `${m.assignment_hours.toFixed(1)} h`
                : "—"}
            </strong>
          </div>
          <div className="metric-line">
            <span>Tiempo hasta solución</span>
            <strong>
              {typeof m?.resolution_hours === "number"
                ? `${m.resolution_hours.toFixed(1)} h`
                : "—"}
            </strong>
          </div>
          <h3>Por categoría</h3>
          {Array.isArray(m?.categories) &&
            m.categories.map((item, i) => {
              const row = item as { name: string; total: number };
              return (
                <div className="metric-line" key={i}>
                  <span>{row.name}</span>
                  <strong>{row.total}</strong>
                </div>
              );
            })}
        </section>
      </div>
      <section className="panel">
        <details>
          <summary>Indicadores por zona, prioridad y responsable</summary>
          <div className="staff-grid">
            {[
              ["zones", "Zonas"],
              ["priorities", "Prioridad"],
              ["responsibles", "Responsables"],
            ].map(([key, label]) => (
              <div key={key}>
                <h3>{label}</h3>
                {Array.isArray(m?.[key!]) &&
                  (m[key!] as Json[]).map((item, i) => {
                    const row = item as { name: string; total: number };
                    return (
                      <div className="metric-line" key={i}>
                        <span>{row.name}</span>
                        <strong>{row.total}</strong>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
          <h3>Tiempos medios</h3>
          {[
            ["review_hours", "Creación → revisión"],
            ["review_assignment_hours", "Revisión → asignación"],
            ["start_hours", "Asignación → inicio"],
            ["service_hours", "Inicio → solución"],
          ].map(([key, label]) => (
            <div className="metric-line" key={key}>
              <span>{label}</span>
              <strong>
                {typeof m?.[key!] === "number"
                  ? `${(m[key!] as number).toFixed(1)} h`
                  : "—"}
              </strong>
            </div>
          ))}
        </details>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Reportes recientes</h2>
            <p>Las últimas incidencias registradas</p>
          </div>
          <Link to="/reports">Ver todos →</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Descripción</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recent.data?.rows.slice(0, 6).map((r) => (
                <tr key={r.id}>
                  <td className="folio">{r.folio}</td>
                  <td className="truncate">{r.description}</td>
                  <td>{dateLabel(r.created_at)}</td>
                  <td>
                    <Badge status={r.status} />
                  </td>
                  <td>
                    <Link to={`/reports/${r.id}`}>Abrir ↗</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recent.data?.count === 0 && (
          <p className="empty">
            Aún no hay reportes. Aquí aparecerán las incidencias enviadas desde
            la aplicación ciudadana.
          </p>
        )}
      </section>
    </>
  );
}
