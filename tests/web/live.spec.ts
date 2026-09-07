import { test, expect } from "@playwright/test";
test("live administrator can list, filter and open a report", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    "Requires an explicitly configured test account and migrated Supabase.",
  );
  await page.goto("/");
  await page
    .getByLabel("Correo electrónico")
    .fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Contraseña").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar al panel" }).click();
  await expect(
    page.getByRole("heading", { name: "El pulso de la ciudad" }),
  ).toBeVisible();
  await page.goto("/reports");
  await page.getByLabel("Estado", { exact: true }).selectOption("recibido");
  const first = page.getByRole("link", { name: "Ver detalle" }).first();
  if (await first.count()) {
    await first.click();
    await expect(
      page.getByRole("heading", { name: "Historial de atención" }),
    ).toBeVisible();
  }
});
