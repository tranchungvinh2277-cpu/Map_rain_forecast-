// utils/utils.js
export function getRainSummary(maTram, mergedData, opts = {}) {
    const TH24 = opts.threshold24 ?? 50;
    const TH72 = opts.threshold72 ?? 100;
    const TH120 = opts.threshold120 ?? 50;
    const mode = opts.from ?? "start";

    const station = mergedData?.find((s) => s.MaTram === maTram);
    if (!station || !Array.isArray(station.forecast) || station.forecast.length === 0) {
        return makeResult(0, 0, 0, null);
    }

    const parseTime = (t) => {
        const d = new Date(t);
        return isNaN(d) ? new Date(String(t).replace(/-/g, "/")) : d;
    };

    const series = station.forecast
        .map((f) => ({ time: parseTime(f.time), value: Number(f.value) }))
        .filter((p) => !isNaN(p.time) && Number.isFinite(p.value))
        .sort((a, b) => a.time - b.time);

    if (series.length === 0) {
        return makeResult(0, 0, 0, null);
    }

    const now = new Date();
    let t0 = series[0].time;
    if (mode === "now") {
        const next = series.find((p) => p.time >= now);
        t0 = next ? next.time : series[0].time;
    }

    const sumInWindow = (hours) => {
        const tend = new Date(t0.getTime() + hours * 3600 * 1000);
        return series
            .filter((p) => p.time >= t0 && p.time < tend)
            .reduce((sum, p) => sum + p.value, 0);
    };

    const total24h = +sumInWindow(24).toFixed(1);
    const total72h = +sumInWindow(72).toFixed(1);
    const total120h = +sumInWindow(120).toFixed(1);

    // Tỷ lệ 120h/72h
    const ratio120_72 = total72h > 0 ? total120h / total72h : null;

    // Cảnh báo mưa lớn
    const warning24h = total24h >= TH24 ? "Cảnh báo mưa lớn 24h" : "";
    const warning72h = total72h >= TH72 ? "Cảnh báo mưa lớn 72h" : "";

    let warning120h = "";
    if (total120h >= TH120 && total120h > 50 && ratio120_72 !== null) {
        if (ratio120_72 >= 0.8) {
            warning120h = "Cảnh báo mưa lớn 120h";
        }
    }

    // Cấp độ rủi ro
    let riskLevel = 0;
    if (total24h > 200 || total72h > 300) riskLevel = 3;
    else if (total24h > 100 || total72h > 200) riskLevel = 2;
    else if (total24h > 50 || total72h > 100) riskLevel = 1;

    const riskInfo = getRiskInfo(riskLevel);

    return {
        total24h,
        total72h,
        total120h,
        ratio120_72,
        warning24h,
        warning72h,
        warning120h,
        riskLevel,
        riskLabel: riskInfo.label,
        riskColor: riskInfo.color,
        start: t0
    };
}

function makeResult(total24h, total72h, total120h, t0) {
    return {
        total24h,
        total72h,
        total120h,
        ratio120_72: null, // ✅ tránh lỗi no-undef
        warning24h: "",
        warning72h: "",
        warning120h: "",
        riskLevel: 0,
        riskLabel: "Không có dữ liệu",
        riskColor: "#808080",
        start: t0
    };
}

// ✅ Trả về màu sắc + nhãn theo cấp độ rủi ro
export function getRiskInfo(level) {
    const levels = [
        { level: 0, label: "An toàn", color: "#4CAF50" },
        { level: 1, label: "Cấp 1 - Mưa lớn", color: "#FFC107" },
        { level: 2, label: "Cấp 2 - Rất lớn", color: "#FF9800" },
        { level: 3, label: "Cấp 3 - Đặc biệt lớn", color: "#F44336" }
    ];
    return levels.find(l => l.level === level) || levels[0];
}

// ✅ Legend cho bản đồ
export function getRiskLegend() {
    return [
        { label: "An toàn", color: "#4CAF50" },
        { label: "Cấp 1 - Mưa lớn", color: "#FFC107" },
        { label: "Cấp 2 - Rất lớn", color: "#FF9800" },
        { label: "Cấp 3 - Đặc biệt lớn", color: "#F44336" }
    ];
}
