// utils/utils.js
// utils/utils.js

export function getRainSummary(
    maTram,
    mergedData,
    timeData,
    opts = {}
) {

    const TH24 = opts.threshold24 ?? 50;
    const TH72 = opts.threshold72 ?? 100;
    const TH120 = opts.threshold120 ?? 150;

    const mode = opts.from ?? "now";

    //--------------------------------------
    // đọc dữ liệu theo mã trạm
    //--------------------------------------

    const station = mergedData?.[maTram];

    if (!station) {

        return makeResult();

    }

    const forecast = station.forecast ?? [];

    const forecastTime = timeData?.forecast ?? [];

    if (
        forecast.length === 0 ||
        forecastTime.length === 0
    ) {
        return makeResult();
    }

    //--------------------------------------
    // Ghép time + value
    //--------------------------------------

    const series = forecast.map((v, i) => ({

        time: new Date(forecastTime[i]),

        value: Number(v) || 0

    }));

    //--------------------------------------
    // Chọn thời điểm bắt đầu
    //--------------------------------------

    let startIndex = 0;

    if (mode === "now") {

        const now = new Date();

        startIndex = series.findIndex(
            p => p.time >= now
        );

        if (startIndex < 0)
            startIndex = 0;

    }

    //--------------------------------------
    // Hàm tính tổng
    //--------------------------------------

    function sumHours(hours) {

        const end = startIndex + hours;

        let s = 0;

        for (
            let i = startIndex;
            i < Math.min(end, series.length);
            i++
        ) {

            s += series[i].value;

        }

        return Number(s.toFixed(1));

    }

    //--------------------------------------

    const total24h = sumHours(24);

    const total72h = sumHours(72);

    const total120h = sumHours(120);

    //--------------------------------------

    const ratio120_72 =
        total72h > 0
            ? total120h / total72h
            : null;

    //--------------------------------------

    let warning24h = "";

    if (total24h >= TH24)
        warning24h = "Cảnh báo mưa lớn 24h";

    let warning72h = "";

    if (total72h >= TH72)
        warning72h = "Cảnh báo mưa lớn 72h";

    let warning120h = "";

    if (
        total120h >= TH120 &&
        ratio120_72 >= 0.8
    ) {

        warning120h = "Cảnh báo mưa lớn 120h";

    }

    //--------------------------------------

    let riskLevel = 0;

    if (total24h > 200 || total72h > 300)
        riskLevel = 3;

    else if (total24h > 100 || total72h > 200)
        riskLevel = 2;

    else if (total24h > 50 || total72h > 100)
        riskLevel = 1;

    //--------------------------------------

    const risk = getRiskInfo(riskLevel);

    return {

        total24h,

        total72h,

        total120h,

        ratio120_72,

        warning24h,

        warning72h,

        warning120h,

        riskLevel,

        riskLabel: risk.label,

        riskColor: risk.color,

        start: series[startIndex].time

    };

}

function makeResult() {

    return {

        total24h: 0,

        total72h: 0,

        total120h: 0,

        ratio120_72: null,

        warning24h: "",

        warning72h: "",

        warning120h: "",

        riskLevel: 0,

        riskLabel: "Không có dữ liệu",

        riskColor: "#808080",

        start: null

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
