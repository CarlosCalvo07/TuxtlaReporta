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

import { Component, type ReactNode } from "react";
import { View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button } from "../src/ui";

interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: "#060d1a",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
            gap: 16,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: "#ff3366",
              textAlign: "center",
            }}
          >
            Ocurrió un error al cargar la vista
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#94a3b8",
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            {this.state.error?.message ?? "Error inesperado"}
          </Text>
          <Button
            title="Volver a intentar"
            onPress={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      );
    }
    return this.props.children;
  }
}

export default function Layout() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={query}>
          <SessionProvider>
            <ThemeProvider>
              <NavigationStack />
            </ThemeProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
