import type { ExpoConfig, ConfigContext } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Tuxtla Reporta",
  slug: "tuxtla-reporta",
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey:
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
          "AIzaSyDummyKeyForBuildsOnly_NotReal",
      },
    },
  },
  plugins: config.plugins?.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === "react-native-maps") {
      return [
        "react-native-maps",
        {
          androidGoogleMapsApiKey:
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
            "AIzaSyDummyKeyForBuildsOnly_NotReal",
        },
      ];
    }
    return plugin;
  }),
  extra: {
    ...config.extra,
    eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "74059b0c-c726-44fd-b8ca-f49b2f3c37cc" },
  },
});
