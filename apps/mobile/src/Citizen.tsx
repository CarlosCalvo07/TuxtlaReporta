import { registerPush } from "./notifications";
import { useRef, useState } from "react";
import {
  Text,
  View,
  Image,
  Alert,
  Pressable,
  Linking,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Crypto from "expo-crypto";
import MapView, { Marker } from "react-native-maps";
import { router } from "expo-router";
import { friendlyError, dateLabel } from "@tuxtla/shared";
import { statusLabels } from "@tuxtla/types";
import { api, client } from "./backend";
import { Button, Field, Screen, styles, Choices, BrandHeader, useTheme } from "./ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "./session";

const isMapAvailable =
  Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  Platform.OS === "ios" ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  __DEV__;

type TabKey = "report" | "my_reports" | "profile";

export default function Citizen() {
  const cache = useQueryClient();
  const session = useSession();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>("report");
  const [reportSearch, setReportSearch] = useState("");
  const [pushStatusMessage, setPushStatusMessage] = useState("");
  const [pushRegistering, setPushRegistering] = useState(false);

  // Consulta de perfil de usuario
  const userProfile = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await client.auth.getUser();
      return data.user;
    },
  });

  // Catálogos y reportes
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: api.catalogs.categories,
  });

  const myReports = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => api.reports.list(),
  });

  // Estado del formulario de nuevo reporte
  const [category, setCategory] = useState(""),
    [description, setDescription] = useState(""),
    [neighborhood, setNeighborhood] = useState(""),
    [photos, setPhotos] = useState<string[]>([]),
    [point, setPoint] = useState<{
      latitude: number;
      longitude: number;
      source: "gps" | "manual_map";
      accuracy?: number;
    } | null>(null),
    [message, setMessage] = useState(""),
    [createdSuccess, setCreatedSuccess] = useState<{
      id: string;
      folio: string;
    } | null>(null);

  const key = useRef(Crypto.randomUUID()),
    paths = useRef<string[]>([]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!category) throw new Error("Selecciona un tipo de incidencia.");
      if (description.trim().length < 20)
        throw new Error("La descripción debe tener al menos 20 caracteres.");
      if (!photos.length)
        throw new Error("Agrega al menos una fotografía de evidencia.");
      if (!point)
        throw new Error("Indica la ubicación del reporte en el mapa.");

      for (let i = paths.current.length; i < photos.length; i++) {
        const uri = photos[i]!;
        try {
          const upload = await api.media.upload({
            uri,
            name: `photo_${i + 1}.jpg`,
            type: "image/jpeg",
          });
          paths.current.push(upload.path);
        } catch (uploadErr) {
          const detail =
            uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
          throw new Error(`Error al subir foto (${i + 1}/${photos.length}): ${detail}`);
        }
      }

      try {
        return await api.reports.create(
          {
            category_id: category,
            description: description.trim(),
            latitude: point.latitude,
            longitude: point.longitude,
            location_source: point.source,
            ...(point.accuracy !== undefined
              ? { location_accuracy_m: point.accuracy }
              : {}),
            neighborhood,
            idempotency_key: key.current,
          },
          paths.current,
        );
      } catch (createErr) {
        const detail =
          createErr instanceof Error ? createErr.message : String(createErr);
        throw new Error(`Error al registrar el reporte: ${detail}`);
      }
    },
    onSuccess: (r) => {
      setMessage("");
      setCreatedSuccess({ id: r.id, folio: r.folio });
      key.current = Crypto.randomUUID();
      paths.current = [];
      setDescription("");
      setPhotos([]);
      setPoint(null);
      void cache.invalidateQueries({ queryKey: ["my-reports"] });
      Alert.alert(
        "¡Reporte enviado con éxito!",
        `Tu número de folio es:\n\n${r.folio}\n\nConsérvalo para dar seguimiento a tu incidencia.`,
        [
          { text: "Cerrar", style: "cancel" },
          {
            text: "Ver reporte",
            onPress: () => router.push(`/report/${r.id}`),
          },
        ],
      );
    },
    onError: (error: unknown) => {
      const errText =
        error instanceof Error
          ? error.message
          : "No se pudo enviar el reporte. Revisa tu conexión e inténtalo de nuevo.";
      setMessage(errText);
      Alert.alert("Error al enviar", errText);
    },
  });

  function validateAndSubmit() {
    if (submit.isPending) return;
    if (!category) {
      const msg = "Por favor selecciona un tipo de incidencia.";
      setMessage(msg);
      Alert.alert("Dato faltante", msg);
      return;
    }
    if (description.trim().length < 20) {
      const faltan = 20 - description.trim().length;
      const msg = `La descripción debe tener al menos 20 caracteres (te faltan ${faltan}).`;
      setMessage(msg);
      Alert.alert(
        "Descripción muy corta",
        `Describe con más detalle la incidencia (mínimo 20 caracteres; te faltan ${faltan}).`,
      );
      return;
    }
    if (!photos.length) {
      const msg = "Agrega al menos una fotografía como evidencia.";
      setMessage(msg);
      Alert.alert("Fotografía requerida", msg);
      return;
    }
    if (!point) {
      const msg =
        "Indica la ubicación en el mapa o pulsa 'Usar mi ubicación actual'.";
      setMessage(msg);
      Alert.alert("Ubicación requerida", msg);
      return;
    }
    setMessage("");
    submit.mutate();
  }

  async function photo(camera: boolean) {
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage(
          "Permiso rechazado. Puedes elegir la otra opción de captura.",
        );
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
      if (!result.canceled) {
        const image = await ImageManipulator.manipulateAsync(
          result.assets[0]!.uri,
          [{ resize: { width: 1600 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        setPhotos((p) => [...p, image.uri]);
      }
    } catch {
      setMessage("No se pudo preparar la fotografía.");
    }
  }

  async function gps() {
    try {
      if (
        (await Location.requestForegroundPermissionsAsync()).status !==
        "granted"
      ) {
        setMessage("Puedes colocar la ubicación manualmente en el mapa.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setPoint({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        source: "gps",
        ...(loc.coords.accuracy !== null
          ? { accuracy: loc.coords.accuracy }
          : {}),
      });
    } catch {
      setMessage(
        "No se obtuvo ubicación. Toca el mapa para seleccionar el lugar.",
      );
    }
  }

  function handleLogout() {
    Alert.alert(
      "Cerrar sesión",
      "¿Estás seguro de que deseas cerrar tu sesión en Tuxtla Reporta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, cerrar sesión",
          style: "destructive",
          onPress: () => {
            void api.auth.logout().then(() => cache.clear());
          },
        },
      ],
    );
  }

  async function handleRegisterPush() {
    try {
      setPushRegistering(true);
      const res = await registerPush();
      setPushStatusMessage(res || "¡Notificaciones activadas exitosamente!");
      Alert.alert("Notificaciones", res || "Notificaciones activadas correctamente.");
    } catch (err) {
      const msg = friendlyError(err);
      setPushStatusMessage(msg);
      Alert.alert("Notificaciones", msg);
    } finally {
      setPushRegistering(false);
    }
  }

  // Filtrado de reportes por folio o texto
  const filteredReports = (myReports.data?.rows ?? []).filter((r) => {
    if (!reportSearch.trim()) return true;
    const q = reportSearch.toLowerCase();
    return (
      r.folio.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (r.neighborhood && r.neighborhood.toLowerCase().includes(q))
    );
  });

  const reportsCount = myReports.data?.rows?.length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ============================================================ */}
      {/* VISTA 1: REPORTAR INCIDENCIAS                                */}
      {/* ============================================================ */}
      {activeTab === "report" && (
        <Screen contentStyle={{ paddingBottom: 100 }}>
          <BrandHeader
            title="Reportar incidencia"
            subtitle="Registra baches, luminarias, fugas y más para atención municipal directa."
          />

          {createdSuccess && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: "rgba(0, 230, 153, 0.12)",
                  borderColor: "#00e699",
                  borderWidth: 1.5,
                  alignItems: "center",
                  padding: 18,
                },
              ]}
            >
              <Text style={{ fontSize: 32, marginBottom: 4 }}>✨</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#00e699",
                  marginBottom: 4,
                }}
              >
                ¡Reporte enviado con éxito!
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                Tu folio de seguimiento asignado es:
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(4, 9, 20, 0.9)",
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: "#00d2ee",
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  alignItems: "center",
                  marginBottom: 14,
                  width: "100%",
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    color: "#00d2ee",
                    letterSpacing: 1.5,
                  }}
                >
                  {createdSuccess.folio}
                </Text>
              </View>
              <View style={{ width: "100%", gap: 8 }}>
                <Button
                  title="Ver detalle del reporte"
                  onPress={() => router.push(`/report/${createdSuccess.id}`)}
                />
                <Button
                  secondary
                  title="Ver en 'Mis reportes'"
                  onPress={() => {
                    setCreatedSuccess(null);
                    setActiveTab("my_reports");
                  }}
                />
                <Button
                  secondary
                  title="Hacer otro reporte"
                  onPress={() => setCreatedSuccess(null)}
                />
              </View>
            </View>
          )}

          {/* Formulario de reporte */}
          <View style={styles.card}>
            <Choices
              label="Tipo de incidencia"
              options={
                categories.data
                  ?.filter((c) => c.is_active)
                  .map((c) => ({ id: c.id, name: c.name })) ?? []
              }
              value={category}
              onChange={setCategory}
            />
            <View>
              <Field
                label="Descripción (20 a 2000 caracteres)"
                multiline
                maxLength={2000}
                numberOfLines={5}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe qué sucede, puntos de referencia visibles, tiempo que lleva la situación..."
              />
              <Text
                style={[
                  styles.small,
                  {
                    textAlign: "right",
                    marginTop: 4,
                    color:
                      description.trim().length >= 20 ? "#00e699" : "#ffb800",
                    fontWeight:
                      description.trim().length >= 20 ? "700" : "500",
                  },
                ]}
              >
                {description.trim().length}/20 caracteres mínimos{" "}
                {description.trim().length >= 20 ? "✓" : ""}
              </Text>
            </View>
            <Field
              label="Colonia o zona"
              value={neighborhood}
              onChangeText={setNeighborhood}
              maxLength={150}
              placeholder="Ej. Las Terrazas, Centro, Plan de Ayala..."
            />
          </View>

          {/* Evidencia fotográfica */}
          <View style={styles.card}>
            <Text style={styles.heading}>Evidencia fotográfica</Text>
            <Text style={styles.small}>
              Sube de 1 a 5 fotografías claras. Evita capturar rostros o datos personales.
            </Text>
            {photos.length > 0 ? (
              <View style={styles.row}>
                {photos.map((uri, idx) => (
                  <View key={uri} style={{ position: "relative" }}>
                    <Image
                      source={{ uri }}
                      accessibilityLabel="Foto seleccionada"
                      style={{ width: 85, height: 85, borderRadius: 8 }}
                    />
                    <Pressable
                      accessibilityLabel="Eliminar fotografía"
                      onPress={() =>
                        setPhotos((p) => p.filter((_, i) => i !== idx))
                      }
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        backgroundColor: "#c62828",
                        borderRadius: 12,
                        width: 22,
                        height: 22,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 12,
                          fontWeight: "bold",
                        }}
                      >
                        ✕
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: "#ffb800", fontSize: 13 }}>
                ⚠️ Debes agregar al menos 1 fotografía de evidencia.
              </Text>
            )}
            <Button
              title="Tomar fotografía con cámara"
              disabled={photos.length >= 5 || submit.isPending}
              onPress={() => void photo(true)}
            />
            <Button
              secondary
              title="Elegir de galería"
              disabled={photos.length >= 5 || submit.isPending}
              onPress={() => void photo(false)}
            />
          </View>

          {/* Ubicación: GPS + Mapa interactivo (sin atajos de zona) */}
          <View style={styles.card}>
            <Text style={styles.heading}>¿Dónde sucede?</Text>
            <Text style={styles.small}>
              Usa el GPS o toca directamente el mapa para marcar el lugar exacto.
            </Text>
            <Button
              secondary
              title="📍 Usar mi ubicación actual (GPS)"
              onPress={() => void gps()}
            />

            {isMapAvailable ? (
              <MapView
                style={{ height: 280, borderRadius: 10, marginVertical: 8 }}
                initialRegion={{
                  latitude: 16.753,
                  longitude: -93.116,
                  latitudeDelta: 0.045,
                  longitudeDelta: 0.045,
                }}
                {...(point
                  ? {
                      region: {
                        latitude: point.latitude,
                        longitude: point.longitude,
                        latitudeDelta: 0.025,
                        longitudeDelta: 0.025,
                      },
                    }
                  : {})}
                onPress={(e) => {
                  setPoint({ ...e.nativeEvent.coordinate, source: "manual_map" });
                }}
              >
                {point && (
                  <Marker
                    coordinate={point}
                    draggable
                    onDragEnd={(e) => {
                      setPoint({
                        ...e.nativeEvent.coordinate,
                        source: "manual_map",
                      });
                    }}
                  />
                )}
              </MapView>
            ) : (
              <View
                style={{
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor:
                    mode === "dark"
                      ? "rgba(0, 210, 238, 0.06)"
                      : "rgba(37, 99, 235, 0.04)",
                  borderColor:
                    mode === "dark"
                      ? "rgba(0, 210, 238, 0.2)"
                      : "rgba(37, 99, 235, 0.2)",
                  borderWidth: 1,
                  gap: 10,
                  marginVertical: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: mode === "dark" ? "#00d2ee" : "#2563eb",
                  }}
                >
                  O selecciona una zona aproximada de Tuxtla:
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { name: "Zona Centro", lat: 16.753, lon: -93.116 },
                    { name: "Terán", lat: 16.741, lon: -93.167 },
                    { name: "Las Palmas", lat: 16.762, lon: -93.09 },
                    { name: "Plan de Ayala", lat: 16.762, lon: -93.185 },
                    { name: "Patria Nueva", lat: 16.768, lon: -93.075 },
                    { name: "Diana Cazadora", lat: 16.752, lon: -93.079 },
                  ].map((zone) => (
                    <Pressable
                      key={zone.name}
                      accessibilityRole="button"
                      accessibilityLabel={zone.name}
                      onPress={() => {
                        setPoint({
                          latitude: zone.lat,
                          longitude: zone.lon,
                          source: "manual_map",
                        });
                        if (!neighborhood) setNeighborhood(zone.name);
                      }}
                      style={({ pressed }) => [
                        {
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 16,
                          borderWidth: 1,
                          backgroundColor:
                            point?.latitude === zone.lat &&
                            point?.longitude === zone.lon
                              ? mode === "dark"
                                ? "rgba(0, 210, 238, 0.25)"
                                : "rgba(37, 99, 235, 0.2)"
                              : mode === "dark"
                                ? "rgba(10, 20, 40, 0.6)"
                                : "rgba(240, 243, 246, 0.9)",
                          borderColor:
                            point?.latitude === zone.lat &&
                            point?.longitude === zone.lon
                              ? mode === "dark"
                                ? "#00d2ee"
                                : "#2563eb"
                              : mode === "dark"
                                ? "rgba(255, 255, 255, 0.15)"
                                : "rgba(0, 0, 0, 0.15)",
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight:
                            point?.latitude === zone.lat &&
                            point?.longitude === zone.lon
                              ? "700"
                              : "500",
                          color:
                            point?.latitude === zone.lat &&
                            point?.longitude === zone.lon
                              ? mode === "dark"
                                ? "#00d2ee"
                                : "#2563eb"
                              : colors.text,
                        }}
                      >
                        {zone.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {point ? (
              <View
                style={{
                  backgroundColor: "rgba(0, 230, 153, 0.12)",
                  borderColor: "#00e699",
                  borderWidth: 1,
                  padding: 12,
                  borderRadius: 8,
                  gap: 3,
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: "#00e699" }}
                >
                  ✓ Ubicación establecida
                </Text>
                <Text style={styles.small}>
                  {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)} ·{" "}
                  {point.source === "gps" ? "GPS" : "Marcador manual"}
                  {point.accuracy !== undefined
                    ? ` · ±${Math.round(point.accuracy)} m`
                    : ""}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver en Google Maps"
                  onPress={() => {
                    void Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`,
                    );
                  }}
                  style={{ marginTop: 4 }}
                >
                  <Text style={{ fontSize: 12, color: "#60a5fa", textDecorationLine: "underline" }}>
                    ↗ Abrir en Google Maps
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text style={{ color: "#ffb800", fontSize: 13 }}>
                ⚠️ Toca el mapa o pulsa "Usar mi ubicación actual" para fijar las coordenadas.
              </Text>
            )}
          </View>

          {(message || submit.error || categories.error) && (
            <Text style={styles.error}>
              {message || friendlyError(submit.error || categories.error)}
            </Text>
          )}

          {/* Guía de requisitos pendientes */}
          {(!category ||
            description.trim().length < 20 ||
            photos.length === 0 ||
            !point) && (
            <View
              style={{
                backgroundColor: "rgba(10, 22, 44, 0.8)",
                borderColor: "rgba(0, 210, 238, 0.25)",
                borderWidth: 1,
                padding: 14,
                borderRadius: 12,
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#00d2ee" }}>
                Requisitos para poder enviar:
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: category ? "#00e699" : "#ffb800",
                }}
              >
                {category ? "✓" : "•"} Seleccionar tipo de incidencia
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color:
                    description.trim().length >= 20 ? "#00e699" : "#ffb800",
                }}
              >
                {description.trim().length >= 20 ? "✓" : "•"} Descripción mínima (
                {description.trim().length}/20 caracteres)
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: photos.length > 0 ? "#00e699" : "#ffb800",
                }}
              >
                {photos.length > 0 ? "✓" : "•"} Al menos 1 fotografía ({photos.length}/5)
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: point ? "#00e699" : "#ffb800",
                }}
              >
                {point ? "✓" : "•"} Ubicación marcada en el mapa
              </Text>
            </View>
          )}

          <Button
            title={
              submit.isPending
                ? "Subiendo evidencias y enviando…"
                : "Enviar reporte"
            }
            disabled={submit.isPending}
            onPress={validateAndSubmit}
          />
        </Screen>
      )}

      {/* ============================================================ */}
      {/* VISTA 2: MIS REPORTES                                        */}
      {/* ============================================================ */}
      {activeTab === "my_reports" && (
        <Screen contentStyle={{ paddingBottom: 100 }}>
          <BrandHeader
            title="Mis reportes"
            subtitle="Consulta el historial y seguimiento en tiempo real de tus incidencias."
          />

          {/* Barra de búsqueda y contador */}
          <View style={[styles.card, { padding: 14, gap: 10 }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                {reportsCount === 0
                  ? "Sin reportes aún"
                  : `${reportsCount} ${reportsCount === 1 ? "reporte registrado" : "reportes registrados"}`}
              </Text>
              <Pressable
                onPress={() => void myReports.refetch()}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                  backgroundColor: "rgba(0, 210, 238, 0.12)",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#00d2ee" }}>
                  🔄 Actualizar
                </Text>
              </Pressable>
            </View>

            {reportsCount > 0 && (
              <TextInput
                value={reportSearch}
                onChangeText={setReportSearch}
                placeholder="Buscar por folio, colonia o descripción..."
                placeholderTextColor="#64748b"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  color: colors.text,
                  fontSize: 14,
                }}
              />
            )}
          </View>

          {myReports.isPending && (
            <View style={{ alignItems: "center", paddingVertical: 30 }}>
              <ActivityIndicator size="large" color="#00d2ee" />
              <Text style={[styles.small, { marginTop: 10 }]}>
                Cargando tus reportes…
              </Text>
            </View>
          )}

          {/* Estado vacío: sin reportes */}
          {!myReports.isPending && reportsCount === 0 && (
            <View
              style={[
                styles.card,
                {
                  alignItems: "center",
                  paddingVertical: 36,
                  paddingHorizontal: 20,
                  gap: 12,
                },
              ]}
            >
              <Text style={{ fontSize: 44 }}>📋</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.text,
                  textAlign: "center",
                }}
              >
                Aún no has enviado reportes
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                Ayuda a mejorar Tuxtla Gutiérrez reportando baches, fugas de agua, fallas de alumbrado o basura acumulada.
              </Text>
              <View style={{ marginTop: 8, width: "100%" }}>
                <Button
                  title="📝 Crear mi primer reporte"
                  onPress={() => setActiveTab("report")}
                />
              </View>
            </View>
          )}

          {/* Listado filtrado */}
          {!myReports.isPending &&
            reportsCount > 0 &&
            filteredReports.length === 0 && (
              <View style={[styles.card, { alignItems: "center", padding: 24 }]}>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                  No se encontraron reportes con ese criterio de búsqueda.
                </Text>
              </View>
            )}

          {!myReports.isPending &&
            filteredReports.map((rep) => {
              const statusColor =
                rep.status === "solucionado"
                  ? "#00e699"
                  : rep.status === "en_atencion"
                    ? "#60a5fa"
                    : rep.status === "en_revision"
                      ? "#ffb800"
                      : "#00d2ee";

              const statusBg =
                rep.status === "solucionado"
                  ? "rgba(0, 230, 153, 0.15)"
                  : rep.status === "en_atencion"
                    ? "rgba(59, 130, 246, 0.18)"
                    : rep.status === "en_revision"
                      ? "rgba(255, 184, 0, 0.15)"
                      : "rgba(0, 210, 238, 0.12)";

              return (
                <Pressable
                  key={rep.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver reporte ${rep.folio}`}
                  onPress={() => router.push(`/report/${rep.id}`)}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      padding: 16,
                      gap: 8,
                      borderColor: pressed ? "#00d2ee" : colors.border,
                      transform: [{ scale: pressed ? 0.99 : 1 }],
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
                      style={{
                        fontSize: 16,
                        fontWeight: "900",
                        color: "#00d2ee",
                        letterSpacing: 0.5,
                      }}
                    >
                      {rep.folio}
                    </Text>
                    <View
                      style={{
                        backgroundColor: statusBg,
                        borderColor: statusColor,
                        borderWidth: 1,
                        paddingHorizontal: 9,
                        paddingVertical: 3.5,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          textTransform: "uppercase",
                          color: statusColor,
                        }}
                      >
                        {statusLabels[rep.status] ?? rep.status}
                      </Text>
                    </View>
                  </View>

                  <Text
                    numberOfLines={3}
                    style={{
                      fontSize: 14,
                      color: colors.text,
                      lineHeight: 20,
                    }}
                  >
                    {rep.description}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 4,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: "rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <Text style={{ fontSize: 11.5, color: colors.textMuted }}>
                      📅 {dateLabel(rep.created_at)}
                      {rep.neighborhood ? ` · 📍 ${rep.neighborhood}` : ""}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#60a5fa",
                      }}
                    >
                      Ver detalle →
                    </Text>
                  </View>
                </Pressable>
              );
            })}
        </Screen>
      )}

      {/* ============================================================ */}
      {/* VISTA 3: MI PERFIL Y SESIÓN                                  */}
      {/* ============================================================ */}
      {activeTab === "profile" && (
        <Screen contentStyle={{ paddingBottom: 100 }}>
          <BrandHeader
            title="Mi perfil"
            subtitle="Información de tu cuenta ciudadana y ajustes de la app."
          />

          {/* Tarjeta de información del usuario */}
          <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "rgba(0, 210, 238, 0.15)",
                borderColor: "#00d2ee",
                borderWidth: 2,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 32 }}>👤</Text>
            </View>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: colors.text,
                marginBottom: 2,
              }}
            >
              {userProfile.data?.email ?? "Ciudadano Tuxtleco"}
            </Text>

            <View
              style={{
                backgroundColor: "rgba(37, 99, 235, 0.2)",
                borderColor: "#3b82f6",
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 12,
                marginTop: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "#93c5fd",
                  textTransform: "uppercase",
                }}
              >
                Rol: Ciudadano
              </Text>
            </View>

            <View
              style={{
                width: "100%",
                marginTop: 20,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: "rgba(255, 255, 255, 0.08)",
                gap: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  Correo electrónico:
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {userProfile.data?.email || "No disponible"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  ID de usuario:
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    color: colors.textSecondary,
                  }}
                >
                  {session.uid ? `${session.uid.slice(0, 12)}…` : "—"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  Reportes registrados:
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#00d2ee",
                  }}
                >
                  {reportsCount}
                </Text>
              </View>
            </View>
          </View>

          {/* Notificaciones */}
          <View style={styles.card}>
            <Text style={styles.heading}>🔔 Notificaciones de seguimiento</Text>
            <Text style={styles.small}>
              Recibe avisos en tu teléfono cada vez que una cuadrilla atienda o solucione una de tus incidencias.
            </Text>
            {pushStatusMessage ? (
              <View
                style={{
                  backgroundColor: "rgba(0, 210, 238, 0.1)",
                  padding: 10,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: "rgba(0, 210, 238, 0.3)",
                }}
              >
                <Text style={{ fontSize: 12.5, color: "#00d2ee" }}>
                  {pushStatusMessage}
                </Text>
              </View>
            ) : null}
            <Button
              secondary
              title={
                pushRegistering
                  ? "Configurando notificaciones…"
                  : "Activar notificaciones en este dispositivo"
              }
              disabled={pushRegistering}
              onPress={() => void handleRegisterPush()}
            />
          </View>

          {/* Información institucional */}
          <View style={styles.card}>
            <Text style={styles.heading}>🏛️ H. Ayuntamiento de Tuxtla Gutiérrez</Text>
            <Text style={styles.small}>
              Atención Ciudadana Oficial y Servicios Públicos Municipales.
            </Text>
            <View style={{ gap: 6, marginTop: 4 }}>
              <Pressable
                onPress={() => void Linking.openURL("tel:072")}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.text }}>
                  📞 Línea de atención ciudadana:
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#60a5fa" }}>
                  072
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  void Linking.openURL("https://www.tuxtla.gob.mx")
                }
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.text }}>
                  🌐 Portal municipal:
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#60a5fa" }}>
                  tuxtla.gob.mx
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Cerrar sesión */}
          <View style={[styles.card, { borderColor: "rgba(220, 38, 38, 0.3)" }]}>
            <Text style={[styles.heading, { color: "#ef4444" }]}>
              Sesión activa
            </Text>
            <Text style={styles.small}>
              Si cierras sesión deberás volver a ingresar con tu correo y contraseña.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              onPress={handleLogout}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed
                    ? "rgba(220, 38, 38, 0.25)"
                    : "rgba(220, 38, 38, 0.12)",
                  borderColor: "#dc2626",
                  borderWidth: 1.5,
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 6,
                },
              ]}
            >
              <Text
                style={{
                  color: "#ef4444",
                  fontSize: 15,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                🚪 Cerrar sesión
              </Text>
            </Pressable>
          </View>
        </Screen>
      )}

      {/* ============================================================ */}
      {/* BARRA DE NAVEGACIÓN INFERIOR (BOTTOM TABS)                   */}
      {/* ============================================================ */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor:
            mode === "dark" ? "rgba(10, 17, 32, 0.96)" : "rgba(255, 255, 255, 0.96)",
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
        {/* Tab 1: Reportar */}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Apartado de Reportar Incidencias"
          onPress={() => setActiveTab("report")}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor:
              activeTab === "report"
                ? "rgba(0, 210, 238, 0.12)"
                : "transparent",
          }}
        >
          <Text style={{ fontSize: 20 }}>📝</Text>
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: activeTab === "report" ? "800" : "500",
              color: activeTab === "report" ? "#00d2ee" : colors.textMuted,
              marginTop: 2,
            }}
          >
            Reportar
          </Text>
        </Pressable>

        {/* Tab 2: Mis Reportes */}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Apartado de Mis Reportes"
          onPress={() => setActiveTab("my_reports")}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 6,
            borderRadius: 10,
            position: "relative",
            backgroundColor:
              activeTab === "my_reports"
                ? "rgba(0, 210, 238, 0.12)"
                : "transparent",
          }}
        >
          <Text style={{ fontSize: 20 }}>📋</Text>
          {reportsCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: 2,
                right: "26%",
                backgroundColor: "#2563eb",
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
              }}
            >
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: "bold",
                }}
              >
                {reportsCount > 99 ? "99+" : reportsCount}
              </Text>
            </View>
          )}
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: activeTab === "my_reports" ? "800" : "500",
              color: activeTab === "my_reports" ? "#00d2ee" : colors.textMuted,
              marginTop: 2,
            }}
          >
            Mis reportes
          </Text>
        </Pressable>

        {/* Tab 3: Mi Perfil */}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Apartado de Mi Perfil"
          onPress={() => setActiveTab("profile")}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor:
              activeTab === "profile"
                ? "rgba(0, 210, 238, 0.12)"
                : "transparent",
          }}
        >
          <Text style={{ fontSize: 20 }}>👤</Text>
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: activeTab === "profile" ? "800" : "500",
              color: activeTab === "profile" ? "#00d2ee" : colors.textMuted,
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
