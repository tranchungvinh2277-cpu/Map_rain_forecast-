// ============================================================
// OBSERVED QUERY ENGINE
// Parse and execute Vietnamese observed rainfall questions.
//
// Data source:
//   metadata_observed_qc_last24.json
//   metadata_observed_qc_last72.json
//
// Service:
//   observedRain.js
//
// Supports:
//   - Observed rainfall at selected station
//   - Observed rainfall around selected location
//   - Observed rainfall around selected station
//   - Observed rainfall by province
//   - 24h / 72h
//   - Summary
//   - Total
//   - Peak
//   - Heavy rainfall
// ============================================================

import {
    getObservedStations,
    getObservedSummary,
} from "./observedRain";


// ============================================================
// DEFAULT CONFIG
// ============================================================

const DEFAULT_HOURS = 24;

const DEFAULT_RADIUS_KM = 50;

const DEFAULT_THRESHOLD_MM = 50;


// ============================================================
// NORMALIZE VIETNAMESE
// ============================================================

function normalizeVietnamese(text = "") {

    return String(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/\s+/g, " ")
        .trim();
}


// ============================================================
// EXTRACT HOURS
// ============================================================

function extractHours(question) {

    const q =
        normalizeVietnamese(question);


    if (
        q.includes("72 gio") ||
        q.includes("72h") ||
        q.includes("72 h") ||
        q.includes("3 ngay")
    ) {

        return 72;

    }


    if (
        q.includes("48 gio") ||
        q.includes("48h") ||
        q.includes("48 h") ||
        q.includes("2 ngay")
    ) {

        return 48;

    }


    if (
        q.includes("24 gio") ||
        q.includes("24h") ||
        q.includes("24 h") ||
        q.includes("1 ngay")
    ) {

        return 24;

    }


    return DEFAULT_HOURS;
}


// ============================================================
// EXTRACT PERIOD
// ============================================================

function extractObservedPeriod(question) {

    const hours =
        extractHours(question);


    if (hours >= 72) {

        return "last72";

    }


    // last24 is the available standard observed period
    return "last24";
}


// ============================================================
// EXTRACT THRESHOLD
// ============================================================

function extractThreshold(question) {

    const q =
        normalizeVietnamese(question);


    const patterns = [

        /tren\s+(\d+(?:\.\d+)?)\s*mm/,

        /hon\s+(\d+(?:\.\d+)?)\s*mm/,

        /tu\s+(\d+(?:\.\d+)?)\s*mm/,

        /(\d+(?:\.\d+)?)\s*mm/,

    ];


    for (
        const pattern of patterns
    ) {

        const match =
            q.match(pattern);


        if (match) {

            return Number(
                match[1]
            );

        }

    }


    return null;
}


// ============================================================
// EXTRACT STATION CODE
// ============================================================

function extractStationCode(question) {

    const match =
        String(question).match(
            /\b(\d{5,6})\b/
        );


    return match
        ? match[1]
        : null;
}


// ============================================================
// EXTRACT PROVINCE
// ============================================================

function extractProvince(
    question,
    mapContext = {}
) {

    const q =
        normalizeVietnamese(question);


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


    // --------------------------------------------------------
    // Explicit province in question
    // --------------------------------------------------------

    for (
        const item of provinceAliases
    ) {

        for (
            const alias of item.aliases
        ) {

            if (
                q.includes(
                    normalizeVietnamese(alias)
                )
            ) {

                return item.province;

            }

        }

    }


    // --------------------------------------------------------
    // Selected province from map
    // --------------------------------------------------------

    const selectedProvince =
        mapContext?.selectedProvince;


    if (
        selectedProvince &&
        normalizeVietnamese(
            selectedProvince
        ) !== "tat ca"
    ) {

        return selectedProvince;

    }


    return null;
}


// ============================================================
// DETECT INTENT
// ============================================================

function detectIntent(question) {

    const q =
        normalizeVietnamese(question);


    // --------------------------------------------------------
    // AREA
    // --------------------------------------------------------

    if (
        q.includes("khu vuc") ||
        q.includes("khu vuc nay") ||
        q.includes("vung nay") ||
        q.includes("khu nay") ||
        q.includes("toan tinh") ||
        q.includes("trong tinh") ||
        q.includes("tren dia ban") ||
        q.includes("dia ban") ||
        q.includes("toan bo tinh")
    ) {

        return "AREA";

    }


    // --------------------------------------------------------
    // HEAVY RAIN
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // PEAK
    // --------------------------------------------------------

    if (
        q.includes("mua lon nhat") ||
        q.includes("luong mua lon nhat") ||
        q.includes("dinh mua") ||
        q.includes("thoi diem mua lon nhat") ||
        q.includes("luc nao mua lon nhat")
    ) {

        return "PEAK";

    }


    // --------------------------------------------------------
    // TOTAL
    // --------------------------------------------------------

    if (
        q.includes("tong luong mua") ||
        q.includes("tong mua") ||
        q.includes("da mua bao nhieu") ||
        q.includes("mua bao nhieu") ||
        q.includes("luong mua bao nhieu")
    ) {

        return "TOTAL";

    }


    // --------------------------------------------------------
    // PERIOD
    // --------------------------------------------------------

    if (
        q.includes("dien bien") ||
        q.includes("theo gio") ||
        q.includes("tung gio") ||
        q.includes("tung buoc")
    ) {

        return "PERIOD";

    }


    // --------------------------------------------------------
    // SUMMARY
    // --------------------------------------------------------

    return "SUMMARY";
}


// ============================================================
// DETECT OBSERVED / FORECAST
// ============================================================
//
// This function is also exported so AIChat can use it.
//
// OBSERVED examples:
//   24 giờ qua
//   72 giờ qua
//   hôm qua
//   vừa qua
//   đã mưa bao nhiêu
//   mưa thực đo
//
// FORECAST examples:
//   24 giờ tới
//   72 giờ tới
//   ngày mai
//   dự báo
//   GFS
//
// ============================================================

export function detectRainDataSource(
    question
) {

    const q =
        normalizeVietnamese(question);


    // --------------------------------------------------------
    // Strong observed expressions
    // --------------------------------------------------------

    const observedPatterns = [

        "gio qua",

        "ngay qua",

        "hom qua",

        "vua qua",

        "da mua",

        "thuc do",

        "thuc te",

        "quan trac",

        "luong mua do duoc",

        "mua do duoc",

        "mua thuc te",

        "mua thuc do",

    ];


    if (
        observedPatterns.some(
            pattern =>
                q.includes(pattern)
        )
    ) {

        return "OBSERVED";

    }


    // --------------------------------------------------------
    // Strong forecast expressions
    // --------------------------------------------------------

    const forecastPatterns = [

        "gio toi",

        "ngay toi",

        "sap toi",

        "du bao",

        "gfs",

        "se mua",

        "du kien",

    ];


    if (
        forecastPatterns.some(
            pattern =>
                q.includes(pattern)
        )
    ) {

        return "FORECAST";

    }


    // --------------------------------------------------------
    // Default
    // --------------------------------------------------------

    return "FORECAST";
}


// ============================================================
// HAVERSINE DISTANCE
// ============================================================

function haversineKm(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;

    const dLat =
        (
            Number(lat2) -
            Number(lat1)
        ) *
        Math.PI / 180;

    const dLon =
        (
            Number(lon2) -
            Number(lon1)
        ) *
        Math.PI / 180;


    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(
            Number(lat1) *
            Math.PI / 180
        ) *
        Math.cos(
            Number(lat2) *
            Math.PI / 180
        ) *
        Math.sin(dLon / 2) ** 2;


    return (
        2 *
        R *
        Math.asin(
            Math.sqrt(a)
        )
    );
}


// ============================================================
// GET STATION COORDINATES
// ============================================================

function getStationCoordinates(
    station
) {

    const lat =
        Number(
            station?.Lat
        );

    const lon =
        Number(
            station?.Lon
        );


    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {

        return null;

    }


    return {
        lat,
        lon,
    };
}


// ============================================================
// RESOLVE STATION
// ============================================================

async function resolveObservedStation(
    question,
    mapContext = {},
    period = "last24"
) {

    const selectedStation =
        mapContext?.selectedStation;


    // --------------------------------------------------------
    // 1. Selected station
    // --------------------------------------------------------

    if (
        selectedStation &&
        typeof selectedStation === "object" &&
        selectedStation.MaTram
    ) {

        const station =
            await getObservedSummary(
                selectedStation.MaTram,
                period
            );


        if (station) {

            return station;

        }

    }


    // --------------------------------------------------------
    // 2. Station code
    // --------------------------------------------------------

    const code =
        extractStationCode(
            question
        );


    if (code) {

        const stations =
            await getObservedStations(
                period
            );


        const station =
            stations.find(
                item =>
                    String(
                        item?.MaTram
                    ).trim() ===
                    String(code).trim()
            );


        if (station) {

            return getObservedSummary(
                station.MaTram,
                period
            );

        }

    }


    // --------------------------------------------------------
    // 3. Coordinates
    // --------------------------------------------------------

    if (
        typeof mapContext?.lat === "number" &&
        typeof mapContext?.lon === "number"
    ) {

        return findNearestObservedStation(
            mapContext.lat,
            mapContext.lon,
            period
        );

    }


    return null;
}


// ============================================================
// FIND NEAREST OBSERVED STATION
// ============================================================

async function findNearestObservedStation(
    lat,
    lon,
    period = "last24"
) {

    const stations =
        await getObservedStations(
            period
        );


    let nearest =
        null;

    let nearestDistance =
        Infinity;


    for (
        const station of stations
    ) {

        const coordinates =
            getStationCoordinates(
                station
            );


        if (!coordinates) {
            continue;
        }


        const distance =
            haversineKm(
                lat,
                lon,
                coordinates.lat,
                coordinates.lon
            );


        if (
            distance <
            nearestDistance
        ) {

            nearestDistance =
                distance;

            nearest =
                station;

        }

    }


    if (!nearest) {
        return null;
    }


    const summary =
        await getObservedSummary(
            nearest.MaTram,
            period
        );


    if (!summary) {
        return null;
    }


    return {

        ...summary,

        distanceKm:
            nearestDistance,

    };
}


// ============================================================
// GET AREA STATIONS AROUND LOCATION
// ============================================================

async function getObservedAreaAroundLocation(
    lat,
    lon,
    period = "last24",
    radiusKm = DEFAULT_RADIUS_KM
) {

    const stations =
        await getObservedStations(
            period
        );


    const nearby =
        [];


    for (
        const station of stations
    ) {

        const coordinates =
            getStationCoordinates(
                station
            );


        if (!coordinates) {
            continue;
        }


        const distance =
            haversineKm(
                lat,
                lon,
                coordinates.lat,
                coordinates.lon
            );


        if (
            distance <= radiusKm
        ) {

            nearby.push({

                station,

                distanceKm:
                    distance,

            });

        }

    }


    if (!nearby.length) {

        return {

            type:
                "AREA_AROUND_LOCATION",

            radiusKm,

            numberOfStations:
                0,

            stations: [],

        };

    }


    // --------------------------------------------------------
    // Build summaries
    // --------------------------------------------------------

    const summaries =
        await Promise.all(

            nearby.map(
                async item => {

                    const summary =
                        await getObservedSummary(
                            item.station.MaTram,
                            period
                        );


                    if (!summary) {
                        return null;
                    }


                    return {

                        ...summary,

                        distanceKm:
                            item.distanceKm,

                    };

                }
            )

        );


    const valid =
        summaries.filter(
            Boolean
        );


    return calculateAreaStatistics(
        valid,
        {
            type:
                "AREA_AROUND_LOCATION",

            radiusKm,

        }
    );
}


// ============================================================
// GET AREA BY PROVINCE
// ============================================================

async function getObservedAreaByProvince(
    province,
    period = "last24"
) {

    if (!province) {
        return null;
    }


    const stations =
        await getObservedStations(
            period
        );


    const normalizedProvince =
        normalizeVietnamese(
            province
        );


    const provinceStations =
        stations.filter(
            station =>
                normalizeVietnamese(
                    station?.Tinh || ""
                ) === normalizedProvince
        );


    if (!provinceStations.length) {

        return {

            type:
                "AREA_PROVINCE",

            province,

            numberOfStations:
                0,

            stations: [],

        };

    }


    const summaries =
        await Promise.all(

            provinceStations.map(
                async station => {

                    return getObservedSummary(
                        station.MaTram,
                        period
                    );

                }
            )

        );


    const valid =
        summaries.filter(
            Boolean
        );


    return calculateAreaStatistics(
        valid,
        {

            type:
                "AREA_PROVINCE",

            province,

        }
    );
}


// ============================================================
// CALCULATE AREA STATISTICS
// ============================================================

function calculateAreaStatistics(
    stations,
    metadata = {}
) {

    const valid =
        stations.filter(
            station =>
                station &&
                Number.isFinite(
                    Number(
                        station.rainSum
                    )
                )
        );


    const numberOfStations =
        valid.length;


    // --------------------------------------------------------
    // No valid station
    // --------------------------------------------------------

    if (!numberOfStations) {

        return {

            ...metadata,

            numberOfStations:
                0,

            stations: [],

            areaMean:
                0,

            areaMax:
                0,

            maxStation:
                null,

            stationsWithRain:
                0,

            percentageWithRain:
                0,

            latestDataTime:
                null,

        };

    }


    // --------------------------------------------------------
    // Rainfall values
    // --------------------------------------------------------

    const values =
        valid.map(
            station =>
                Number(
                    station.rainSum
                ) || 0
        );


    // --------------------------------------------------------
    // Area mean
    // --------------------------------------------------------

    const total =
        values.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        );


    const areaMean =
        total /
        numberOfStations;


    // --------------------------------------------------------
    // Area maximum
    // --------------------------------------------------------

    const maxValue =
        Math.max(
            ...values
        );


    const maxStation =
        valid.find(
            station =>
                Number(
                    station.rainSum
                ) === maxValue
        ) || null;


    // --------------------------------------------------------
    // Stations with rain
    // --------------------------------------------------------

    const stationsWithRain =
        valid.filter(
            station =>
                Number(
                    station.rainSum
                ) > 0
        ).length;


    const percentageWithRain =
        numberOfStations > 0
            ? (
                stationsWithRain /
                numberOfStations
            ) * 100
            : 0;


    // --------------------------------------------------------
    // Latest observed data time
    //
    // getObservedSummary() already returns:
    //
    //   endTime = DataInfo.LastTime
    //
    // We use the latest valid endTime among stations.
    // This is the actual last observed data timestamp,
    // NOT a latency / delay value.
    // --------------------------------------------------------

    const validTimes =
        valid
            .map(
                station =>
                    station.endTime
            )
            .filter(
                Boolean
            );


    const latestDataTime =
        validTimes.length
            ? validTimes.reduce(
                (
                    latest,
                    current
                ) => {

                    const latestDate =
                        new Date(
                            latest
                        );

                    const currentDate =
                        new Date(
                            current
                        );

                    if (
                        Number.isNaN(
                            currentDate.getTime()
                        )
                    ) {
                        return latest;
                    }

                    if (
                        Number.isNaN(
                            latestDate.getTime()
                        )
                    ) {
                        return current;
                    }

                    return currentDate >
                        latestDate
                        ? current
                        : latest;

                }
            )
            : null;


    // --------------------------------------------------------
    // Return
    // --------------------------------------------------------

    return {

        ...metadata,

        numberOfStations,

        areaMean,

        areaMax:
            maxValue,

        maxStation,

        stationsWithRain,

        percentageWithRain,

        latestDataTime,

        stations:
            valid,

    };
}


// ============================================================
// EXECUTE STATION SUMMARY
// ============================================================

async function executeStationSummary(
    station,
    period
) {

    if (!station) {
        return null;
    }


    return {

        station,

        period,

        rainfall:
            station.rainSum,

        maxRainfall:
            station.rainMax,

        rainHours:
            station.rainHours,

        startTime:
            station.startTime,

        endTime:
            station.endTime,

        lastUpdate:
            station.lastUpdate,

        qc:
            station.qc,

    };
}


// ============================================================
// EXECUTE STATION TOTAL
// ============================================================

async function executeStationTotal(
    station,
    period
) {

    if (!station) {
        return null;
    }


    return {

        station,

        period,

        total:
            station.rainSum,

        startTime:
            station.startTime,

        endTime:
            station.endTime,

    };
}


// ============================================================
// EXECUTE STATION PEAK
// ============================================================

async function executeStationPeak(
    station,
    period
) {

    if (!station) {
        return null;
    }


    return {

        station,

        period,

        peak: {

            value:
                station.rainMax,

            time:
                null,

        },

    };
}


// ============================================================
// MAIN OBSERVED QUERY
// ============================================================

export async function queryObserved(
    question,
    mapContext = {}
) {

    if (
        !question ||
        !question.trim()
    ) {

        return {

            success:
                false,

            source:
                "OBSERVED",

            error:
                "EMPTY_QUESTION",

            message:
                "Bạn chưa nhập câu hỏi.",

        };

    }


    const intent =
        detectIntent(
            question
        );


    const period =
        extractObservedPeriod(
            question
        );


    const hours =
        period === "last72"
            ? 72
            : 24;


    const threshold =
        extractThreshold(
            question
        ) ??
        DEFAULT_THRESHOLD_MM;


    const province =
        extractProvince(
            question,
            mapContext
        );


    const selectedStation =
        mapContext?.selectedStation;


    const hasExplicitArea =
        intent === "AREA";


    // --------------------------------------------------------
    // Determine whether question should use area
    // --------------------------------------------------------

    const isProvinceQuestion =
        Boolean(province);

    const effectiveArea =
        isProvinceQuestion ||
        hasExplicitArea;


    const base = {

        success:
            true,

        source:
            "OBSERVED",

        model:
            "OBSERVED_QC",

        question,

        intent,

        period,

        hours,

        threshold,

        province,

        timestamp:
            new Date().toISOString(),

    };


    // ========================================================
    // AREA
    // ========================================================

    if (effectiveArea) {

        // ----------------------------------------------------
        // Province
        // ----------------------------------------------------

        if (province) {

            const data =
                await getObservedAreaByProvince(
                    province,
                    period
                );


            return {

                ...base,

                areaType:
                    "PROVINCE",

                data,

            };

        }


        // ----------------------------------------------------
        // Selected station location
        // ----------------------------------------------------

        if (
            selectedStation &&
            typeof selectedStation === "object" &&
            selectedStation.Lat != null &&
            selectedStation.Lon != null
        ) {

            const data =
                await getObservedAreaAroundLocation(
                    Number(
                        selectedStation.Lat
                    ),
                    Number(
                        selectedStation.Lon
                    ),
                    period,
                    DEFAULT_RADIUS_KM
                );


            return {

                ...base,

                areaType:
                    "AROUND_SELECTED_LOCATION",

                data: {

                    ...data,

                    selectedStation: {

                        MaTram:
                            selectedStation.MaTram,

                        TenTram:
                            selectedStation.TenTram,

                    },

                },

            };

        }


        // ----------------------------------------------------
        // Map coordinates
        // ----------------------------------------------------

        if (
            mapContext?.lat != null &&
            mapContext?.lon != null
        ) {

            const data =
                await getObservedAreaAroundLocation(
                    Number(
                        mapContext.lat
                    ),
                    Number(
                        mapContext.lon
                    ),
                    period,
                    DEFAULT_RADIUS_KM
                );


            return {

                ...base,

                areaType:
                    "AROUND_MAP_LOCATION",

                data,

            };

        }


        return {

            ...base,

            success:
                false,

            error:
                "AREA_NOT_FOUND",

            message:
                "Chưa xác định được khu vực cần phân tích.",

        };

    }


    // ========================================================
    // STATION
    // ========================================================

    const station =
        await resolveObservedStation(
            question,
            mapContext,
            period
        );


    if (!station) {

        return {

            ...base,

            success:
                false,

            error:
                "STATION_NOT_FOUND",

            message:
                "Chưa xác định được trạm quan trắc hoặc vị trí cần phân tích.",

        };

    }


    // ========================================================
    // SUMMARY
    // ========================================================

    if (
        intent === "SUMMARY"
    ) {

        const result =
            await executeStationSummary(
                station,
                period
            );


        return {

            ...base,

            station,
            summary:
                result,

        };

    }


    // ========================================================
    // TOTAL
    // ========================================================

    if (
        intent === "TOTAL"
    ) {

        const result =
            await executeStationTotal(
                station,
                period
            );


        return {

            ...base,

            station,

            total:
                result?.total,

        };

    }


    // ========================================================
    // PEAK
    // ========================================================

    if (
        intent === "PEAK"
    ) {

        const result =
            await executeStationPeak(
                station,
                period
            );


        return {

            ...base,

            station,

            peak:
                result?.peak,

        };

    }


    // ========================================================
    // HEAVY RAIN
    // ========================================================

    if (
        intent === "HEAVY_RAIN"
    ) {

        const result =
            await getObservedAreaAroundLocation(
                Number(
                    station.Lat
                ),
                Number(
                    station.Lon
                ),
                period,
                DEFAULT_RADIUS_KM
            );


        const stations =
            result?.stations || [];


        const heavyStations =
            stations.filter(
                item =>
                    Number(
                        item.rainSum
                    ) >= threshold
            );


        return {

            ...base,

            station,

            data: {

                ...result,

                heavyStations,

                numberOfHeavyStations:
                    heavyStations.length,

            },

        };

    }


    // ========================================================
    // PERIOD
    // ========================================================

    if (
        intent === "PERIOD"
    ) {

        return {

            ...base,

            station,

            periodData:
                null,

            message:
                "Dữ liệu chuỗi giờ quan trắc đã có trong nguồn dữ liệu trạm.",

        };

    }


    // ========================================================
    // FALLBACK
    // ========================================================

    return {

        ...base,

        station,

        summary:
            await executeStationSummary(
                station,
                period
            ),

    };
}


// ============================================================
// FORMAT OBSERVED ANSWER
// ============================================================

export function formatObservedAnswer(
    result
) {

    if (!result) {

        return (
            "Không có dữ liệu quan trắc."
        );

    }


    if (!result.success) {

        return (
            result.message ||
            "Không thể xác định dữ liệu quan trắc cần phân tích."
        );

    }


    // ========================================================
    // AREA
    // ========================================================

    if (
        result.intent === "AREA" ||
        result.areaType === "PROVINCE" ||
        result.areaType === "AROUND_SELECTED_LOCATION" ||
        result.areaType === "AROUND_MAP_LOCATION"
    ) {

        const data =
            result.data;


        if (!data) {

            return (
                "Không có dữ liệu quan trắc " +
                "cho khu vực cần phân tích."
            );

        }


        const count =
            data.numberOfStations ??
            0;


        const periodText =
            result.hours === 72
                ? "72 giờ qua"
                : "24 giờ qua";


        // ----------------------------------------------------
        // No station
        // ----------------------------------------------------

        if (!count) {

            if (
                result.areaType ===
                "PROVINCE"
            ) {

                return (
                    `Trong ${periodText}, ` +
                    `chưa có dữ liệu quan trắc ` +
                    `tại ${result.province}.`
                );

            }


            return (
                `Trong ${periodText}, ` +
                `không có trạm quan trắc ` +
                `trong khu vực bán kính ` +
                `${data.radiusKm ?? DEFAULT_RADIUS_KM} km.`
            );

        }


        const areaMean =
            Number(
                data.areaMean
            ) || 0;


        const areaMax =
            Number(
                data.areaMax
            ) || 0;


        const maxStation =
            data.maxStation;


        const stationsWithRain =
            data.stationsWithRain ??
            0;


        const percentageWithRain =
            data.percentageWithRain ??
            0;


        let title;


        if (
            result.areaType ===
            "PROVINCE"
        ) {

            title =
                `Quan trắc ${periodText} tại ${result.province}:`;

        } else {

            const stationName =
                result.data?.selectedStation?.TenTram ||
                "vị trí đang xem";


            const radiusKm =
                data.radiusKm ??
                DEFAULT_RADIUS_KM;


            title =
                `Quan trắc ${periodText} tại khu vực ` +
                `lân cận ${stationName} ` +
                `(bán kính ${radiusKm} km):`;

        }


        return (
            `${title}\n\n` +
            `• Số trạm phân tích: ${count}\n` +
            `• Mưa trung bình: ${areaMean.toFixed(2)} mm\n` +
            `• Mưa lớn nhất: ${areaMax.toFixed(2)} mm\n` +
            `• Trạm lớn nhất: ${maxStation?.TenTram || "Không xác định"}` +
            `${maxStation?.MaTram ? ` (${maxStation.MaTram})` : ""}\n` +
            `• Trạm có mưa: ${stationsWithRain}/${count} (${percentageWithRain.toFixed(0)}%)\n` +
            `• Số liệu cập nhật đến: ${data.latestDataTime ?? "—"}\n\n` +
            `Đánh giá: ` +
            buildObservedAssessment(
                areaMean,
                areaMax,
                stationsWithRain,
                count
            ) +
            `.`
        );
    }


    // ========================================================
    // HEAVY RAIN
    // ========================================================

    if (
        result.intent === "HEAVY_RAIN"
    ) {

        const data =
            result.data;


        const stations =
            data?.heavyStations ||
            [];


        if (!stations.length) {

            return (
                `Trong ${result.hours} giờ qua, ` +
                `không có trạm trong khu vực ` +
                `vượt ngưỡng ${result.threshold} mm.`
            );

        }


        const lines =
            stations
                .slice(0, 10)
                .map(
                    station =>
                        `• ${station.TenTram} ` +
                        `(${station.MaTram}): ` +
                        `${Number(
                            station.rainSum
                        ).toFixed(2)} mm`
                )
                .join("\n");


        return (
            `Trong ${result.hours} giờ qua, ` +
            `có ${stations.length} trạm có tổng lượng mưa ` +
            `≥ ${result.threshold} mm:\n\n` +
            lines
        );
    }


    // ========================================================
    // TOTAL
    // ========================================================

    if (
        result.intent === "TOTAL"
    ) {

        const station =
            result.station;


        return (
            `Tại trạm ${station?.TenTram || "không xác định"} ` +
            `(${station?.MaTram || "—"}), ` +
            `tổng lượng mưa trong ${result.hours} giờ qua ` +
            `là ${Number(
                result.total ?? 0
            ).toFixed(2)} mm.`
        );
    }


    // ========================================================
    // PEAK
    // ========================================================

    if (
        result.intent === "PEAK"
    ) {

        const station =
            result.station;


        const peak =
            result.peak;


        return (
            `Tại trạm ${station?.TenTram || "không xác định"} ` +
            `(${station?.MaTram || "—"}), ` +
            `lượng mưa lớn nhất trong ${result.hours} giờ qua ` +
            `là ${Number(
                peak?.value ?? 0
            ).toFixed(2)} mm.`
        );
    }


    // ========================================================
    // SUMMARY
    // ========================================================

    const summary =
        result.summary;


    if (!summary) {

        return (
            "Không tìm thấy dữ liệu quan trắc."
        );

    }


    const periodText =
        result.hours === 72
            ? "72 giờ qua"
            : "24 giờ qua";


    return (

        `Quan trắc ${periodText} tại trạm ` +
        `${summary.station?.TenTram || "không xác định"} ` +
        `(${summary.station?.MaTram || "—"}), ` +
        `${summary.station?.Tinh || ""}:\n\n` +

        `• Tổng lượng mưa: ` +
        `${Number(
            summary.rainfall ?? 0
        ).toFixed(2)} mm\n` +

        `• Lượng mưa lớn nhất: ` +
        `${Number(
            summary.maxRainfall ?? 0
        ).toFixed(2)} mm\n` +

        `• Số giờ có mưa: ` +
        `${summary.rainHours ?? 0} giờ\n` +

        `• Thời kỳ: ` +
        `${summary.startTime ?? "—"} → ` +
        `${summary.endTime ?? "—"}\n` +

        `• Số liệu cập nhật đến: ` +
        `${summary.latestDataTime ?? summary.endTime ?? "—"}\n\n` +

        `Đánh giá chất lượng: ` +
        `${summary.qc?.status || "Chưa xác định"}.`
    );
}


// ============================================================
// ASSESSMENT
// ============================================================

function buildObservedAssessment(
    mean,
    max,
    stationsWithRain,
    totalStations
) {

    if (!totalStations) {

        return "Chưa đủ dữ liệu để đánh giá";

    }


    const coverage =
        stationsWithRain /
        totalStations;


    if (
        max >= 100
    ) {

        return (
            "Khu vực có xuất hiện mưa rất lớn, " +
            "cần chú ý đến các điểm có lượng mưa cực đại"
        );

    }


    if (
        max >= 50
    ) {

        return (
            "Khu vực có xuất hiện mưa lớn cục bộ"
        );

    }


    if (
        mean >= 25
    ) {

        return (
            "Mưa phân bố tương đối rộng trên khu vực"
        );

    }


    if (
        mean >= 10
    ) {

        return (
            "Khu vực có mưa ở mức trung bình"
        );

    }


    if (
        coverage >= 0.5
    ) {

        return (
            "Mưa xuất hiện trên phạm vi tương đối rộng " +
            "nhưng lượng mưa nhìn chung không lớn"
        );

    }


    if (
        stationsWithRain > 0
    ) {

        return (
            "Mưa xuất hiện cục bộ tại một số trạm"
        );

    }


    return (
        "Phần lớn khu vực không có mưa"
    );
}


// ============================================================
// EXPORT HELPERS
// ============================================================

export {
    normalizeVietnamese,
    extractHours,
    extractThreshold,
    extractProvince,
    detectIntent,
    haversineKm,
};
