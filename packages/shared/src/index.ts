import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";
import type {
  Database,
  CreateReportInput,
  CitizenRegistrationInput,
  ReportPriority,
  ReportStatus,
  MediaType,
  Json,
  Report,
} from "@tuxtla/types";
import {
  publicEnvSchema,
  createReportSchema,
  registrationSchema,
} from "@tuxtla/validation";
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(date));
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function friendlyError(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: { message?: string }[] }).issues;
    const firstMsg = issues?.[0]?.message;
    if (firstMsg && !/^(Too small|Too big|Invalid|Expected)/i.test(firstMsg)) {
      return firstMsg;
    }
    return "Revisa los datos del formulario.";
  }
  const message =
    error instanceof AppError
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String(error.message)
        : typeof error === "string"
          ? error
          : "";
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials")
  )
    return "Correo electrónico o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.";
  if (lower.includes("email not confirmed"))
    return "Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada o carpeta de spam.";
  if (
    lower.includes("user already registered") ||
    lower.includes("already been registered")
  )
    return "Este correo electrónico ya se encuentra registrado.";
  if (
    lower.includes("password should be at least") ||
    lower.includes(">=12 characters") ||
    lower.includes("at least 12 characters")
  )
    return "La contraseña debe tener al menos 12 caracteres.";
  if (
    lower.includes("unable to validate email") ||
    lower.includes("invalid email") ||
    lower.includes("anonymous sign-ins are disabled")
  )
    return "Ingresa un correo electrónico válido.";
  if (
    lower.includes("rate limit") ||
    lower.includes("for security purposes") ||
    lower.includes("too many requests")
  )
    return "Has realizado demasiados intentos seguidos. Por seguridad, espera unos minutos antes de volver a intentarlo.";
  if (
    lower.includes("new password should be different") ||
    lower.includes("same_password")
  )
    return "La nueva contraseña debe ser diferente a la actual.";
  if (
    lower.includes("invalid session") ||
    lower.includes("auth session missing") ||
    lower.includes("jwt expired")
  )
    return "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
  if (message.includes("CONFLICT"))
    return "El reporte cambió. Actualiza la vista e inténtalo nuevamente.";
  if (message.includes("AREA_MISMATCH"))
    return "El responsable debe pertenecer al área del reporte.";
  if (message.includes("ASSIGNMENT_REQUIRED"))
    return "Primero debes asignar un responsable de mantenimiento antes de pasar a En atención.";
  if (message.includes("RESOLUTION_REQUIRED"))
    return "Añade evidencia final y una nota de resolución de al menos 5 caracteres.";
  if (message.includes("INVALID_TRANSITION"))
    return "No es posible cambiar a ese estado directamente. Revisa el estado actual del reporte.";
  if (message.includes("INVALID_MEDIA"))
    return "No se pudo validar la fotografía subida. Intenta adjuntarla nuevamente.";
  if (message.includes("MEDIA_LIMIT"))
    return "Se alcanzó el límite máximo de fotografías permitidas para este reporte.";
  if (message.includes("PHOTO_REQUIRED"))
    return "Debes adjuntar entre 1 y 5 fotografías de evidencia.";
  if (message.includes("Camera permission"))
    return "Permiso de cámara o galería denegado. Habilítalo en los ajustes de tu dispositivo.";
  if (message.includes("ACTIVE_ASSIGNMENTS"))
    return "Reasigna los trabajos activos antes de cambiar el área o desactivar al responsable.";
  if (message.includes("Failed to fetch") || message.includes("Network"))
    return "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.";
  if (error instanceof AppError && message) return message;
  return "No se pudo completar la operación. Revisa tus permisos o vuelve a intentarlo.";
}

export const DEFAULT_CLUSTER_RADIUS_M = 45;

export type CategoryHeatStyle = {
  key: "bache" | "basura" | "alumbrado" | "agua" | "otra";
  label: string;
  emoji: string;
  color: string;
  darkColor: string;
  haloInner: string;
  haloOuter: string;
  badgeBg: string;
  badgeBorder: string;
};

const CATEGORY_HEAT_STYLES: Record<CategoryHeatStyle["key"], CategoryHeatStyle> = {
  bache: {
    key: "bache",
    label: "Bache / Vialidad",
    emoji: "",
    color: "#ef4444",
    darkColor: "#b91c1c",
    haloInner: "rgba(239, 68, 68, 0.45)",
    haloOuter: "rgba(249, 115, 22, 0.20)",
    badgeBg: "rgba(239, 68, 68, 0.15)",
    badgeBorder: "rgba(239, 68, 68, 0.45)",
  },
  alumbrado: {
    key: "alumbrado",
    label: "Alumbrado público",
    emoji: "",
    color: "#f59e0b",
    darkColor: "#b45309",
    haloInner: "rgba(245, 158, 11, 0.48)",
    haloOuter: "rgba(250, 204, 21, 0.22)",
    badgeBg: "rgba(245, 158, 11, 0.16)",
    badgeBorder: "rgba(245, 158, 11, 0.48)",
  },
  basura: {
    key: "basura",
    label: "Basura / Limpia",
    emoji: "",
    color: "#10b981",
    darkColor: "#047857",
    haloInner: "rgba(16, 185, 129, 0.45)",
    haloOuter: "rgba(52, 211, 153, 0.20)",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    badgeBorder: "rgba(16, 185, 129, 0.45)",
  },
  agua: {
    key: "agua",
    label: "Agua / Drenaje",
    emoji: "",
    color: "#06b6d4",
    darkColor: "#0e7490",
    haloInner: "rgba(6, 182, 212, 0.45)",
    haloOuter: "rgba(56, 189, 248, 0.20)",
    badgeBg: "rgba(6, 182, 212, 0.15)",
    badgeBorder: "rgba(6, 182, 212, 0.45)",
  },
  otra: {
    key: "otra",
    label: "Otra incidencia",
    emoji: "",
    color: "#a855f7",
    darkColor: "#6b21a8",
    haloInner: "rgba(168, 85, 247, 0.45)",
    haloOuter: "rgba(192, 132, 252, 0.20)",
    badgeBg: "rgba(168, 85, 247, 0.15)",
    badgeBorder: "rgba(168, 85, 247, 0.45)",
  },
};

export function getCategoryHeatStyle(slugOrName?: string | null): CategoryHeatStyle {
  const raw = (slugOrName ?? "").toLowerCase();
  if (raw.includes("bache") || raw.includes("pavimento") || raw.includes("vial")) {
    return CATEGORY_HEAT_STYLES.bache;
  }
  if (raw.includes("alumbrado") || raw.includes("luminaria") || raw.includes("luz")) {
    return CATEGORY_HEAT_STYLES.alumbrado;
  }
  if (raw.includes("basura") || raw.includes("residuo") || raw.includes("limpia")) {
    return CATEGORY_HEAT_STYLES.basura;
  }
  if (raw.includes("agua") || raw.includes("fuga") || raw.includes("drenaje") || raw.includes("alcantarilla")) {
    return CATEGORY_HEAT_STYLES.agua;
  }
  return CATEGORY_HEAT_STYLES.otra;
}

export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type ClusterableReport = {
  id: string;
  folio: string;
  latitude: number;
  longitude: number;
  category_id?: string | null;
  status?: ReportStatus;
  priority?: ReportPriority;
  description?: string;
  neighborhood?: string | null;
  created_at?: string;
};

export type IncidentCluster<T extends ClusterableReport = ClusterableReport> = {
  id: string;
  primary: T;
  reports: T[];
  count: number;
  duplicateCount: number;
  category_id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  heatLevel: "normal" | "medio" | "alto" | "critico";
};

const priorityWeight: Record<ReportPriority, number> = {
  baja: 1,
  media: 2,
  alta: 3,
  urgente: 4,
};

const statusWeight: Record<ReportStatus, number> = {
  en_atencion: 4,
  en_revision: 3,
  recibido: 2,
  solucionado: 1,
};

/**
 * Agrupa reportes cercanos (rango corto en metros) que pertenezcan
 * exactamente a la misma categoría de incidencia (ej. bache solo con bache,
 * basura solo con basura, alumbrado solo con alumbrado).
 */
export function clusterReportsByCategory<T extends ClusterableReport>(
  reports: T[],
  radiusMeters: number = DEFAULT_CLUSTER_RADIUS_M,
): IncidentCluster<T>[] {
  const visited = new Set<string>();
  const clusters: IncidentCluster<T>[] = [];

  for (let i = 0; i < reports.length; i++) {
    const seed = reports[i]!;
    if (visited.has(seed.id)) continue;
    visited.add(seed.id);

    const catId = seed.category_id ?? "unknown";
    const seedSolved = seed.status === "solucionado";
    const group: T[] = [seed];

    // Búsqueda transitiva de vecinos cercanos de la MISMA categoría
    let added = true;
    while (added) {
      added = false;
      const centroidLat =
        group.reduce((sum, item) => sum + item.latitude, 0) / group.length;
      const centroidLon =
        group.reduce((sum, item) => sum + item.longitude, 0) / group.length;

      for (let j = 0; j < reports.length; j++) {
        const candidate = reports[j]!;
        if (visited.has(candidate.id)) continue;
        const candidateCat = candidate.category_id ?? "unknown";
        if (candidateCat !== catId) continue;

        const candidateSolved = candidate.status === "solucionado";
        if (seedSolved !== candidateSolved) continue;

        const distToCentroid = distanceMeters(
          centroidLat,
          centroidLon,
          candidate.latitude,
          candidate.longitude,
        );
        const distToAnyMember = group.some(
          (member) =>
            distanceMeters(
              member.latitude,
              member.longitude,
              candidate.latitude,
              candidate.longitude,
            ) <= radiusMeters,
        );

        if (distToCentroid <= radiusMeters || distToAnyMember) {
          visited.add(candidate.id);
          group.push(candidate);
          added = true;
        }
      }
    }

    // Ordenar miembros: primero el de estado más avanzado / mayor prioridad / más antiguo
    const sorted = [...group].sort((a, b) => {
      const sa = a.status ? statusWeight[a.status] : 0;
      const sb = b.status ? statusWeight[b.status] : 0;
      if (sb !== sa) return sb - sa;
      const pa = a.priority ? priorityWeight[a.priority] : 0;
      const pb = b.priority ? priorityWeight[b.priority] : 0;
      if (pb !== pa) return pb - pa;
      if (a.created_at && b.created_at) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });

    const primary = sorted[0]!;
    const avgLat =
      sorted.reduce((sum, item) => sum + item.latitude, 0) / sorted.length;
    const avgLon =
      sorted.reduce((sum, item) => sum + item.longitude, 0) / sorted.length;

    const count = sorted.length;
    const heatLevel: IncidentCluster["heatLevel"] =
      count >= 5
        ? "critico"
        : count >= 3
          ? "alto"
          : count === 2
            ? "medio"
            : "normal";

    clusters.push({
      id: primary.id,
      primary,
      reports: sorted,
      count,
      duplicateCount: count - 1,
      category_id: catId,
      latitude: avgLat,
      longitude: avgLon,
      radiusMeters,
      heatLevel,
    });
  }

  return clusters;
}

/**
 * Devuelve todos los reportes candidatos cercanos (dentro de radiusMeters)
 * que compartan la misma categoría que el reporte objetivo (excluyendo el propio).
 */
export function findNearbySameCategoryReports<T extends ClusterableReport>(
  target: Pick<ClusterableReport, "id" | "category_id" | "latitude" | "longitude" | "status">,
  candidates: T[],
  radiusMeters: number = DEFAULT_CLUSTER_RADIUS_M,
): T[] {
  const targetCat = target.category_id ?? "unknown";
  const targetSolved = target.status === "solucionado";
  return candidates.filter((c) => {
    if (c.id === target.id) return false;
    if ((c.category_id ?? "unknown") !== targetCat) return false;
    if ((c.status === "solucionado") !== targetSolved) return false;
    return (
      distanceMeters(
        target.latitude,
        target.longitude,
        c.latitude,
        c.longitude,
      ) <= radiusMeters
    );
  });
}
export function makeClient(
  env: { url: string; key: string; environment: string },
  storage?: SupportedStorage,
) {
  const config = publicEnvSchema.parse(env);
  return createClient<Database>(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !storage,
      ...(storage ? { storage } : {}),
    },
  });
}
export type Client = SupabaseClient<Database>;
export function nextReportStatus(
  status: ReportStatus,
  role: Database["public"]["Enums"]["app_role"] | null,
): ReportStatus | undefined {
  if (!role || role === "citizen" || status === "solucionado") return undefined;
  if (status === "recibido")
    return role === "admin" ? "en_revision" : undefined;
  return status === "en_revision" ? "en_atencion" : "solucionado";
}
type ReportList = Report & {
  citizen_name: string | null;
  assigned_to: string | null;
  responsible_name: string | null;
};
function checked<R extends { data: unknown; error: unknown }>(
  result: R,
): NonNullable<R["data"]> {
  if (result.error) throw result.error;
  return result.data as NonNullable<R["data"]>;
}
const reportColumns =
  "id,folio,citizen_id,category_id,description,status,priority,location,latitude,longitude,location_source,location_accuracy_m,address_text,neighborhood,created_at,updated_at,first_reviewed_at,first_assigned_at,attention_started_at,resolved_at,version,idempotency_key" as const;
export type ReportFilters = {
  page?: number;
  folio?: string;
  text?: string;
  status?: ReportStatus | "";
  priority?: ReportPriority | "";
  category?: string;
  area?: string;
  neighborhood?: string;
  since?: string;
  until?: string;
  responsible?: string;
  unassigned?: boolean;
};
function safeUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function services(client: Client) {
  const call = async <T>(
    name: string,
    body: Record<string, unknown> | FormData,
  ): Promise<T> => {
    const result = await client.functions.invoke<T>(name, { body });
    if (result.error) {
      let message = result.error.message;
      if ("context" in result.error && result.error.context) {
        try {
          const res = (result.error.context as Response).clone();
          const json = await res.json();
          if (json && typeof json === "object" && "message" in json) {
            message = String(json.message);
          }
        } catch {}
      }
      throw new AppError(
        "FUNCTION",
        message ||
          "No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.",
      );
    }
    if (result.data === null)
      throw new AppError("EMPTY", "No se recibió una respuesta.");
    return result.data;
  };
  return {
    auth: {
      login: async (email: string, password: string) =>
        checked(await client.auth.signInWithPassword({ email, password })),
      logout: async () => {
        const result = await client.auth.signOut();
        if (result.error) throw result.error;
      },
      role: async () => checked(await client.rpc("get_my_role")),
      profile: async () => {
        const user = checked(await client.auth.getUser()).user;
        if (!user) throw new Error("Invalid session");
        return checked(
          await client
            .from("profiles")
            .select("id,display_name,is_active,created_at,updated_at")
            .eq("id", user.id)
            .single(),
        );
      },
      reset: async (email: string, redirectTo: string) =>
        checked(await client.auth.resetPasswordForEmail(email, { redirectTo })),
      password: async (password: string) =>
        checked(await client.auth.updateUser({ password })),
      register: async (data: CitizenRegistrationInput) =>
        call<{ message: string }>(
          "register-citizen",
          registrationSchema.parse(data),
        ),
    },
    reports: {
      list: async (filters: ReportFilters = {}) => {
        let q = client
          .from("report_list")
          .select(
            "id,folio,citizen_id,category_id,description,status,priority,location,latitude,longitude,location_source,location_accuracy_m,address_text,neighborhood,created_at,updated_at,first_reviewed_at,first_assigned_at,attention_started_at,resolved_at,version,idempotency_key,citizen_name,assigned_to,responsible_name",
            { count: "exact" },
          )
          .order("created_at", { ascending: false });
        if (filters.folio)
          q = q.ilike("folio", `%${filters.folio.replace(/[%_]/g, "")}%`);
        if (filters.text)
          q = q.ilike("description", `%${filters.text.replace(/[%_]/g, "")}%`);
        if (filters.status) q = q.eq("status", filters.status);
        if (filters.priority) q = q.eq("priority", filters.priority);
        if (filters.category) q = q.eq("category_id", filters.category);
        if (filters.neighborhood)
          q = q.ilike(
            "neighborhood",
            `%${filters.neighborhood.replace(/[%_]/g, "")}%`,
          );
        if (filters.since)
          q = q.gte("created_at", `${filters.since}T00:00:00-06:00`);
        if (filters.until)
          q = q.lte("created_at", `${filters.until}T23:59:59.999-06:00`);
        if (filters.unassigned) q = q.is("assigned_to", null);
        if (filters.responsible) q = q.eq("assigned_to", filters.responsible);
        if (filters.area) {
          const cats = checked(
            await client
              .from("incident_categories")
              .select("id")
              .eq("maintenance_area_id", filters.area),
          );
          q = q.in(
            "category_id",
            cats.map((c) => c.id),
          );
        }
        // Postgres describes all view columns as nullable; columns selected from reports retain their constraints.
        const page = filters.page ?? 0;
        const result = await q
          .range(page * 25, page * 25 + 24)
          .overrideTypes<ReportList[], { merge: false }>();
        if (result.error) throw result.error;
        return { rows: result.data, count: result.count ?? 0 };
      },
      detail: async (id: string) => {
        const [report, media, history, notes, assignments] = await Promise.all([
          client.from("reports").select(reportColumns).eq("id", id).single(),
          client
            .from("report_media")
            .select(
              "id,report_id,uploaded_by,media_type,storage_bucket,storage_path,mime_type,size_bytes,created_at",
            )
            .eq("report_id", id)
            .order("created_at"),
          client
            .from("report_status_history")
            .select(
              "id,report_id,from_status,to_status,changed_by,note,created_at",
            )
            .eq("report_id", id)
            .order("created_at"),
          client
            .from("report_notes")
            .select("id,report_id,author_id,note,visibility,created_at")
            .eq("report_id", id)
            .order("created_at"),
          client
            .from("report_assignments")
            .select(
              "id,report_id,maintenance_user_id,maintenance_area_id,assigned_by,status,assignment_note,assigned_at,accepted_at,started_at,completed_at,ended_at",
            )
            .eq("report_id", id)
            .order("assigned_at"),
        ]);
        return {
          report: checked(report),
          media: checked(media),
          history: checked(history),
          notes: checked(notes),
          assignments: checked(assignments),
        };
      },
      create: async (input: CreateReportInput, paths: string[]) =>
        checked(
          await client.rpc("create_report", {
            data: createReportSchema.parse(input),
            paths,
          }),
        ),
      status: async (
        rid: string,
        target: ReportStatus,
        version: number,
        note: string,
      ) =>
        checked(
          await client.rpc("change_report_status", {
            rid,
            target,
            expected_version: version,
            note,
          }),
        ),
      assign: async (rid: string, uid: string, version: number, note: string) =>
        checked(
          await client.rpc("assign_report", {
            rid,
            uid,
            expected_version: version,
            note,
          }),
        ),
      update: async (
        rid: string,
        category: string,
        priority: ReportPriority,
        version: number,
      ) =>
        checked(
          await client.rpc("update_report", {
            rid,
            category,
            priority,
            expected_version: version,
          }),
        ),
      note: async (
        rid: string,
        note: string,
        visibility: "internal" | "citizen_visible",
      ) => checked(await client.rpc("add_note", { rid, note, visibility })),
      bbox: async (west: number, south: number, east: number, north: number) =>
        checked(
          await client.rpc("get_reports_in_bbox", { west, south, east, north }),
        ),
      subscribe: (id: string, refresh: () => void) => {
        const channel = client
          .channel(`report:${id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "reports",
              filter: `id=eq.${id}`,
            },
            refresh,
          )
          .subscribe();
        return () => {
          void client.removeChannel(channel);
        };
      },
      subscribeNew: (refresh: () => void) => {
        const channel = client
          .channel("new-reports")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "reports",
              filter: "status=eq.recibido",
            },
            refresh,
          )
          .subscribe();
        return () => {
          void client.removeChannel(channel);
        };
      },
    },
    catalogs: {
      categories: async () =>
        checked(
          await client
            .from("incident_categories")
            .select(
              "id,name,slug,description,icon,default_priority,maintenance_area_id,is_active,created_at,updated_at",
            )
            .order("name"),
        ),
      areas: async () =>
        checked(
          await client
            .from("maintenance_areas")
            .select("id,name,slug,description,is_active,created_at,updated_at")
            .order("name"),
        ),
      save: async (kind: "category" | "area", data: Json) =>
        checked(await client.rpc("manage_catalog", { kind, data })),
    },
    staff: {
      workload: async (area?: string) =>
        checked(
          await client.rpc("get_maintenance_workload", area ? { area } : {}),
        ),
      list: async () =>
        checked(
          await client
            .from("staff_directory")
            .select(
              "id,display_name,is_active,created_at,updated_at,role,areas",
            )
            .order("display_name")
            .limit(1000)
            .overrideTypes<
              (Database["public"]["Tables"]["profiles"]["Row"] & {
                role: "admin" | "maintenance";
                areas: string[];
              })[],
              { merge: false }
            >(),
        ),
      mine: async () =>
        checked(
          await client
            .from("maintenance_user_areas")
            .select(
              "user_id,maintenance_area_id,is_primary,created_by,created_at",
            ),
        ),
      create: async (data: {
        email: string;
        name: string;
        role: "admin" | "maintenance";
        areas: string[];
      }) => call("create-staff-user", data),
      update: async (uid: string, active: boolean, areas: string[]) =>
        checked(await client.rpc("update_staff", { uid, active, areas })),
    },
    media: {
      upload: async (
        file: Blob | { uri: string; name: string; type: string },
        rid?: string,
        kind: MediaType = "initial",
      ) => {
        // Intentar subida directa a Storage (tanto para ciudadano inicial como para mantenimiento/resolución)
        try {
          const user = (await client.auth.getUser()).data.user;
          if (user) {
            const path =
              kind === "initial" && !rid
                ? `uploads/${user.id}/${safeUUID()}.jpg`
                : rid
                  ? `reports/${rid}/${user.id}/${safeUUID()}.jpg`
                  : null;

            if (path) {
              let bodyToUpload: Blob | ArrayBuffer;

              if (file instanceof Blob) {
                bodyToUpload = file;
              } else if (file && typeof file === "object" && "uri" in file) {
                const res = await fetch(file.uri);
                bodyToUpload = await res.arrayBuffer();
              } else {
                throw new Error("Formato de archivo inválido");
              }

              const result = await client.storage
                .from("report-media")
                .upload(path, bodyToUpload, {
                  contentType: "image/jpeg",
                  upsert: false,
                });

              if (!result.error) {
                if (rid && kind !== "initial") {
                  const attach = await client.rpc("add_media", {
                    rid,
                    path,
                    kind,
                  });
                  if (!attach.error) {
                    return { path };
                  }
                  console.warn(
                    "add_media RPC failed after direct upload, falling back:",
                    attach.error,
                  );
                } else {
                  return { path };
                }
              } else {
                console.warn(
                  "Direct storage upload failed, falling back to function:",
                  result.error,
                );
              }
            }
          }
        } catch (storageErr) {
          console.warn(
            "Direct storage error, falling back to function:",
            storageErr,
          );
        }

        const form = new FormData();
        if (file instanceof Blob) {
          form.append("file", file, "photo.jpg");
        } else if (file && typeof file === "object" && "uri" in file) {
          try {
            const res = await fetch(file.uri);
            const blob = await res.blob();
            form.append("file", blob, file.name || "photo.jpg");
          } catch {
            form.append("file", file as unknown as Blob);
          }
        } else {
          form.append("file", file as unknown as Blob);
        }
        form.append("kind", kind);
        if (rid) form.append("report_id", rid);
        return call<{ path: string }>("upload-media", form);
      },
      url: async (path: string) =>
        checked(
          await client.storage.from("report-media").createSignedUrl(path, 120),
        ).signedUrl,
    },
    analytics: {
      metrics: async (since?: string, until?: string) =>
        checked(
          await client.rpc("get_report_metrics", {
            ...(since ? { since } : {}),
            ...(until ? { until_date: until } : {}),
          }),
        ),
    },
    notifications: {
      list: async () =>
        checked(
          await client
            .from("notifications")
            .select("id,user_id,report_id,event,created_at,read_at")
            .order("created_at", { ascending: false })
            .limit(30),
        ),
      register: async (token: string) =>
        checked(await client.rpc("register_device", { token })),
      subscribe: (uid: string, refresh: () => void) => {
        const ch = client
          .channel(`notifications:${uid}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${uid}`,
            },
            refresh,
          )
          .subscribe();
        return () => {
          void client.removeChannel(ch);
        };
      },
    },
  };
}
