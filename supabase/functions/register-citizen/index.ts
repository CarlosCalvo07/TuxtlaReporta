import {
  endpoint,
  response,
  admin,
  env,
  digest,
  rateLimit,
} from "../_shared/http.ts";
import {
  registrationSchema,
  validateCurp,
} from "../../../packages/validation/src/index.ts";
endpoint(async (req) => {
  const data = registrationSchema.parse(await req.json());
  await rateLimit("register:global", 500);
  await rateLimit(`register:${data.email.toLowerCase()}`, 3);
  const validation = validateCurp(data);
  if (!validation.valid || !validation.birthDate)
    throw new Error("Invalid registration");
  const server = admin();
  // createUser fails on existing email, so compensation can only delete a newly created account.
  const { data: signup, error } = await server.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: false,
  });
  const message =
    "Si el registro puede completarse, recibirás un correo para confirmar tu cuenta.";
  if (error || !signup.user) return response({ message });
  const provision = await admin().rpc("provision_citizen", {
    uid: signup.user.id,
    data: {
      first_names: data.first_names,
      paternal_surname: data.paternal_surname,
      maternal_surname: data.maternal_surname,
      birth_date: validation.birthDate,
      sex: data.sex,
      curp_last4: data.curp.slice(-4),
      privacy_notice_version: env("PRIVACY_NOTICE_VERSION"),
    },
    curp_hash: await digest(data.curp),
  });
  if (provision.error) {
    await server.auth.admin.deleteUser(signup.user.id);
    return response({ message });
  }
  await server.auth.resend({
    type: "signup",
    email: data.email,
    options: { emailRedirectTo: env("MOBILE_AUTH_REDIRECT") },
  });
  return response({ message });
});
