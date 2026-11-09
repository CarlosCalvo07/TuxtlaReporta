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
              {mode === "dark" ? "Modo claro" : "Modo oscuro"}
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
  contentStyle,
}: {
  children: ReactNode;
  safeTop?: boolean;
  contentStyle?: any;
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
        contentStyle,
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

const MASK_DOT = "•";

function applyMaskedPasswordChange(prevReal: string, nextMasked: string): string {
  if (nextMasked === MASK_DOT.repeat(prevReal.length)) return prevReal;
  let prefixLen = 0;
  const minLen = Math.min(prevReal.length, nextMasked.length);
  while (prefixLen < minLen && nextMasked[prefixLen] === MASK_DOT) {
    prefixLen++;
  }
  let suffixLen = 0;
  while (
    suffixLen < prevReal.length - prefixLen &&
    suffixLen < nextMasked.length - prefixLen &&
    nextMasked[nextMasked.length - 1 - suffixLen] === MASK_DOT
  ) {
    suffixLen++;
  }
  const inserted = nextMasked.slice(prefixLen, nextMasked.length - suffixLen);
  return (
    prevReal.slice(0, prefixLen) +
    inserted +
    prevReal.slice(prevReal.length - suffixLen)
  );
}

export function PasswordRequirements({
  value,
  minLength = 12,
}: {
  value: string;
  minLength?: number;
}) {
  const { mode } = useTheme();
  const len = value.length;
  const met = len >= minLength;
  const remaining = Math.max(0, minLength - len);
  const progress = Math.min(1, len / minLength);

  const accentColor = met
    ? "#10b981"
    : len > 0
      ? "#f59e0b"
      : mode === "dark"
        ? "#64748b"
        : "#475569";

  const bgColor = met
    ? "rgba(16, 185, 129, 0.14)"
    : len > 0
      ? "rgba(245, 158, 11, 0.14)"
      : mode === "dark"
        ? "rgba(15, 23, 42, 0.6)"
        : "rgba(241, 245, 249, 0.9)";

  const borderColor = met
    ? "rgba(16, 185, 129, 0.45)"
    : len > 0
      ? "rgba(245, 158, 11, 0.45)"
      : mode === "dark"
        ? "rgba(148, 163, 184, 0.22)"
        : "#cbd5e1";

  return (
    <View
      style={{
        marginTop: 6,
        padding: 10,
        borderRadius: 8,
        backgroundColor: bgColor,
        borderWidth: 1,
        borderColor,
        gap: 6,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: accentColor,
            }}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: accentColor,
              flex: 1,
            }}
          >
            {met
              ? "Contraseña válida: cumple los requisitos"
              : len === 0
                ? `Requisito: mínimo ${minLength} caracteres`
                : `Te ${remaining === 1 ? "falta 1 carácter" : `faltan ${remaining} caracteres`}`}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "800",
            color: accentColor,
          }}
        >
          {len}/{minLength}
        </Text>
      </View>

      <View
        style={{
          height: 6,
          borderRadius: 999,
          backgroundColor:
            mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: "100%",
            borderRadius: 999,
            backgroundColor: accentColor,
          }}
        />
      </View>
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors, mode } = useTheme();
  const isPassword = Boolean(props.secureTextEntry);
  const [showPassword, setShowPassword] = useState(false);

  if (isPassword) {
    const realValue = typeof props.value === "string" ? props.value : "";
    const displayedValue = showPassword
      ? realValue
      : MASK_DOT.repeat(realValue.length);

    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
              paddingVertical: 0,
              paddingRight: 8,
              flexDirection: "row",
              alignItems: "center",
            },
          ]}
        >
          <TextInput
            accessibilityLabel={label}
            placeholderTextColor={colors.textMuted}
            {...props}
            secureTextEntry={false}
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="none"
            contextMenuHidden={!showPassword}
            value={displayedValue}
            onChangeText={(text) => {
              if (!props.onChangeText) return;
              if (showPassword) {
                props.onChangeText(text);
              } else {
                props.onChangeText(applyMaskedPasswordChange(realValue, text));
              }
            }}
            style={[
              {
                flex: 1,
                color: colors.text,
                fontSize: 15,
                paddingVertical: 12,
                letterSpacing: !showPassword && realValue.length > 0 ? 2 : 0,
              },
              props.style,
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setShowPassword((prev) => !prev)}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor:
                mode === "dark"
                  ? "rgba(59, 130, 246, 0.16)"
                  : "rgba(30, 64, 175, 0.1)",
              borderWidth: 1,
              borderColor:
                mode === "dark"
                  ? "rgba(59, 130, 246, 0.35)"
                  : "rgba(30, 64, 175, 0.25)",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: mode === "dark" ? "#93c5fd" : "#1e40af",
              }}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
