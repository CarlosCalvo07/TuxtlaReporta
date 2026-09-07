import {
  endpoint,
  response,
  authenticated,
  admin,
  env,
  rateLimit,
} from "../_shared/http.ts";
import { z } from "zod";
endpoint(async (req) => {
  const actor = await authenticated(req);
  if (actor.role !== "admin") throw new Error("Forbidden");
  await rateLimit(`staff:${actor.user.id}`, 20);
  const data = z
    .object({
      email: z.email(),
      name: z.string().trim().min(2).max(200),
      role: z.enum(["admin", "maintenance"]),
      areas: z.array(z.uuid()).max(20),
    })
    .parse(await req.json());
  if (data.role === "maintenance" && !data.areas.length)
    throw new Error("Area required");
  const server = admin();
  const { data: created, error } = await server.auth.admin.createUser({
    email: data.email,
    email_confirm: false,
  });
  if (error || !created.user) throw new Error("Create failed");
  const result = await server.rpc("provision_staff", {
    uid: created.user.id,
    name: data.name,
    role: data.role,
    areas: data.areas,
    actor: actor.user.id,
  });
  if (result.error) {
    await server.auth.admin.deleteUser(created.user.id);
    throw result.error;
  }
  const invite = await server.auth.resetPasswordForEmail(data.email, {
    redirectTo: env("STAFF_AUTH_REDIRECT"),
  });
  if (invite.error)
    return response({
      message:
        "Usuario creado. Reenvía el correo de acceso desde recuperación de contraseña.",
    });
  return response({
    message: "Usuario creado. Revisa el correo para establecer acceso.",
  });
});
