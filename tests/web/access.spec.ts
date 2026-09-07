import { test, expect } from "@playwright/test";
test("login is accessible and has no horizontal overflow", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bienvenido de nuevo" }),
  ).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar al panel" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (info.project.name === "desktop")
    await page.screenshot({
      path: "test-results/login-desktop.png",
      fullPage: true,
    });
});
test("private report routes require authentication", async ({ page }) => {
  await page.goto("/reports/20000000-0000-4000-8000-000000000001");
  await expect(
    page.getByRole("heading", { name: "Bienvenido de nuevo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Historial de atención" }),
  ).toHaveCount(0);
});
test("privacy explains structural validation", async ({ page }) => {
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacidad y uso de datos" }),
  ).toBeVisible();
  await expect(page.getByText(/no acredita identidad oficial/)).toBeVisible();
});
