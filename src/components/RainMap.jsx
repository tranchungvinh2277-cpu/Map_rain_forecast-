import React, { useCallback, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "./Sidebar";
import ProvinceLayer from "./ProvinceLayer";
import StationLayer from "./StationLayer";
import MapController from "./MapController";
import MapLegend from "./MapLegend";
import useIsMobile from "../hooks/useIsMobile";
import useForecast from "../hooks/useForecast";
import useFilteredStations from "../hooks/useFilteredStations";
import { ALL_VALUE } from "../utils/normalize";
import { getStationKey, VIETNAM_BOUNDS } from "../utils/mapUtils";
import tamTinhData from "../data/TamTinh.geojson";

export default function RainMap() {
  const markerRefs = useRef({});
  const isMobile = useIsMobile();
  const { tramList, mergedData, geoData, timeData, loading, error } = useForecast();
  const [selectedTram, setSelectedTram] = useState(null);
  const [filterLoaiTram, setFilterLoaiTram] = useState(ALL_VALUE);
  const [filterTinh, setFilterTinh] = useState(ALL_VALUE);
  const [riskFilter, setRiskFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { filteredStations, tinhOptions, loaiOptions, rainSummaryByStation } =
    useFilteredStations({
      tramList,
      mergedData,
      timeData,
      filterTinh,
      filterLoaiTram,
      riskFilter,
    });

  const handleSelectTram = useCallback(
    (station) => {
      setSelectedTram(station);

      if (isMobile) {
        setSidebarOpen(false);
      }

      window.setTimeout(() => {
        markerRefs.current[getStationKey(station)]?.openPopup();
      }, 50);
    },
    [isMobile]
  );

  const handleResetFilters = useCallback(() => {
    setFilterTinh(ALL_VALUE);
    setFilterLoaiTram(ALL_VALUE);
    setRiskFilter("all");
    setSelectedTram(null);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        position: "relative",
      }}
    >
      <Sidebar
        isMobile={isMobile}
        open={sidebarOpen}
        timeData={timeData}
        tinhOptions={tinhOptions}
        loaiOptions={loaiOptions}
        filterTinh={filterTinh}
        filterLoaiTram={filterLoaiTram}
        riskFilter={riskFilter}
        stations={filteredStations}
        selectedTram={selectedTram}
        onToggle={() => setSidebarOpen((open) => !open)}
        onClose={() => setSidebarOpen(false)}
        onSelectTinh={(value) => {
          setFilterTinh(value);
          setSelectedTram(null);
        }}
        onSelectLoaiTram={(value) => {
          setFilterLoaiTram(value);
          setSelectedTram(null);
        }}
        onSelectRisk={(value) => {
          setRiskFilter(value);
          setSelectedTram(null);
        }}
        onResetFilters={handleResetFilters}
        onSelectTram={handleSelectTram}
      />

      <div style={{ flex: 1, height: "100vh", position: "relative" }}>
        {loading && <StatusMessage>Đang tải dữ liệu...</StatusMessage>}
        {error && <StatusMessage>Lỗi tải dữ liệu: {error.message}</StatusMessage>}

        <MapContainer
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
          bounds={VIETNAM_BOUNDS}
          maxBounds={VIETNAM_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={5}
          maxZoom={12}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ProvinceLayer data={geoData} />
          <StationLayer
            stations={filteredStations}
            mergedData={mergedData}
            timeData={timeData}
            selectedTram={selectedTram}
            markerRefs={markerRefs}
            onSelectTram={handleSelectTram}
            rainSummaryByStation={rainSummaryByStation}
            isMobile={isMobile}
          />
          <MapController
            geoData={geoData}
            provinceData={tamTinhData}
            filterTinh={filterTinh}
            selectedTram={selectedTram}
            stations={filteredStations}
          />
          <MapLegend visible={!isMobile} />
        </MapContainer>
      </div>
    </div>
  );
}

function StatusMessage({ children }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 1500,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid #ddd",
        borderRadius: 4,
        padding: "6px 10px",
        fontSize: "0.9rem",
      }}
    >
      {children}
    </div>
  );
}
