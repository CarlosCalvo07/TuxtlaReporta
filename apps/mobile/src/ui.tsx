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
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
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

export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const isCompact = width < 360;
  const isTablet = width >= 700;
  const horizontalPadding = isCompact ? 14 : isTablet ? 28 : 18;
  const cardPadding = isCompact ? 14 : 18;
  const mapHeight = Math.round(Math.min(Math.max(height * 0.32, 200), 300));
  return {
    width,
    height,
    fontScale,
    isCompact,
    isTablet,
    horizontalPadding,
    cardPadding,
    mapHeight,
  };
}

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
  const { isCompact } = useResponsiveLayout();

  return (
    <View style={{ marginBottom: isCompact ? 12 : 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: isCompact ? 8 : 11,
            flex: 1,
            flexShrink: 1,
          }}
        >
          <Image
            source={require("../assets/logo.png")}
            style={{
              width: isCompact ? 38 : 44,
              height: isCompact ? 38 : 44,
              flexShrink: 0,
            }}
            resizeMode="contain"
          />
          <View style={{ flex: 1, flexShrink: 1 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              maxFontSizeMultiplier={1.15}
              style={{
                fontSize: isCompact ? 16 : 18,
                fontWeight: "900",
                color: colors.text,
                letterSpacing: 0.4,
              }}
            >
              TUXTLA{" "}
              <Text style={{ color: mode === "dark" ? "#60a5fa" : "#1e40af" }}>
                REPORTA
              </Text>
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              maxFontSizeMultiplier={1.15}
              style={{
                fontSize: isCompact ? 8.5 : 9.5,
                fontWeight: "700",
                color: mode === "dark" ? "#f59e0b" : "#b45309",
                letterSpacing: isCompact ? 0.8 : 1.3,
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={toggle}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              flexShrink: 0,
              backgroundColor: colors.card,
              borderWidth: 1.5,
              borderColor: colors.border,
              paddingVertical: isCompact ? 6 : 8,
              paddingHorizontal: isCompact ? 10 : 12,
              borderRadius: 20,
              elevation: 2,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              maxFontSizeMultiplier={1.15}
              style={{
                fontSize: isCompact ? 11.5 : 12.5,
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
        <Text
          maxFontSizeMultiplier={1.2}
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize: isCompact ? 22 : 26,
            },
          ]}
        >
          {title}
        </Text>
      )}
      {subtitle && (
        <Text
          maxFontSizeMultiplier={1.25}
          style={[
            styles.subtitle,
            {
              color: colors.textSecondary,
              fontSize: isCompact ? 12.5 : 13.5,
              lineHeight: isCompact ? 18 : 20,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export function Screen({
  children,
  safeTop = true,
  hasTabBar = false,
  contentStyle,
}: {
  children: ReactNode;
  safeTop?: boolean;
  hasTabBar?: boolean;
  contentStyle?: any;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isCompact, horizontalPadding } = useResponsiveLayout();

  const topInset = safeTop ? Math.max(insets.top + 8, 16) : 12;
  const bottomInset = hasTabBar ? 24 : Math.max(insets.bottom + 24, 36);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.content,
          {
            flexGrow: 1,
            paddingTop: topInset,
            paddingBottom: bottomInset,
            paddingLeft: Math.max(insets.left, horizontalPadding),
            paddingRight: Math.max(insets.right, horizontalPadding),
            gap: isCompact ? 12 : 16,
          },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
            gap: isCompact ? 12 : 16,
          }}
        >
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  const { cardPadding, isCompact } = useResponsiveLayout();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          padding: cardPadding,
          gap: isCompact ? 10 : 13,
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
        maxFontSizeMultiplier={1.2}
        style={[
          styles.buttonText,
          { textAlign: "center" },
          secondary && { color: colors.secondaryText },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const MASK_DOT = "•";

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
  const [focused, setFocused] = useState(false);

  if (isPassword) {
    const realValue = typeof props.value === "string" ? props.value : "";

    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              borderColor: focused ? "#3b82f6" : colors.inputBorder,
              paddingVertical: 0,
              paddingLeft: 13,
              paddingRight: 8,
              flexDirection: "row",
              alignItems: "center",
              position: "relative",
            },
          ]}
        >
          {!showPassword && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 13,
                right: 92,
                top: 0,
                bottom: 0,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {realValue.length > 0 ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    letterSpacing: 2.5,
                    fontWeight: "700",
                  }}
                >
                  {MASK_DOT.repeat(realValue.length)}
                </Text>
              ) : (
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textMuted,
                    fontSize: 15,
                  }}
                >
                  {props.placeholder ?? ""}
                </Text>
              )}
              {focused && (
                <View
                  style={{
                    width: 2,
                    height: 18,
                    backgroundColor: "#3b82f6",
                    marginLeft: realValue.length > 0 ? 2 : 0,
                  }}
                />
              )}
            </View>
          )}
          <TextInput
            accessibilityLabel={label}
            placeholderTextColor={
              showPassword ? colors.textMuted : "transparent"
            }
            {...props}
            secureTextEntry={false}
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            importantForAutofill="no"
            contextMenuHidden={!showPassword}
            caretHidden={!showPassword}
            value={realValue}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            onChangeText={props.onChangeText}
            style={[
              {
                flex: 1,
                color: showPassword ? colors.text : "transparent",
                fontSize: 15,
                paddingVertical: 12,
                minHeight: 46,
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
              paddingHorizontal: 11,
              paddingVertical: 7,
              borderRadius: 6,
              backgroundColor:
                mode === "dark"
                  ? "rgba(59, 130, 246, 0.18)"
                  : "rgba(30, 64, 175, 0.1)",
              borderWidth: 1,
              borderColor:
                mode === "dark"
                  ? "rgba(59, 130, 246, 0.4)"
                  : "rgba(30, 64, 175, 0.25)",
              opacity: pressed ? 0.75 : 1,
              marginLeft: 6,
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

const DONATION_PRESETS = [
  { id: "20", label: "$20 MXN", amount: 20 },
  { id: "50", label: "$50 MXN", amount: 50 },
  { id: "100", label: "$100 MXN", amount: 100 },
  { id: "200", label: "$200 MXN", amount: 200 },
  { id: "custom", label: "Otro monto", amount: 0 },
] as const;

const DONATION_METHODS = [
  { id: "card", name: "Tarjeta bancaria" },
  { id: "spei", name: "Transferencia SPEI" },
  { id: "codi", name: "CoDi / QR" },
];

export function DonationSection({
  compactTrigger = false,
  defaultExpanded = false,
}: {
  compactTrigger?: boolean;
  defaultExpanded?: boolean;
}) {
  const { colors, mode } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [selectedPreset, setSelectedPreset] = useState<string>("50");
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [donorNote, setDonorNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<{
    folio: string;
    amount: number;
    methodName: string;
    date: string;
  } | null>(null);

  const resolvedAmount =
    selectedPreset === "custom"
      ? Number(customAmount.replace(/\D/g, "")) || 0
      : (DONATION_PRESETS.find((p) => p.id === selectedPreset)?.amount ?? 50);

  function handleConfirmDonation() {
    if (resolvedAmount < 10) {
      Alert.alert(
        "Monto mínimo",
        "Por favor selecciona o ingresa un monto mínimo de $10 MXN para continuar.",
      );
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const folio = `DON-2026-${randomNum}`;
      const methodName =
        DONATION_METHODS.find((m) => m.id === method)?.name ??
        "Tarjeta bancaria";
      const now = new Date().toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      setProcessing(false);
      setReceipt({
        folio,
        amount: resolvedAmount,
        methodName,
        date: now,
      });
      Alert.alert(
        "Aportación registrada",
        `Muchas gracias por apoyar a Tuxtla Reporta con $${resolvedAmount} MXN.\n\nComprobante de demostración: ${folio}`,
      );
    }, 450);
  }

  if (compactTrigger && !expanded) {
    return (
      <View
        style={{
          width: "100%",
          marginTop: 6,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          alignItems: "center",
          gap: 6,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          ¿Te fue útil la aplicación? Puedes apoyar voluntariamente al proyecto.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apoyar el proyecto con una donación voluntaria"
          onPress={() => setExpanded(true)}
          style={({ pressed }) => ({
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: mode === "dark" ? "#38bdf8" : "#0284c7",
            backgroundColor:
              mode === "dark"
                ? "rgba(56, 189, 248, 0.12)"
                : "rgba(2, 132, 199, 0.08)",
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: "700",
              color: mode === "dark" ? "#38bdf8" : "#0284c7",
            }}
          >
            Apoyar el proyecto (Donación opcional)
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Card
      style={
        compactTrigger
          ? {
              width: "100%",
              marginTop: 10,
              borderColor:
                mode === "dark"
                  ? "rgba(56, 189, 248, 0.35)"
                  : "rgba(2, 132, 199, 0.35)",
            }
          : undefined
      }
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <View style={{ flex: 1, minWidth: 180 }}>
          <Heading>Apoyar el proyecto</Heading>
          <Text style={[styles.small, { marginTop: 2 }]}>
            Aportación voluntaria para mantenimiento y mejora de la plataforma
            (Modo demostración).
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((prev) => !prev)}
          style={({ pressed }) => ({
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: mode === "dark" ? "#3b82f6" : "#1d4ed8",
            backgroundColor:
              mode === "dark"
                ? "rgba(37, 99, 235, 0.16)"
                : "rgba(30, 64, 175, 0.08)",
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
            {expanded ? "Ocultar" : "Donar ahora"}
          </Text>
        </Pressable>
      </View>

      {expanded && (
        <View
          style={{
            marginTop: 6,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 12,
          }}
        >
          {receipt ? (
            <View
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                borderColor: "rgba(16, 185, 129, 0.45)",
                borderWidth: 1,
                borderRadius: 10,
                padding: 14,
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: "#10b981",
                }}
              >
                ¡Muchas gracias por tu aportación!
              </Text>
              <Text style={{ fontSize: 12.5, color: colors.textSecondary }}>
                Tu apoyo contribuye a mantener activa la plataforma ciudadana.
              </Text>
              <View
                style={{
                  backgroundColor: colors.inputBg,
                  borderRadius: 8,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  Folio de comprobante:{" "}
                  <Text style={{ fontWeight: "800", color: colors.text }}>
                    {receipt.folio}
                  </Text>
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  Monto aportado:{" "}
                  <Text style={{ fontWeight: "800", color: "#10b981" }}>
                    ${receipt.amount} MXN
                  </Text>
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  Método:{" "}
                  <Text style={{ fontWeight: "700", color: colors.text }}>
                    {receipt.methodName}
                  </Text>
                </Text>
                <Text style={{ fontSize: 11.5, color: colors.textMuted }}>
                  Fecha: {receipt.date}
                </Text>
              </View>
              <Button
                secondary
                title="Realizar otra aportación"
                onPress={() => {
                  setReceipt(null);
                  setDonorNote("");
                }}
              />
            </View>
          ) : (
            <>
              <View>
                <Text style={styles.label}>Selecciona un monto (MXN)</Text>
                <View style={styles.row}>
                  {DONATION_PRESETS.map((item) => {
                    const active = selectedPreset === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        onPress={() => setSelectedPreset(item.id)}
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
                              fontWeight: active ? "800" : "600",
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {selectedPreset === "custom" && (
                <Field
                  label="Ingresa el monto en pesos (MXN)"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="Ej. 150"
                  value={customAmount}
                  onChangeText={(txt) =>
                    setCustomAmount(txt.replace(/\D/g, ""))
                  }
                />
              )}

              <Choices
                label="Método de aportación (Simulador)"
                options={DONATION_METHODS}
                value={method}
                onChange={setMethod}
              />

              <Field
                label="Comentario opcional"
                placeholder="Ej. Excelente iniciativa para la ciudad"
                maxLength={120}
                value={donorNote}
                onChangeText={setDonorNote}
              />

              <Text style={styles.small}>
                Nota: Los reportes municipales son gratuitos. Este apartado es
                una simulación académica de donación voluntaria sin cargos
                reales.
              </Text>

              <Button
                title={
                  processing
                    ? "Procesando aportación…"
                    : resolvedAmount > 0
                      ? `Confirmar aportación de $${resolvedAmount} MXN`
                      : "Confirmar aportación"
                }
                disabled={processing || resolvedAmount < 10}
                onPress={handleConfirmDonation}
              />
            </>
          )}
        </View>
      )}
    </Card>
  );
}
