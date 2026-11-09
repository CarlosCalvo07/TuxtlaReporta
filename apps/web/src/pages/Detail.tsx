import { compressPhoto } from "../compress";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  dateLabel,
  DEFAULT_CLUSTER_RADIUS_M,
  distanceMeters,
  findNearbySameCategoryReports,
  nextReportStatus,
} from "@tuxtla/shared";
import {
  statusLabels,
  priorities,
  type ReportPriority,
  type ReportStatus,
} from "@tuxtla/types";
import { api } from "../backend";
import { Badge, CategoryBadge, ErrorNotice, Map } from "../components";
import { useSession } from "../session";

function Photo({ path, label }: { path: string; label?: string }) {
  const q = useQuery({
    queryKey: ["photo", path],
    queryFn: () => api.media.url(path),
    staleTime: 60000,
    refetchInterval: 60000,
    gcTime: 0,
  });
  return q.data ? (
    <figure className="photo-card">
      <a href={q.data} target="_blank" rel="noreferrer" title="Ver foto completa en nueva pestaña">
        <img src={q.data} loading="lazy" alt={label || "Evidencia"} />
      </a>
      {label && <figcaption>{label}</figcaption>}
    </figure>
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
    [visibility, setVisibility] = useState<"internal" | "citizen_visible">("internal"),
    [isEditingAssignee, setIsEditingAssignee] = useState(false),
    [isEditingClassification, setIsEditingClassification] = useState(false),
    [syncDuplicates, setSyncDuplicates] = useState(true),
    [uploadError, setUploadError] = useState<string | null>(null);

  const r = q.data?.report;
  const currentCat = categories.data?.find((c) => c.id === r?.category_id);
  const area = currentCat?.maintenance_area_id;

  const nearby = useQuery({
    queryKey: ["nearby-reports", r?.id, r?.latitude, r?.longitude],
    queryFn: () =>
      api.reports.bbox(
        r!.longitude - 0.001,
        r!.latitude - 0.001,
        r!.longitude + 0.001,
        r!.latitude + 0.001,
      ),
    enabled: !!r,
  });

  const groupedDuplicates = useMemo(
    () =>
      r && nearby.data
        ? findNearbySameCategoryReports(r, nearby.data, DEFAULT_CLUSTER_RADIUS_M)
        : [],
    [r, nearby.data],
  );

  const staff = useQuery({
    queryKey: ["workload", area],
    queryFn: () => api.staff.workload(area ?? undefined),
    enabled: session.role === "admin" && !!area,
  });

  const staffList = useQuery({
    queryKey: ["staff-directory"],
    queryFn: api.staff.list,
    enabled: session.role === "admin",
  });

  const mutate = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => {
      if (!navigator.onLine) throw new Error("Network");
      return action();
    },
    onSuccess: () => {
      void cache.invalidateQueries();
      setIsEditingAssignee(false);
      setIsEditingClassification(false);
      setUploadError(null);
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

  const activeAssignment = q.data?.assignments?.find((a) => !a.ended_at);
  const assignedStaff =
    staffList.data?.find((s) => s.id === activeAssignment?.maintenance_user_id) ||
    staff.data?.find((w) => w.user_id === activeAssignment?.maintenance_user_id);

  useEffect(() => {
    if (r) {
      setPriority(r.priority);
      setCategory(r.category_id);
    }
    if (activeAssignment?.maintenance_user_id) {
      setAssignee(activeAssignment.maintenance_user_id);
    }
  }, [r, activeAssignment]);

  if (q.isPending) return <p role="status">Cargando reporte…</p>;
  if (!r) return <ErrorNotice error={q.error} />;

  const rawNext: ReportStatus | undefined = nextReportStatus(r.status, session.role);
  const next: ReportStatus | undefined =
    rawNext ??
    (session.role === "maintenance" && r.status === "recibido" && activeAssignment
      ? "en_atencion"
      : undefined);

  const initialMedia = q.data?.media.filter((m) => m.media_type === "initial") ?? [];
  const resolutionMedia = q.data?.media.filter((m) => m.media_type === "resolution") ?? [];
  const progressMedia = q.data?.media.filter((m) => m.media_type !== "initial" && m.media_type !== "resolution") ?? [];

  const hasResolutionPhoto = resolutionMedia.length > 0;
  const hasResolutionNote = note.trim().length >= 5;
  const canSolve = hasResolutionPhoto && hasResolutionNote;

  const handleResolutionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !r) return;
    setUploadError(null);
    mutate.mutate(async () => {
      const compressed = await compressPhoto(file);
      return api.media.upload(compressed, r.id, "resolution");
    });
    e.target.value = "";
  };

  return (
    <>
      {/* Contenedor oficial para impresión / Generar PDF */}
      <div className="print-report-container" aria-hidden="true">
        <div className="print-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", color: "#0a192f" }}>
              H. AYUNTAMIENTO DE TUXTLA GUTIÉRREZ
            </h2>
            <p style={{ margin: "2px 0 6px", fontSize: "12px", color: "#475569" }}>
              COORDINACIÓN DE ATENCIÓN CIUDADANA Y SERVICIOS MUNICIPALES
            </p>
            <h3 style={{ margin: 0, fontSize: "14px", color: "#0066ff" }}>
              EXPEDIENTE OFICIAL DE INCIDENCIA URBANA
            </h3>
          </div>
          <div className="print-folio-badge">
            <span style={{ fontSize: "10px", display: "block", color: "#64748b" }}>FOLIO OFICIAL</span>
            <strong style={{ fontSize: "16px", color: "#0a192f", fontFamily: "monospace" }}>{r.folio}</strong>
          </div>
        </div>

        <table className="print-table">
          <tbody>
            <tr>
              <th style={{ width: "20%" }}>Estatus:</th>
              <td style={{ width: "30%" }}><strong>{statusLabels[r.status].toUpperCase()}</strong></td>
              <th style={{ width: "20%" }}>Prioridad:</th>
              <td style={{ width: "30%" }}><strong>{r.priority.toUpperCase()}</strong></td>
            </tr>
            <tr>
              <th>Categoría:</th>
              <td>{categories.data?.find((c) => c.id === r.category_id)?.name || "Sin categoría"}</td>
              <th>Fecha de registro:</th>
              <td>{dateLabel(r.created_at)}</td>
            </tr>
            <tr>
              <th>Colonia / Ubicación:</th>
              <td>{r.neighborhood || "Sin especificar"}</td>
              <th>Coordenadas GPS:</th>
              <td>{r.latitude.toFixed(6)}, {r.longitude.toFixed(6)} ({r.location_source === "gps" ? "GPS" : "Manual"})</td>
            </tr>
            <tr>
              <th>Responsable asignado:</th>
              <td>{assignedStaff?.display_name || "Sin responsable asignado"}</td>
              <th>Fecha de resolución:</th>
              <td>{r.resolved_at ? dateLabel(r.resolved_at) : "En proceso"}</td>
            </tr>
            <tr>
              <th>Descripción del reporte:</th>
              <td colSpan={3}>{r.description}</td>
            </tr>
          </tbody>
        </table>

        <div className="print-signatures">
          <div className="signature-box">
            <div className="signature-line" />
            <strong>{session.name || "Administrador del Sistema"}</strong>
            <span>Centro de Mando Urbano</span>
          </div>
          <div className="signature-box">
            <div className="signature-line" />
            <strong>{assignedStaff?.display_name || "Personal Operativo Asignado"}</strong>
            <span>Cuadrilla de Atención en Campo</span>
          </div>
        </div>
      </div>

      {/* Vista interactiva de pantalla */}
      <div className="header-actions-bar">
        <Link to="/reports" className="back-link">← Volver a reportes</Link>
        <button
          type="button"
          className="print-btn"
          onClick={() => window.print()}
          title="Descargar reporte en formato PDF o imprimir"
        >
          Generar reporte PDF
        </button>
      </div>

      <div className="page-heading">
        <div>
          <p className="eyebrow">DETALLE DE INCIDENCIA</p>
          <h1>{r.folio}</h1>
          <p>Registrado el {dateLabel(r.created_at)}</p>
        </div>
        <Badge status={r.status} />
      </div>

      <ErrorNotice error={mutate.error} />
      {uploadError && <p className="notice">{uploadError}</p>}

      <div className="detail-grid">
        <div>
          {/* Panel Principal de la Incidencia */}
          <section className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>{currentCat?.name}</h2>
              <CategoryBadge
                name={currentCat?.name}
                slug={currentCat?.slug}
                duplicateCount={groupedDuplicates.length}
              />
            </div>
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
                  {r.location_source === "gps" ? "GPS confirmado" : "Seleccionada en mapa"}
                </strong>
              </span>
              {groupedDuplicates.length > 0 && (
                <span>
                  Agrupación en rango corto
                  <strong>
                    {groupedDuplicates.length + 1} reportes (≤ {DEFAULT_CLUSTER_RADIUS_M} m)
                  </strong>
                </span>
              )}
            </div>
            <Map
              reports={[r, ...groupedDuplicates]}
              categories={categories.data}
              showControls={groupedDuplicates.length > 0}
            />
            <p className="small">
              {r.latitude}, {r.longitude} {r.address_text && `· ${r.address_text}`}
            </p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir ruta de navegación
            </a>
          </section>

          {/* Panel de Reportes Repetidos Agrupados (Rango Corto <= 45 m, misma categoría) */}
          {groupedDuplicates.length > 0 && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>
                    Incidencias repetidas agrupadas ({groupedDuplicates.length + 1} reportes)
                  </h2>
                  <p>
                    Otros ciudadanos reportaron <strong>{currentCat?.name}</strong> en un rango
                    corto menor a {DEFAULT_CLUSTER_RADIUS_M} metros de este punto.
                  </p>
                </div>
                <span className="chip">Rango ≤ {DEFAULT_CLUSTER_RADIUS_M} m</span>
              </div>
              <div className="grouped-duplicates-grid">
                {groupedDuplicates.map((dup) => {
                  const dist = Math.round(
                    distanceMeters(
                      r.latitude,
                      r.longitude,
                      dup.latitude,
                      dup.longitude,
                    ),
                  );
                  return (
                    <div key={dup.id} className="saved-card">
                      <div className="saved-header">
                        <strong className="folio">{dup.folio}</strong>
                        <Badge status={dup.status} />
                      </div>
                      <p className="small" style={{ margin: "2px 0" }}>
                        A <strong>{dist} m</strong> de distancia · {dateLabel(dup.created_at)}
                      </p>
                      <p className="small" style={{ color: "var(--text-primary)" }}>
                        {dup.description}
                      </p>
                      <Link to={`/reports/${dup.id}`} style={{ fontSize: 12, fontWeight: 700 }}>
                        Abrir expediente vinculado
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Panel de Evidencias Separadas */}
          <section className="panel">
            <h2>Evidencia fotográfica</h2>

            {/* Evidencia Inicial del Ciudadano */}
            <div className="evidence-block">
              <div className="evidence-header">
                <h3>Evidencia del reporte inicial (Ciudadano)</h3>
                <span className="badge-count">{initialMedia.length} foto(s)</span>
              </div>
              <p className="evidence-desc">
                Fotografías capturadas por el ciudadano al momento de emitir el reporte.
              </p>
              {initialMedia.length > 0 ? (
                <div className="photos">
                  {initialMedia.map((m) => (
                    <Photo key={m.id} path={m.storage_path} label="Reporte original" />
                  ))}
                </div>
              ) : (
                <div className="empty-box">Sin fotografía inicial registrada.</div>
              )}
            </div>

            {/* Evidencia de Resolución */}
            <div className="evidence-block" style={{ marginTop: "24px" }}>
              <div className="evidence-header">
                <h3>Evidencia de resolución (Trabajo concluido)</h3>
                <span className="badge-count">{resolutionMedia.length} foto(s)</span>
              </div>
              <p className="evidence-desc">
                Fotografías que comprueban que el problema ha sido atendido y solucionado por la cuadrilla.
              </p>
              {resolutionMedia.length > 0 ? (
                <div className="photos">
                  {resolutionMedia.map((m) => (
                    <Photo key={m.id} path={m.storage_path} label="Resolución concluida" />
                  ))}
                </div>
              ) : (
                <div className="empty-box warning">
                  Aún no se ha adjuntado evidencia fotográfica de solución.
                </div>
              )}

              {/* Botón para añadir evidencia de resolución */}
              {r.status !== "solucionado" && (
                <div style={{ marginTop: "14px" }}>
                  <label className="upload-btn">
                    <span>{mutate.isPending ? "Subiendo foto…" : "Adjuntar foto de resolución"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={mutate.isPending}
                      onChange={handleResolutionUpload}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Evidencias de seguimiento si existen */}
            {progressMedia.length > 0 && (
              <div className="evidence-block" style={{ marginTop: "24px" }}>
                <div className="evidence-header">
                  <h3>Evidencia de seguimiento y atención</h3>
                  <span className="badge-count">{progressMedia.length} foto(s)</span>
                </div>
                <div className="photos">
                  {progressMedia.map((m) => (
                    <Photo key={m.id} path={m.storage_path} label="Avance operativo" />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Historial de atención */}
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
            {q.data?.assignments && q.data.assignments.length > 0 && (
              <details style={{ marginTop: "16px" }}>
                <summary>Historial de asignaciones ({q.data.assignments.length})</summary>
                {q.data.assignments.map((a) => (
                  <p key={a.id} className="small" style={{ margin: "6px 0" }}>
                    {dateLabel(a.assigned_at)} · <strong>{a.status}</strong>
                    {a.assignment_note && ` · Nota: ${a.assignment_note}`}
                  </p>
                ))}
              </details>
            )}
          </section>
        </div>

        <div>
          {/* Panel Siguiente Paso */}
          <section className="panel">
            <h2>Siguiente paso</h2>
            <p>
              {next
                ? `Pasar a ${statusLabels[next].toLowerCase()}`
                : "Este reporte ya está solucionado."}
            </p>

            {/* Guía y requisitos claros cuando el siguiente paso es Solucionado */}
            {next === "solucionado" && (
              <div className="requirements-box">
                <span className="req-title">Requisitos para marcar como Solucionado:</span>
                <div className={`req-item ${hasResolutionPhoto ? "done" : "pending"}`}>
                  <span className="req-check">{hasResolutionPhoto ? "[OK]" : "○"}</span>
                  <div className="req-content">
                    <strong>1. Evidencia fotográfica de solución:</strong>
                    <span>
                      {hasResolutionPhoto
                        ? `${resolutionMedia.length} foto(s) de resolución adjunta(s).`
                        : "Falta subir al menos 1 fotografía de evidencia de resolución."}
                    </span>
                    {!hasResolutionPhoto && (
                      <label className="quick-upload-inline">
                        Subir foto de solución
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={mutate.isPending}
                          onChange={handleResolutionUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className={`req-item ${hasResolutionNote ? "done" : "pending"}`}>
                  <span className="req-check">{hasResolutionNote ? "[OK]" : "○"}</span>
                  <div className="req-content">
                    <strong>2. Nota de resolución del trabajo:</strong>
                    <span>
                      {hasResolutionNote
                        ? `Nota lista (${note.trim().length} caracteres).`
                        : `Escribe las observaciones abajo (mínimo 5 caracteres, llevas ${note.trim().length}).`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {groupedDuplicates.length > 0 && r.status !== "solucionado" && (
              <label className="check" style={{ margin: "10px 0" }}>
                <input
                  type="checkbox"
                  checked={syncDuplicates}
                  onChange={(e) => setSyncDuplicates(e.target.checked)}
                />
                <span>
                  Sincronizar avance con los{" "}
                  <strong>{groupedDuplicates.length}</strong> reporte(s) repetido(s) de esta
                  misma incidencia (≤ {DEFAULT_CLUSTER_RADIUS_M} m)
                </span>
              </label>
            )}

            <label>
              Observaciones / nota de resolución
              <textarea
                maxLength={2000}
                placeholder={
                  next === "solucionado"
                    ? "Detalla el trabajo realizado y cómo se solucionó la incidencia…"
                    : "Escribe alguna observación o nota interna…"
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
            </label>

            {next && (
              <button
                className={next === "solucionado" && canSolve ? "btn-success" : ""}
                disabled={
                  mutate.isPending ||
                  (next === "solucionado" && !canSolve)
                }
                onClick={() => {
                  if (
                    next === "solucionado" &&
                    !window.confirm(
                      "¿Confirmas que la incidencia está solucionada y los trabajos han concluido?",
                    )
                  )
                    return;
                  mutate.mutate(async () => {
                    const res = await api.reports.status(r.id, next, r.version, note);
                    if (syncDuplicates && groupedDuplicates.length > 0 && next !== "solucionado") {
                      for (const dup of groupedDuplicates) {
                        if (dup.status === r.status) {
                          try {
                            await api.reports.status(
                              dup.id,
                              next,
                              dup.version,
                              note || `Actualización agrupada junto al folio ${r.folio}`,
                            );
                          } catch {}
                        }
                      }
                    }
                    setNote("");
                    return res;
                  });
                }}
              >
                {mutate.isPending
                  ? "Guardando…"
                  : next === "solucionado"
                    ? canSolve
                      ? "Marcar como Solucionado"
                      : "Cumple los 2 requisitos para solucionar"
                    : statusLabels[next]}
              </button>
            )}

            <label style={{ marginTop: "18px" }}>
              Visibilidad de la nota
              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as typeof visibility)
                }
              >
                <option value="internal">Interna (Solo personal municipal)</option>
                <option value="citizen_visible">Visible al ciudadano</option>
              </select>
            </label>
            <button
              className="secondary"
              disabled={mutate.isPending || !note.trim()}
              onClick={() =>
                mutate.mutate(async () => {
                  await api.reports.note(r.id, note, visibility);
                  setNote("");
                })
              }
            >
              Guardar nota solamente
            </button>
          </section>

          {/* Panel Responsable de atención con visualización de asignado y botón Editar */}
          {session.role === "admin" && (
            <>
              <section className="panel">
                <div className="panel-header-action">
                  <h2>Responsable de atención</h2>
                  {activeAssignment && !isEditingAssignee && r.status !== "solucionado" && (
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => setIsEditingAssignee(true)}
                    >
                      Reasignar
                    </button>
                  )}
                </div>

                {area ? (
                  <>
                    {/* Visualización clara de la asignación guardada */}
                    {activeAssignment && !isEditingAssignee ? (
                      <div className="saved-card">
                        <div className="saved-header">
                          <span className="chip-active">Asignado actualmente</span>
                          <span className="small">{dateLabel(activeAssignment.assigned_at)}</span>
                        </div>
                        <p className="saved-name">
                          {assignedStaff?.display_name || "Personal de mantenimiento"}
                        </p>
                        <p className="small">
                          Estatus del trabajo: <strong>{activeAssignment.status}</strong>
                        </p>
                        {activeAssignment.assignment_note && (
                          <p className="small" style={{ fontStyle: "italic" }}>
                            Nota: {activeAssignment.assignment_note}
                          </p>
                        )}
                      </div>
                    ) : null}

                    {/* Formulario de asignación / reasignación */}
                    {(!activeAssignment || isEditingAssignee) && (
                      <div className="assign-form">
                        <label>
                          {activeAssignment
                            ? "Selecciona el nuevo responsable del área"
                            : "Personal del área operativa"}
                          <select
                            value={assignee}
                            onChange={(e) => setAssignee(e.target.value)}
                          >
                            <option value="">Selecciona responsable…</option>
                            {staff.data?.map((w) => (
                              <option key={w.user_id} value={w.user_id}>
                                {w.display_name} · {w.open_count} casos activos
                              </option>
                            ))}
                          </select>
                        </label>
                        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                          <button
                            disabled={
                              mutate.isPending ||
                              !assignee ||
                              r.status === "solucionado"
                            }
                            onClick={() =>
                              mutate.mutate(async () => {
                                const assigned = await api.reports.assign(
                                  r.id,
                                  assignee,
                                  r.version,
                                  note,
                                );
                                // Si estaba en recibido, pasarlo automáticamente a en_revision para habilitar el trabajo de campo
                                if (assigned.status === "recibido") {
                                  try {
                                    await api.reports.status(
                                      r.id,
                                      "en_revision",
                                      assigned.version,
                                      note || "Asignado a personal operativo para atención",
                                    );
                                  } catch {}
                                }
                                // Sincronizar asignación con reportes repetidos del mismo punto (< 45m)
                                if (syncDuplicates && groupedDuplicates.length > 0) {
                                  for (const dup of groupedDuplicates) {
                                    if (dup.status !== "solucionado") {
                                      try {
                                        const dupAssigned = await api.reports.assign(
                                          dup.id,
                                          assignee,
                                          dup.version,
                                          note || `Agrupado con folio ${r.folio}`,
                                        );
                                        if (dupAssigned.status === "recibido") {
                                          await api.reports.status(
                                            dup.id,
                                            "en_revision",
                                            dupAssigned.version,
                                            `En revisión junto con folio ${r.folio}`,
                                          );
                                        }
                                      } catch {}
                                    }
                                  }
                                }
                                return assigned;
                              })
                            }
                          >
                            {mutate.isPending
                              ? "Guardando…"
                              : activeAssignment
                                ? "Guardar reasignación"
                                : "Asignar responsable"}
                          </button>
                          {isEditingAssignee && activeAssignment && (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                setAssignee(activeAssignment.maintenance_user_id);
                                setIsEditingAssignee(false);
                              }}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="small">
                    Clasifica el reporte en una categoría con área responsable antes de asignarlo.
                  </p>
                )}
              </section>

              {/* Panel Clasificación con visualización guardada y botón Editar */}
              <section className="panel">
                <div className="panel-header-action">
                  <h2>Clasificación</h2>
                  {!isEditingClassification && (
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => setIsEditingClassification(true)}
                    >
                      Editar clasificación
                    </button>
                  )}
                </div>

                {/* Vista guardada limpia */}
                {!isEditingClassification ? (
                  <div className="saved-card">
                    <div className="summary-field">
                      <span className="summary-label">Categoría asignada:</span>
                      <strong className="summary-value">
                        {categories.data?.find((c) => c.id === r.category_id)?.name || "Sin categoría"}
                      </strong>
                    </div>
                    <div className="summary-field" style={{ marginTop: "10px" }}>
                      <span className="summary-label">Prioridad de atención:</span>
                      <span className={`priority-pill priority-${r.priority}`}>
                        {r.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Formulario de edición */
                  <div className="edit-form">
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
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                    <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                      <button
                        disabled={
                          mutate.isPending ||
                          (category === r.category_id && priority === r.priority)
                        }
                        onClick={() =>
                          mutate.mutate(() =>
                            api.reports.update(r.id, category, priority, r.version),
                          )
                        }
                      >
                        {mutate.isPending ? "Guardando…" : "Guardar cambios"}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setCategory(r.category_id);
                          setPriority(r.priority);
                          setIsEditingClassification(false);
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* Panel de Notas */}
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
            {!q.data?.notes.length && <p className="small">Sin notas registradas.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
