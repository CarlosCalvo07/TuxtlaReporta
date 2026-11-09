import { describe, it, expect } from "vitest";
import {
  nextReportStatus,
  clusterReportsByCategory,
  findNearbySameCategoryReports,
  getCategoryHeatStyle,
  distanceMeters,
} from "./index";

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

describe("short-range heatmap clustering by category", () => {
  it("groups nearby reports of the exact same category within 45m and keeps other categories separate", () => {
    const reports = [
      {
        id: "r1",
        folio: "TGZ-INC-001",
        category_id: "cat-bache",
        latitude: 16.753,
        longitude: -93.116,
        status: "recibido" as const,
      },
      {
        id: "r2",
        folio: "TGZ-INC-002",
        category_id: "cat-bache",
        latitude: 16.7531, // ~11 metros de r1
        longitude: -93.1161,
        status: "recibido" as const,
      },
      {
        id: "r3",
        folio: "TGZ-INC-003",
        category_id: "cat-basura", // Misma coordenada pero otra categoría (basura)
        latitude: 16.753,
        longitude: -93.116,
        status: "recibido" as const,
      },
      {
        id: "r4",
        folio: "TGZ-INC-004",
        category_id: "cat-bache", // Lejos (~600 m)
        latitude: 16.758,
        longitude: -93.116,
        status: "recibido" as const,
      },
    ];

    const clusters = clusterReportsByCategory(reports, 45);
    expect(clusters).toHaveLength(3);

    const bacheGroup = clusters.find((c) => c.id === "r1");
    expect(bacheGroup?.count).toBe(2);
    expect(bacheGroup?.duplicateCount).toBe(1);

    const basuraGroup = clusters.find((c) => c.category_id === "cat-basura");
    expect(basuraGroup?.count).toBe(1);

    const nearbyToR1 = findNearbySameCategoryReports(reports[0]!, reports, 45);
    expect(nearbyToR1.map((x) => x.id)).toEqual(["r2"]);
  });

  it("assigns distinct colors for bache, alumbrado, basura, and otra", () => {
    const bache = getCategoryHeatStyle("bache");
    const alumbrado = getCategoryHeatStyle("Alumbrado público");
    const basura = getCategoryHeatStyle("basura");
    const otra = getCategoryHeatStyle("otra");

    const uniqueColors = new Set([
      bache.color,
      alumbrado.color,
      basura.color,
      otra.color,
    ]);
    expect(uniqueColors.size).toBe(4);
    expect(distanceMeters(16.753, -93.116, 16.753, -93.116)).toBe(0);
  });
});
