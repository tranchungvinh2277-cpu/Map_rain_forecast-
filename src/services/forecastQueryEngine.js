// ============================================================
// FORECAST QUERY ENGINE
// Parse Vietnamese rainfall forecast questions
// and execute real GFS forecast services.
// ============================================================

import {
    getForecastInfo,
    summarizeForecast,
    getForecastPeriod,
    getNearestStation,
    getHeavyRainfallStations,
    searchStations,
    getPeakForecast,
    getForecastTotal,
    getAreaForecast,
    getAreaForecastAroundLocation,
} from "./forecastRainfallService";

const DEFAULT_HOURS = 24;
// ============================================================
// NORMALIZE VIETNAMESE
// ============================================================

function normalizeVietnamese(text = "") {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/\s+/g, " ")
        .trim();
}


// ============================================================
// INTENT DETECTION
// ============================================================

function detectIntent(question) {

    const q = normalizeVietnamese(question);
    

    // ========================================================
    // AREA
    // Phải kiểm tra TRƯỚC HEAVY_RAIN
    // ========================================================

    const isAreaQuestion =
        q.includes("khu vuc") ||
        q.includes("khu vuc nay") ||
        q.includes("toan tinh") ||
        q.includes("trong tinh") ||
        q.includes("tren dia ban") ||
        q.includes("tinh nao") ||
        q.includes("dia ban") ||
        q.includes("vung nay") ||
        q.includes("khu nay") ||
        q.includes("toan bo tinh");


    if (isAreaQuestion) {
        return "AREA";
    }


    // ========================================================
    // HEAVY RAIN
    // ========================================================

    if (
        q.includes("mua lon") ||
        q.includes("mua manh") ||
        q.includes("mua rat lon") ||
        q.includes("mua nhieu") ||
        q.includes("mua bao") ||
        q.includes("nguy co mua lon") ||
        q.includes("tram nao mua lon") ||
        q.includes("o dau mua lon")
    ) {
        return "HEAVY_RAIN";
    }


    // ========================================================
    // PEAK
    // ========================================================

    if (
        q.includes("mua lon nhat") ||
        q.includes("luong mua lon nhat") ||
        q.includes("dinh mua") ||
        q.includes("thoi diem mua lon nhat") ||
        q.includes("luc nao mua lon nhat")
    ) {
        return "PEAK";
    }


    // ========================================================
    // TOTAL
    // ========================================================

    if (
        q.includes("tong luong mua") ||
        q.includes("tong mua") ||
        q.includes("mua bao nhieu") ||
        q.includes("luong mua bao nhieu")
    ) {
        return "TOTAL";
    }


    // ========================================================
    // PERIOD
    // ========================================================

    if (
        q.includes("dien bien") ||
        q.includes("theo gio") ||
        q.includes("tung gio") ||
        q.includes("tung buoc") ||
        q.includes("72 gio") ||
        q.includes("3 ngay") ||
        q.includes("5 ngay")
    ) {
        return "PERIOD";
    }


    // ========================================================
    // DEFAULT
    // ========================================================

    return "SUMMARY";
}

// ============================================================
// EXTRACT HOURS
// ============================================================

function extractHours(question) {

    const q = normalizeVietnamese(question);


    // 5 ngày
    if (
        q.includes("5 ngay") ||
        q.includes("120 gio") ||
        q.includes("120h")
    ) {
        return 120;
    }


    // 3 ngày
    if (
        q.includes("3 ngay") ||
        q.includes("72 gio") ||
        q.includes("72h") ||
        q.includes("72 h")
    ) {
        return 72;
    }


    // 2 ngày
    if (
        q.includes("2 ngay") ||
        q.includes("48 gio") ||
        q.includes("48h") ||
        q.includes("48 h")
    ) {
        return 48;
    }


    // 24 giờ
    if (
        q.includes("24 gio") ||
        q.includes("24h") ||
        q.includes("24 h") ||
        q.includes("1 ngay")
    ) {
        return 24;
    }


    // 12 giờ
    if (
        q.includes("12 gio") ||
        q.includes("12h") ||
        q.includes("12 h")
    ) {
        return 12;
    }


    // 6 giờ
    if (
        q.includes("6 gio") ||
        q.includes("6h") ||
        q.includes("6 h")
    ) {
        return 6;
    }


    return DEFAULT_HOURS;
}


// ============================================================
// EXTRACT RAINFALL THRESHOLD
// ============================================================

function extractThreshold(question) {

    const q = normalizeVietnamese(question);

    const patterns = [
        /tren\s+(\d+(?:\.\d+)?)\s*mm/,
        /hon\s+(\d+(?:\.\d+)?)\s*mm/,
        /tu\s+(\d+(?:\.\d+)?)\s*mm/,
        /(\d+(?:\.\d+)?)\s*mm/,
    ];


    for (const pattern of patterns) {

        const match = q.match(pattern);

        if (match) {
            return Number(match[1]);
        }
    }


    return null;
}


// ============================================================
// EXTRACT STATION CODE
// ============================================================

function extractStationCode(question) {

    const match = question.match(
        /\b(\d{5,6})\b/
    );

    return match
        ? match[1]
        : null;
}


// ============================================================
// EXTRACT PROVINCE
// ============================================================

function extractProvince(question, mapContext = {}) {

    const q = normalizeVietnamese(question);

    // ======================================================
    // TÊN NGƯỜI DÙNG CÓ THỂ GỌI
    // → TÊN TỈNH THỰC TẾ TRONG tramList.json
    // ======================================================

    const provinceAliases = [

        { aliases: ["an giang"], province: "An Giang" },
        { aliases: ["bac ninh"], province: "Bắc Ninh" },
        { aliases: ["bac giang"], province: "Bắc Giang" },
        { aliases: ["bac kan", "bac can"], province: "Bắc Kạn" },
        { aliases: ["bac lieu"], province: "Bạc Liêu" },
        { aliases: ["ben tre"], province: "Bến Tre" },
        { aliases: ["binh duong"], province: "Bình Dương" },
        { aliases: ["binh dinh"], province: "Bình Định" },
        { aliases: ["binh phuoc"], province: "Bình Phước" },
        { aliases: ["binh thuan"], province: "Bình Thuận" },
        { aliases: ["ca mau"], province: "Cà Mau" },
        { aliases: ["can tho"], province: "Cần Thơ" },
        { aliases: ["cao bang"], province: "Cao Bằng" },
        { aliases: ["da nang"], province: "Đà Nẵng" },
        { aliases: ["dak lak", "dac lac"], province: "Đắk Lắk" },
        { aliases: ["dak nong"], province: "Đắk Nông" },
        { aliases: ["dien bien"], province: "Điện Biên" },
        { aliases: ["dong nai"], province: "Đồng Nai" },
        { aliases: ["dong thap"], province: "Đồng Tháp" },
        { aliases: ["gia lai"], province: "Gia Lai" },
        { aliases: ["ha giang"], province: "Hà Giang" },
        { aliases: ["ha nam"], province: "Hà Nam" },

        // ⭐ QUAN TRỌNG
        {
            aliases: [
                "ha noi",
                "thu do ha noi",
                "hanoi"
            ],
            province: "Thủ đô Hà Nội"
        },

        { aliases: ["ha tinh"], province: "Hà Tĩnh" },
        { aliases: ["hai duong"], province: "Hải Dương" },
        { aliases: ["hai phong"], province: "Hải Phòng" },
        { aliases: ["hau giang"], province: "Hậu Giang" },
        { aliases: ["hoa binh"], province: "Hòa Bình" },
        { aliases: ["hung yen"], province: "Hưng Yên" },
        { aliases: ["khanh hoa"], province: "Khánh Hòa" },
        { aliases: ["kien giang"], province: "Kiên Giang" },
        { aliases: ["kon tum"], province: "Kon Tum" },
        { aliases: ["lai chau"], province: "Lai Châu" },
        { aliases: ["lam dong"], province: "Lâm Đồng" },
        { aliases: ["lang son"], province: "Lạng Sơn" },
        { aliases: ["lao cai"], province: "Lào Cai" },
        { aliases: ["long an"], province: "Long An" },
        { aliases: ["nam dinh"], province: "Nam Định" },
        { aliases: ["nghe an"], province: "Nghệ An" },
        { aliases: ["ninh binh"], province: "Ninh Bình" },
        { aliases: ["ninh thuan"], province: "Ninh Thuận" },
        { aliases: ["phu tho"], province: "Phú Thọ" },
        { aliases: ["phu yen"], province: "Phú Yên" },
        { aliases: ["quang binh"], province: "Quảng Bình" },
        { aliases: ["quang nam"], province: "Quảng Nam" },
        { aliases: ["quang ngai"], province: "Quảng Ngãi" },
        { aliases: ["quang ninh"], province: "Quảng Ninh" },
        { aliases: ["quang tri"], province: "Quảng Trị" },
        { aliases: ["soc trang"], province: "Sóc Trăng" },
        { aliases: ["son la"], province: "Sơn La" },
        { aliases: ["tay ninh"], province: "Tây Ninh" },
        { aliases: ["thai binh"], province: "Thái Bình" },
        { aliases: ["thai nguyen"], province: "Thái Nguyên" },
        { aliases: ["thanh hoa"], province: "Thanh Hóa" },
        {
            aliases: [
                "thua thien hue",
                "hue"
            ],
            province: "Thừa Thiên Huế"
        },
        { aliases: ["tien giang"], province: "Tiền Giang" },
        { aliases: ["tra vinh"], province: "Trà Vinh" },
        { aliases: ["tuyen quang"], province: "Tuyên Quang" },
        { aliases: ["vinh long"], province: "Vĩnh Long" },
        { aliases: ["vinh phuc"], province: "Vĩnh Phúc" },
        { aliases: ["yen bai"], province: "Yên Bái" },
        { aliases: ["ho chi minh", "tphcm", "tp hcm"], province: "Hồ Chí Minh" },
        {
            aliases: [
                "ba ria vung tau",
                "ba ria - vung tau"
            ],
            province: "Bà Rịa - Vũng Tàu"
        }
    ];

    // ======================================================
    // 1. ƯU TIÊN TỈNH ĐƯỢC NÓI TRỰC TIẾP TRONG CÂU HỎI
    // ======================================================

    for (const item of provinceAliases) {

        for (const alias of item.aliases) {

            if (
                q.includes(
                    normalizeVietnamese(alias)
                )
            ) {
                return item.province;
            }
        }
    }

    // ======================================================
    // 2. NẾU KHÔNG NÓI TỈNH → DÙNG TỈNH ĐANG ĐƯỢC CHỌN
    // ======================================================

    const selectedProvince =
        mapContext?.selectedProvince;

    if (
        selectedProvince &&
        normalizeVietnamese(selectedProvince) !== "tat ca"
    ) {
        return selectedProvince;
    }

    return null;
}


// ============================================================
// FIND STATION
// ============================================================

async function resolveStation(question, mapContext = {}) {

    // --------------------------------------------------------
    // 1. Selected station on map
    // --------------------------------------------------------

    const selectedStation =
        mapContext?.selectedStation;


    if (
        selectedStation &&
        typeof selectedStation === "object" &&
        selectedStation.MaTram
    ) {

        return selectedStation;
    }


    // --------------------------------------------------------
    // 2. Station code in question
    // --------------------------------------------------------

    const code =
        extractStationCode(question);


    if (code) {

        const result =
            await searchStations(code, {
                limit: 10,
            });


        if (result?.length) {

            return result.find(
                station =>
                    String(station.MaTram) === String(code)
            ) || result[0];
        }
    }


    // --------------------------------------------------------
    // 3. Station name in question
    // --------------------------------------------------------

    const result =
        await searchStations(question, {
            limit: 10,
        });


    if (result?.length) {
        return result[0];
    }


    // --------------------------------------------------------
    // 4. Location on map
    // --------------------------------------------------------

    if (
        typeof mapContext?.lat === "number" &&
        typeof mapContext?.lon === "number"
    ) {

        const nearest =
            await getNearestStation(
                mapContext.lat,
                mapContext.lon
            );

        return nearest;
    }


    return null;
}


// ============================================================
// EXECUTE SUMMARY
// ============================================================

async function executeSummary(
    station,
    hours
) {

    if (!station?.MaTram) {
        return null;
    }


    return await summarizeForecast(
        station.MaTram,
        {
            hours,
        }
    );
}


// ============================================================
// EXECUTE TOTAL
// ============================================================

async function executeTotal(
    station,
    hours
) {

    if (!station?.MaTram) {
        return null;
    }


    const total =
        await getForecastTotal(
            station.MaTram,
            hours
        );


    return {
        station,
        hours,
        total,
    };
}


// ============================================================
// EXECUTE PEAK
// ============================================================

async function executePeak(
    station,
    hours
) {

    if (!station?.MaTram) {
        return null;
    }


    const peak =
        await getPeakForecast(
            station.MaTram,
            {
                hours,
            }
        );


    return {
        station,
        hours,
        peak,
    };
}


// ============================================================
// EXECUTE PERIOD
// ============================================================

async function executePeriod(
    station,
    hours
) {

    if (!station?.MaTram) {
        return null;
    }


    const period =
        await getForecastPeriod(
            station.MaTram,
            {
                hours,
            }
        );


    return {
        station,
        hours,
        period,
    };
}


// ============================================================
// EXECUTE AREA
// ============================================================

async function executeArea(
    province,
    hours,
    threshold
) {

    if (!province)
        return null;

    const area =
        await getAreaForecast(
            province,
            {
                hours,
                threshold
            }
        );

    if (!area) {
        return {
            success: false,
            message:
                `Chưa có dữ liệu dự báo GFS cho ${province}.`
        };
    }

    return {

        province,

        hours,

        threshold,

        ...area,

    };
}

// ==========================================================
// EXECUTE AREA AROUND LOCATION
// ==========================================================

async function executeAreaAroundLocation(
    lat,
    lon,
    hours = DEFAULT_HOURS,
    threshold = 50,
    selectedStation = null
) {

    const data =
        await getAreaForecastAroundLocation(
            lat,
            lon,
            {
                hours,
                radiusKm: 50,
                threshold,
            }
        );


    if (!data) {

        return {

            success: false,

            message:
                "Không tìm thấy dữ liệu dự báo GFS quanh vị trí này.",

        };

    }


    return data;
}

// ============================================================
// EXECUTE HEAVY RAIN
// ============================================================

async function executeHeavyRain(
    hours,
    threshold
) {

    const stations =
        await getHeavyRainfallStations({
            hours,
            threshold,
        });


    return {
        hours,
        threshold,
        stations,
    };
}


// ============================================================
// MAIN QUERY ENGINE
// ============================================================

export async function queryForecast(
    question,
    mapContext = {}
) {

    if (!question?.trim()) {

        return {
            success: false,
            error: "EMPTY_QUESTION",
            message:
                "Bạn chưa nhập câu hỏi.",
        };
    }


    // ========================================================
    // PARSE QUESTION
    // ========================================================

    const intent =
        detectIntent(question);


    const hours =
        extractHours(question);


    const extractedThreshold =
        extractThreshold(question);

    const threshold =
        extractedThreshold != null
            ? extractedThreshold
            : 50;


    // ========================================================
    // XÁC ĐỊNH TỈNH
    // ========================================================
    // extractProvince() là async
    // nên PHẢI có await
    // ========================================================

    const province =
        await extractProvince(
            question,
            mapContext
        );


    // ========================================================
    // TRẠM ĐANG ĐƯỢC CHỌN
    // ========================================================

    const selectedStation =
        mapContext?.selectedStation;


    // ========================================================
    // NẾU CÓ TỈNH HOẶC TRẠM → AREA
    // ========================================================

    const effectiveIntent =
        (
            province ||
            (
                selectedStation &&
                typeof selectedStation === "object" &&
                selectedStation.Lat != null &&
                selectedStation.Lon != null
            )
        )
            ? "AREA"
            : intent;


    // ========================================================
    // CHỈ TÌM TRẠM CHO CÂU HỎI KHÔNG PHẢI AREA
    // ========================================================

    let station = null;

    if (effectiveIntent !== "AREA") {

        station =
            await resolveStation(
                question,
                mapContext
            );
    }


    // ========================================================
    // RESULT BASE
    // ========================================================

    const base = {

        success: true,

        source: "GFS",

        model: "GFS",

        question,

        intent: effectiveIntent,

        hours,

        threshold,

        station,

        province,

        timestamp:
            new Date().toISOString(),
    };


    // ========================================================
    // HEAVY RAIN
    // ========================================================

    if (effectiveIntent === "HEAVY_RAIN") {

        const result =
            await executeHeavyRain(
                hours,
                threshold
            );


        return {
            ...base,
            ...result,
        };
    }


    // ========================================================
    // AREA
    // ========================================================

    if (effectiveIntent === "AREA") {

        // ================================================
        // A. CÓ TỈNH → TOÀN BỘ TRẠM TRONG TỈNH
        // ================================================

        if (province) {

            const data =
                await executeArea(
                    province,
                    hours,
                    threshold
                );

            return {
                ...base,
                areaType: "PROVINCE",
                data: {
                    ...data,
                    province,
                },
            };
        }


        // ================================================
        // B. KHÔNG CÓ TỈNH → KHU VỰC QUANH TRẠM ĐANG XEM
        // ================================================

        if (
            selectedStation &&
            typeof selectedStation === "object" &&
            selectedStation.Lat != null &&
            selectedStation.Lon != null
        ) {

            const data =
                await executeAreaAroundLocation(
                    Number(selectedStation.Lat),
                    Number(selectedStation.Lon),
                    hours,
                    threshold,
                    selectedStation
                );

            return {
                ...base,
                areaType: "AROUND_SELECTED_LOCATION",
                data: {
                    ...data,
                    selectedStation: {
                        MaTram: selectedStation.MaTram,
                        TenTram: selectedStation.TenTram,
                    },
                },
            };
        }


        // ================================================
        // C. KHÔNG CÓ TRẠM → DÙNG TỌA ĐỘ BẢN ĐỒ
        // ================================================

        if (
            mapContext?.lat != null &&
            mapContext?.lon != null
        ) {

            const data =
                await executeAreaAroundLocation(
                    Number(mapContext.lat),
                    Number(mapContext.lon),
                    hours,
                    threshold
                );

            return {
                ...base,
                areaType: "AROUND_MAP_LOCATION",
                data,
            };
        }


        return {
            ...base,
            success: false,
            error: "AREA_NOT_FOUND",
            message:
                "Chưa xác định được khu vực cần phân tích.",
        };
    }


    // ========================================================
    // NO STATION
    // ========================================================

    if (!station) {

        return {

            ...base,

            success: false,

            error:
                "STATION_NOT_FOUND",

            message:
                "Chưa xác định được trạm hoặc vị trí cần phân tích.",

        };

    }


    // ========================================================
    // TOTAL
    // ========================================================

    if (effectiveIntent === "TOTAL") {

        const result =
            await executeTotal(
                station,
                hours
            );


        return {

            ...base,

            ...result,

        };

    }


    // ========================================================
    // PEAK
    // ========================================================

    if (effectiveIntent === "PEAK") {

        const result =
            await executePeak(
                station,
                hours
            );


        return {

            ...base,

            ...result,

        };

    }


    // ========================================================
    // PERIOD
    // ========================================================

    if (effectiveIntent === "PERIOD") {

        const result =
            await executePeriod(
                station,
                hours
            );


        return {

            ...base,

            ...result,

        };

    }


    // ========================================================
    // SUMMARY
    // ========================================================

    const result =
        await executeSummary(
            station,
            hours
        );


    return {

        ...base,

        summary: result,

    };
}


// ============================================================
// FORMAT RESULT FOR AI CHAT
// ============================================================

export function formatForecastAnswer(
    result
) {

    if (!result) {

        return (
            "Không có dữ liệu dự báo GFS."
        );
    }


    if (!result.success) {

        return result.message ||
            "Không thể xác định dữ liệu cần phân tích.";
    }


    // ========================================================
    // HEAVY RAIN
    // ========================================================

    if (
        result.intent === "HEAVY_RAIN"
    ) {

        const stations =
            result.stations || [];


        if (!stations.length) {

            return (
                `Trong ${result.hours} giờ tới, ` +
                `chưa phát hiện trạm nào có lượng mưa ` +
                `vượt ngưỡng yêu cầu.`
            );
        }


        const thresholdText =
            result.threshold != null
                ? ` trên ${result.threshold} mm`
                : "";


        return (
            `Trong ${result.hours} giờ tới, ` +
            `có ${stations.length} trạm dự báo mưa lớn${thresholdText}.`
        );
    }


    // ========================================================
    // AREA
    // ========================================================

    if (result.intent === "AREA") {

        const data =
            result.data;


        if (!data) {

            return (
                "Không có dữ liệu dự báo GFS " +
                "cho khu vực cần phân tích."
            );

        }


        // ======================================================
        // KHU VỰC QUANH VỊ TRÍ ĐANG XEM
        // ======================================================

        if (
            data.type ===
            "AREA_AROUND_LOCATION"
        ) {

            const stationCount =
                data.numberOfStations ?? 0;

            const radiusKm =
                data.radiusKm ?? 50;

            // Ngưỡng mưa cảnh báo, đơn vị mm
            const threshold =
                data.threshold ?? 50;

            const areaMean =
                data.areaMean ?? 0;

            const areaMax =
                data.areaMax ?? 0;

            const maxStation =
                data.maxStation;

            const stationsAboveThreshold =
                data.stationsAboveThreshold ?? 0;

            const percentageAboveThreshold =
                data.percentageAboveThreshold ?? 0;

            const stationName =
                result.data?.selectedStation?.TenTram ||
                "đang xem";


            // ------------------------------------------------------
            // KHÔNG CÓ TRẠM TRONG KHU VỰC
            // ------------------------------------------------------

            if (!stationCount) {

                return (
                    `Trong ${result.hours} giờ tới, ` +
                    `chưa có trạm GFS nào trong ` +
                    `bán kính ${radiusKm} km ` +
                    `quanh trạm ${stationName}.`
                );

            }


            // ------------------------------------------------------
            // CÓ DỮ LIỆU
            // ------------------------------------------------------

            return (
                `Dự báo GFS ${result.hours} giờ tới ` +
                `tại khu vực lân cận trạm ${stationName} ` +
                `(bán kính ${radiusKm} km):\n\n` +

                `• Số trạm phân tích: ` +
                `${stationCount}\n` +

                `• Mưa trung bình: ` +
                `${areaMean.toFixed(2)} mm\n` +

                `• Mưa lớn nhất: ` +
                `${areaMax.toFixed(2)} mm\n` +

                `• Trạm lớn nhất: ` +
                `${maxStation?.TenTram || "Không xác định"}` +

                `${
                    maxStation?.MaTram
                        ? ` (${maxStation.MaTram})`
                        : ""
                }\n` +

                `• Trạm ≥ ${threshold} mm: ` +
                `${stationsAboveThreshold}/${stationCount} ` +
                `(${percentageAboveThreshold.toFixed(0)}%)\n\n` +

                `Đánh giá: ` +
                `${data.assessment || "CHƯA XÁC ĐỊNH"}.\n\n`
            );
        }


        // ======================================================
        // TOÀN TỈNH
        // ======================================================

        if (
            data.province
        ) {

            const stationCount =
                data.numberOfStations ?? 0;


            if (!stationCount) {

                return (
                    `Chưa có dữ liệu dự báo GFS ` +
                    `cho ${data.province}.`
                );

            }


            const maxStation =
                data.maxStation;


            const maxStationText =
                maxStation
                    ? (
                        `${maxStation.TenTram} ` +
                        `(${maxStation.MaTram})`
                    )
                    : "—";


            const threshold =
                result.threshold ?? 50;


            const stationsAbove =
                data.stations.filter(
                    station =>
                        Number.isFinite(
                            station.total
                        ) &&
                        station.total >=
                            threshold
                ).length;


            const percentage =
                stationCount > 0
                    ? (
                        stationsAbove /
                        stationCount
                    ) * 100
                    : 0;


            return (
                `Dự báo GFS ${result.hours} giờ tới ` +
                `tại ${data.province}:\n\n` +

                `• Số trạm phân tích: ` +
                `${stationCount}\n` +

                `• Mưa trung bình: ` +
                `${data.areaMean ?? "—"} mm\n` +

                `• Mưa lớn nhất: ` +
                `${data.areaMax ?? "—"} mm\n` +

                `• Trạm lớn nhất: ` +
                `${maxStationText}\n` +

                `• Trạm ≥ ${threshold} mm: ` +
                `${stationsAbove}/${stationCount} ` +
                `(${Math.round(percentage)}%)`
            );

        }


        return (
            "Không có dữ liệu dự báo GFS " +
            "phù hợp."
        );
    }

    // ========================================================
    // TOTAL
    // ========================================================

    if (
        result.intent === "TOTAL"
    ) {

        return (
            `Tại trạm ${result.station.TenTram} ` +
            `(${result.station.MaTram}), ` +
            `tổng lượng mưa dự báo trong ${result.hours} giờ tới ` +
            `là ${result.total ?? "—"} mm.`
        );
    }


    // ========================================================
    // PEAK
    // ========================================================

    if (
        result.intent === "PEAK"
    ) {

        const peak =
            result.peak;


        if (!peak) {

            return (
                "Không tìm thấy cực đại dự báo."
            );
        }


        return (
            `Tại trạm ${result.station.TenTram} ` +
            `(${result.station.MaTram}), ` +
            `lượng mưa dự báo lớn nhất trong ${result.hours} giờ tới ` +
            `là ${peak.value ?? "—"} mm, ` +
            `xảy ra vào ${peak.time ?? "—"}.`
        );
    }


    // ========================================================
    // PERIOD
    // ========================================================

    if (
        result.intent === "PERIOD"
    ) {

        const period =
            result.period;


        if (!period) {

            return (
                "Không có dữ liệu diễn biến mưa."
            );
        }


        return (
            `Đã lấy diễn biến dự báo GFS ` +
            `${result.hours} giờ tại trạm ` +
            `${result.station.TenTram} ` +
            `(${result.station.MaTram}).`
        );
    }


    // ========================================================
    // SUMMARY
    // ========================================================

    const summary =
        result.summary;


    if (!summary) {

        return (
            "Không tìm thấy dữ liệu dự báo GFS."
        );
    }


    return (
        `Dự báo GFS ${summary.numberOfHours} giờ tới ` +
        `tại trạm ${summary.TenTram} ` +
        `(${summary.MaTram}), ${summary.Tinh}:\n\n` +

        `• Tổng lượng mưa: ${summary.total ?? "—"} mm\n` +

        `• Lượng mưa lớn nhất: ${summary.max ?? "—"} mm\n` +

        `• Lượng mưa trung bình: ${summary.mean ?? "—"} mm\n` +

        `• Thời điểm mưa lớn nhất: ${summary.peakTime ?? "—"}\n\n` +

        `Thời kỳ dự báo: ` +
        `${summary.startTime ?? "—"} → ` +
        `${summary.endTime ?? "—"}.`
    );
}


// ============================================================
// FORECAST INFO
// ============================================================

export async function getForecastEngineInfo() {

    return await getForecastInfo();
}