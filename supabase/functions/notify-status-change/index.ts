import { endpoint, response, env } from "../_shared/http.ts";
import { dispatchPush, checkReceipts } from "../_shared/push.ts";
endpoint(async (req) => {
  if (
    req.headers.get("Authorization") !== `Bearer ${env("PUSH_PROVIDER_SECRET")}`
  )
    return response({ message: "No autorizado" }, 401);
  const processed = await dispatchPush();
  const receipts = await checkReceipts();
  return response({ processed, receipts });
});
