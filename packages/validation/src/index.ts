import { z } from "zod";
import { normalizeName, validateCurp } from "./curp.ts";
export * from "./curp.ts";
export const nameSchema = z
  .string({ error: "Este campo es obligatorio." })
  .transform(normalizeName)
  .pipe(
    z
      .string()
      .min(2, "Ingresa al menos 2 caracteres.")
      .max(100, "No puede exceder 100 caracteres.")
      .regex(/^[\p{L}\p{M} ]+$/u, "Usa únicamente letras y espacios."),
  );
export const registrationSchema = z
  .object({
    email: z.email(
      "Ingresa un correo electrónico válido (ejemplo: usuario@correo.com).",
    ),
    password: z
      .string({ error: "Ingresa una contraseña." })
      .min(12, "La contraseña debe tener al menos 12 caracteres.")
      .max(128, "La contraseña no puede exceder 128 caracteres."),
    first_names: nameSchema,
    paternal_surname: nameSchema,
    maternal_surname: z.union([nameSchema, z.literal("")]),
    age: z
      .number({ error: "Ingresa tu edad en números." })
      .int("La edad debe ser un número entero.")
      .min(17, "Debes tener al menos 17 años para registrarte.")
      .max(120, "Ingresa una edad válida (máximo 120 años)."),
    sex: z.enum(["H", "M"], {
      error: "Selecciona el sexo según tu CURP.",
    }),
    curp: z
      .string({ error: "Ingresa tu CURP de 18 caracteres." })
      .transform((s) => s.replace(/\s/g, "").toUpperCase()),
    privacy_consent: z.literal(true, {
      error: "Debes aceptar el aviso de privacidad para crear tu cuenta.",
    }),
  })
  .superRefine((data, ctx) => {
    for (const message of validateCurp(data).errors)
      ctx.addIssue({ code: "custom", path: ["curp"], message });
  });
export const createReportSchema = z.object({
  category_id: z.uuid("Selecciona un tipo de incidencia válido."),
  description: z
    .string({ error: "Ingresa una descripción de la incidencia." })
    .trim()
    .min(20, "La descripción debe tener al menos 20 caracteres.")
    .max(2000, "La descripción no puede exceder 2000 caracteres."),
  latitude: z
    .number({ error: "Selecciona una ubicación válida en el mapa." })
    .min(-90, "Latitud fuera de rango.")
    .max(90, "Latitud fuera de rango."),
  longitude: z
    .number({ error: "Selecciona una ubicación válida en el mapa." })
    .min(-180, "Longitud fuera de rango.")
    .max(180, "Longitud fuera de rango."),
  location_source: z.enum(["gps", "manual_map"]),
  location_accuracy_m: z.number().min(0).optional(),
  neighborhood: z.string().max(150, "Máximo 150 caracteres.").optional(),
  address_text: z.string().max(300, "Máximo 300 caracteres.").optional(),
  idempotency_key: z.uuid(),
});
export const publicEnvSchema = z.object({
  url: z.url(),
  key: z.string().startsWith("sb_publishable_"),
  environment: z.enum(["development", "test", "production"]),
});
