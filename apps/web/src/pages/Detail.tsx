import { compressPhoto } from "../compress";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { dateLabel, nextReportStatus } from "@tuxtla/shared";
import {
  statusLabels,
  priorities,
  type ReportPriority,
  type ReportStatus,
} from "@tuxtla/types";
import { api } from "../backend";
import { Badge, ErrorNotice, Map } from "../components";
import { useSession } from "../session";
function Photo({ path }: { path: string }) {
  const q = useQuery({
    queryKey: ["photo", path],
    queryFn: () => api.media.url(path),
    staleTime: 60000,
    refetchInterval: 60000,
    gcTime: 0,
  });
  return q.data ? (
    <a href={q.data} target="_blank" rel="noreferrer">
      <img src={q.data} loading="lazy" alt="Evidencia del reporte" />
    </a>
  ) : (
    <ErrorNotice error={q.error} />
  );
}
export default function Detail() {
  const { id = "" } = useParams(),
    session = useSession(),
    cache = useQueryClient();
  const q = useQuery({
    queryKey: ["report", id],
    queryFn: () => api.reports.detail(id),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: api.catalogs.categories,
  });
  const [note, setNote] = useState(""),
    [assignee, setAssignee] = useState(""),
    [priority, setPriority] = useState<ReportPriority>("media"),
    [category, setCategory] = useState(""),
    [visibility, setVisibility] = useState<"internal" | "citizen_visible">(
      "internal",
    );
  const r = q.data?.report;
  const area = categories.data?.find(
    (c) => c.id === r?.category_id,
  )?.maintenance_area_id;
  const staff = useQuery({
    queryKey: ["workload", area],
    queryFn: () => api.staff.workload(area ?? undefined),
    enabled: session.role === "admin" && !!area,
  });
  const mutate = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => {
      if (!navigator.onLine) throw new Error("Network");
      return action();
    },
    onSuccess: () => {
      void cache.invalidateQueries();
      setNote("");
    },
  });
  useEffect(
    () =>
      api.reports.subscribe(
        id,
        () => void cache.invalidateQueries({ queryKey: ["report", id] }),
      ),
    [id, cache],
  );
  useEffect(() => {
    if (r) {
      setPriority(r.priority);
      setCategory(r.category_id);
    }
  }, [r]);
  if (q.isPending) return <p role="status">Cargando reporte…</p>;
  if (!r) return <ErrorNotice error={q.error} />;
  const next: ReportStatus | undefined = nextReportStatus(
    r.status,
    session.role,
  );
  return (
    <>
      <Link to="/reports">← Volver a reportes</Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DETALLE DE INCIDENCIA</p>
          <h1>{r.folio}</h1>
          <p>Registrado el {dateLabel(r.created_at)}</p>
        </div>
        <Badge status={r.status} />
      </div>
      <ErrorNotice error={mutate.error} />
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>
              {categories.data?.find((c) => c.id === r.category_id)?.name}
            </h2>
            <p className="description">{r.description}</p>
            <div className="metadata">
              <span>
                Colonia<strong>{r.neighborhood || "Sin especificar"}</strong>
              </span>
              <span>
                Prioridad<strong>{r.priority}</strong>
              </span>
              <span>
                Ubicación
                <strong>
                  {r.location_source === "gps"
                    ? "GPS confirmado"
                    : "Seleccionada en mapa"}
                </strong>
              </span>
            </div>
            <Map reports={[r]} />
            <p className="small">
              {r.latitude}, {r.longitude}{" "}
              {r.address_text && `· ${r.address_text}`}
            </p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir ruta de navegación ↗
            </a>
          </section>
          <section className="panel">
            <h2>Evidencia fotográfica</h2>
            <div className="photos">
              {q.data?.media.map((m) => (
                <figure key={m.id}>
                  <Photo path={m.storage_path} />
                  <figcaption>
                    {m.media_type === "initial"
                      ? "Reporte original"
                      : m.media_type === "resolution"
                        ? "Resolución"
                        : "Atención"}
                  </figcaption>
                </figure>
              ))}
            </div>
            {r.status !== "solucionado" && (
              <label className="upload">
                Añadir evidencia de resolución
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={mutate.isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      mutate.mutate(async () =>
                        api.media.upload(
                          await compressPhoto(file),
                          r.id,
                          "resolution",
                        ),
                      );
                  }}
                />
              </label>
            )}
          </section>
          <section className="panel">
            <h2>Historial de atención</h2>
            <ol className="timeline">
              {q.data?.history.map((h) => (
                <li key={h.id}>
                  <strong>{statusLabels[h.to_status]}</strong>
                  <time>{dateLabel(h.created_at)}</time>
                  {h.note && <p>{h.note}</p>}
                </li>
              ))}
            </ol>
            {q.data?.assignments.length !== 0 && (
              <details>
                <summary>Historial de asignaciones</summary>
                {q.data?.assignments.map((a) => (
                  <p key={a.id}>
                    {dateLabel(a.assigned_at)} · {a.status}
                    {a.assignment_note && ` · ${a.assignment_note}`}
                  </p>
                ))}
              </details>
            )}
          </section>
        </div>
        <div>
          <section className="panel">
            <h2>Siguiente paso</h2>
            <p>
              {next
                ? `Pasar a ${statusLabels[next].toLowerCase()}`
                : "Este reporte ya está solucionado."}
            </p>
            <label>
              Observaciones / nota de resolución
              <textarea
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
              />
            </label>
            {next && (
              <button
                disabled={
                  mutate.isPending ||
                  (next === "solucionado" &&
                    (note.trim().length < 5 ||
                      !q.data?.media.some(
                        (m) => m.media_type === "resolution",
                      )))
                }
                onClick={() => {
                  if (
                    next === "solucionado" &&
                    !window.confirm(
                      "¿Confirmas que la incidencia está solucionada?",
                    )
                  )
                    return;
                  mutate.mutate(() =>
                    api.reports.status(r.id, next, r.version, note),
                  );
                }}
              >
                {mutate.isPending ? "Guardando…" : statusLabels[next]}
              </button>
            )}
            <label>
              Visibilidad de la nota
              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as typeof visibility)
                }
              >
                <option value="internal">Interna</option>
                <option value="citizen_visible">Visible al ciudadano</option>
              </select>
            </label>
            <button
              className="secondary"
              disabled={mutate.isPending || !note.trim()}
              onClick={() =>
                mutate.mutate(() => api.reports.note(r.id, note, visibility))
              }
            >
              Guardar nota
            </button>
          </section>
          {session.role === "admin" && (
            <>
              <section className="panel">
                <h2>Responsable de atención</h2>
                {area ? (
                  <>
                    <label>
                      Personal del área
                      <select
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                      >
                        <option value="">Selecciona responsable</option>
                        {staff.data?.map((w) => (
                          <option key={w.user_id} value={w.user_id}>
                            {w.display_name} · {w.open_count} activos
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      disabled={
                        mutate.isPending ||
                        !assignee ||
                        r.status === "solucionado"
                      }
                      onClick={() =>
                        mutate.mutate(() =>
                          api.reports.assign(r.id, assignee, r.version, note),
                        )
                      }
                    >
                      Asignar / reasignar
                    </button>
                  </>
                ) : (
                  <p>
                    Clasifica el reporte en una categoría con área responsable
                    antes de asignarlo.
                  </p>
                )}
              </section>
              <section className="panel">
                <h2>Clasificación</h2>
                <label>
                  Categoría
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.data
                      ?.filter((c) => c.is_active)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Prioridad
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as ReportPriority)
                    }
                  >
                    {priorities.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary"
                  disabled={mutate.isPending}
                  onClick={() =>
                    mutate.mutate(() =>
                      api.reports.update(r.id, category, priority, r.version),
                    )
                  }
                >
                  Guardar clasificación
                </button>
              </section>
            </>
          )}
          <section className="panel">
            <h2>Notas</h2>
            {q.data?.notes.map((n) => (
              <article className="note" key={n.id}>
                <small>
                  {dateLabel(n.created_at)} ·{" "}
                  {n.visibility === "internal" ? "Interna" : "Ciudadano"}
                </small>
                <p>{n.note}</p>
              </article>
            ))}
            {!q.data?.notes.length && <p>Sin notas registradas.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
