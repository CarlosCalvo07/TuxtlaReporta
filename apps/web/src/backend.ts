import { makeClient, services } from "@tuxtla/shared";
export const client = makeClient({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  environment: import.meta.env.VITE_APP_ENV,
});
export const api = services(client);
