import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Report, ReportStatus } from "@tuxtla/types";
import { statusLabels } from "@tuxtla/types";
import { friendlyError } from "@tuxtla/shared";
export function Badge({ status }: { status: ReportStatus }) {
  return <span className={`badge ${status}`}>● {statusLabels[status]}</span>;
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
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(instance);
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
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    layer.current?.clearLayers();
    for (const report of reports) {
      const label = document.createElement("span");
      label.textContent = report.folio;
      L.circleMarker([report.latitude, report.longitude], {
        radius: 8,
        color: "#173f35",
        fillColor: "#bad19a",
        fillOpacity: 1,
        weight: 3,
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
