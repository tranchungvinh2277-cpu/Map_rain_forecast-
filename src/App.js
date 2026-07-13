import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// ==== Hàm tính tổng mưa và mức cảnh báo ====
function getRainSummary(maTram, mergedData, opts = {}) {
    const TH24 = opts.threshold24 ?? 50;
    const TH72 = opts.threshold72 ?? 100;

    const tramData = mergedData[maTram] || { total24h: 0, total72h: 0 };
    const total24h = tramData.total24h;
    const total72h = tramData.total72h;

    let warningLevel = "green"; // mặc định an toàn
    if (total72h >= TH72) warningLevel = "red";
    else if (total24h >= TH24) warningLevel = "yellow";

    return { total24h, total72h, warningLevel };
}

// ==== Icon đổi màu theo mức cảnh báo ====
function getMarkerIcon(color) {
    return L.divIcon({
        className: "custom-marker",
        html: `<div style="background-color:${color};width:20px;height:20px;border-radius:50%;border:2px solid white;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
}

// ==== Dữ liệu mẫu ====
const tramList = [
    { MaTram: "T1", TenTram: "Trạm 1", lat: 21.03, lon: 105.85 },
    { MaTram: "T2", TenTram: "Trạm 2", lat: 21.1, lon: 105.9 },
];

const mergedData = {
    T1: { total24h: 30, total72h: 80 },
    T2: { total24h: 60, total72h: 120 },
};

// ==== Component chính ====
export default function App() {
    return (
        <div className="App">
            <MapContainer center={[21.03, 105.85]} zoom={8} style={{ height: "100vh" }}>
                <TileLayer
                    attribution='&copy; <a href="https://osm.org/copyright">OSM</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {tramList.map((tram) => {
                    const { total24h, total72h, warningLevel } = getRainSummary(tram.MaTram, mergedData);
                    let color = warningLevel === "red" ? "red" : warningLevel === "yellow" ? "orange" : "green";

                    return (
                        <Marker
                            key={tram.MaTram}
                            position={[tram.lat, tram.lon]}
                            icon={getMarkerIcon(color)}
                        >
                            <Popup>
                                <b>{tram.TenTram}</b> <br />
                                24h: {total24h} mm <br />
                                72h: {total72h} mm <br />
                                Cảnh báo:{" "}
                                {warningLevel === "green"
                                    ? "An toàn"
                                    : warningLevel === "yellow"
                                        ? "Cảnh báo 24h"
                                        : "Cảnh báo 72h"}
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
