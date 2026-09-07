import {
  endpoint,
  response,
  authenticated,
  admin,
  rateLimit,
} from "../_shared/http.ts";
import { z } from "zod";
endpoint(async (req) => {
  const actor = await authenticated(req);
  await rateLimit(`upload:${actor.user.id}`, 40);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > 8388608)
    throw new Error("Invalid file");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let mime: string, ext: string;
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    mime = "image/jpeg";
    ext = "jpg";
  } else if (
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  ) {
    mime = "image/png";
    ext = "png";
  } else if (
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  ) {
    mime = "image/webp";
    ext = "webp";
  } else throw new Error("Invalid image signature");
  const kind = z
    .enum(["initial", "before_service", "after_service", "resolution"])
    .parse(form.get("kind"));
  let path: string;
  let rid: string | undefined;
  if (kind === "initial") {
    if (actor.role !== "citizen") throw new Error("Forbidden");
    path = `uploads/${actor.user.id}/${crypto.randomUUID()}.${ext}`;
  } else {
    rid = z.uuid().parse(form.get("report_id"));
    if (!["admin", "maintenance"].includes(actor.role))
      throw new Error("Forbidden");
    const report = await actor.client
      .from("reports")
      .select("id,status")
      .eq("id", rid)
      .single();
    if (report.error || report.data.status === "solucionado")
      throw new Error("Forbidden");
    path = `reports/${rid}/${actor.user.id}/${crypto.randomUUID()}.${ext}`;
  }
  const server = admin();
  const upload = await server.storage
    .from("report-media")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (upload.error) throw upload.error;
  if (rid) {
    const attach = await actor.client.rpc("add_media", { rid, path, kind });
    if (attach.error) {
      await server.storage.from("report-media").remove([path]);
      throw attach.error;
    }
  }
  return response({ path });
});
