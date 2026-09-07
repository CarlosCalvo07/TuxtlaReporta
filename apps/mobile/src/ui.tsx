import {
  ScrollView,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  View,
  type TextInputProps,
} from "react-native";
import type { ReactNode } from "react";
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f6f2" },
  content: { padding: 22, paddingBottom: 60, gap: 16 },
  title: { fontSize: 29, fontWeight: "700", color: "#173f35", marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 22, color: "#637262" },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e6d9",
    gap: 12,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#40553e", marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: "#cdd8c7",
    borderRadius: 8,
    padding: 13,
    fontSize: 16,
    backgroundColor: "white",
    color: "#263e2a",
    minHeight: 48,
  },
  button: {
    padding: 15,
    backgroundColor: "#173f35",
    borderRadius: 9,
    alignItems: "center",
    minHeight: 49,
  },
  buttonText: { color: "white", fontSize: 15, fontWeight: "600" },
  secondary: { backgroundColor: "#e7eedc" },
  secondaryText: { color: "#315239" },
  error: {
    padding: 13,
    color: "#904529",
    backgroundColor: "#fff0e8",
    borderRadius: 8,
  },
  row: { flexDirection: "row", gap: 9, flexWrap: "wrap" },
  chip: { padding: 11, borderRadius: 8, backgroundColor: "#e9eee2" },
  chipActive: { backgroundColor: "#c7d9b3" },
  small: { fontSize: 12, color: "#6d7d64", lineHeight: 19 },
  heading: { fontSize: 18, fontWeight: "600", color: "#284328" },
});
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#91a087"
        {...props}
        style={[styles.input, props.style]}
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
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((x) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: value === x.id }}
            key={x.id}
            onPress={() => onChange(x.id)}
            style={[styles.chip, value === x.id && styles.chipActive]}
          >
            <Text>{x.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
