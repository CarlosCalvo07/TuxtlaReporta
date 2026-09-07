import { readFile } from "node:fs/promises";
const lines = await readFile("apps/web/.env", "utf8");
const env = Object.fromEntries(
  lines
    .split(/\r?\n/)
    .filter((x) => x.includes("="))
    .map((x) => {
      const i = x.indexOf("=");
      return [x.slice(0, i), x.slice(i + 1)];
    }),
);
for (const path of [
  "/auth/v1/health",
  "/rest/v1/incident_categories?select=id&limit=1",
]) {
  const r = await fetch(env.VITE_SUPABASE_URL + path, {
    headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY },
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json();
  console.log(
    JSON.stringify({
      endpoint: path.split("?")[0],
      status: r.status,
      ...(typeof data.code === "string" ? { code: data.code } : {}),
    }),
  );
}
