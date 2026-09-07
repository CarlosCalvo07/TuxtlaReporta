import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/web",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "mobile-web",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        channel: "chrome",
      },
    },
  ],
  webServer: {
    command:
      "node apps/web/node_modules/vite/bin/vite.js apps/web --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
