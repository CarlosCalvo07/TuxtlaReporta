import { z } from "zod";
import { normalizeName, validateCurp } from "./curp.ts";
export * from "./curp.ts";
export const nameSchema = z
  .string()
  .transform(normalizeName)
  .pipe(
    z
      .string()
      .min(2)
      .max(100)
      .regex(/^[\p{L}\p{M} ]+$/u, "Usa únicamente letras y espacios."),
  );
export const registrationSchema = z
  .object({
    email: z.email(),
    password: z.string().min(12).max(128),
    first_names: nameSchema,
    paternal_surname: nameSchema,
    maternal_surname: z.union([nameSchema, z.literal("")]),
    age: z.number().int().min(17).max(120),
    sex: z.enum(["H", "M"]),
    curp: z.string().transform((s) => s.replace(/\s/g, "").toUpperCase()),
    privacy_consent: z.literal(true),
  })
  .superRefine((data, ctx) => {
    for (const message of validateCurp(data).errors)
      ctx.addIssue({ code: "custom", path: ["curp"], message });
  });
export const createReportSchema = z.object({
  category_id: z.uuid(),
  description: z.string().trim().min(20).max(2000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  location_source: z.enum(["gps", "manual_map"]),
  location_accuracy_m: z.number().min(0).optional(),
  neighborhood: z.string().max(150).optional(),
  address_text: z.string().max(300).optional(),
  idempotency_key: z.uuid(),
});
export const publicEnvSchema = z.object({
  url: z.url(),
  key: z.string().startsWith("sb_publishable_"),
  environment: z.enum(["development", "test", "production"]),
});
