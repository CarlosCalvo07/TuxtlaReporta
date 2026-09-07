import { describe, it, expect } from "vitest";
import {
  normalizeName,
  ageOn,
  checkDigit,
  validateCurp,
  nameCode,
  createReportSchema,
} from "./index";
describe("identity validation", () => {
  it("preserves Unicode and presentation", () =>
    expect(normalizeName("  José   Muñoz ")).toBe("José Muñoz"));
  it("handles birthday boundary", () => {
    expect(ageOn("2009-09-07", new Date("2026-09-06T18:00:00Z"))).toBe(16);
    expect(ageOn("2009-09-06", new Date("2026-09-06T18:00:00Z"))).toBe(17);
  });
  it("handles compound names and missing maternal surname", () =>
    expect(
      nameCode({
        first_names: "José Luis",
        paternal_surname: "de la Cruz",
        maternal_surname: "",
      }),
    ).toEqual({ prefix: "CUXL", consonants: "RXS" }));
  it("validates synthetic structure and detects altered checksum", () => {
    const base = "PELA000101HC SRPN A".replaceAll(" ", "");
    const data = {
      first_names: "Ana",
      paternal_surname: "Perez",
      maternal_surname: "Lopez",
      age: 26,
      sex: "H" as const,
      curp: base + checkDigit(base),
    };
    const result = validateCurp(data, new Date("2026-09-06T18:00:00Z"));
    expect(result.valid).toBe(true);
    expect(
      validateCurp(
        { ...data, curp: base + ((Number(checkDigit(base)) + 1) % 10) },
        new Date("2026-09-06T18:00:00Z"),
      ).valid,
    ).toBe(false);
  });
  it("rejects impossible dates", () =>
    expect(
      validateCurp({
        first_names: "Ana",
        paternal_surname: "Perez",
        maternal_surname: "Lopez",
        age: 26,
        sex: "H",
        curp: "PELA000231HCSRPN" + "A" + checkDigit("PELA000231HCSRPNA"),
      }).valid,
    ).toBe(false));
  it("rejects invalid coordinates and short descriptions", () =>
    expect(
      createReportSchema.safeParse({
        category_id: "10000000-0000-4000-8000-000000000001",
        description: "Bache",
        latitude: 91,
        longitude: -93,
        location_source: "manual_map",
        idempotency_key: "10000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(false));
});
