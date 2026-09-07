import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dateLabel, type ReportFilters } from "@tuxtla/shared";
import {
  statuses,
  statusLabels,
  priorities,
  type ReportPriority,
  type ReportStatus,
} from "@tuxtla/types";
import { api } from "../backend";
import { Badge, ErrorNotice } from "../components";
import { useSession } from "../session";
export default function Reports() {
  const s = useSession();
  const [filters, setFilters] = useState<ReportFilters>({ page: 0 }),
    [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => ({ ...f, folio: search, page: 0 })),
      300,
    );
    return () => clearTimeout(t);
  }, [search]);
  const reports = useQuery({
    queryKey: ["reports", filters],
    queryFn: () => api.reports.list(filters),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: api.catalogs.categories,
  });
  const workload = useQuery({
    queryKey: ["workload"],
    queryFn: () => api.staff.workload(),
    enabled: s.role === "admin",
  });
  const mine = useQuery({
    queryKey: ["my-areas"],
    queryFn: api.staff.mine,
    enabled: s.role === "maintenance",
  });
  const areas = useQuery({ queryKey: ["areas"], queryFn: api.catalogs.areas });
  const set = (data: Partial<ReportFilters>) =>
    setFilters((f) => ({ ...f, ...data, page: 0 }));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEGUIMIENTO OPERATIVO</p>
          <h1>
            {s.role === "admin" ? "Reportes ciudadanos" : "Mis asignaciones"}
          </h1>
          <p>
            {s.role === "admin"
              ? "Cada incidencia, su responsable y su siguiente paso."
              : `Áreas: ${mine.data?.map((x) => areas.data?.find((a) => a.id === x.maintenance_area_id)?.name).join(", ") ?? "Cargando…"}`}
          </p>
        </div>
        <span className="chip">{reports.data?.count ?? "—"} reportes</span>
      </div>
      <section className="panel">
        <div className="filters">
          <label>
            Buscar folio
            <input
              placeholder="TGZ-INC-…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Estado
            <select
              value={filters.status ?? ""}
              onChange={(e) =>
                set({ status: e.target.value as ReportStatus | "" })
              }
            >
              <option value="">Todos los estados</option>
              {statuses.map((x) => (
                <option key={x} value={x}>
                  {statusLabels[x]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridad
            <select
              value={filters.priority ?? ""}
              onChange={(e) =>
                set({ priority: e.target.value as ReportPriority | "" })
              }
            >
              <option value="">Todas</option>
              {priorities.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Categoría
            <select
              value={filters.category ?? ""}
              onChange={(e) => set({ category: e.target.value })}
            >
              <option value="">Todas las categorías</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details>
          <summary>Más filtros</summary>
          <div className="filters">
            <label>
              Descripción
              <input onChange={(e) => set({ text: e.target.value })} />
            </label>
            <label>
              Área
              <select
                value={filters.area ?? ""}
                onChange={(e) => set({ area: e.target.value })}
              >
                <option value="">Todas</option>
                {areas.data?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Colonia
              <input onChange={(e) => set({ neighborhood: e.target.value })} />
            </label>
            <label>
              Desde
              <input
                type="date"
                onChange={(e) => set({ since: e.target.value })}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                onChange={(e) => set({ until: e.target.value })}
              />
            </label>
            {s.role === "admin" && (
              <>
                <label>
                  Responsable
                  <select
                    onChange={(e) => set({ responsible: e.target.value })}
                  >
                    <option value="">Todos</option>
                    {[
                      ...new Map(
                        workload.data?.map((x) => [x.user_id, x]),
                      ).values(),
                    ].map((x) => (
                      <option key={x.user_id} value={x.user_id}>
                        {x.display_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    onChange={(e) => set({ unassigned: e.target.checked })}
                  />
                  Sin asignar
                </label>
              </>
            )}
          </div>
        </details>
        <ErrorNotice error={reports.error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Folio / fecha</th>
                <th>Incidencia</th>
                <th>Ciudadano / responsable</th>
                <th>Colonia</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.data?.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong className="folio">{r.folio}</strong>
                    <small>{dateLabel(r.created_at)}</small>
                  </td>
                  <td>
                    {categories.data?.find((c) => c.id === r.category_id)?.name}
                    <small className="truncate">{r.description}</small>
                  </td>
                  <td>
                    {r.citizen_name || "—"}
                    <small>{r.responsible_name || "Sin asignar"}</small>
                  </td>
                  <td>{r.neighborhood || "Sin especificar"}</td>
                  <td>
                    <Badge status={r.status} />
                  </td>
                  <td>
                    <span className={`priority ${r.priority}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td>
                    <Link to={`/reports/${r.id}`}>Ver detalle ↗</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reports.isPending && <p role="status">Cargando reportes…</p>}
        {reports.data?.count === 0 && (
          <p className="empty">
            No hay reportes que coincidan con estos filtros.
          </p>
        )}
        <footer className="pagination">
          <span>Página {(filters.page ?? 0) + 1} · 25 por página</span>
          <div>
            <button
              className="secondary"
              disabled={!filters.page}
              onClick={() =>
                setFilters((f) => ({ ...f, page: (f.page ?? 0) - 1 }))
              }
            >
              Anterior
            </button>
            <button
              className="secondary"
              disabled={
                ((filters.page ?? 0) + 1) * 25 >= (reports.data?.count ?? 0)
              }
              onClick={() =>
                setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))
              }
            >
              Siguiente
            </button>
          </div>
        </footer>
      </section>
    </>
  );
}
