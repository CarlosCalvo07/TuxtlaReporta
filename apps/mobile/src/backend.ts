import * as SecureStore from "expo-secure-store";
import { makeClient, services } from "@tuxtla/shared";
// Chunked writes keep each SecureStore entry below platform limits; the manifest is committed last.
const storage = {
  async getItem(key: string) {
    const manifest = await SecureStore.getItemAsync(key);
    if (!manifest) return null;
    const { version, count } = JSON.parse(manifest) as {
      version: string;
      count: number;
    };
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.getItemAsync(`${key}.${version}.${i}`),
      ),
    );
    return chunks.every((x) => x !== null) ? chunks.join("") : null;
  },
  async setItem(key: string, value: string) {
    const old = await SecureStore.getItemAsync(key);
    const version = String(Date.now()),
      chunks = value.match(/[\s\S]{1,1500}/g) ?? [""];
    await Promise.all(
      chunks.map((s, i) =>
        SecureStore.setItemAsync(`${key}.${version}.${i}`, s),
      ),
    );
    await SecureStore.setItemAsync(
      key,
      JSON.stringify({ version, count: chunks.length }),
    );
    if (old) {
      const prev = JSON.parse(old) as { version: string; count: number };
      await Promise.all(
        Array.from({ length: prev.count }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}.${prev.version}.${i}`),
        ),
      );
    }
  },
  async removeItem(key: string) {
    const old = await SecureStore.getItemAsync(key);
    await SecureStore.deleteItemAsync(key);
    if (old) {
      const prev = JSON.parse(old) as { version: string; count: number };
      await Promise.all(
        Array.from({ length: prev.count }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}.${prev.version}.${i}`),
        ),
      );
    }
  },
};
export const client = makeClient(
  {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
  },
  storage,
);
export const api = services(client);
