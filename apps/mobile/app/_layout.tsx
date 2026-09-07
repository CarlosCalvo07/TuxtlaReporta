import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "../src/session";
const query = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000 },
    mutations: { retry: false },
  },
});
export default function Layout() {
  return (
    <QueryClientProvider client={query}>
      <SessionProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#173f35" },
            headerTintColor: "#fff",
            headerTitle: "Tuxtla Reporta",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen
            name="report/[id]"
            options={{ title: "Detalle del reporte" }}
          />
        </Stack>
      </SessionProvider>
    </QueryClientProvider>
  );
}
