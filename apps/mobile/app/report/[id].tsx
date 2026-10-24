import { useEffect, useState } from "react";
import { Text, View, Image, Alert, Linking, Platform } from "react-native";
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
import { Screen, Button, Field, Choices, styles } from "../../src/ui";
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
      style={{ height: 230, borderRadius: 9, width: "100%" }}
    />
  ) : (
    <Text>Cargando fotografía…</Text>
  );
}
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    s = useSession(),
    cache = useQueryClient();
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
    [category, setCategory] = useState("");
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
  return (
    <Screen safeTop={false}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "900",
            color: "#00d2ee",
            letterSpacing: 1,
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
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
          }}
        >
          <Text
            style={{
              fontSize: 11,
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
            {statusLabels[r.status]}
          </Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>
          {categories.data?.find((c) => c.id === r.category_id)?.name}
        </Text>
        <Text style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 20 }}>
          {r.description}
        </Text>
        <Text style={styles.small}>{dateLabel(r.created_at)}</Text>
        <Text style={styles.small}>
          {r.neighborhood || "Sin colonia especificada"} · Prioridad{" "}
          {r.priority}
        </Text>
        {isMapAvailable ? (
          <MapView
            style={{ height: 250, borderRadius: 8 }}
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
              backgroundColor: "rgba(0, 210, 238, 0.06)",
              borderColor: "rgba(0, 210, 238, 0.2)",
              borderWidth: 1,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#00d2ee" }}>
              📍 Ubicación de la incidencia:
            </Text>
            <Text style={{ fontSize: 12, color: "#cbd5e1" }}>
              Coordenadas: {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
            </Text>
          </View>
        )}
        <Button
          secondary
          title="Ver ubicación en Google Maps"
          onPress={() => {
            void Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
            );
          }}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Fotografías</Text>
        {q.data?.media.map((m) => (
          <View key={m.id} style={{ gap: 8 }}>
            <Photo path={m.storage_path} />
            <Text style={styles.small}>
              {m.media_type === "initial"
                ? "Reporte original"
                : m.media_type === "resolution"
                  ? "Resolución"
                  : "Atención"}
            </Text>
          </View>
        ))}
      </View>
      {s.role !== "citizen" && r.status !== "solucionado" && (
        <View style={styles.card}>
          <Text style={styles.heading}>Atender reporte</Text>
          <Field
            label="Observaciones / resolución"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={2000}
          />
          <Button
            secondary
            title="Añadir evidencia final"
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
            <Button
              title={statusLabels[next]}
              disabled={
                mutation.isPending ||
                (next === "solucionado" &&
                  (note.trim().length < 5 ||
                    !q.data?.media.some((m) => m.media_type === "resolution")))
              }
              onPress={() => {
                const action = () =>
                  mutation.mutate(() =>
                    api.reports.status(id, next, r.version, note),
                  );
                if (next === "solucionado")
                  Alert.alert(
                    "Confirmar solución",
                    "¿La incidencia quedó solucionada?",
                    [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Confirmar", onPress: action },
                    ],
                  );
                else action();
              }}
            />
          )}
        </View>
      )}
      {s.role === "admin" && (
        <>
          <View style={styles.card}>
            <Text style={styles.heading}>Asignar responsable</Text>
            {area ? (
              <>
                <Choices
                  label="Personal compatible"
                  options={
                    staff.data?.map((w) => ({
                      id: w.user_id,
                      name: `${w.display_name} · ${w.open_count} activos`,
                    })) ?? []
                  }
                  value={assignee}
                  onChange={setAssignee}
                />
                <Button
                  title="Asignar / reasignar"
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
              <Text>Selecciona una categoría con área responsable.</Text>
            )}
          </View>
          <View style={styles.card}>
            <Choices
              label="Categoría"
              options={
                categories.data
                  ?.filter((c) => c.is_active)
                  .map((c) => ({ id: c.id, name: c.name })) ?? []
              }
              value={category}
              onChange={setCategory}
            />
            <Choices
              label="Prioridad"
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
          </View>
        </>
      )}
      {mutation.error && (
        <Text style={styles.error}>{friendlyError(mutation.error)}</Text>
      )}
      <View style={styles.card}>
        <Text style={styles.heading}>Historial</Text>
        {q.data?.history.map((h) => (
          <View key={h.id}>
            <Text>{statusLabels[h.to_status]}</Text>
            <Text style={styles.small}>{dateLabel(h.created_at)}</Text>
            {h.note && <Text>{h.note}</Text>}
          </View>
        ))}
      </View>
      {!!q.data?.notes.length && (
        <View style={styles.card}>
          <Text style={styles.heading}>Notas</Text>
          {q.data.notes.map((n) => (
            <Text key={n.id}>{n.note}</Text>
          ))}
        </View>
      )}
    </Screen>
  );
}
