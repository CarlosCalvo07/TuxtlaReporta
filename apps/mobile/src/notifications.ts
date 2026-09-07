import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./backend";
export async function registerPush() {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", {
      name: "Actualizaciones de reportes",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted")
    return "Notificaciones desactivadas. Puedes consultar tus reportes en la aplicación.";
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    string | undefined;
  if (!projectId)
    return "El proyecto EAS debe configurarse para habilitar notificaciones.";
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.notifications.register(token.data);
  return "Notificaciones activadas.";
}
