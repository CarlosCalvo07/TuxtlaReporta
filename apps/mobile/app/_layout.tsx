import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../src/session";
import { ThemeProvider, useTheme } from "../src/ui";

const query = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000 },
    mutations: { retry: false },
  },
});

function NavigationStack() {
  const { mode, colors } = useTheme();

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: mode === "dark" ? "#060d1a" : "#ffffff",
          },
          headerTintColor: mode === "dark" ? "#00d2ee" : "#0a192f",
          headerTitleStyle: {
            fontWeight: "800",
            color: colors.text,
          },
          headerTitle: "Tuxtla Reporta",
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="report/[id]"
          options={{ title: "Detalle del reporte", headerShown: true }}
        />
      </Stack>
    </>
  );
}

import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={query}>
        <SessionProvider>
          <ThemeProvider>
            <NavigationStack />
          </ThemeProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
