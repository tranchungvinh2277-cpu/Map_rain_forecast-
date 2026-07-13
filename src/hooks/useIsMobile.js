import { useState, useEffect } from "react";

/**
 * Hook kiểm tra thiết bị có phải mobile (màn hình nhỏ hơn breakpoint).
 * Tự động cập nhật khi resize hoặc xoay màn hình.
 *
 * @param {number} breakpoint - Ngưỡng px để coi là mobile (mặc định: 768)
 * @returns {boolean} true nếu là mobile
 */
export default function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

    useEffect(() => {
        const getIsMobile = () => window.innerWidth < breakpoint;
        const handleResize = () => {
            setIsMobile(getIsMobile());
        };

        // Lắng nghe cả resize và orientationchange (xoay màn hình)
        window.addEventListener("resize", handleResize);
        window.addEventListener("orientationchange", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("orientationchange", handleResize);
        };
    }, [breakpoint]);

    return isMobile;
}
