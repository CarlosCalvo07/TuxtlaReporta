import { useEffect, useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { registerPush } from "./notifications";

import { dateLabel, friendlyError, type ReportFilters } from "@tuxtla/shared";
import {
  statusLabels,
  statuses,
  priorities,
  type ReportStatus,
  type ReportPriority,
  type Json,
} from "@tuxtla/types";
import { api } from "./backend";
import { useSession } from "./session";
import { Screen, Button, Choices, Field, styles, BrandHeader } from "./ui";
export default function Operations() {
  const s = useSession(),
    cache = useQueryClient();
  const [filters, setFilters] = useState<ReportFilters>({ page: 0 }),
    [message, setMessage] = useState("");
  const [sinceInput, setSinceInput] = useState(""),
    [untilInput, setUntilInput] = useState("");
  const reports = useQuery({
    queryKey: ["reports", filters],
    queryFn: () => api.reports.list(filters),
  });
  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: api.catalogs.categories,
  });
  const areas = useQuery({ queryKey: ["areas"], queryFn: api.catalogs.areas });
  const mine = useQuery({
    queryKey: ["my-areas"],
    queryFn: api.staff.mine,
    enabled: s.role === "maintenance",
  });
  const metrics = useQuery({
    queryKey: ["metrics"],
    queryFn: () => api.analytics.metrics(),
    enabled: s.role === "admin",
  });
  const workload = useQuery({
    queryKey: ["workload"],
    queryFn: () => api.staff.workload(),
    enabled: s.role === "admin",
  });
  useEffect(
    () =>
      api.notifications.subscribe(s.uid, () => void cache.invalidateQueries()),
    [s.uid, cache],
  );
  const set = (f: Partial<ReportFilters>) =>
    setFilters((x) => ({ ...x, ...f, page: 0 }));
  const m = metrics.data as Record<string, Json> | undefined;
  async function notifications() {
    try {
      setMessage(await registerPush());
    } catch {
      setMessage("No fue posible configurar las notificaciones.");
    }
  }
  return (
    <Screen>
      <BrandHeader
        title={s.role === "admin" ? "Operación de la ciudad" : "Mis asignaciones"}
        subtitle={
          s.role === "maintenance"
            ? `Áreas: ${mine.data
                ?.map(
                  (m) =>
                    areas.data?.find((a) => a.id === m.maintenance_area_id)?.name,
                )
                .join(", ") ?? "Cargando…"}`
            : "Seguimiento y control de reportes urbanos en tiempo real."
        }
      />
      {s.role === "admin" && (
        <View style={styles.card}>
          <Text style={styles.heading}>Telemetría Operativa</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 4,
            }}
          >
            {statuses.map((status) => (
              <View
                key={status}
                style={{
                  flex: 1,
                  minWidth: "45%",
                  backgroundColor: "rgba(5, 12, 24, 0.8)",
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor:
                    status === "solucionado"
                      ? "rgba(5, 150, 105, 0.4)"
                      : status === "en_atencion"
                        ? "rgba(37, 99, 235, 0.4)"
                        : status === "en_revision"
                          ? "rgba(217, 119, 6, 0.4)"
                          : "rgba(2, 132, 199, 0.4)",
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    fontWeight: "600",
                  }}
                >
                  {statusLabels[status]}
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "800",
                    color:
                      status === "solucionado"
                        ? "#10b981"
                        : status === "en_atencion"
                          ? "#60a5fa"
                          : status === "en_revision"
                            ? "#f59e0b"
                            : "#38bdf8",
                    marginTop: 4,
                  }}
                >
                  {String(m?.[status] ?? "0")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={styles.card}>
        <Choices
          label="Estado"
          options={[
            { id: "", name: "Todos" },
            ...statuses.map((id) => ({ id, name: statusLabels[id] })),
          ]}
          value={filters.status ?? ""}
          onChange={(status) => set({ status: status as ReportStatus | "" })}
        />
        <Choices
          label="Prioridad"
          options={[
            { id: "", name: "Todas" },
            ...priorities.map((id) => ({ id, name: id })),
          ]}
          value={filters.priority ?? ""}
          onChange={(priority) =>
            set({ priority: priority as ReportPriority | "" })
          }
        />
        {s.role === "admin" && (
          <>
            <Choices
              label="Categoría"
              options={[
                { id: "", name: "Todas" },
                ...(cats.data?.map((c) => ({ id: c.id, name: c.name })) ?? []),
              ]}
              value={filters.category ?? ""}
              onChange={(category) => set({ category })}
            />
            <Field
              label="Desde (AAAA-MM-DD)"
              value={sinceInput}
              onChangeText={setSinceInput}
              onEndEditing={() => {
                if (!sinceInput || /^\d{4}-\d{2}-\d{2}$/.test(sinceInput))
                  set({ since: sinceInput });
                else setMessage("Escribe la fecha como AAAA-MM-DD.");
              }}
              placeholder="2026-09-01"
            />
            <Field
              label="Hasta (AAAA-MM-DD)"
              value={untilInput}
              onChangeText={setUntilInput}
              onEndEditing={() => {
                if (!untilInput || /^\d{4}-\d{2}-\d{2}$/.test(untilInput))
                  set({ until: untilInput });
                else setMessage("Escribe la fecha como AAAA-MM-DD.");
              }}
            />
            <Choices
              label="Área de mantenimiento"
              options={[
                { id: "", name: "Todas" },
                ...(areas.data?.map((a) => ({ id: a.id, name: a.name })) ?? []),
              ]}
              value={filters.area ?? ""}
              onChange={(area) => set({ area })}
            />
          </>
        )}
      </View>
      {reports.error && (
        <Text style={styles.error}>{friendlyError(reports.error)}</Text>
      )}
      {reports.isPending && <Text>Cargando reportes…</Text>}
      {reports.data?.rows.map((r) => (
        <Pressable
          accessibilityRole="button"
          key={r.id}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: pressed
                ? "rgba(0, 210, 238, 0.12)"
                : "rgba(10, 22, 44, 0.85)",
              gap: 6,
            },
          ]}
          onPress={() => router.push(`/report/${r.id}`)}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: "#00d2ee",
                letterSpacing: 0.5,
              }}
            >
              {r.folio}
            </Text>
            <View
              style={{
                backgroundColor:
                  r.status === "solucionado"
                    ? "rgba(0, 230, 153, 0.15)"
                    : r.status === "en_atencion"
                      ? "rgba(59, 130, 246, 0.18)"
                      : r.status === "en_revision"
                        ? "rgba(255, 184, 0, 0.15)"
                        : "rgba(0, 210, 238, 0.12)",
                borderColor:
                  r.status === "solucionado"
                    ? "rgba(0, 230, 153, 0.4)"
                    : r.status === "en_atencion"
                      ? "rgba(59, 130, 246, 0.4)"
                      : r.status === "en_revision"
                        ? "rgba(255, 184, 0, 0.4)"
                        : "rgba(0, 210, 238, 0.3)",
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  color:
                    r.status === "solucionado"
                      ? "#00e699"
                      : r.status === "en_atencion"
                        ? "#60a5fa"
                        : r.status === "en_revision"
                          ? "#ffb800"
                          : "#00d2ee",
                }}
              >
                {statusLabels[r.status]} · {r.priority}
              </Text>
            </View>
          </View>
          <Text style={[styles.heading, { fontSize: 15 }]}>
            {cats.data?.find((c) => c.id === r.category_id)?.name}
          </Text>
          <Text numberOfLines={2} style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 18 }}>
            {r.description}
          </Text>
          <Text style={styles.small}>
            {r.neighborhood || "Sin colonia especificada"} · {dateLabel(r.created_at)}
          </Text>
          <Text style={{ color: "#00d2ee", fontWeight: "700", fontSize: 12, marginTop: 4 }}>
            Abrir detalle →
          </Text>
        </Pressable>
      ))}
      {reports.data?.count === 0 && (
        <Text style={styles.subtitle}>No hay reportes con estos filtros.</Text>
      )}
      <View style={styles.row}>
        <Button
          secondary
          title="Anterior"
          disabled={!filters.page}
          onPress={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) - 1 }))}
        />
        <Button
          secondary
          title="Siguiente"
          disabled={
            ((filters.page ?? 0) + 1) * 25 >= (reports.data?.count ?? 0)
          }
          onPress={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))}
        />
      </View>
      {s.role === "admin" && (
        <View style={styles.card}>
          <Text style={styles.heading}>Carga por área y responsable</Text>
          {workload.data?.map((w) => (
            <Text key={`${w.user_id}:${w.area_id}`}>
              {w.display_name} · {w.area_name}: {w.open_count}
            </Text>
          ))}
        </View>
      )}
      <Button
        secondary
        title="Activar notificaciones"
        onPress={() => void notifications()}
      />
      {message && <Text style={styles.subtitle}>{message}</Text>}
      <Button
        secondary
        title="Cerrar sesión"
        onPress={() => {
          void api.auth.logout().then(() => cache.clear());
        }}
      />
    </Screen>
  );
}
