import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

export interface MobileHeatClusterItem {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  color: string;
  haloInner: string;
  haloOuter: string;
  label: string;
  folio: string;
}

interface OpenStreetMapProps {
  point?: { latitude: number; longitude: number } | null;
  onSelectPoint?: (coords: { latitude: number; longitude: number }) => void;
  clusters?: MobileHeatClusterItem[];
  radiusMeters?: number;
  onSelectCluster?: (reportId: string) => void;
  height?: number;
  isDark?: boolean;
  interactive?: boolean;
}

export function OpenStreetMap({
  point = null,
  onSelectPoint,
  clusters,
  radiusMeters = 45,
  onSelectCluster,
  height = 280,
  isDark = true,
  interactive = Boolean(onSelectPoint) || Boolean(clusters?.length),
}: OpenStreetMapProps) {
  const webViewRef = useRef<any>(null);
  const firstCluster = clusters?.[0];
  const initialLat = point?.latitude ?? firstCluster?.latitude ?? 16.753;
  const initialLng = point?.longitude ?? firstCluster?.longitude ?? -93.116;
  const hasPoint = Boolean(point);
  const hasClusters = Boolean(clusters && clusters.length > 0);

  // Synchronize point changes from outside (GPS button, zone buttons) into the map
  useEffect(() => {
    if (point && webViewRef.current) {
      const script = `if (window.setMarker) { window.setMarker(${point.latitude}, ${point.longitude}, true); } true;`;
      webViewRef.current.injectJavaScript(script);
    }
  }, [point?.latitude, point?.longitude]);

  const clustersJson = JSON.stringify(clusters ?? []);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #070e1c; font-family: system-ui, -apple-system, sans-serif; }
    ${
      isDark
        ? `
    .leaflet-tile {
      filter: brightness(0.62) invert(1) contrast(2.6) hue-rotate(200deg) saturate(0.35) !important;
    }
    .leaflet-container {
      background: #070e1c !important;
    }
    `
        : ""
    }
    .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
    }
    .leaflet-control-zoom a {
      background: #0d1b33 !important;
      color: #00d2ee !important;
      border: 1px solid rgba(0, 210, 238, 0.3) !important;
    }
    .heat-icon {
      background: transparent !important;
      border: none !important;
    }
    .heat-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .heat-aura {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      pointer-events: none;
    }
    .heat-core {
      position: relative;
      z-index: 2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 10px;
      border: 2px solid #ffffff;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([${initialLat}, ${initialLng}], ${hasPoint ? 16 : hasClusters ? 13 : 14});

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var marker = null;
    var isPointInteractive = ${Boolean(onSelectPoint) ? "true" : "false"};
    var clusters = ${clustersJson};
    var radiusMeters = ${radiusMeters};

    function setMarker(lat, lng, pan) {
      if (!marker) {
        marker = L.marker([lat, lng], { draggable: isPointInteractive }).addTo(map);
        if (isPointInteractive) {
          marker.on('dragend', function() {
            var pos = marker.getLatLng();
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'point',
                latitude: pos.lat,
                longitude: pos.lng
              }));
            }
          });
        }
      } else {
        marker.setLatLng([lat, lng]);
      }
      if (pan) {
        map.setView([lat, lng], 16, { animate: true });
      }
    }

    ${hasPoint ? `setMarker(${initialLat}, ${initialLng}, false);` : ""}

    if (clusters && clusters.length > 0) {
      var bounds = [];
      for (var i = 0; i < clusters.length; i++) {
        (function(c) {
          bounds.push([c.latitude, c.longitude]);
          L.circle([c.latitude, c.longitude], {
            radius: radiusMeters,
            color: c.color,
            weight: c.count > 1 ? 1.5 : 1,
            dashArray: c.count > 1 ? '4 4' : null,
            fillColor: c.color,
            fillOpacity: Math.min(0.16 + (c.count - 1) * 0.06, 0.38),
            interactive: false
          }).addTo(map);

          var outerSize = c.count >= 5 ? 74 : c.count >= 3 ? 60 : c.count === 2 ? 48 : 34;
          var coreSize = c.count > 1 ? 24 : 14;
          var html = '<div class="heat-wrap" style="width:' + outerSize + 'px;height:' + outerSize + 'px;">' +
            '<div class="heat-aura" style="width:' + outerSize + 'px;height:' + outerSize + 'px;background:radial-gradient(circle,' + c.haloInner + ' 0%,' + c.haloOuter + ' 52%,rgba(0,0,0,0) 75%);"></div>' +
            '<div class="heat-core" style="width:' + coreSize + 'px;height:' + coreSize + 'px;background:' + c.color + ';box-shadow:0 0 10px ' + c.color + ';">' +
            (c.count > 1 ? '×' + c.count : '') +
            '</div></div>';

          var icon = L.divIcon({
            className: 'heat-icon',
            html: html,
            iconSize: [outerSize, outerSize],
            iconAnchor: [outerSize / 2, outerSize / 2]
          });

          var m = L.marker([c.latitude, c.longitude], { icon: icon }).addTo(map);
          m.on('click', function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'cluster',
                id: c.id
              }));
            }
          });
        })(clusters[i]);
      }
      if (!${hasPoint ? "true" : "false"} && bounds.length > 1) {
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
      }
    }

    if (isPointInteractive) {
      map.on('click', function(e) {
        setMarker(e.latlng.lat, e.latlng.lng, false);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'point',
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          }));
        }
      });
    }
  </script>
</body>
</html>
  `;

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#00d2ee" />
          </View>
        )}
        startInLoadingState
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "cluster" && typeof data.id === "string") {
              onSelectCluster?.(data.id);
              return;
            }
            if (
              onSelectPoint &&
              typeof data.latitude === "number" &&
              typeof data.longitude === "number"
            ) {
              onSelectPoint({
                latitude: data.latitude,
                longitude: data.longitude,
              });
            }
          } catch (err) {
            console.warn("Failed to parse map coordinate message", err);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: "hidden",
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 210, 238, 0.25)",
    backgroundColor: "#070e1c",
  },
  webview: {
    flex: 1,
    backgroundColor: "#070e1c",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#070e1c",
    justifyContent: "center",
    alignItems: "center",
  },
});
