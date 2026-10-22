import { createClient } from "@supabase/supabase-js";

export const env = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing server configuration: ${key}`);
  return value;
};

export const admin = () =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export function response(data: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization,apikey,content-type,x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export function endpoint(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return response({}, 204);
    if (req.method !== "POST")
      return response({ message: "Método no permitido" }, 405);
    try {
      const url = new URL(req.url);
      const isUpload = url.pathname.includes("upload-media");
      const limit = isUpload ? 12 * 1024 * 1024 : 65536;
      const contentLength = Number(req.headers.get("Content-Length") ?? 0);
      if (contentLength > limit) {
        console.error("Payload too large:", contentLength, "limit:", limit);
        return response(
          { message: "La fotografía excede el tamaño máximo permitido (8 MB)." },
          413,
        );
      }
      return await handler(req);
    } catch (err) {
      console.error("Endpoint error:", err);
      return response(
        {
          message:
            err instanceof Error
              ? err.message
              : "No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.",
        },
        400,
      );
    }
  });
}

export async function authenticated(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    console.error("Missing or invalid Authorization header");
    throw new Error("No has iniciado sesión o la sesión expiró.");
  }
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const server = admin();
  const { data, error } = await server.auth.getUser(token);
  if (error || !data?.user) {
    console.error("Failed to authenticate user with token:", error);
    throw new Error("Sesión inválida o expirada. Vuelve a iniciar sesión.");
  }

  const { data: roleRow, error: roleError } = await server
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (roleError || !roleRow?.role) {
    console.error("Failed to get role:", roleError);
    throw new Error("No tienes permisos suficientes.");
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  const client = createClient(env("SUPABASE_URL"), anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  return { client, user: data.user, role: roleRow.role as string };
}

export async function digest(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env("CURP_HASH_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return [
    ...new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export async function rateLimit(key: string, limit = 40) {
  const { data, error } = await admin().rpc("consume_rate_limit", {
    k: await digest(key),
    max_requests: limit,
    window_seconds: 3600,
  });
  if (error || !data) {
    console.error("Rate limit exceeded or error:", error);
    throw new Error("Has superado el límite de intentos por hora. Espera unos momentos.");
  }
}
