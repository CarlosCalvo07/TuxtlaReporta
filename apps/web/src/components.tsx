import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Report, ReportStatus } from "@tuxtla/types";
import { statusLabels } from "@tuxtla/types";
import { friendlyError } from "@tuxtla/shared";
export function Badge({ status }: { status: ReportStatus }) {
  return (
    <span className={`badge ${status}`}>
      <span className="pulse-dot"></span>
      {statusLabels[status]}
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
  onBounds,
}: {
  reports: Pick<Report, "id" | "folio" | "latitude" | "longitude">[];
  onBounds?: (bounds: [number, number, number, number]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    layer = useRef<L.LayerGroup | null>(null),
    callback = useRef(onBounds);
  callback.current = onBounds;
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
    for (const report of reports) {
      const label = document.createElement("span");
      label.textContent = report.folio;
      label.style.fontFamily = "system-ui, -apple-system, sans-serif";
      label.style.fontWeight = "700";
      label.style.fontSize = "11px";
      L.circleMarker([report.latitude, report.longitude], {
        radius: 7,
        color: "#1e3a8a",
        fillColor: "#2563eb",
        fillOpacity: 0.95,
        weight: 2,
      })
        .bindTooltip(label)
        .addTo(layer.current!);
    }
    if (reports.length === 1 && !callback.current) {
      const r = reports[0]!;
      map.current?.setView([r.latitude, r.longitude], 16);
    }
  }, [reports]);
  return (
    <div
      ref={ref}
      className="map"
      role="img"
      aria-label="Mapa de incidencias en Tuxtla Gutiérrez"
    />
  );
}
