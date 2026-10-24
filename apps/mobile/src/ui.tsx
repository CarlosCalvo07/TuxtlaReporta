import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  ScrollView,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  View,
  Image,
  type TextInputProps,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ThemeMode = "dark" | "light";

export const darkColors = {
  background: "#0a1120",
  card: "rgba(18, 30, 50, 0.92)",
  border: "rgba(148, 163, 184, 0.18)",
  text: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  inputBg: "#080e1a",
  inputBorder: "rgba(148, 163, 184, 0.25)",
  buttonPrimary: "#1d4ed8",
  buttonSecondary: "rgba(30, 58, 138, 0.25)",
  secondaryBorder: "#2563eb",
  secondaryText: "#93c5fd",
  chipBg: "rgba(15, 23, 42, 0.8)",
  chipActiveBg: "rgba(37, 99, 235, 0.22)",
  chipBorder: "rgba(255, 255, 255, 0.1)",
  chipActiveBorder: "#3b82f6",
  chipText: "#94a3b8",
  chipTextActive: "#ffffff",
};

export const lightColors = {
  background: "#f8fafc",
  card: "#ffffff",
  border: "#cbd5e1",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  inputBg: "#ffffff",
  inputBorder: "#cbd5e1",
  buttonPrimary: "#1e40af",
  buttonSecondary: "#f1f5f9",
  secondaryBorder: "#1e40af",
  secondaryText: "#1e40af",
  chipBg: "#f1f5f9",
  chipActiveBg: "rgba(30, 64, 175, 0.1)",
  chipBorder: "#cbd5e1",
  chipActiveBorder: "#1e40af",
  chipText: "#475569",
  chipTextActive: "#0f172a",
};

interface ThemeContextType {
  mode: ThemeMode;
  toggle: () => void;
  colors: typeof darkColors;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  toggle: () => {},
  colors: darkColors,
});

const THEME_STORAGE_KEY = "tuxtla_mobile_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    void (async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (saved === "dark" || saved === "light") {
          setMode(saved);
        }
      } catch {}
    })();
  }, []);

  const toggle = () => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      void SecureStore.setItemAsync(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  };

  const colors = mode === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, toggle, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#060d1a",
  },
  content: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 21,
    color: "#94a3b8",
  },
  card: {
    backgroundColor: "rgba(12, 24, 46, 0.78)",
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    gap: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#3b82f6",
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    borderRadius: 8,
    padding: 13,
    fontSize: 15,
    backgroundColor: "#080e1a",
    color: "#f8fafc",
    minHeight: 48,
  },
  button: {
    padding: 14,
    backgroundColor: "#1d4ed8",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondary: {
    backgroundColor: "rgba(30, 58, 138, 0.15)",
    borderWidth: 1,
    borderColor: "#2563eb",
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryText: {
    color: "#93c5fd",
    fontWeight: "700",
  },
  error: {
    padding: 14,
    color: "#fca5a5",
    backgroundColor: "rgba(220, 38, 38, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.35)",
    borderRadius: 8,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  chipActive: {
    backgroundColor: "rgba(37, 99, 235, 0.22)",
    borderColor: "#2563eb",
  },
  chipText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  small: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
  },
  heading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeRecibido: {
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    borderColor: "rgba(2, 132, 199, 0.35)",
  },
  badgeRevision: {
    backgroundColor: "rgba(217, 119, 6, 0.15)",
    borderColor: "rgba(217, 119, 6, 0.35)",
  },
  badgeAtencion: {
    backgroundColor: "rgba(37, 99, 235, 0.18)",
    borderColor: "rgba(37, 99, 235, 0.35)",
  },
  badgeSolucionado: {
    backgroundColor: "rgba(5, 150, 105, 0.15)",
    borderColor: "rgba(5, 150, 105, 0.35)",
  },
});

export function BrandHeader({
  title,
  subtitle,
  showToggle = true,
}: {
  title?: string;
  subtitle?: string;
  showToggle?: boolean;
}) {
  const { mode, toggle, colors } = useTheme();

  return (
    <View style={{ marginBottom: 18 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Image
            source={require("../assets/logo.png")}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: colors.text,
                letterSpacing: 0.5,
              }}
            >
              TUXTLA <Text style={{ color: mode === "dark" ? "#60a5fa" : "#1e40af" }}>REPORTA</Text>
            </Text>
            <Text
              style={{
                fontSize: 9.5,
                fontWeight: "700",
                color: mode === "dark" ? "#f59e0b" : "#b45309",
                letterSpacing: 1.5,
              }}
            >
              GOBIERNO MUNICIPAL DE TUXTLA
            </Text>
          </View>
        </View>
        {showToggle && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar modo claro u oscuro"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={toggle}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: colors.card,
              borderWidth: 1.5,
              borderColor: colors.border,
              paddingVertical: 8,
              paddingHorizontal: 13,
              borderRadius: 20,
              elevation: 3,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              {mode === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
            </Text>
          </Pressable>
        )}
      </View>
      {title && (
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      )}
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export function Screen({
  children,
  safeTop = true,
}: {
  children: ReactNode;
  safeTop?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const topInset = safeTop ? Math.max(insets.top + 10, 48) : 16;
  const bottomInset = Math.max(insets.bottom + 24, 50);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topInset,
          paddingBottom: bottomInset,
          paddingLeft: Math.max(insets.left, 20),
          paddingRight: Math.max(insets.right, 20),
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: any;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Heading({
  children,
  style,
}: {
  children: ReactNode;
  style?: any;
}) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.heading, { color: colors.text }, style]}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: colors.buttonPrimary },
        secondary && [
          styles.secondary,
          {
            backgroundColor: colors.buttonSecondary,
            borderColor: colors.secondaryBorder,
          },
        ],
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && { color: colors.secondaryText },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.text,
          },
          props.style,
        ]}
      />
    </View>
  );
}

export function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((x) => {
          const active = value === x.id;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              key={x.id}
              onPress={() => onChange(x.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active
                    ? colors.chipActiveBg
                    : colors.chipBg,
                  borderColor: active
                    ? colors.chipActiveBorder
                    : colors.chipBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: active
                      ? colors.chipTextActive
                      : colors.chipText,
                    fontWeight: active ? "700" : "500",
                  },
                ]}
              >
                {x.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
