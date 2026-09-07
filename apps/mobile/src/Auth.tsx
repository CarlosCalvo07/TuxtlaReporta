import { useState } from "react";
import { Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { friendlyError } from "@tuxtla/shared";
import { registrationSchema } from "@tuxtla/validation";
import type { CitizenRegistrationInput } from "@tuxtla/types";
import { api } from "./backend";
import { Button, Field, Screen, styles, Choices } from "./ui";
export default function Auth() {
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CitizenRegistrationInput>({
    defaultValues: {
      first_names: "",
      paternal_surname: "",
      maternal_surname: "",
      age: 17,
      sex: "H",
      curp: "",
      email: "",
      password: "",
      privacy_consent: false,
    },
  });
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>
        {register ? "Crea tu cuenta" : "Tu ciudad, en tus manos"}
      </Text>
      <Text style={styles.subtitle}>
        {register
          ? "Regístrate para reportar incidencias y consultar su atención."
          : "Reporta una incidencia o accede a tus tareas de atención urbana."}
      </Text>
      {register ? (
        <>
          <View style={styles.card}>
            {(
              [
                { key: "first_names", label: "Nombre(s)" },
                { key: "paternal_surname", label: "Apellido paterno" },
                {
                  key: "maternal_surname",
                  label: "Apellido materno (si aplica)",
                },
                { key: "curp", label: "CURP" },
                { key: "email", label: "Correo electrónico" },
                { key: "password", label: "Contraseña (mínimo 12 caracteres)" },
              ] as const
            ).map((f) => (
              <Controller
                key={f.key}
                control={control}
                name={f.key}
                render={({ field }) => (
                  <>
                    <Field
                      label={f.label}
                      value={field.value}
                      onChangeText={field.onChange}
                      secureTextEntry={f.key === "password"}
                      autoCapitalize={
                        f.key === "email" || f.key === "password"
                          ? "none"
                          : f.key === "curp"
                            ? "characters"
                            : "words"
                      }
                    />
                    {errors[f.key] && (
                      <Text style={styles.error}>{errors[f.key]?.message}</Text>
                    )}
                  </>
                )}
              />
            ))}
            <Controller
              control={control}
              name="age"
              render={({ field }) => (
                <Field
                  label="Edad"
                  keyboardType="number-pad"
                  value={String(field.value)}
                  onChangeText={(s) => field.onChange(Number(s))}
                />
              )}
            />
            <Controller
              control={control}
              name="sex"
              render={({ field }) => (
                <Choices
                  label="Sexo según CURP"
                  options={[
                    { id: "H", name: "Hombre" },
                    { id: "M", name: "Mujer" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </View>
          <View style={styles.card}>
            <Text style={styles.heading}>Privacidad</Text>
            <Text style={styles.small}>
              Utilizamos tu cuenta para dar seguimiento a los reportes. La
              ubicación y las fotos permiten atender la incidencia. La CURP se
              valida estructuralmente, no oficialmente, y se conserva una huella
              criptográfica para prevenir duplicados.
            </Text>
            <Text style={styles.small}>
              El aviso integral del responsable debe estar publicado antes de
              habilitar el registro público.
            </Text>
            <Controller
              control={control}
              name="privacy_consent"
              render={({ field }) => (
                <Button
                  secondary
                  title={
                    field.value
                      ? "✓ Acepto el aviso de privacidad"
                      : "Aceptar el aviso de privacidad"
                  }
                  onPress={() => field.onChange(!field.value)}
                />
              )}
            />
          </View>
          <Button
            title={busy ? "Registrando…" : "Crear cuenta"}
            disabled={busy}
            onPress={() =>
              void handleSubmit(async (values) => {
                const parsed = registrationSchema.safeParse(values);
                if (!parsed.success) {
                  for (const issue of parsed.error.issues) {
                    setError(issue.path[0] as keyof CitizenRegistrationInput, {
                      message: issue.message,
                    });
                  }
                  setMessage("Revisa los campos indicados.");
                  return;
                }
                await run(async () => {
                  const result = await api.auth.register(parsed.data);
                  setMessage(result.message);
                });
              })()
            }
          />
        </>
      ) : (
        <>
          <Field
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Field
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
          />
          <Button
            title={busy ? "Ingresando…" : "Iniciar sesión"}
            disabled={busy}
            onPress={() => void run(() => api.auth.login(email, password))}
          />
          <Button
            secondary
            title="Recuperar contraseña"
            onPress={() =>
              void run(async () => {
                await api.auth.reset(email, "tuxtlareporta://auth");
                setMessage(
                  "Si existe una cuenta, recibirás un correo para recuperar el acceso.",
                );
              })
            }
          />
        </>
      )}
      {message && (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      )}
      <Button
        secondary
        title={register ? "Ya tengo cuenta" : "Registrarme como ciudadano"}
        onPress={() => {
          setRegister(!register);
          setMessage("");
        }}
      />
    </Screen>
  );
}
