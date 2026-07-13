import React from "react";

export default function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "white",
        border: "1px solid #ccc",
        padding: "5px",
        fontSize: "12px"
      }}>
        <p><strong>{label}</strong></p>
        {payload.map((item, index) => (
          <p key={index} style={{ color: item.fill, margin: 0 }}>
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}
