import React from "react";

export default function ModalAgree({ onAgree }) {
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(5px)",
                WebkitBackdropFilter: "blur(5px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
                padding: 20,
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 1000,
                    maxHeight: "92vh",
                    background: "#ffffff",
                    borderRadius: 18,
                    overflow: "hidden",
                    boxShadow: "0 20px 60px rgba(0,0,0,.45)",
                    animation: "modalAppear .25s ease-out",
                }}
            >
                {/* Nội dung có thể cuộn nếu màn hình thấp */}
                <div
                    style={{
                        overflowY: "auto",
                        maxHeight: "92vh",
                        padding: 20,
                        textAlign: "center",
                    }}
                >
                    {/* Poster */}
                    <div
                        style={{
                            position: "relative",
                            display: "inline-block",
                            width: "100%",
                        }}
                    >
                        <img
                            src="/Upload/Luu_y.png"
                            alt="Lưu ý"
                            style={{
                                width: "100%",
                                display: "block",
                                borderRadius: 12,
                                border: "1px solid #d8d8d8",
                            }}
                        />

                        {/* Nút sẽ đặt ở đây */}

                    </div>

                    {/* Khoảng cách rất nhỏ để nút như là một phần của poster */}
                    <div style={{ height: 12 }} />

                    {/* Nút Đồng ý */}
                    <button
                        onClick={onAgree}
                        style={{
                            position: "absolute",

                            bottom: "12px",

                            left: "50%",
                            transform: "translateX(-50%)",

                            width: 340,
                            height: 66,

                            border: "none",
                            borderRadius: 12,

                            background:
                                "linear-gradient(to bottom,#22d96b,#14a84d)",

                            color: "#fff",

                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",

                            gap: 15,

                            cursor: "pointer",

                            boxShadow: "0 8px 20px rgba(0,0,0,.35)",

                            transition: ".2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform =
                                "translateX(-50%) scale(1.03)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform =
                                "translateX(-50%) scale(1)";
                        }}
                    >
                        <div
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: "50%",
                                background: "#fff",

                                color: "#18a54b",

                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",

                                fontWeight: "bold",
                                fontSize: 28,
                            }}
                        >
                            ✓
                        </div>

                        <div
                            style={{
                                textAlign: "left",
                                lineHeight: 1.1,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 16,
                                    fontWeight: 800,
                                }}
                            >
                                ĐỒNG Ý
                            </div>

                            <div
                                style={{
                                    fontSize: 12,
                                }}
                            >
                                VÀ TRUY CẬP HỆ THỐNG
                            </div>
                        </div>
                    </button>

                    {/* Dòng nhỏ phía dưới */}
                    <div
                        style={{
                            marginTop: 1,
                            fontSize: 12,
                            color: "#666",
                        }}
                    >
                    </div>
                </div>
            </div>

            {/* Animation */}
            <style>{`
        @keyframes modalAppear{
          from{
            transform:scale(.94);
            opacity:0;
          }
          to{
            transform:scale(1);
            opacity:1;
          }
        }

        @media (max-width:768px){

          button{
            width:95% !important;
            height:70px !important;
          }

          button div:first-child{
            width:46px !important;
            height:46px !important;
            font-size:26px !important;
          }

          button div:nth-child(2) div:first-child{
            font-size:24px !important;
          }

          button div:nth-child(2) div:last-child{
            font-size:14px !important;
          }

        }

      `}</style>
        </div>
    );
}