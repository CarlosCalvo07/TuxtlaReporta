import type { Database } from "./database.types.ts";
export type { Database, Json } from "./database.types.ts";
export type AppRole = Database["public"]["Enums"]["app_role"];
export type ReportStatus = Database["public"]["Enums"]["report_status"];
export type ReportPriority = Database["public"]["Enums"]["report_priority"];
export type MediaType = Database["public"]["Enums"]["media_type"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type Category =
  Database["public"]["Tables"]["incident_categories"]["Row"];
export type Area = Database["public"]["Tables"]["maintenance_areas"]["Row"];
export type AssignmentSummary =
  Database["public"]["Tables"]["report_assignments"]["Row"];
export type CitizenRegistrationInput = {
  email: string;
  password: string;
  first_names: string;
  paternal_surname: string;
  maternal_surname: string;
  age: number;
  sex: "H" | "M";
  curp: string;
  privacy_consent: boolean;
};
export type CreateReportInput = {
  category_id: string;
  description: string;
  latitude: number;
  longitude: number;
  location_source: "gps" | "manual_map";
  location_accuracy_m?: number;
  neighborhood?: string;
  address_text?: string;
  idempotency_key: string;
};
export type CurpValidationResult = {
  valid: boolean;
  verificationLevel: "invalid" | "structural_valid";
  birthDate: string | null;
  errors: string[];
};
export type ReportDetail = {
  report: Report;
  media: Database["public"]["Tables"]["report_media"]["Row"][];
  history: Database["public"]["Tables"]["report_status_history"]["Row"][];
  notes: Database["public"]["Tables"]["report_notes"]["Row"][];
  assignments: AssignmentSummary[];
};
export const statusLabels: Record<ReportStatus, string> = {
  recibido: "Recibido",
  en_revision: "En revisión",
  en_atencion: "En atención",
  solucionado: "Solucionado",
};
export const roleLabels: Record<AppRole, string> = {
  citizen: "Ciudadano",
  admin: "Administrador",
  maintenance: "Mantenimiento",
};
export const priorities: ReportPriority[] = [
  "baja",
  "media",
  "alta",
  "urgente",
];
export const statuses: ReportStatus[] = [
  "recibido",
  "en_revision",
  "en_atencion",
  "solucionado",
];
