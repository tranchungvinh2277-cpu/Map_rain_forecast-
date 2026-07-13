import React, { useState, useEffect } from "react";

export default function Sidebar({
  tramList,
  selectedTinh,
  setSelectedTinh,
  selectedLoaiTram,
  setSelectedLoaiTram,
  setSelectedTram,
  mergedData
}) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [forecastTime, setForecastTime] = useState({ start: "", end: "" });

    // Xử lý responsive
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  //================ Lấy dữ liệu dự báo từ MergedData.json ========== //
useEffect(() => {
  fetch("/mergedData.json")
    .then((res) => res.json())
    .then((data) => {
      // Vì mergedData.json là 1 mảng => tìm trạm 48899, Thủ dầu 1
      const stationData = data.find((st) => st.MaTram === "48899");

      if (stationData && stationData.forecast?.length > 0) {
        // Lấy danh sách thời gian từ forecast
        const times = stationData.forecast.map(f => f.time);
        const startDate = new Date(times[0]).toLocaleDateString("vi-VN");
        const endDate = new Date(times[times.length - 1]).toLocaleDateString("vi-VN");

        setForecastTime({ start: startDate, end: endDate });
      }
    })
    .catch((err) => console.error("Lỗi khi đọc mergedData.json:", err));
}, []);


  const tinhList = [...new Set(tramList.map(t => t.Tinh))];
  const loaiTramList = [...new Set(tramList.map(t => t.LoaiTram))];

  const filteredTrams = tramList
    .filter(t =>
      (!selectedTinh || t.Tinh === selectedTinh) &&
      (!selectedLoaiTram || t.LoaiTram === selectedLoaiTram) &&
      (!search || t.TenTram.toLowerCase().includes(search.toLowerCase()))
    );

  const content = (
    <div style={{ padding: "10px" }}>
      <h3>Lọc dữ liệu</h3>
      <div style={{ marginBottom: "10px" }}>
        <label>Tỉnh:</label>
        <select
          value={selectedTinh}
          onChange={e => setSelectedTinh(e.target.value)}
          style={{ width: "100%", marginBottom: "5px" }}
        >
          <option value="">-- Chọn Tỉnh --</option>
          {tinhList.map(tinh => (
            <option key={tinh}>{tinh}</option>
          ))}
        </select>

        <label>Loại Trạm:</label>
        <select
          value={selectedLoaiTram}
          onChange={e => setSelectedLoaiTram(e.target.value)}
          style={{ width: "100%" }}
        >
          <option value="">-- Loại Trạm --</option>
          {loaiTramList.map(loai => (
            <option key={loai}>{loai}</option>
          ))}
        </select>
      </div>

      <input
        type="text"
        placeholder="Tìm tên trạm..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "5px",
          marginBottom: "10px",
          boxSizing: "border-box"
        }}
      />
      
      <h3>Danh sách trạm ({filteredTrams.length})</h3>
      <div style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#eee" }}>
              <th style={{ textAlign: "left", padding: "5px" }}>Tên trạm</th>
              <th style={{ textAlign: "left", padding: "5px" }}>Mã</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrams.map(tram => (
              <tr
                key={tram.MaTram}
                onClick={() => setSelectedTram(tram)}
                style={{ cursor: "pointer", borderBottom: "1px solid #ddd" }}
              >
                <td style={{ padding: "5px" }}>{tram.TenTram}</td>
                <td style={{ padding: "5px" }}>{tram.MaTram}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const sidebarStyle = {
    width: collapsed ? "40px" : "300px",
    transition: "transform 0.3s ease",
    height: "100vh",
    background: "#f9f9f9",
    overflow: "hidden",
    boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
    position: isMobile ? "fixed" : "relative",
    top: 0,
    left: 0,
    zIndex: 1100,
    transform: isMobile
      ? `translateX(${mobileOpen ? "0" : "-100%"})`
      : "translateX(0)"
  };

  const backdropStyle = {
    display: mobileOpen ? "block" : "none",
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.4)",
    zIndex: 1050,
    transition: "opacity 0.3s ease",
    opacity: mobileOpen ? 1 : 0
  };

  return (
    <>
      {isMobile && <div style={backdropStyle} onClick={() => setMobileOpen(false)} />}
      {isMobile && !mobileOpen && (
        <button
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 1110,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "5px",
            padding: "5px 10px",
            cursor: "pointer"
          }}
          onClick={() => setMobileOpen(true)}
        >
          ☰
        </button>
      )}

      <div style={sidebarStyle}>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              position: "absolute",
              top: 10,
              right: collapsed ? "-20px" : "-20px",
              width: "20px",
              height: "40px",
              cursor: "pointer",
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: "0 5px 5px 0",
              zIndex: 1001
            }}
          >
            {collapsed ? "→" : "←"}
          </button>
        )}

        {(!collapsed || isMobile) && content}
      </div>
    </>
  );
}
