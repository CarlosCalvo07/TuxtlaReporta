import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Tuxtla Reporta",
        short_name: "Tuxtla",
        description: "Gestión de incidencias urbanas",
        theme_color: "#173f35",
        background_color: "#f5f6f2",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [],
        navigateFallbackDenylist: [/^\/auth/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 650 },
});
