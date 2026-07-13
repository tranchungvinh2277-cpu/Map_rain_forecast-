// src/components/MapLegend.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRiskLegend } from "../utils/utils";

const MapLegend = ({ visible = true }) => {
    const [collapsed, setCollapsed] = useState(false); // state thu nhỏ
    const legend = getRiskLegend();

    if (!visible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            style={{
                position: "absolute",
                bottom: 20,
                right: 20,
                background: "rgba(255, 255, 255, 0.95)",
                padding: collapsed ? "5px" : "10px 15px",
                borderRadius: "8px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                fontSize: "0.9rem",
                zIndex: 1000,
                width: collapsed ? "40px" : "200px",
                overflow: "hidden",
            }}
        >
            {/* Nút thu nhỏ */}
            <div
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#eee",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    userSelect: "none",
                }}
                title={collapsed ? "Mở rộng" : "Thu nhỏ"}
            >
                {collapsed ? "▶" : "◀"}
            </div>

            {/* Nội dung chỉ hiện khi không collapsed */}
            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h4
                            style={{
                                margin: "0 0 8px 0",
                                fontSize: "1rem",
                                textAlign: "center",
                            }}
                        >
                            Cảnh báo mưa
                        </h4>
                        {legend.map((item, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: 4,
                                }}
                                title={item.label}
                            >
                                <div
                                    style={{
                                        width: 0,
                                        height: 0,
                                        borderLeft: "8px solid transparent",
                                        borderRight: "8px solid transparent",
                                        borderBottom: `16px solid ${item.color}`,
                                        marginRight: 8,
                                    }}
                                />
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MapLegend;
