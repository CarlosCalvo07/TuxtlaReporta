import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

interface OpenStreetMapProps {
  point: { latitude: number; longitude: number } | null;
  onSelectPoint: (coords: { latitude: number; longitude: number }) => void;
  height?: number;
  isDark?: boolean;
}

export function OpenStreetMap({
  point,
  onSelectPoint,
  height = 280,
  isDark = true,
}: OpenStreetMapProps) {
  const webViewRef = useRef<any>(null);
  const initialLat = point?.latitude ?? 16.753;
  const initialLng = point?.longitude ?? -93.116;
  const hasPoint = Boolean(point);

  // Synchronize point changes from outside (GPS button, zone buttons) into the map
  useEffect(() => {
    if (point && webViewRef.current) {
      const script = `if (window.setMarker) { window.setMarker(${point.latitude}, ${point.longitude}, true); } true;`;
      webViewRef.current.injectJavaScript(script);
    }
  }, [point?.latitude, point?.longitude]);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #070e1c; }
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
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([${initialLat}, ${initialLng}], ${hasPoint ? 16 : 14});

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var marker = null;

    function setMarker(lat, lng, pan) {
      if (!marker) {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', function() {
          var pos = marker.getLatLng();
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              latitude: pos.lat,
              longitude: pos.lng
            }));
          }
        });
      } else {
        marker.setLatLng([lat, lng]);
      }
      if (pan) {
        map.setView([lat, lng], 16, { animate: true });
      }
    }

    ${hasPoint ? `setMarker(${initialLat}, ${initialLng}, false);` : ""}

    map.on('click', function(e) {
      setMarker(e.latlng.lat, e.latlng.lng, false);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        }));
      }
    });
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
            if (
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
