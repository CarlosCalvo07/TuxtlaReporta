import { endpoint, response, rateLimit } from "../_shared/http.ts";
import { validateCurp } from "../../../packages/validation/src/index.ts";
import { z } from "zod";
endpoint(async (req) => {
  const data = z
    .object({
      first_names: z.string().max(100),
      paternal_surname: z.string().max(100),
      maternal_surname: z.string().max(100),
      curp: z.string().max(30),
      age: z.number().int(),
      sex: z.enum(["H", "M"]),
    })
    .parse(await req.json());
  await rateLimit(`curp:${data.curp}`, 10);
  return response(validateCurp(data));
});
