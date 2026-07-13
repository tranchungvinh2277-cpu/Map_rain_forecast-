import L from "leaflet";

// Icon tam giác
export const triangleIcon = L.icon({
  iconUrl: "/icons/triangle.png", // Thay bằng icon thật
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Icon nổi bật khi chọn trạm
export const highlightIcon = L.icon({
  iconUrl: "/icons/highlight.png", // Thay bằng icon vàng/đỏ
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Icon mặc định
export const normalIcon = L.icon({
  iconUrl: "/icons/marker.png", // Icon mặc định
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Icon chữ label
export const labelIcon = (text) =>
  L.divIcon({
    className: "label-icon",
    html: `<div style="background:white;padding:2px;border:1px solid black;font-size:10px;white-space:nowrap">${text}</div>`,
    iconSize: [50, 20],
    iconAnchor: [25, 10],
  });
