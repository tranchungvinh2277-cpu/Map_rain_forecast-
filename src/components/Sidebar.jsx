import React, { memo } from "react";
import { getStationKey, isSameStation } from "../utils/mapUtils";

const riskOptions = [
  { value: "all", label: "Tất cả cảnh báo" },
  { value: "1", label: "Cấp 1 - Mưa lớn" },
  { value: "2", label: "Cấp 2 - Rất lớn" },
  { value: "3", label: "Cấp 3 - Đặc biệt lớn" },
];

function Sidebar({
  isMobile,
  open,
  forecastTime,
  tinhOptions,
  loaiOptions,
  filterTinh,
  filterLoaiTram,
  riskFilter,
  stations,
  selectedTram,
  onToggle,
  onClose,
  onSelectTinh,
  onSelectLoaiTram,
  onSelectRisk,
  onResetFilters,
  onSelectTram,
}) {
  const sidebarStyle = {
    width: isMobile ? "80%" : 350,
    maxWidth: 600,
    minWidth: 250,
    height: "100vh",
    overflowY: "auto",
    background: "#fff",
    padding: "1rem",
    position: isMobile ? "fixed" : "relative",
    top: 0,
    left: open ? 0 : isMobile ? "-100%" : 0,
    transition: "all 0.3s",
    zIndex: 2000,
    boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
  };

  const backdropStyle = {
    display: open && isMobile ? "block" : "none",
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.4)",
    zIndex: 1000,
  };

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />

      <div style={sidebarStyle}>
        <h2 style={{ textAlign: "center", margin: 0, color: "#003366" }}>
          BẢN ĐỒ MƯA DỰ BÁO 1H TRONG 15 NGÀY
        </h2>

        {forecastTime.start && forecastTime.end && (
          <p style={{ textAlign: "center", fontWeight: "bold" }}>
            Thời gian dự báo: {forecastTime.start} - {forecastTime.end}
          </p>
        )}

        <p style={{ textAlign: "center", fontSize: "0.9rem", color: "#555" }}>
          Nguồn: Mô hình mưa dự báo toàn cầu GFS -{" "}
          <a href="https://nomads.ncep.noaa.gov" target="_blank" rel="noopener noreferrer">
            https://nomads.ncep.noaa.gov
          </a>
        </p>

        <h4>Lọc trạm:</h4>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <select value={filterTinh} onChange={(event) => onSelectTinh(event.target.value)}>
            {tinhOptions.map((tinh) => (
              <option key={tinh} value={tinh}>
                {tinh}
              </option>
            ))}
          </select>

          <select
            value={filterLoaiTram}
            onChange={(event) => onSelectLoaiTram(event.target.value)}
          >
            {loaiOptions.map((loai) => (
              <option key={loai} value={loai}>
                {loai}
              </option>
            ))}
          </select>

          <select value={riskFilter} onChange={(event) => onSelectRisk(event.target.value)}>
            {riskOptions.map((risk) => (
              <option key={risk.value} value={risk.value}>
                {risk.label}
              </option>
            ))}
          </select>

          <button onClick={onResetFilters}>Reset</button>
        </div>

        <h4>Danh sách trạm:</h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th>Tỉnh</th>
              <th>Tên trạm</th>
              <th>Loại</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => (
              <tr
                key={getStationKey(station)}
                onClick={() => onSelectTram(station)}
                style={{
                  background:
                    isSameStation(selectedTram, station) ? "#ffff99" : "transparent",
                  cursor: "pointer",
                  fontSize: "0.90rem",
                }}
              >
                <td>{station.Tinh}</td>
                <td>{station.TenTram}</td>
                <td>{station.LoaiTram}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!open && isMobile && (
        <button
          onClick={onToggle}
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 3000,
            background: "#fff",
            border: "1px solid #ccc",
            padding: "6px 10px",
            borderRadius: 4,
          }}
        >
          ☰
        </button>
      )}
    </>
  );
}

export default memo(Sidebar);
