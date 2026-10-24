import { useEffect, useState } from "react";
import { Text, View, Image, Alert, Linking, Platform, Pressable } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useLocalSearchParams, Redirect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MapView, { Marker } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { dateLabel, friendlyError, nextReportStatus } from "@tuxtla/shared";

const isMapAvailable =
  Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  Platform.OS === "ios" ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  __DEV__;
import {
  statusLabels,
  priorities,
  type ReportPriority,
  type ReportStatus,
} from "@tuxtla/types";
import { api } from "../../src/backend";
import { useSession } from "../../src/session";
import { Screen, Button, Field, Choices, styles, useTheme, Card, Heading } from "../../src/ui";
function Photo({ path }: { path: string }) {
  const q = useQuery({
    queryKey: ["photo", path],
    queryFn: () => api.media.url(path),
    staleTime: 60000,
    refetchInterval: 60000,
    gcTime: 0,
  });
  return q.data ? (
    <Image
      source={{ uri: q.data }}
      accessibilityLabel="Evidencia del reporte"
      style={{ height: 230, borderRadius: 8, width: "100%" }}
    />
  ) : (
    <Text style={{ fontSize: 13, color: "#64748b" }}>Cargando fotografía…</Text>
  );
}
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    s = useSession(),
    cache = useQueryClient(),
    { colors, mode } = useTheme();
  const q = useQuery({
    queryKey: ["report", id],
    queryFn: () => api.reports.detail(id),
    enabled: !!s.role,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: api.catalogs.categories,
    enabled: !!s.role,
  });
  const [note, setNote] = useState(""),
    [assignee, setAssignee] = useState(""),
    [priority, setPriority] = useState<ReportPriority>("media"),
    [category, setCategory] = useState(""),
    [isEditingAssignee, setIsEditingAssignee] = useState(false),
    [isEditingClassification, setIsEditingClassification] = useState(false);
  const r = q.data?.report;
  const area = categories.data?.find(
    (c) => c.id === r?.category_id,
  )?.maintenance_area_id;
  const staff = useQuery({
    queryKey: ["workload", area],
    queryFn: () => api.staff.workload(area ?? undefined),
    enabled: s.role === "admin" && !!area,
  });
  const mutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => {
      void cache.invalidateQueries();
      setNote("");
      setIsEditingAssignee(false);
      setIsEditingClassification(false);
    },
  });
  useEffect(() => {
    if (!s.role) return;
    return api.reports.subscribe(id, () => void cache.invalidateQueries());
  }, [id, cache, s.role]);
  useEffect(() => {
    if (r) {
      setPriority(r.priority);
      setCategory(r.category_id);
    }
  }, [r]);
  if (s.loading)
    return (
      <Screen safeTop={false}>
        <Text>Verificando acceso…</Text>
      </Screen>
    );
  if (!s.role) return <Redirect href="/" />;
  if (!r)
    return (
      <Screen safeTop={false}>
        <Text>
          {q.isPending ? "Cargando reporte…" : friendlyError(q.error)}
        </Text>
      </Screen>
    );
  const next: ReportStatus | undefined = nextReportStatus(r.status, s.role);
  async function upload() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Camera permission");
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;
    const photo = await ImageManipulator.manipulateAsync(
      result.assets[0]!.uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    await api.media.upload(
      { uri: photo.uri, name: "resolution.jpg", type: "image/jpeg" },
      id,
      "resolution",
    );
  }
  const activeAssignment = q.data?.assignments?.find((a) => !a.ended_at);
  const assignedWorker = staff.data?.find(
    (w) => w.user_id === activeAssignment?.maintenance_user_id,
  );
  const initialPhotos =
    q.data?.media.filter((m) => m.media_type === "initial") ?? [];
  const resolutionPhotos =
    q.data?.media.filter((m) => m.media_type === "resolution") ?? [];
  const hasResolutionPhoto = resolutionPhotos.length > 0;
  const hasValidNote = note.trim().length >= 5;
  const canSolve = hasResolutionPhoto && hasValidNote;

  return (
    <Screen safeTop={false}>
      {/* Encabezado con Folio y Estado Formal */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "900",
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
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color:
                r.status === "solucionado"
                  ? "#10b981"
                  : r.status === "en_atencion"
                    ? "#60a5fa"
                    : r.status === "en_revision"
                      ? "#f59e0b"
                      : "#38bdf8",
            }}
          >
            {statusLabels[r.status]}
          </Text>
        </View>
      </View>

      {/* Tarjeta de Información General */}
      <Card>
        <Heading>
          {categories.data?.find((c) => c.id === r.category_id)?.name || "Incidencia Urbana"}
        </Heading>
        <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 21 }}>
          {r.description}
        </Text>
        <Text style={styles.small}>{dateLabel(r.created_at)}</Text>
        <Text style={styles.small}>
          Colonia: {r.neighborhood || "Sin colonia especificada"} · Prioridad{" "}
          <Text style={{ fontWeight: "700", textTransform: "uppercase" }}>{r.priority}</Text>
        </Text>

        {/* Indicador de Responsable Actual */}
        {activeAssignment ? (
          <View
            style={{
              padding: 10,
              borderRadius: 6,
              backgroundColor:
                mode === "dark"
                  ? "rgba(37, 99, 235, 0.1)"
                  : "rgba(37, 99, 235, 0.06)",
              borderColor:
                mode === "dark"
                  ? "rgba(37, 99, 235, 0.25)"
                  : "rgba(37, 99, 235, 0.2)",
              borderWidth: 1,
              marginTop: 6,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                textTransform: "uppercase",
                color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
              }}
            >
              Responsable de Atención Asignado:
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: colors.text,
                marginTop: 2,
              }}
            >
              👤 {assignedWorker?.display_name || "Personal operativo asignado"}
            </Text>
            {activeAssignment.assignment_note ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Nota: {activeAssignment.assignment_note}
              </Text>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              padding: 10,
              borderRadius: 6,
              backgroundColor:
                mode === "dark"
                  ? "rgba(217, 119, 6, 0.1)"
                  : "rgba(217, 119, 6, 0.08)",
              borderColor: "rgba(217, 119, 6, 0.25)",
              borderWidth: 1,
              marginTop: 6,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: mode === "dark" ? "#fbbf24" : "#b45309",
                fontWeight: "600",
              }}
            >
              ⚠️ Sin responsable de atención asignado aún
            </Text>
          </View>
        )}

        {/* Mapa o Coordenadas */}
        {isMapAvailable ? (
          <MapView
            style={{ height: 230, borderRadius: 8, marginTop: 8 }}
            initialRegion={{
              latitude: r.latitude,
              longitude: r.longitude,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }}
          >
            <Marker
              coordinate={{ latitude: r.latitude, longitude: r.longitude }}
            />
          </MapView>
        ) : (
          <View
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor:
                mode === "dark"
                  ? "rgba(30, 58, 138, 0.15)"
                  : "rgba(37, 99, 235, 0.06)",
              borderColor:
                mode === "dark"
                  ? "rgba(59, 130, 246, 0.3)"
                  : "rgba(37, 99, 235, 0.2)",
              borderWidth: 1,
              gap: 4,
              marginTop: 6,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
              }}
            >
              📍 Coordenadas de la Ubicación:
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
            </Text>
          </View>
        )}
        <Button
          secondary
          title="Ver en Google Maps"
          onPress={() => {
            void Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
            );
          }}
        />
      </Card>

      {/* Evidencia Inicial (Ciudadano) */}
      <Card>
        <Heading>📸 Evidencia Inicial del Reporte</Heading>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
          Fotografías capturadas por la ciudadanía al registrar la solicitud:
        </Text>
        {initialPhotos.length > 0 ? (
          initialPhotos.map((m) => (
            <View key={m.id} style={{ gap: 6, marginBottom: 12 }}>
              <Photo path={m.storage_path} />
              <Text style={styles.small}>Fotografía original del ciudadano</Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: "italic" }}>
            No se adjuntó fotografía en el reporte original.
          </Text>
        )}
      </Card>

      {/* Evidencia de Resolución (Personal Municipal) */}
      <Card>
        <Heading>✅ Evidencia de Trabajo Concluido</Heading>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
          Fotografía de verificación obligatoria del trabajo realizado en campo:
        </Text>
        {resolutionPhotos.length > 0 ? (
          resolutionPhotos.map((m) => (
            <View key={m.id} style={{ gap: 6, marginBottom: 12 }}>
              <Photo path={m.storage_path} />
              <Text style={{ fontSize: 12, color: "#10b981", fontWeight: "700" }}>
                ✓ Fotografía de resolución validada
              </Text>
            </View>
          ))
        ) : (
          <View
            style={{
              padding: 10,
              borderRadius: 6,
              backgroundColor:
                mode === "dark"
                  ? "rgba(217, 119, 6, 0.12)"
                  : "rgba(217, 119, 6, 0.08)",
              borderWidth: 1,
              borderColor: "rgba(217, 119, 6, 0.3)",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: mode === "dark" ? "#fbbf24" : "#b45309",
                lineHeight: 18,
              }}
            >
              ⚠️ Pendiente: Para dar por solucionada la incidencia es indispensable subir la fotografía de conclusión del trabajo.
            </Text>
          </View>
        )}
      </Card>

      {/* Panel de Atención Operativa para Personal y Responsables */}
      {s.role !== "citizen" && r.status !== "solucionado" && (
        <Card>
          <Heading>🛠️ Panel de Atención Operativa</Heading>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
            Registre el seguimiento técnico y la evidencia de resolución.
          </Text>

          {/* Checklist de Requisitos para Solucionar */}
          {next === "solucionado" && (
            <View
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor:
                  mode === "dark"
                    ? "rgba(15, 23, 42, 0.7)"
                    : "rgba(241, 245, 249, 0.9)",
                borderColor: colors.border,
                borderWidth: 1,
                marginBottom: 10,
                gap: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
                  textTransform: "uppercase",
                }}
              >
                Requisitos para marcar "Solucionado":
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: hasResolutionPhoto ? "#10b981" : "#ef4444",
                  fontWeight: "600",
                }}
              >
                {hasResolutionPhoto ? "✓" : "✗"} 1. Fotografía de trabajo concluido registrada ({resolutionPhotos.length})
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: hasValidNote ? "#10b981" : "#ef4444",
                  fontWeight: "600",
                }}
              >
                {hasValidNote ? "✓" : "✗"} 2. Observación técnica registrada (mín. 5 caracteres, actual: {note.trim().length})
              </Text>
            </View>
          )}

          <Field
            label="Observaciones técnicas / Informe de conclusión"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={2000}
          />

          <Button
            secondary
            title="📷 Tomar fotografía de conclusión"
            disabled={mutation.isPending}
            onPress={() => mutation.mutate(upload)}
          />

          <Button
            secondary
            title="Guardar nota interna"
            disabled={mutation.isPending || !note.trim()}
            onPress={() =>
              mutation.mutate(() => api.reports.note(id, note, "internal"))
            }
          />

          {next && (
            <Pressable
              disabled={
                mutation.isPending ||
                (next === "solucionado" && !canSolve)
              }
              onPress={() => {
                const action = () =>
                  mutation.mutate(() =>
                    api.reports.status(id, next, r.version, note),
                  );
                if (next === "solucionado") {
                  Alert.alert(
                    "Confirmar resolución institucional",
                    "¿Confirma que la incidencia en campo ha sido completamente solucionada y se adjuntaron las evidencias?",
                    [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Confirmar y Finalizar", onPress: action },
                    ],
                  );
                } else {
                  action();
                }
              }}
              style={({ pressed }) => [
                {
                  padding: 13,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 6,
                  backgroundColor:
                    next === "solucionado"
                      ? canSolve
                        ? "#059669"
                        : mode === "dark"
                          ? "#334155"
                          : "#cbd5e1"
                      : "#1d4ed8",
                  opacity:
                    mutation.isPending || (next === "solucionado" && !canSolve)
                      ? 0.55
                      : pressed
                        ? 0.85
                        : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {next === "solucionado"
                  ? canSolve
                    ? "✓ Marcar como Solucionado"
                    : "Completar requisitos para Solucionar"
                  : `Avanzar a: ${statusLabels[next]}`}
              </Text>
            </Pressable>
          )}
        </Card>
      )}

      {/* Gestión de Asignación y Clasificación (Administradores) */}
      {s.role === "admin" && (
        <>
          {/* Tarjeta de Responsable de Atención */}
          <Card>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <Heading>Responsable de Atención</Heading>
              {activeAssignment && (
                <Pressable
                  onPress={() => setIsEditingAssignee(!isEditingAssignee)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: mode === "dark" ? "#3b82f6" : "#1d4ed8",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
                    }}
                  >
                    {isEditingAssignee ? "Cancelar" : "✏️ Reasignar"}
                  </Text>
                </Pressable>
              )}
            </View>

            {area ? (
              (!activeAssignment || isEditingAssignee) ? (
                <>
                  <Choices
                    label="Personal de mantenimiento compatible"
                    options={
                      staff.data?.map((w) => ({
                        id: w.user_id,
                        name: `${w.display_name} (${w.open_count} casos)`,
                      })) ?? []
                    }
                    value={assignee}
                    onChange={setAssignee}
                  />
                  <Button
                    title="Guardar asignación de responsable"
                    disabled={
                      !assignee ||
                      mutation.isPending ||
                      r.status === "solucionado"
                    }
                    onPress={() =>
                      mutation.mutate(() =>
                        api.reports.assign(id, assignee, r.version, note),
                      )
                    }
                  />
                </>
              ) : (
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  Asignado a:{" "}
                  <Text style={{ fontWeight: "700", color: colors.text }}>
                    {assignedWorker?.display_name || "Personal registrado"}
                  </Text>
                </Text>
              )
            ) : (
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                Selecciona una categoría con área de servicio responsable.
              </Text>
            )}
          </Card>

          {/* Tarjeta de Clasificación */}
          <Card>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <Heading>Clasificación Oficial</Heading>
              <Pressable
                onPress={() => setIsEditingClassification(!isEditingClassification)}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: mode === "dark" ? "#3b82f6" : "#1d4ed8",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
                  }}
                >
                  {isEditingClassification ? "Cancelar" : "✏️ Modificar"}
                </Text>
              </Pressable>
            </View>

            {isEditingClassification ? (
              <>
                <Choices
                  label="Categoría de incidencia"
                  options={
                    categories.data
                      ?.filter((c) => c.is_active)
                      .map((c) => ({ id: c.id, name: c.name })) ?? []
                  }
                  value={category}
                  onChange={setCategory}
                />
                <Choices
                  label="Prioridad de atención"
                  options={priorities.map((id) => ({ id, name: id }))}
                  value={priority}
                  onChange={(p) => setPriority(p as ReportPriority)}
                />
                <Button
                  title="Guardar clasificación"
                  disabled={mutation.isPending}
                  onPress={() =>
                    mutation.mutate(() =>
                      api.reports.update(id, category, priority, r.version),
                    )
                  }
                />
              </>
            ) : (
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  Categoría:{" "}
                  <Text style={{ fontWeight: "700", color: colors.text }}>
                    {categories.data?.find((c) => c.id === r.category_id)?.name}
                  </Text>
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  Nivel de prioridad:{" "}
                  <Text style={{ fontWeight: "700", color: colors.text, textTransform: "uppercase" }}>
                    {r.priority}
                  </Text>
                </Text>
              </View>
            )}
          </Card>
        </>
      )}

      {mutation.error && (
        <Text style={styles.error}>{friendlyError(mutation.error)}</Text>
      )}

      {/* Historial Oficial de Cambios */}
      <Card>
        <Heading>Historial de Movimientos</Heading>
        {q.data?.history.map((h) => (
          <View
            key={h.id}
            style={{
              paddingVertical: 6,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
              {statusLabels[h.to_status]}
            </Text>
            <Text style={styles.small}>{dateLabel(h.created_at)}</Text>
            {h.note && (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {h.note}
              </Text>
            )}
          </View>
        ))}
      </Card>

      {/* Bitácora de Notas */}
      {!!q.data?.notes.length && (
        <Card>
          <Heading>Bitácora de Notas Internas</Heading>
          {q.data.notes.map((n) => (
            <View
              key={n.id}
              style={{
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.text }}>{n.note}</Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
