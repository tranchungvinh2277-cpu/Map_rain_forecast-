import React from "react";

const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 5000,
};

const modalContentStyle = {
  background: "#fff",
  padding: "10px",
  borderRadius: "10px",
  textAlign: "center",
  maxWidth: "600px",
  width: "90%",
};

export default function ModalNotice({ show, onAgree }) {
  if (!show) return null;
  return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        <h3>Thông báo</h3>
        <img
          src="/Upload/Luu_y.jpg"
          alt="Lưu ý"
          style={{ width: "100%", height: "auto", marginBottom: "10px" }}
        />
        <p>Vui lòng đọc kỹ lưu ý trước khi truy cập bản đồ.</p>
        <button onClick={onAgree} style={{ marginTop: "10px", padding: "5px 15px" }}>
          Đồng ý
        </button>
      </div>
    </div>
  );
}
