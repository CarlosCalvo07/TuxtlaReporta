import { useEffect, useMemo, useState } from "react";
import {
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { registerPush } from "./notifications";
import { OpenStreetMap, type MobileHeatClusterItem } from "./OpenStreetMap";

import {
  clusterReportsByCategory,
  dateLabel,
  DEFAULT_CLUSTER_RADIUS_M,
  friendlyError,
  getCategoryHeatStyle,
  type ReportFilters,
} from "@tuxtla/shared";
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
import {
  Screen,
  Button,
  Choices,
  Field,
  styles,
  BrandHeader,
  useTheme,
} from "./ui";

type OpsTab = "list" | "heatmap" | "profile";

export default function Operations() {
  const s = useSession(),
    cache = useQueryClient(),
    { colors, mode } = useTheme(),
    insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<OpsTab>("list");
  const [filters, setFilters] = useState<ReportFilters>({ page: 0 }),
    [search, setSearch] = useState(""),
    [groupDuplicates, setGroupDuplicates] = useState(true),
    [showFilters, setShowFilters] = useState(false),
    [message, setMessage] = useState("");
  const [sinceInput, setSinceInput] = useState(""),
    [untilInput, setUntilInput] = useState("");

  const profile = useQuery({
    queryKey: ["my-profile", s.uid],
    queryFn: api.auth.profile,
    enabled: !!s.uid,
  });

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

  const myAreaNames = useMemo(() => {
    if (!mine.data || !areas.data) return "Cargando…";
    const names = mine.data
      .map((item) => areas.data?.find((a) => a.id === item.maintenance_area_id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "Sin área asignada";
  }, [mine.data, areas.data]);

  const searchedRows = useMemo(() => {
    const rows = reports.data?.rows ?? [];
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.folio.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.neighborhood && r.neighborhood.toLowerCase().includes(q)),
    );
  }, [reports.data?.rows, search]);

  const clusters = useMemo(
    () => clusterReportsByCategory(searchedRows, DEFAULT_CLUSTER_RADIUS_M),
    [searchedRows],
  );

  const duplicatesGroupedCount = useMemo(
    () => clusters.reduce((sum, c) => sum + c.duplicateCount, 0),
    [clusters],
  );

  const mobileHeatClusters: MobileHeatClusterItem[] = useMemo(
    () =>
      clusters.map((c) => {
        const cat = cats.data?.find((item) => item.id === c.category_id);
        const style = getCategoryHeatStyle(cat?.slug || cat?.name);
        return {
          id: c.primary.id,
          latitude: c.latitude,
          longitude: c.longitude,
          count: c.count,
          color: style.color,
          haloInner: style.haloInner,
          haloOuter: style.haloOuter,
          label: cat?.name || style.label,
          folio: c.primary.folio,
        };
      }),
    [clusters, cats.data],
  );

  const maintenanceStats = useMemo(() => {
    const rows = reports.data?.rows ?? [];
    return {
      total: reports.data?.count ?? rows.length,
      porIniciar: rows.filter(
        (r) => r.status === "recibido" || r.status === "en_revision",
      ).length,
      enAtencion: rows.filter((r) => r.status === "en_atencion").length,
      solucionado: rows.filter((r) => r.status === "solucionado").length,
    };
  }, [reports.data]);

  async function notifications() {
    try {
      const msg = await registerPush();
      setMessage(msg);
      Alert.alert("Notificaciones", msg);
    } catch {
      const err = "No fue posible configurar las notificaciones.";
      setMessage(err);
      Alert.alert("Notificaciones", err);
    }
  }

  function handleLogout() {
    Alert.alert(
      "Cerrar sesión",
      "¿Deseas cerrar tu sesión operativa en Tuxtla Reporta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => {
            void api.auth.logout().then(() => cache.clear());
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ============================================================ */}
      {/* TAB 1: ASIGNACIONES Y REPORTES OPERATIVOS                    */}
      {/* ============================================================ */}
      {activeTab === "list" && (
        <Screen contentStyle={{ paddingBottom: 105 }}>
          <BrandHeader
            title={
              s.role === "admin" ? "Operación de la ciudad" : "Mis asignaciones"
            }
            subtitle={
              s.role === "maintenance"
                ? `Cuadrilla operativa · Áreas: ${myAreaNames}`
                : "Seguimiento y control de reportes urbanos en tiempo real."
            }
          />

          {/* Tarjetas de Resumen Operativo (Tanto para Mantenimiento como para Admin) */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={[styles.heading, { color: colors.text, fontSize: 15 }]}>
                {s.role === "admin"
                  ? "Telemetría Operativa"
                  : "Resumen de mi carga de trabajo"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Actualizar lista de asignaciones"
                onPress={() => {
                  void reports.refetch();
                  void cats.refetch();
                  void areas.refetch();
                  if (s.role === "maintenance") void mine.refetch();
                  if (s.role === "admin") void metrics.refetch();
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                  backgroundColor: "rgba(37, 99, 235, 0.16)",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
                  }}
                >
                  🔄 Actualizar
                </Text>
              </Pressable>
            </View>

            {s.role === "admin" ? (
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
                      backgroundColor:
                        mode === "dark" ? "rgba(5, 12, 24, 0.8)" : "#f8fafc",
                      borderRadius: 10,
                      padding: 12,
                      borderWidth: 1,
                      borderColor:
                        status === "solucionado"
                          ? "rgba(5, 150, 105, 0.45)"
                          : status === "en_atencion"
                            ? "rgba(37, 99, 235, 0.45)"
                            : status === "en_revision"
                              ? "rgba(217, 119, 6, 0.45)"
                              : "rgba(2, 132, 199, 0.45)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10.5,
                        color: colors.textMuted,
                        textTransform: "uppercase",
                        fontWeight: "700",
                        letterSpacing: 0.5,
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
                              ? mode === "dark"
                                ? "#60a5fa"
                                : "#1d4ed8"
                              : status === "en_revision"
                                ? "#f59e0b"
                                : mode === "dark"
                                  ? "#38bdf8"
                                  : "#0284c7",
                        marginTop: 4,
                      }}
                    >
                      {String(m?.[status] ?? "0")}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 4,
                }}
              >
                {[
                  {
                    label: "Por iniciar",
                    val: maintenanceStats.porIniciar,
                    color: "#f59e0b",
                    border: "rgba(245, 158, 11, 0.4)",
                  },
                  {
                    label: "En atención",
                    val: maintenanceStats.enAtencion,
                    color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
                    border: "rgba(37, 99, 235, 0.4)",
                  },
                  {
                    label: "Solucionados",
                    val: maintenanceStats.solucionado,
                    color: "#10b981",
                    border: "rgba(16, 185, 129, 0.4)",
                  },
                  {
                    label: "Total asignados",
                    val: maintenanceStats.total,
                    color: mode === "dark" ? "#38bdf8" : "#0284c7",
                    border: "rgba(2, 132, 199, 0.4)",
                  },
                ].map((item) => (
                  <View
                    key={item.label}
                    style={{
                      flex: 1,
                      minWidth: "45%",
                      backgroundColor:
                        mode === "dark" ? "rgba(5, 12, 24, 0.8)" : "#f8fafc",
                      borderRadius: 10,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: item.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10.5,
                        color: colors.textMuted,
                        textTransform: "uppercase",
                        fontWeight: "700",
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "800",
                        color: item.color,
                        marginTop: 4,
                      }}
                    >
                      {item.val}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Barra de búsqueda, agrupación y filtros */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                padding: 14,
                gap: 10,
              },
            ]}
          >
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por folio, colonia o descripción..."
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: colors.text,
                fontSize: 14,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => setGroupDuplicates((g) => !g)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  backgroundColor: groupDuplicates
                    ? "rgba(245, 158, 11, 0.16)"
                    : colors.chipBg,
                  borderColor: groupDuplicates ? "#f59e0b" : colors.chipBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: groupDuplicates
                      ? mode === "dark"
                        ? "#fbbf24"
                        : "#b45309"
                      : colors.textSecondary,
                  }}
                >
                  🔥 {groupDuplicates ? "Agrupando repetidos (≤45m)" : "Agrupar repetidos (≤45m)"}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setShowFilters((f) => !f)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  backgroundColor: showFilters
                    ? colors.chipActiveBg
                    : colors.chipBg,
                  borderColor: showFilters
                    ? colors.chipActiveBorder
                    : colors.chipBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {showFilters ? "▲ Ocultar filtros" : "⚙️ Filtrar reportes"}
                </Text>
              </Pressable>
            </View>

            {duplicatesGroupedCount > 0 && groupDuplicates && (
              <Text style={{ fontSize: 11.5, color: "#f59e0b", fontWeight: "600" }}>
                🔥 {duplicatesGroupedCount} reporte(s) repetido(s) del mismo tipo fueron agrupados en un radio de {DEFAULT_CLUSTER_RADIUS_M} m.
              </Text>
            )}

            {showFilters && (
              <View style={{ gap: 12, marginTop: 4 }}>
                <Choices
                  label="Estado"
                  options={[
                    { id: "", name: "Todos" },
                    ...statuses.map((id) => ({ id, name: statusLabels[id] })),
                  ]}
                  value={filters.status ?? ""}
                  onChange={(status) =>
                    set({ status: status as ReportStatus | "" })
                  }
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
                <Choices
                  label="Categoría"
                  options={[
                    { id: "", name: "Todas" },
                    ...(cats.data?.map((c) => ({ id: c.id, name: c.name })) ??
                      []),
                  ]}
                  value={filters.category ?? ""}
                  onChange={(category) => set({ category })}
                />
                {s.role === "admin" && (
                  <>
                    <Field
                      label="Desde (AAAA-MM-DD)"
                      value={sinceInput}
                      onChangeText={setSinceInput}
                      onEndEditing={() => {
                        if (
                          !sinceInput ||
                          /^\d{4}-\d{2}-\d{2}$/.test(sinceInput)
                        )
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
                        if (
                          !untilInput ||
                          /^\d{4}-\d{2}-\d{2}$/.test(untilInput)
                        )
                          set({ until: untilInput });
                        else setMessage("Escribe la fecha como AAAA-MM-DD.");
                      }}
                    />
                    <Choices
                      label="Área de mantenimiento"
                      options={[
                        { id: "", name: "Todas" },
                        ...(areas.data?.map((a) => ({
                          id: a.id,
                          name: a.name,
                        })) ?? []),
                      ]}
                      value={filters.area ?? ""}
                      onChange={(area) => set({ area })}
                    />
                  </>
                )}
              </View>
            )}
          </View>

          {reports.error && (
            <Text style={styles.error}>{friendlyError(reports.error)}</Text>
          )}
          {reports.isPending && (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Cargando reportes…
              </Text>
            </View>
          )}

          {(groupDuplicates
            ? clusters.map((c) => ({ row: c.primary, cluster: c }))
            : searchedRows.map((r) => ({ row: r, cluster: null }))
          ).map(({ row: r, cluster }) => {
            const cat = cats.data?.find((c) => c.id === r.category_id);
            const heatStyle = getCategoryHeatStyle(cat?.slug || cat?.name);
            const extraCount = cluster ? cluster.duplicateCount : 0;

            return (
              <Pressable
                accessibilityRole="button"
                key={r.id}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: pressed
                      ? mode === "dark"
                        ? "rgba(37, 99, 235, 0.15)"
                        : "rgba(37, 99, 235, 0.08)"
                      : colors.card,
                    borderColor: colors.border,
                    gap: 8,
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
                      fontSize: 15,
                      fontWeight: "800",
                      color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
                      letterSpacing: 0.5,
                    }}
                  >
                    {r.folio}
                  </Text>
                  <View
                    style={{
                      backgroundColor:
                        r.status === "solucionado"
                          ? "rgba(5, 150, 105, 0.15)"
                          : r.status === "en_atencion"
                            ? "rgba(37, 99, 235, 0.18)"
                            : r.status === "en_revision"
                              ? "rgba(217, 119, 6, 0.15)"
                              : "rgba(2, 132, 199, 0.12)",
                      borderColor:
                        r.status === "solucionado"
                          ? "rgba(5, 150, 105, 0.45)"
                          : r.status === "en_atencion"
                            ? "rgba(37, 99, 235, 0.45)"
                            : r.status === "en_revision"
                              ? "rgba(217, 119, 6, 0.45)"
                              : "rgba(2, 132, 199, 0.4)",
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
                            ? "#10b981"
                            : r.status === "en_atencion"
                              ? mode === "dark"
                                ? "#60a5fa"
                                : "#1d4ed8"
                              : r.status === "en_revision"
                                ? "#f59e0b"
                                : mode === "dark"
                                  ? "#38bdf8"
                                  : "#0284c7",
                      }}
                    >
                      {statusLabels[r.status]} · {r.priority}
                    </Text>
                  </View>
                </View>

                {/* Etiqueta de categoría con color identificador del mapa de calor */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: heatStyle.badgeBg,
                      borderColor: heatStyle.badgeBorder,
                      borderWidth: 1,
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      borderRadius: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: heatStyle.color,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: heatStyle.color,
                      }}
                    >
                      {cat?.name || heatStyle.label}
                    </Text>
                  </View>

                  {extraCount > 0 && (
                    <View
                      style={{
                        backgroundColor: heatStyle.color,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontWeight: "800",
                          color: "#ffffff",
                        }}
                      >
                        🔥 ×{extraCount + 1} reportes en ≤{DEFAULT_CLUSTER_RADIUS_M}m
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  numberOfLines={2}
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13.5,
                    lineHeight: 19,
                  }}
                >
                  {r.description}
                </Text>

                <Text style={styles.small}>
                  📍 {r.neighborhood || "Sin colonia especificada"} ·{" "}
                  {dateLabel(r.created_at)}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 4,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Pressable
                    onPress={() => {
                      void Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`,
                      );
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#10b981",
                      }}
                    >
                      🧭 Cómo llegar (Maps)
                    </Text>
                  </Pressable>
                  <Text
                    style={{
                      color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
                      fontWeight: "700",
                      fontSize: 12.5,
                    }}
                  >
                    Atender reporte →
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {!reports.isPending && searchedRows.length === 0 && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  alignItems: "center",
                  padding: 24,
                },
              ]}
            >
              <Text style={[styles.heading, { color: colors.text, fontSize: 16 }]}>
                Sin reportes asignados con estos filtros
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  fontSize: 13,
                }}
              >
                Pulsa "🔄 Actualizar" o cambia los filtros para consultar otras asignaciones.
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Button
              secondary
              title="Anterior"
              disabled={!filters.page}
              onPress={() =>
                setFilters((f) => ({ ...f, page: (f.page ?? 0) - 1 }))
              }
            />
            <Button
              secondary
              title="Siguiente"
              disabled={
                ((filters.page ?? 0) + 1) * 25 >= (reports.data?.count ?? 0)
              }
              onPress={() =>
                setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))
              }
            />
          </View>
        </Screen>
      )}

      {/* ============================================================ */}
      {/* TAB 2: MAPA DE CALOR POR CATEGORÍA (RANGO CORTO)             */}
      {/* ============================================================ */}
      {activeTab === "heatmap" && (
        <Screen contentStyle={{ paddingBottom: 105 }}>
          <BrandHeader
            title="Mapa de calor operativo"
            subtitle={`Agrupación inteligente en rango corto (≤ ${DEFAULT_CLUSTER_RADIUS_M} m) con colores por tipo de incidencia.`}
          />

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.heading, { color: colors.text, fontSize: 15 }]}>
              Colores por tipo de incidencia
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(["bache", "alumbrado", "basura", "otra"] as const).map((k) => {
                const st = getCategoryHeatStyle(k);
                return (
                  <View
                    key={k}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: st.badgeBg,
                      borderColor: st.badgeBorder,
                      borderWidth: 1,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 5,
                        backgroundColor: st.color,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: st.color,
                      }}
                    >
                      {st.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <OpenStreetMap
              clusters={mobileHeatClusters}
              radiusMeters={DEFAULT_CLUSTER_RADIUS_M}
              height={340}
              isDark={mode === "dark"}
              onSelectCluster={(id) => router.push(`/report/${id}`)}
            />

            <Text style={styles.small}>
              📊 {searchedRows.length} reporte(s) → {clusters.length} punto(s) de
              atención únicos ({duplicatesGroupedCount} repetido(s) agrupado(s) en ≤{" "}
              {DEFAULT_CLUSTER_RADIUS_M} m). Toca cualquier círculo en el mapa para
              abrir su expediente.
            </Text>
          </View>

          {clusters.map((c) => {
            const cat = cats.data?.find((item) => item.id === c.category_id);
            const st = getCategoryHeatStyle(cat?.slug || cat?.name);
            return (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/report/${c.primary.id}`)}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: st.badgeBorder,
                    padding: 14,
                    gap: 4,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 13.5, fontWeight: "800", color: st.color }}
                  >
                    {st.emoji} {cat?.name || st.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: "800",
                      color: colors.text,
                    }}
                  >
                    {c.count > 1
                      ? `🔥 ${c.count} reportes agrupados`
                      : c.primary.folio}
                  </Text>
                </View>
                <Text style={{ fontSize: 12.5, color: colors.textSecondary }}>
                  {c.primary.neighborhood || "Tuxtla Gutiérrez"} · Folio principal:{" "}
                  {c.primary.folio}
                </Text>
              </Pressable>
            );
          })}
        </Screen>
      )}

      {/* ============================================================ */}
      {/* TAB 3: PERFIL OPERATIVO Y TURNO                              */}
      {/* ============================================================ */}
      {activeTab === "profile" && (
        <Screen contentStyle={{ paddingBottom: 105 }}>
          <BrandHeader
            title="Mi perfil operativo"
            subtitle="Información de tu cuenta, áreas asignadas y notificaciones."
          />

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                alignItems: "center",
                paddingVertical: 22,
              },
            ]}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: "rgba(37, 99, 235, 0.16)",
                borderColor: "#3b82f6",
                borderWidth: 2,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 28 }}>🛠️</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
              {profile.data?.display_name || "Personal Operativo"}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              Rol: {s.role === "admin" ? "Administrador" : "Mantenimiento"}
            </Text>

            {s.role === "maintenance" && (
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                Áreas asignadas: <Text style={{ fontWeight: "700", color: colors.text }}>{myAreaNames}</Text>
              </Text>
            )}
          </View>

          {s.role === "admin" && (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.heading, { color: colors.text }]}>
                Carga por área y responsable
              </Text>
              {workload.data?.map((w) => (
                <Text
                  key={`${w.user_id}:${w.area_id}`}
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    marginVertical: 2,
                  }}
                >
                  {w.display_name} · {w.area_name}:{" "}
                  <Text style={{ fontWeight: "700", color: colors.text }}>
                    {w.open_count}
                  </Text>
                </Text>
              ))}
            </View>
          )}

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.heading, { color: colors.text }]}>
              🔔 Notificaciones de asignaciones
            </Text>
            <Text style={styles.small}>
              Recibe alertas inmediatas cuando se te asigne una nueva incidencia en tu área.
            </Text>
            <Button
              secondary
              title="Activar notificaciones"
              onPress={() => void notifications()}
            />
            {message ? <Text style={styles.subtitle}>{message}</Text> : null}
          </View>

          <Button
            secondary
            title="Cerrar sesión"
            onPress={handleLogout}
          />
        </Screen>
      )}

      {/* ============================================================ */}
      {/* BARRA DE NAVEGACIÓN INFERIOR OPERATIVA                       */}
      {/* ============================================================ */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor:
            mode === "dark"
              ? "rgba(10, 17, 32, 0.96)"
              : "rgba(255, 255, 255, 0.96)",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 10,
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab("list")}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor:
              activeTab === "list"
                ? "rgba(37, 99, 235, 0.14)"
                : "transparent",
          }}
        >
          <Text style={{ fontSize: 19 }}>📋</Text>
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: activeTab === "list" ? "800" : "500",
              color:
                activeTab === "list"
                  ? mode === "dark"
                    ? "#60a5fa"
                    : "#1d4ed8"
                  : colors.textMuted,
              marginTop: 2,
            }}
          >
            Asignaciones
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab("heatmap")}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor:
              activeTab === "heatmap"
                ? "rgba(37, 99, 235, 0.14)"
                : "transparent",
          }}
        >
          <Text style={{ fontSize: 19 }}>🔥</Text>
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: activeTab === "heatmap" ? "800" : "500",
              color:
                activeTab === "heatmap"
                  ? mode === "dark"
                    ? "#60a5fa"
                    : "#1d4ed8"
                  : colors.textMuted,
              marginTop: 2,
            }}
          >
            Mapa de calor
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab("profile")}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor:
              activeTab === "profile"
                ? "rgba(37, 99, 235, 0.14)"
                : "transparent",
          }}
        >
          <Text style={{ fontSize: 19 }}>👤</Text>
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: activeTab === "profile" ? "800" : "500",
              color:
                activeTab === "profile"
                  ? mode === "dark"
                    ? "#60a5fa"
                    : "#1d4ed8"
                  : colors.textMuted,
              marginTop: 2,
            }}
          >
            Mi perfil
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
