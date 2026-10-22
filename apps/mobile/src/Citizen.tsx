import { registerPush } from "./notifications";
import { useRef, useState } from "react";
import { Text, View, Image, Alert, Pressable } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Crypto from "expo-crypto";
import MapView, { Marker } from "react-native-maps";
import { router } from "expo-router";
import { friendlyError, dateLabel } from "@tuxtla/shared";
import { statusLabels } from "@tuxtla/types";
import { api } from "./backend";
import { Button, Field, Screen, styles, Choices, BrandHeader } from "./ui";

export default function Citizen() {
  const cache = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: api.catalogs.categories,
  });

  const myReports = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => api.reports.list(),
  });

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
        "Indica la ubicación en el mapa o pulsa 'Usar mi ubicación'.";
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

  return (
    <Screen>
      <BrandHeader
        title="Reportar incidencia"
        subtitle="Cuéntanos qué sucede y dónde. El folio de seguimiento se genera automáticamente al enviar."
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
              title="Hacer otro reporte"
              onPress={() => setCreatedSuccess(null)}
            />
          </View>
        </View>
      )}

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
          />
          <Text
            style={[
              styles.small,
              {
                textAlign: "right",
                marginTop: 4,
                color:
                  description.trim().length >= 20 ? "#2e7d32" : "#997b19",
                fontWeight:
                  description.trim().length >= 20 ? "600" : "normal",
              },
            ]}
          >
            {description.trim().length}/20 caracteres mínimos{" "}
            {description.trim().length >= 20 ? "✓" : ""}
          </Text>
        </View>
        <Field
          label="Colonia o zona (opcional)"
          value={neighborhood}
          onChangeText={setNeighborhood}
          maxLength={150}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Evidencia fotográfica</Text>
        <Text style={styles.small}>
          Entre 1 y 5 fotografías. Evita rostros y datos personales.
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
          <Text style={{ color: "#997b19", fontSize: 13 }}>
            ⚠️ Debes agregar al menos 1 fotografía de evidencia.
          </Text>
        )}
        <Button
          title="Tomar fotografía"
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

      <View style={styles.card}>
        <Text style={styles.heading}>¿Dónde sucede?</Text>
        <Text style={styles.small}>
          Usa el GPS o toca el mapa. Arrastra el marcador para ajustar la
          ubicación exacta.
        </Text>
        <Button
          secondary
          title="Usar mi ubicación"
          onPress={() => void gps()}
        />
        <MapView
          style={{ height: 300, borderRadius: 8 }}
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
        {point ? (
          <View
            style={{
              backgroundColor: "#edf6ec",
              padding: 10,
              borderRadius: 8,
              gap: 2,
            }}
          >
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: "#2e7d32" }}
            >
              ✓ Ubicación establecida
            </Text>
            <Text style={styles.small}>
              {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)} ·{" "}
              {point.source === "gps" ? "GPS" : "Mapa manual"}
              {point.accuracy !== undefined
                ? ` · ±${Math.round(point.accuracy)} m`
                : ""}
            </Text>
          </View>
        ) : (
          <Text style={{ color: "#997b19", fontSize: 13 }}>
            ⚠️ Toca el mapa o pulsa "Usar mi ubicación" para marcar el lugar.
          </Text>
        )}
      </View>

      {(message || submit.error || categories.error) && (
        <Text style={styles.error}>
          {message || friendlyError(submit.error || categories.error)}
        </Text>
      )}

      {/* Lista de requisitos pendientes para guiar al ciudadano */}
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
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#00d2ee", letterSpacing: 0.5 }}>
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
            {description.trim().length >= 20 ? "✓" : "•"} Descripción con al
            menos 20 caracteres ({description.trim().length}/20)
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: photos.length > 0 ? "#2e7d32" : "#997b19",
            }}
          >
            {photos.length > 0 ? "✓" : "•"} Al menos 1 fotografía de evidencia (
            {photos.length}/5)
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: point ? "#2e7d32" : "#997b19",
            }}
          >
            {point ? "✓" : "•"} Ubicación marcada en el mapa
          </Text>
        </View>
      )}

      <Button
        title={
          submit.isPending
            ? "Subiendo fotografías y enviando…"
            : "Enviar reporte"
        }
        disabled={submit.isPending}
        onPress={validateAndSubmit}
      />



      <View style={styles.card}>
        <Text style={styles.heading}>Mis reportes enviados</Text>
        <Text style={styles.small}>
          Acceso rápido al historial de reportes que has registrado.
        </Text>

        {myReports.isPending && (
          <Text style={styles.small}>Cargando tus reportes…</Text>
        )}

        {myReports.data?.rows && myReports.data.rows.length === 0 && (
          <Text style={{ fontSize: 13, color: "#6d7d64", fontStyle: "italic" }}>
            Aún no has enviado reportes desde esta cuenta.
          </Text>
        )}

        {myReports.data?.rows && myReports.data.rows.length > 0 && (
          <View style={{ gap: 8, marginTop: 4 }}>
            {myReports.data.rows.slice(0, 5).map((rep) => (
              <Pressable
                key={rep.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver reporte ${rep.folio}`}
                onPress={() => router.push(`/report/${rep.id}`)}
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed
                      ? "rgba(0, 210, 238, 0.12)"
                      : "rgba(9, 19, 38, 0.9)",
                    borderWidth: 1,
                    borderColor: "rgba(0, 210, 238, 0.2)",
                    borderRadius: 10,
                    padding: 14,
                    gap: 5,
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
                      fontSize: 14,
                      fontWeight: "800",
                      color: "#00d2ee",
                      letterSpacing: 0.5,
                    }}
                  >
                    {rep.folio}
                  </Text>
                  <View
                    style={{
                      backgroundColor:
                        rep.status === "solucionado"
                          ? "rgba(0, 230, 153, 0.15)"
                          : rep.status === "en_atencion"
                            ? "rgba(59, 130, 246, 0.18)"
                            : rep.status === "en_revision"
                              ? "rgba(255, 184, 0, 0.15)"
                              : "rgba(0, 210, 238, 0.12)",
                      borderColor:
                        rep.status === "solucionado"
                          ? "rgba(0, 230, 153, 0.4)"
                          : rep.status === "en_atencion"
                            ? "rgba(59, 130, 246, 0.4)"
                            : rep.status === "en_revision"
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
                          rep.status === "solucionado"
                            ? "#00e699"
                            : rep.status === "en_atencion"
                              ? "#60a5fa"
                              : rep.status === "en_revision"
                                ? "#ffb800"
                                : "#00d2ee",
                      }}
                    >
                      {statusLabels[rep.status] ?? rep.status}
                    </Text>
                  </View>
                </View>
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 18 }}
                >
                  {rep.description}
                </Text>
                <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {dateLabel(rep.created_at)}
                  {rep.neighborhood ? ` · ${rep.neighborhood}` : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Button
        secondary
        title="Activar notificaciones de mis reportes"
        onPress={() => {
          void registerPush()
            .then(setMessage)
            .catch((error) => setMessage(friendlyError(error)));
        }}
      />
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
