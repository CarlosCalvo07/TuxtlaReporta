import { it, expect } from "vitest";
import { nextReportStatus } from "./index";
it.each([
  ["recibido", "admin", "en_revision"],
  ["recibido", "maintenance", undefined],
  ["en_revision", "maintenance", "en_atencion"],
  ["en_atencion", "maintenance", "solucionado"],
  ["solucionado", "admin", undefined],
  ["en_atencion", "citizen", undefined],
] as const)("next status for %s as %s", (status, role, next) => {
  expect(nextReportStatus(status, role)).toBe(next);
});
