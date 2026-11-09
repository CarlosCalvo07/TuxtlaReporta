import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Category, Report, ReportStatus } from "@tuxtla/types";
import { statusLabels } from "@tuxtla/types";
import {
  clusterReportsByCategory,
  DEFAULT_CLUSTER_RADIUS_M,
  friendlyError,
  getCategoryHeatStyle,
  type ClusterableReport,
} from "@tuxtla/shared";

export function Badge({ status }: { status: ReportStatus }) {
  return (
    <span className={`badge ${status}`}>
      <span className="pulse-dot"></span>
      {statusLabels[status]}
    </span>
  );
}

export function CategoryBadge({
  name,
  slug,
  duplicateCount = 0,
}: {
  name?: string | null | undefined;
  slug?: string | null | undefined;
  duplicateCount?: number | undefined;
}) {
  const style = getCategoryHeatStyle(slug || name);
  return (
    <span
      className="category-heat-badge"
      style={{
        backgroundColor: style.badgeBg,
        borderColor: style.badgeBorder,
        color: style.color,
      }}
    >
      <span
        className="category-heat-dot"
        style={{ backgroundColor: style.color, boxShadow: `0 0 8px ${style.color}` }}
      />
      <span>{name || style.label}</span>
      {duplicateCount > 0 && (
        <strong
          className="cluster-pill-inline"
          style={{ backgroundColor: style.color, color: "#ffffff" }}
          title={`${duplicateCount + 1} reportes ciudadanos agrupados de esta misma incidencia en rango corto`}
        >
          ×{duplicateCount + 1}
        </strong>
      )}
    </span>
  );
}

export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <p role="alert" className="notice">
      {friendlyError(error)}
    </p>
  ) : null;
}

export function Map({
  reports,
  categories,
  onBounds,
  radiusMeters = DEFAULT_CLUSTER_RADIUS_M,
  showControls,
}: {
  reports: (Pick<Report, "id" | "folio" | "latitude" | "longitude"> &
    Partial<
      Pick<
        Report,
        | "category_id"
        | "status"
        | "priority"
        | "description"
        | "neighborhood"
        | "created_at"
      >
    >)[];
  categories?: Category[] | undefined;
  onBounds?: ((bounds: [number, number, number, number]) => void) | undefined;
  radiusMeters?: number | undefined;
  showControls?: boolean | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    layer = useRef<L.LayerGroup | null>(null),
    callback = useRef(onBounds);
  callback.current = onBounds;

  const controlsVisible = showControls ?? Boolean(onBounds || reports.length > 1);
  const [viewMode, setViewMode] = useState<"heatmap" | "points">("heatmap");
  const [activeRadius, setActiveRadius] = useState<number>(radiusMeters);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    setActiveRadius(radiusMeters);
  }, [radiusMeters]);

  const categoryLookup = useMemo(() => {
    const m = new globalThis.Map<string, Category>();
    for (const c of categories ?? []) {
      m.set(c.id, c);
    }
    return m;
  }, [categories]);

  const filteredReports = useMemo(() => {
    if (categoryFilter === "all") return reports;
    return reports.filter((r) => {
      const cat = r.category_id ? categoryLookup.get(r.category_id) : undefined;
      const style = getCategoryHeatStyle(cat?.slug || cat?.name || r.category_id);
      return style.key === categoryFilter || r.category_id === categoryFilter;
    });
  }, [reports, categoryFilter, categoryLookup]);

  const clusters = useMemo(
    () =>
      clusterReportsByCategory(
        filteredReports as ClusterableReport[],
        activeRadius,
      ),
    [filteredReports, activeRadius],
  );

  const totalDuplicatesGrouped = useMemo(
    () => clusters.reduce((acc, c) => acc + c.duplicateCount, 0),
    [clusters],
  );

  const legendItems = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories
        .filter((c) => c.is_active)
        .map((c) => {
          const style = getCategoryHeatStyle(c.slug || c.name);
          const count = reports.filter((r) => r.category_id === c.id).length;
          return {
            id: c.id,
            name: c.name,
            style,
            count,
          };
        });
    }
    return (["bache", "alumbrado", "basura", "otra"] as const).map((key) => {
      const style = getCategoryHeatStyle(key);
      return {
        id: key,
        name: style.label,
        style,
        count: 0,
      };
    });
  }, [categories, reports]);

  useEffect(() => {
    if (!ref.current) return;
    const instance = L.map(ref.current).setView([16.753, -93.116], 13);
    map.current = instance;

    let currentTiles: L.TileLayer | null = null;
    const updateTiles = () => {
      const isLight =
        document.documentElement.getAttribute("data-theme") === "light";
      const rawKey = import.meta.env.VITE_CARTO_API_KEY;
      const cartoKey =
        typeof rawKey === "string" && rawKey.trim().length > 10
          ? rawKey.trim()
          : null;

      const url = cartoKey
        ? isLight
          ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`
          : `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      const attribution = cartoKey
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

      if (currentTiles) instance.removeLayer(currentTiles);
      currentTiles = L.tileLayer(url, {
        attribution,
        maxZoom: 19,
        subdomains: cartoKey ? "abcd" : "abc",
      }).addTo(instance);
    };

    updateTiles();
    const observer = new MutationObserver(updateTiles);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    layer.current = L.layerGroup().addTo(instance);
    const update = () => {
      const b = instance.getBounds();
      callback.current?.([
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth(),
      ]);
    };
    instance.on("moveend", update);
    update();
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    layer.current?.clearLayers();
    if (!layer.current) return;

    if (viewMode === "points") {
      for (const report of filteredReports) {
        const cat = report.category_id
          ? categoryLookup.get(report.category_id)
          : undefined;
        const style = getCategoryHeatStyle(cat?.slug || cat?.name);

        const label = document.createElement("span");
        label.textContent = `${cat?.name ? `${cat.name} · ` : ""}${report.folio}`;
        label.style.fontFamily = "system-ui, -apple-system, sans-serif";
        label.style.fontWeight = "700";
        label.style.fontSize = "11px";

        L.circleMarker([report.latitude, report.longitude], {
          radius: 7,
          color: style.darkColor,
          fillColor: style.color,
          fillOpacity: 0.95,
          weight: 2,
        })
          .bindTooltip(label)
          .addTo(layer.current);
      }
    } else {
      for (const cluster of clusters) {
        const cat = cluster.category_id
          ? categoryLookup.get(cluster.category_id)
          : undefined;
        const style = getCategoryHeatStyle(cat?.slug || cat?.name);
        const categoryName = cat?.name || style.label;

        // 1. Zona geográfica de rango corto (ej. 45 m) para visualizar agrupación del mismo tipo
        L.circle([cluster.latitude, cluster.longitude], {
          radius: activeRadius,
          color: style.color,
          weight: cluster.count > 1 ? 1.5 : 1,
          dashArray: cluster.count > 1 ? "4 4" : undefined,
          fillColor: style.color,
          fillOpacity: Math.min(0.14 + (cluster.count - 1) * 0.06, 0.38),
          interactive: false,
        }).addTo(layer.current);

        // 2. Halo visual de mapa de calor + marcador central con contador de reportes agrupados
        const outerSize =
          cluster.count >= 5
            ? 84
            : cluster.count >= 3
              ? 68
              : cluster.count === 2
                ? 54
                : 38;
        const coreSize = cluster.count > 1 ? 26 : 16;

        const iconHtml = `
          <div class="heat-cluster-wrap" style="width:${outerSize}px;height:${outerSize}px;">
            <div class="heat-cluster-aura ${cluster.count > 1 ? "pulsing" : ""}" style="
              width:${outerSize}px;
              height:${outerSize}px;
              background: radial-gradient(circle, ${style.haloInner} 0%, ${style.haloOuter} 52%, rgba(0,0,0,0) 75%);
            "></div>
            <div class="heat-cluster-core" style="
              width:${coreSize}px;
              height:${coreSize}px;
              background:${style.color};
              border:2px solid #ffffff;
              box-shadow: 0 0 12px ${style.color};
            ">
              ${cluster.count > 1 ? `<span>×${cluster.count}</span>` : ""}
            </div>
          </div>
        `;

        const divIcon = L.divIcon({
          className: "custom-heat-icon",
          html: iconHtml,
          iconSize: [outerSize, outerSize],
          iconAnchor: [outerSize / 2, outerSize / 2],
        });

        const tooltipEl = document.createElement("div");
        tooltipEl.style.fontFamily = "system-ui, -apple-system, sans-serif";
        tooltipEl.style.fontSize = "11.5px";
        tooltipEl.style.lineHeight = "1.35";
        const strongEl = document.createElement("strong");
        strongEl.style.color = style.color;
        strongEl.textContent = categoryName;
        tooltipEl.appendChild(strongEl);
        const br = document.createElement("br");
        tooltipEl.appendChild(br);
        const subText = document.createElement("span");
        subText.textContent =
          cluster.count > 1
            ? `${cluster.count} reportes agrupados (rango ≤ ${activeRadius}m) · Principal: ${cluster.primary.folio}`
            : `Folio: ${cluster.primary.folio}`;
        tooltipEl.appendChild(subText);

        // Popup interactivo con desglose de todos los reportes ciudadanos agrupados
        const popupEl = document.createElement("div");
        popupEl.style.fontFamily = "system-ui, -apple-system, sans-serif";
        popupEl.style.minWidth = "230px";
        popupEl.style.maxWidth = "290px";

        const headerEl = document.createElement("div");
        headerEl.style.display = "flex";
        headerEl.style.justifyContent = "space-between";
        headerEl.style.alignItems = "center";
        headerEl.style.gap = "8px";
        headerEl.style.marginBottom = "6px";

        const catTag = document.createElement("strong");
        catTag.style.color = style.color;
        catTag.style.fontSize = "13px";
        catTag.textContent = categoryName;
        headerEl.appendChild(catTag);

        const countTag = document.createElement("span");
        countTag.style.background = style.color;
        countTag.style.color = "#ffffff";
        countTag.style.fontSize = "10.5px";
        countTag.style.fontWeight = "700";
        countTag.style.padding = "2px 7px";
        countTag.style.borderRadius = "10px";
        countTag.textContent =
          cluster.count > 1
            ? `${cluster.count} reportes (≤${activeRadius}m)`
            : "1 reporte";
        headerEl.appendChild(countTag);
        popupEl.appendChild(headerEl);

        if (cluster.count > 1) {
          const noteEl = document.createElement("p");
          noteEl.style.margin = "0 0 8px 0";
          noteEl.style.fontSize = "11px";
          noteEl.style.color = "#475569";
          noteEl.textContent = `Se agruparon ${cluster.count} reportes de "${categoryName}" dentro de un rango corto de ${activeRadius} m para evitar duplicar órdenes de atención.`;
          popupEl.appendChild(noteEl);
        }

        const listEl = document.createElement("div");
        listEl.style.display = "flex";
        listEl.style.flexDirection = "column";
        listEl.style.gap = "5px";
        listEl.style.maxHeight = "150px";
        listEl.style.overflowY = "auto";

        for (const item of cluster.reports) {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.justifyContent = "space-between";
          row.style.alignItems = "center";
          row.style.padding = "4px 6px";
          row.style.borderRadius = "5px";
          row.style.background = "rgba(15, 23, 42, 0.06)";
          row.style.fontSize = "11.5px";

          const folioSpan = document.createElement("strong");
          folioSpan.textContent = item.folio;
          row.appendChild(folioSpan);

          const link = document.createElement("a");
          link.href = `/reports/${item.id}`;
          link.textContent = "Abrir";
          link.style.fontWeight = "700";
          link.style.color = "#2563eb";
          row.appendChild(link);

          listEl.appendChild(row);
        }

        popupEl.appendChild(listEl);

        L.marker([cluster.latitude, cluster.longitude], { icon: divIcon })
          .bindTooltip(tooltipEl)
          .bindPopup(popupEl)
          .addTo(layer.current);
      }
    }

    if (reports.length === 1 && !callback.current) {
      const r = reports[0]!;
      map.current?.setView([r.latitude, r.longitude], 16);
    }
  }, [filteredReports, clusters, viewMode, activeRadius, categoryLookup, reports]);

  return (
    <div className="heatmap-wrapper">
      {controlsVisible && (
        <div className="heatmap-toolbar">
          <div className="heatmap-toolbar-top">
            <div className="heatmap-mode-group">
              <button
                type="button"
                className={viewMode === "heatmap" ? "heat-btn active" : "heat-btn"}
                onClick={() => setViewMode("heatmap")}
              >
                Mapa de calor agrupado
              </button>
              <button
                type="button"
                className={viewMode === "points" ? "heat-btn active" : "heat-btn"}
                onClick={() => setViewMode("points")}
              >
                Puntos individuales
              </button>
            </div>

            {viewMode === "heatmap" && (
              <div className="heatmap-radius-group">
                <span>Rango corto:</span>
                {[30, 45, 75].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={
                      activeRadius === r ? "radius-pill active" : "radius-pill"
                    }
                    onClick={() => setActiveRadius(r)}
                  >
                    {r} m
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Leyenda interactiva por color de tipo de incidencia */}
          <div className="heatmap-legend">
            <button
              type="button"
              className={
                categoryFilter === "all" ? "legend-chip active" : "legend-chip"
              }
              onClick={() => setCategoryFilter("all")}
            >
              <span>Todas ({reports.length})</span>
            </button>
            {legendItems.map((item) => {
              const isSelected = categoryFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={isSelected ? "legend-chip active" : "legend-chip"}
                  style={{
                    borderColor: isSelected
                      ? item.style.color
                      : item.style.badgeBorder,
                    backgroundColor: isSelected
                      ? item.style.badgeBg
                      : undefined,
                  }}
                  onClick={() =>
                    setCategoryFilter(isSelected ? "all" : item.id)
                  }
                >
                  <span
                    className="category-heat-dot"
                    style={{
                      backgroundColor: item.style.color,
                      boxShadow: `0 0 8px ${item.style.color}`,
                    }}
                  />
                  <span>
                    {item.name}
                    {categories ? ` (${item.count})` : ""}
                  </span>
                </button>
              );
            })}
          </div>

          {viewMode === "heatmap" && (
            <div className="heatmap-summary-bar">
              <span>
                <strong>{filteredReports.length}</strong> reporte(s) en vista →{" "}
                <strong>{clusters.length}</strong> incidencia(s) única(s) por tipo
              </span>
              {totalDuplicatesGrouped > 0 ? (
                <span className="heatmap-dedup-tag">
                  {totalDuplicatesGrouped} reporte(s) repetido(s) agrupado(s) en ≤{" "}
                  {activeRadius} m
                </span>
              ) : (
                <span className="small">
                  Agrupación automática por mismo tipo de incidencia en ≤ {activeRadius} m
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div
        ref={ref}
        className="map"
        role="img"
        aria-label="Mapa de calor de incidencias en Tuxtla Gutiérrez"
      />
    </div>
  );
}
