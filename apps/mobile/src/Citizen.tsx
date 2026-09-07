import { registerPush } from "./notifications";
import { useRef, useState } from "react";
import { Text, View, Image, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Crypto from "expo-crypto";
import MapView, { Marker } from "react-native-maps";
import { router } from "expo-router";
import { friendlyError } from "@tuxtla/shared";
import { api } from "./backend";
import { Button, Field, Screen, styles, Choices } from "./ui";
export default function Citizen() {
  const cache = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: api.catalogs.categories,
  });
  const [category, setCategory] = useState(""),
    [description, setDescription] = useState(""),
    [neighborhood, setNeighborhood] = useState(""),
    [folio, setFolio] = useState(""),
    [photos, setPhotos] = useState<string[]>([]),
    [point, setPoint] = useState<{
      latitude: number;
      longitude: number;
      source: "gps" | "manual_map";
      accuracy?: number;
    } | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [message, setMessage] = useState("");
  const key = useRef(Crypto.randomUUID()),
    paths = useRef<string[]>([]);
  const submit = useMutation({
    mutationFn: async () => {
      if (!point || !confirmed || !photos.length)
        throw new Error("Missing data");
      for (let i = paths.current.length; i < photos.length; i++) {
        const uri = photos[i]!;
        const upload = await api.media.upload({
          uri,
          name: "photo.jpg",
          type: "image/jpeg",
        });
        paths.current.push(upload.path);
      }
      return api.reports.create(
        {
          category_id: category,
          description,
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
    },
    onSuccess: (r) => {
      Alert.alert("Reporte enviado", `Folio: ${r.folio}`);
      key.current = Crypto.randomUUID();
      paths.current = [];
      setDescription("");
      setPhotos([]);
      setConfirmed(false);
      router.push(`/report/${r.id}`);
    },
  });
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
      setConfirmed(false);
    } catch {
      setMessage(
        "No se obtuvo ubicación. Toca el mapa para seleccionar el lugar.",
      );
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Reportar incidencia</Text>
      <Text style={styles.subtitle}>
        Cuéntanos qué sucede y dónde. La fecha y el folio se registran
        automáticamente al enviar.
      </Text>
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
        <Field
          label="Descripción (20 a 2000 caracteres)"
          multiline
          maxLength={2000}
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
        />
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
        <View style={styles.row}>
          {photos.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              accessibilityLabel="Foto seleccionada"
              style={{ width: 85, height: 85, borderRadius: 8 }}
            />
          ))}
        </View>
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
          Usa el GPS o toca el mapa. Arrastra el marcador para corregir el
          punto.
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
            setConfirmed(false);
          }}
        >
          {point && (
            <Marker
              coordinate={point}
              draggable
              onDragEnd={(e) => {
                setPoint({ ...e.nativeEvent.coordinate, source: "manual_map" });
                setConfirmed(false);
              }}
            />
          )}
        </MapView>
        {point && (
          <Text style={styles.small}>
            {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)} ·{" "}
            {point.source === "gps" ? "GPS" : "Mapa manual"}
            {point.accuracy !== undefined
              ? ` · ±${Math.round(point.accuracy)} m`
              : ""}
          </Text>
        )}
        <Button
          secondary
          title={
            confirmed ? "✓ Ubicación confirmada" : "Confirmar esta ubicación"
          }
          disabled={!point}
          onPress={() => setConfirmed(!confirmed)}
        />
      </View>
      {(message || submit.error || categories.error) && (
        <Text style={styles.error}>
          {message || friendlyError(submit.error || categories.error)}
        </Text>
      )}
      <Button
        title={submit.isPending ? "Subiendo y enviando…" : "Enviar reporte"}
        disabled={
          submit.isPending ||
          !category ||
          description.trim().length < 20 ||
          !confirmed ||
          photos.length === 0
        }
        onPress={() => submit.mutate()}
      />
      <View style={styles.card}>
        <Text style={styles.heading}>Consultar mi reporte</Text>
        <Field
          label="Folio"
          value={folio}
          onChangeText={setFolio}
          autoCapitalize="characters"
        />
        <Button
          secondary
          title="Consultar estado"
          onPress={() => {
            void api.reports
              .list({ folio })
              .then((result) => {
                const match = result.rows.find((r) => r.folio === folio.trim());
                if (match) router.push(`/report/${match.id}`);
                else
                  setMessage("No se encontró un reporte propio con ese folio.");
              })
              .catch((error) => setMessage(friendlyError(error)));
          }}
        />
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
