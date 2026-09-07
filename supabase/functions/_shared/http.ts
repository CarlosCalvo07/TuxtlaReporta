import { createClient } from "@supabase/supabase-js";
export const env = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error("Missing server configuration");
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
      "Access-Control-Allow-Origin": env("WEB_ORIGIN"),
      "Access-Control-Allow-Headers":
        "authorization,apikey,content-type,x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    },
  });
}
export function endpoint(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return response({}, 204);
    if (req.method !== "POST")
      return response({ message: "Método no permitido" }, 405);
    try {
      const limit = req.url.endsWith("/upload-media") ? 9 * 1024 * 1024 : 16384;
      if (Number(req.headers.get("Content-Length") ?? 0) > limit)
        return response({ message: "Solicitud demasiado grande" }, 413);
      const reader = req.body?.getReader(),
        chunks: Uint8Array[] = [];
      let total = 0;
      if (reader) {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          total += part.value.byteLength;
          if (total > limit) {
            await reader.cancel();
            return response({ message: "Solicitud demasiado grande" }, 413);
          }
          chunks.push(part.value);
        }
      }
      const body = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }
      return await handler(
        new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body,
        }),
      );
    } catch {
      return response(
        {
          message:
            "No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.",
        },
        400,
      );
    }
  });
}
export async function authenticated(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");
  const role = await client.rpc("get_my_role");
  if (role.error || !role.data) throw new Error("Unauthorized");
  return { client, user: data.user, role: role.data as string };
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
export async function rateLimit(key: string, limit = 10) {
  const { data, error } = await admin().rpc("consume_rate_limit", {
    k: await digest(key),
    max_requests: limit,
    window_seconds: 3600,
  });
  if (error || !data) throw new Error("Rate limit");
}
