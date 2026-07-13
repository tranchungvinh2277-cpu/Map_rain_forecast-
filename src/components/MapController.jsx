import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { ALL_VALUE, isAll } from "../utils/normalize";
import { findProvinceFeature, getFeatureCenter } from "../utils/provinceUtils";

function MapController({ geoData, provinceData, filterTinh, selectedTram, stations }) {
  const map = useMap();
  const lastActionRef = useRef("");

  useEffect(() => {
    if (selectedTram && hasLatLon(selectedTram)) {
      const actionKey = `station:${selectedTram.MaTram}`;
      if (lastActionRef.current === actionKey) return;

      lastActionRef.current = actionKey;
      map.flyTo([selectedTram.Lat + 0.1, selectedTram.Lon], 11);
      return;
    }

    if (!isAll(filterTinh)) {
      const actionKey = `province:${filterTinh}`;
      if (lastActionRef.current === actionKey) return;

      const feature = findProvinceFeature(provinceData, filterTinh);
      const center = getFeatureCenter(feature);

      if (center) {
        lastActionRef.current = actionKey;
        map.flyTo([center.lat, center.lon], 9, { duration: 1.5 });
        return;
      }

      if (stations.length) {
        lastActionRef.current = actionKey;
        map.fitBounds(L.latLngBounds(stations.map((station) => [station.Lat, station.Lon])), {
          padding: [30, 30],
          maxZoom: 9,
        });
        return;
      }
    }

    if (geoData && filterTinh === ALL_VALUE) {
      const actionKey = "all";
      if (lastActionRef.current === actionKey) return;

      const bounds = L.geoJSON(geoData).getBounds();
      lastActionRef.current = actionKey;
      map.fitBounds(bounds, { padding: [20, 20] });
      map.setMaxBounds(bounds.pad(0.1));
    }
  }, [filterTinh, geoData, map, provinceData, selectedTram, stations]);

  return null;
}

function hasLatLon(station) {
  return (
    typeof station.Lat === "number" &&
    typeof station.Lon === "number" &&
    !Number.isNaN(station.Lat) &&
    !Number.isNaN(station.Lon)
  );
}

export default MapController;
