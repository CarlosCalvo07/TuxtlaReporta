import { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { friendlyError } from "@tuxtla/shared";
import { registrationSchema } from "@tuxtla/validation";
import type { CitizenRegistrationInput } from "@tuxtla/types";
import { api } from "./backend";
import {
  Button,
  Field,
  Screen,
  styles,
  Choices,
  BrandHeader,
  PasswordRequirements,
} from "./ui";
export default function Auth() {
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [ageInput, setAgeInput] = useState("18"),
    [message, setMessage] = useState(""),
    [infoMessage, setInfoMessage] = useState(""),
    [pendingConfirmEmail, setPendingConfirmEmail] = useState(""),
    [busy, setBusy] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<CitizenRegistrationInput>({
    defaultValues: {
      first_names: "",
      paternal_surname: "",
      maternal_surname: "",
      age: 18,
      sex: "H",
      curp: "",
      email: "",
      password: "",
      privacy_consent: false,
    },
  });

  useEffect(() => {
    if (!pendingConfirmEmail || !email.trim() || !password) return;
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void api.auth.login(email.trim(), password).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [pendingConfirmEmail, email, password]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    setInfoMessage("");
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
      <BrandHeader
        title={register ? "Crea tu cuenta ciudadana" : "Bienvenido"}
        subtitle={
          register
            ? "Regístrate para reportar incidencias urbanas y dar seguimiento a su atención."
            : "Reporta incidencias en Tuxtla Gutiérrez o accede a tus tareas operativas."
        }
      />
      {register ? (
        <>
          <View style={styles.card}>
            {(
              [
                {
                  key: "first_names",
                  label: "Nombre(s)",
                  placeholder: "Ej. Carlos Alberto",
                },
                {
                  key: "paternal_surname",
                  label: "Apellido paterno",
                  placeholder: "Ej. Calvo",
                },
                {
                  key: "maternal_surname",
                  label: "Apellido materno (si aplica)",
                  placeholder: "Ej. Gómez",
                },
                {
                  key: "curp",
                  label: "CURP (18 caracteres)",
                  placeholder: "Ej. CAGC010709HCSLMRA6",
                },
                {
                  key: "email",
                  label: "Correo electrónico",
                  placeholder: "ejemplo@correo.com",
                },
                {
                  key: "password",
                  label: "Contraseña (mínimo 12 caracteres)",
                  placeholder: "Escribe al menos 12 caracteres",
                },
              ] as const
            ).map((f) => (
              <Controller
                key={f.key}
                control={control}
                name={f.key}
                render={({ field }) => (
                  <View style={{ gap: 4 }}>
                    <Field
                      label={f.label}
                      placeholder={f.placeholder}
                      value={field.value}
                      onChangeText={(val) => {
                        const nextVal =
                          f.key === "curp" ? val.toUpperCase() : val;
                        field.onChange(nextVal);
                        if (errors[f.key]) clearErrors(f.key);
                      }}
                      secureTextEntry={f.key === "password"}
                      keyboardType={
                        f.key === "email" ? "email-address" : "default"
                      }
                      maxLength={f.key === "curp" ? 18 : 128}
                      autoCapitalize={
                        f.key === "email" || f.key === "password"
                          ? "none"
                          : f.key === "curp"
                            ? "characters"
                            : "words"
                      }
                    />
                    {f.key === "password" && (
                      <PasswordRequirements value={field.value} minLength={12} />
                    )}
                    {errors[f.key] && (
                      <Text style={styles.error}>{errors[f.key]?.message}</Text>
                    )}
                  </View>
                )}
              />
            ))}
            <Controller
              control={control}
              name="age"
              render={({ field }) => (
                <View style={{ gap: 4 }}>
                  <Field
                    label="Edad (años cumplidos)"
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="Ej. 25"
                    value={ageInput}
                    onChangeText={(s) => {
                      const digits = s.replace(/\D/g, "");
                      setAgeInput(digits);
                      field.onChange(digits ? Number(digits) : 0);
                      if (errors.age) clearErrors("age");
                    }}
                  />
                  {errors.age && (
                    <Text style={styles.error}>{errors.age.message}</Text>
                  )}
                </View>
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
                  onChange={(val) => {
                    field.onChange(val);
                    if (errors.sex) clearErrors("sex");
                  }}
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
                <View style={{ gap: 6 }}>
                  <Button
                    secondary
                    title={
                      field.value
                        ? "Aviso de privacidad aceptado"
                        : "Aceptar el aviso de privacidad"
                    }
                    onPress={() => {
                      field.onChange(!field.value);
                      if (errors.privacy_consent)
                        clearErrors("privacy_consent");
                    }}
                  />
                  {errors.privacy_consent && (
                    <Text style={styles.error}>
                      {errors.privacy_consent.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
          <Button
            title={busy ? "Registrando…" : "Crear cuenta"}
            disabled={busy}
            onPress={() =>
              void handleSubmit(async (values) => {
                clearErrors();
                const parsed = registrationSchema.safeParse(values);
                if (!parsed.success) {
                  for (const issue of parsed.error.issues) {
                    const key = issue.path[0] as
                      | keyof CitizenRegistrationInput
                      | undefined;
                    if (key) {
                      setError(key, {
                        message: issue.message,
                      });
                    }
                  }
                  setMessage(
                    "Por favor revisa y corrige los campos marcados arriba.",
                  );
                  return;
                }
                await run(async () => {
                  await api.auth.register(parsed.data);
                  const cleanEmail = parsed.data.email.trim();
                  setEmail(cleanEmail);
                  setPassword(parsed.data.password);
                  setPendingConfirmEmail(cleanEmail);
                  setRegister(false);
                });
              })()
            }
          />
        </>
      ) : (
        <>
          {Boolean(pendingConfirmEmail) && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: "rgba(16, 185, 129, 0.14)",
                  borderColor: "rgba(16, 185, 129, 0.55)",
                  borderWidth: 1.5,
                  gap: 8,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: "#10b981",
                }}
              >
                ¡Cuenta creada! Confirma tu correo para entrar
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#e2e8f0",
                  lineHeight: 19,
                }}
              >
                1. Abre el correo electrónico enviado a{" "}
                <Text style={{ fontWeight: "800", color: "#38bdf8" }}>
                  {pendingConfirmEmail}
                </Text>{" "}
                y pulsa en confirmar cuenta.
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#e2e8f0",
                  lineHeight: 19,
                }}
              >
                2. Una vez confirmado tu correo, pulsa{" "}
                <Text style={{ fontWeight: "800", color: "#10b981" }}>
                  Ya confirmé mi correo · Iniciar sesión
                </Text>{" "}
                aquí abajo (tu correo y contraseña ya están listos).
              </Text>
            </View>
          )}
          <Field
            label="Correo electrónico"
            placeholder="ejemplo@correo.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (message) setMessage("");
              if (infoMessage) setInfoMessage("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Field
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (message) setMessage("");
              if (infoMessage) setInfoMessage("");
            }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
          />
          <Button
            title={
              busy
                ? "Ingresando…"
                : pendingConfirmEmail
                  ? "Ya confirmé mi correo · Iniciar sesión"
                  : "Iniciar sesión"
            }
            disabled={busy}
            onPress={() => {
              if (!email.trim() || !password) {
                setMessage(
                  "Por favor ingresa tu correo electrónico y tu contraseña.",
                );
                return;
              }
              void run(() => api.auth.login(email.trim(), password));
            }}
          />
          <Button
            secondary
            title="Recuperar contraseña"
            onPress={() => {
              if (!email.trim()) {
                setMessage(
                  "Escribe primero tu correo electrónico arriba para enviarte el enlace de recuperación.",
                );
                return;
              }
              void run(async () => {
                await api.auth.reset(email.trim(), "tuxtlareporta://auth");
                setInfoMessage(
                  "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
                );
              });
            }}
          />
        </>
      )}
      {Boolean(infoMessage) && (
        <View
          style={{
            padding: 14,
            backgroundColor: "rgba(16, 185, 129, 0.14)",
            borderWidth: 1,
            borderColor: "rgba(16, 185, 129, 0.45)",
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#6ee7b7", fontSize: 13, fontWeight: "600" }}>
            {infoMessage}
          </Text>
        </View>
      )}
      {Boolean(message) && (
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
          setInfoMessage("");
          setPendingConfirmEmail("");
          clearErrors();
        }}
      />
    </Screen>
  );
}
