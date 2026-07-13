import L from "leaflet";
import { cleanText } from "./normalize";

export function getProvinceName(feature) {
  return (
    feature?.properties?.Name ||
    feature?.properties?.name ||
    feature?.properties?.Ten ||
    ""
  )
    .replace(/^Tỉnh\s+/i, "")
    .replace(/^Thành phố\s+/i, "")
    .trim();
}

export function findProvinceFeature(data, provinceName) {
  if (!data?.features || !provinceName) return null;

  const selected = cleanText(provinceName);
  return data.features.find((feature) => cleanText(getProvinceName(feature)) === selected) || null;
}

export function getFeatureCenter(feature) {
  if (!feature?.geometry) return null;

  if (feature.geometry.type === "Point") {
    const [lon, lat] = feature.geometry.coordinates;
    return { lat, lon };
  }

  const center = L.geoJSON(feature).getBounds().getCenter();
  return { lat: center.lat, lon: center.lng };
}
