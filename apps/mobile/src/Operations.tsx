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
import { Screen, Button, Choices, Field, styles } from "./ui";
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
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>
        {s.role === "admin" ? "Operación de la ciudad" : "Mis asignaciones"}
      </Text>
      {s.role === "maintenance" && (
        <Text style={styles.subtitle}>
          Áreas:{" "}
          {mine.data
            ?.map(
              (m) =>
                areas.data?.find((a) => a.id === m.maintenance_area_id)?.name,
            )
            .join(", ")}
        </Text>
      )}
      {s.role === "admin" && (
        <View style={styles.card}>
          <Text style={styles.heading}>Resumen</Text>
          {statuses.map((status) => (
            <Text key={status}>
              {statusLabels[status]}: {String(m?.[status] ?? "—")}
            </Text>
          ))}
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
          style={styles.card}
          onPress={() => router.push(`/report/${r.id}`)}
        >
          <Text style={styles.heading}>
            {cats.data?.find((c) => c.id === r.category_id)?.name}
          </Text>
          <Text style={styles.small}>{r.folio}</Text>
          <Text numberOfLines={2}>{r.description}</Text>
          <Text>
            {statusLabels[r.status]} · {r.priority}
          </Text>
          <Text style={styles.small}>
            {r.neighborhood || "Sin colonia especificada"} ·{" "}
            {dateLabel(r.created_at)}
          </Text>
          <Text style={{ color: "#295e43" }}>Abrir detalle →</Text>
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
