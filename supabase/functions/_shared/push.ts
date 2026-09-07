import { admin } from "./http.ts";
const headers = () => ({
  "Content-Type": "application/json",
  ...(Deno.env.get("EXPO_ACCESS_TOKEN")
    ? { Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}` }
    : {}),
});
type Ticket = { id?: string; status: string; details?: { error?: string } };
export async function dispatchPush() {
  const server = admin();
  const batch = await server.rpc("claim_push_batch");
  if (batch.error) throw batch.error;
  let processed = 0;
  for (const job of batch.data as { id: string; tokens: string[] }[]) {
    if (!job.tokens.length) {
      await server.rpc("finish_push", { job: job.id, success: true });
      continue;
    }
    try {
      const result = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: headers(),
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify(
          job.tokens.map((to) => ({
            to,
            title: "Tuxtla Reporta",
            body: "Hay una actualización en tus reportes. Abre la aplicación para consultarla.",
            sound: "default",
            channelId: "default",
          })),
        ),
      });
      if (!result.ok) throw new Error("Provider response");
      const payload = (await result.json()) as { data: Ticket[] };
      if (
        !Array.isArray(payload.data) ||
        payload.data.length !== job.tokens.length
      )
        throw new Error("Provider response");
      const invalid = job.tokens.filter(
        (_, i) => payload.data[i]?.details?.error === "DeviceNotRegistered",
      );
      const receipts = payload.data.flatMap((t, i) =>
        t.status === "ok" && t.id
          ? [{ ticket_id: t.id, token: job.tokens[i] }]
          : [],
      );
      if (receipts.length) {
        const saved = await server.rpc("record_push_receipts", {
          job: job.id,
          receipts,
        });
        if (saved.error) throw saved.error;
      }
      const success = payload.data.every(
        (t) => t.status === "ok" || t.details?.error === "DeviceNotRegistered",
      );
      await server.rpc("finish_push", {
        job: job.id,
        success,
        invalid_tokens: invalid,
      });
      processed++;
    } catch {
      await server.rpc("finish_push", { job: job.id, success: false });
    }
  }
  return processed;
}
export async function checkReceipts() {
  const server = admin();
  const claimed = await server.rpc("claim_push_receipts");
  if (claimed.error) throw claimed.error;
  const ids = (claimed.data as { ticket_id: string }[]).map((x) => x.ticket_id);
  if (!ids.length) return 0;
  const res = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST",
    headers: headers(),
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Receipt provider");
  const payload = (await res.json()) as { data: Record<string, Ticket> };
  let processed = 0;
  for (const id of ids) {
    const ticket = payload.data[id];
    if (!ticket) continue;
    const result =
      ticket.status === "ok"
        ? "delivered"
        : ticket.details?.error === "DeviceNotRegistered"
          ? "DeviceNotRegistered"
          : "provider_error";
    const saved = await server.rpc("finish_push_receipt", {
      ticket: id,
      result,
    });
    if (saved.error) throw saved.error;
    processed++;
  }
  return processed;
}
