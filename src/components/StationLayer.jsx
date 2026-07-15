import React, { memo } from "react";
import { Marker, Popup } from "react-leaflet";
import RainPopup from "./RainPopup";
import { getTriangleIcon } from "../utils/icons";
import { getStationKey, isSameStation } from "../utils/mapUtils";

function StationLayer({
  stations,
  mergedData,
  timeData,
  selectedTram,
  markerRefs,
  onSelectTram,
  rainSummaryByStation,
  isMobile,
}) {
  return stations.map((station) => {
    const summary = rainSummaryByStation.get(station.MaTram);
    if (!summary) return null;

    const stationKey = getStationKey(station);
    const selected = isSameStation(selectedTram, station);

    return (
      <Marker
        key={stationKey}
        position={[station.Lat, station.Lon]}
        icon={getTriangleIcon(selected ? "blue" : summary.riskColor)}
        ref={(ref) => {
          markerRefs.current[stationKey] = ref;
        }}
        eventHandlers={{ click: () => onSelectTram(station) }}
      >
        <Popup
          key={`${stationKey}_${selected ? "selected" : "normal"}`}
          maxWidth={isMobile ? 320 : 600}
          minWidth={250}
        >
          <RainPopup
            station={station}
            mergedData={mergedData}
            timeData={timeData}
            summary={summary}
            isMobile={isMobile}
          />
        </Popup>
      </Marker>
    );
  });
}

export default memo(StationLayer);
