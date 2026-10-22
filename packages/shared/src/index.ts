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
  if (error instanceof AppError) return error.message;
  if (error && typeof error === "object" && "issues" in error)
    return "Revisa los datos del formulario.";
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (message.includes("CONFLICT"))
    return "El reporte cambió. Actualiza la vista e inténtalo nuevamente.";
  if (message.includes("AREA_MISMATCH"))
    return "El responsable debe pertenecer al área del reporte.";
  if (message.includes("RESOLUTION_REQUIRED"))
    return "Añade evidencia final y una nota de resolución de al menos 5 caracteres.";
  if (message.includes("ACTIVE_ASSIGNMENTS"))
    return "Reasigna los trabajos activos antes de cambiar el área o desactivar al responsable.";
  if (message.includes("Failed to fetch") || message.includes("Network"))
    return "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.";
  return "No se pudo completar la operación. Revisa tus permisos o vuelve a intentarlo.";
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
        // En subidas iniciales de ciudadanos, intentar subida directa a Storage
        if (kind === "initial" && !rid) {
          try {
            const user = (await client.auth.getUser()).data.user;
            if (user) {
              const path = `uploads/${user.id}/${safeUUID()}.jpg`;
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
                return { path };
              }
              console.warn("Direct storage upload failed, falling back to function:", result.error);
            }
          } catch (storageErr) {
            console.warn("Direct storage error, falling back to function:", storageErr);
          }
        }

        const form = new FormData();
        if (file instanceof Blob) form.append("file", file, "photo.jpg");
        else form.append("file", file as unknown as Blob);
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
