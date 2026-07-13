import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export const LoadGeoJSON = ({
  url,
  style,
  labelField,
  autoFitBounds = false,
  lockBounds = false
}) => {
  const map = useMap();
  const geoLayerRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Xóa layer cũ nếu có
        if (geoLayerRef.current) {
          map.removeLayer(geoLayerRef.current);
        }

        const layer = L.geoJSON(data, {
          style: feature => {
            // Áp dụng style cho Polygon và LineString
            if (feature.geometry.type !== "Point") return style;
            return null; // Không style cho point
          },
          pointToLayer: (feature, latlng) => {
            if (labelField && feature.properties && feature.properties[labelField]) {
              const label = L.tooltip({
                permanent: true,
                direction: "center",
                className: "label-tooltip",
                offset: [0, 0]
              })
                .setContent(`<span>${feature.properties[labelField]}</span>`)
                .setLatLng(latlng);

              label.addTo(map);
            }
            return null; // Không vẽ marker
          },
          onEachFeature: (feature, layer) => {
            if (feature.geometry.type !== "Point" && labelField && feature.properties[labelField]) {
              const center = layer.getBounds().getCenter();
              const label = L.tooltip({
                permanent: true,
                direction: "center",
                className: "label-tooltip",
                offset: [0, 0]
              })
                .setContent(`<span>${feature.properties[labelField]}</span>`)
                .setLatLng(center);

              label.addTo(map);
            }
          }
        }).addTo(map);

        if (autoFitBounds) {
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
            if (lockBounds) {
              map.setMaxBounds(bounds);
            }
          }
        }

        geoLayerRef.current = layer;
      })
      .catch(err => console.error("Lỗi khi tải GeoJSON:", err));

    return () => {
      if (geoLayerRef.current) {
        map.removeLayer(geoLayerRef.current);
        geoLayerRef.current = null;
      }
    };
  }, [url, map, style, labelField, autoFitBounds, lockBounds]);

  return null;
};
