import { endpoint, response, authenticated } from "../_shared/http.ts";
import { z } from "zod";
endpoint(async (req) => {
  const { client } = await authenticated(req);
  const data = z
    .object({
      rid: z.uuid(),
      target: z.enum(["recibido", "en_revision", "en_atencion", "solucionado"]),
      expected_version: z.number().int().positive(),
      note: z.string().max(2000).default(""),
    })
    .parse(await req.json());
  const result = await client.rpc("change_report_status", data);
  if (result.error) throw result.error;
  return response(result.data);
});
