import L from "leaflet";

// Icon tam giác
export const triangleIcon = L.icon({
    iconUrl: "/icons/triangle.png",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// Icon nổi bật khi chọn trạm
export const highlightIcon = L.icon({
    iconUrl: "/icons/highlight.png",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// Icon mặc định
export const normalIcon = L.icon({
    iconUrl: "/icons/marker.png",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// Icon chữ label
export const labelIcon = (text) =>
    L.divIcon({
        className: "label-icon",
        html: `<div style="
      background:white;
      padding:2px;
      border:1px solid black;
      font-size:10px;
      white-space:nowrap;
    ">${text}</div>`,
        iconSize: [50, 20],
        iconAnchor: [25, 10],
    });

// Marker icon đổi màu
export const getMarkerIcon = (color) =>
    L.divIcon({
        className: "custom-marker",
        html: `<div style="
      background:${color};
      width:16px;
      height:16px;
      border-radius:50%;
      border:2px solid white;
      box-shadow:0 0 3px rgba(0,0,0,0.5);
    "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });
export function getRiskColor(riskLevel) {
    switch (riskLevel) {
        case 1:
            return "yellow";  // Cảnh báo cấp 1
        case 2:
            return "orange";  // Cảnh báo cấp 2
        case 3:
            return "red";     // Cảnh báo cấp 3
        default:
            return "blue";    // Không cảnh báo
    }
}