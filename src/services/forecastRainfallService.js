// ==========================================================
// FORECAST RAINFALL SERVICE
// ==========================================================
// Giai đoạn 1:
//   - CHỈ xử lý MƯA DỰ BÁO GFS
//   - KHÔNG xử lý observed
//
// Data nằm trong:
//   public/mergedData.json
//   public/timeData.json
//   public/tramList.json
//
// URL khi chạy React:
//   /mergedData.json
//   /timeData.json
//   /tramList.json
//
// Cấu trúc mergedData:
// {
//   "064471": {
//      "observed": [...],
//      "forecast": [...]
//   }
// }
//
// Cấu trúc timeData:
// {
//   "observed": [...],
//   "forecast": [...]
// }
//
// Cấu trúc tramList:
// [
//   {
//      "MaTram": "064471",
//      "TenTram": "Vĩnh Thuận",
//      "LoaiTram": "NDTD",
//      "Tinh": "An Giang",
//      "Lat": 9.497,
//      "Lon": 105.256
//   }
// ]
// ==========================================================


// ==========================================================
// CONFIGURATION
// ==========================================================

const DATA_URL = {
    mergedData: "/mergedData.json",
    timeData: "/timeData.json",
    tramList: "/tramList.json",
};

const DEFAULT_PERIOD_HOURS = 24;

const MAX_FORECAST_HOURS = 120;

const DEFAULT_MAX_DISTANCE_KM = 100;


// ==========================================================
// DATA CACHE
// ==========================================================

let mergedDataCache = null;
let timeDataCache = null;
let tramListCache = null;

let dataLoadingPromise = null;


// ==========================================================
// LOAD DATA
// ==========================================================

/**
 * Load toàn bộ dữ liệu GFS.
 *
 * Chỉ load một lần.
 * Sau đó sử dụng cache.
 */
async function loadForecastData() {

    if (
        mergedDataCache &&
        timeDataCache &&
        tramListCache
    ) {
        return {
            mergedData: mergedDataCache,
            timeData: timeDataCache,
            tramList: tramListCache,
        };
    }


    // Nếu đang có request load dữ liệu,
    // các request khác dùng chung Promise.
    if (dataLoadingPromise) {
        return dataLoadingPromise;
    }


    dataLoadingPromise =
        Promise.all([

            fetch(DATA_URL.mergedData),

            fetch(DATA_URL.timeData),

            fetch(DATA_URL.tramList),

        ])
        .then(async responses => {

            const [
                mergedResponse,
                timeResponse,
                tramResponse
            ] = responses;


            if (!mergedResponse.ok) {

                throw new Error(
                    `Không thể tải ${DATA_URL.mergedData}`
                );

            }


            if (!timeResponse.ok) {

                throw new Error(
                    `Không thể tải ${DATA_URL.timeData}`
                );

            }


            if (!tramResponse.ok) {

                throw new Error(
                    `Không thể tải ${DATA_URL.tramList}`
                );

            }


            const [

                mergedData,

                timeData,

                tramList

            ] = await Promise.all([

                mergedResponse.json(),

                timeResponse.json(),

                tramResponse.json(),

            ]);


            // ------------------------------------------------
            // Cache
            // ------------------------------------------------

            mergedDataCache =
                mergedData;

            timeDataCache =
                timeData;

            tramListCache =
                tramList;


            return {

                mergedData,

                timeData,

                tramList,

            };

        })
        .catch(error => {

            // Cho phép lần sau thử load lại
            dataLoadingPromise = null;

            throw error;

        });


    return dataLoadingPromise;
}


// ==========================================================
// CLEAR CACHE
// ==========================================================

/**
 * Xóa cache.
 *
 * Có thể dùng khi dữ liệu JSON được cập nhật
 * và muốn đọc lại dữ liệu mới.
 */
export function clearForecastCache() {

    mergedDataCache = null;

    timeDataCache = null;

    tramListCache = null;

    dataLoadingPromise = null;
}


// ==========================================================
// INTERNAL HELPERS
// ==========================================================

function normalizeStationCode(maTram) {

    if (
        maTram === null ||
        maTram === undefined
    ) {
        return null;
    }


    return String(maTram).trim();
}


function isValidNumber(value) {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}


function normalizeRainfall(value) {

    const number =
        Number(value);


    if (!Number.isFinite(number)) {
        return null;
    }


    return number;
}


function round(
    value,
    decimals = 2
) {

    if (!Number.isFinite(value)) {
        return null;
    }


    const factor =
        Math.pow(
            10,
            decimals
        );


    return (
        Math.round(
            value * factor
        ) / factor
    );
}


function parseDateTime(value) {

    if (!value) {
        return null;
    }


    if (value instanceof Date) {
        return value;
    }


    const normalized =
        String(value)
            .trim()
            .replace(" ", "T");


    const date =
        new Date(normalized);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }


    return date;
}


// ==========================================================
// HAVERSINE DISTANCE
// ==========================================================

function haversineDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;


    const dLat =
        (lat2 - lat1) *
        Math.PI / 180;


    const dLon =
        (lon2 - lon1) *
        Math.PI / 180;


    const a =
        Math.sin(dLat / 2) ** 2 +

        Math.cos(
            lat1 * Math.PI / 180
        ) *

        Math.cos(
            lat2 * Math.PI / 180
        ) *

        Math.sin(dLon / 2) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;
}


// ==========================================================
// INTERNAL DATA ACCESS
// ==========================================================

async function getData() {

    return loadForecastData();
}


async function findStation(
    maTram
) {

    const {
        tramList
    } = await getData();


    const code =
        normalizeStationCode(
            maTram
        );


    if (!code) {
        return null;
    }


    return (
        tramList.find(
            station =>
                normalizeStationCode(
                    station.MaTram
                ) === code
        ) || null
    );
}


async function getRawForecastValues(
    maTram
) {

    const {
        mergedData
    } = await getData();


    const code =
        normalizeStationCode(
            maTram
        );


    if (!code) {
        return [];
    }


    const stationData =
        mergedData?.[code];


    if (
        !stationData ||
        !Array.isArray(
            stationData.forecast
        )
    ) {
        return [];
    }


    return stationData.forecast
        .map(normalizeRainfall);
}


async function getForecastTimesInternal() {

    const {
        timeData
    } = await getData();


    if (
        !timeData ||
        !Array.isArray(
            timeData.forecast
        )
    ) {
        return [];
    }


    return timeData.forecast;
}


async function buildForecastSeries(
    maTram
) {

    const values =
        await getRawForecastValues(
            maTram
        );


    const times =
        await getForecastTimesInternal();


    const length =
        Math.min(
            values.length,
            times.length
        );


    const series = [];


    for (
        let i = 0;
        i < length;
        i++
    ) {

        const value =
            values[i];

        const time =
            times[i];


        if (
            value === null ||
            value === undefined
        ) {
            continue;
        }


        series.push({

            index: i,

            time,

            value,

        });

    }


    return series;
}


// ==========================================================
// 1. GET STATION FORECAST
// ==========================================================

export async function getStationForecast(
    maTram
) {

    const station =
        await findStation(
            maTram
        );


    if (!station) {
        return null;
    }


    const series =
        await buildForecastSeries(
            maTram
        );


    return {

        MaTram:
            station.MaTram,

        TenTram:
            station.TenTram,

        LoaiTram:
            station.LoaiTram,

        Tinh:
            station.Tinh,

        Lat:
            Number(station.Lat),

        Lon:
            Number(station.Lon),

        forecast:
            series,

    };
}


// ==========================================================
// 2. GET FORECAST AT TIME
// ==========================================================

export async function getForecastAtTime(
    maTram,
    timeOrIndex
) {

    const series =
        await buildForecastSeries(
            maTram
        );


    if (!series.length) {
        return null;
    }


    // ------------------------------------------------------
    // Theo index
    // ------------------------------------------------------

    if (
        typeof timeOrIndex === "number"
    ) {

        return (
            series.find(
                item =>
                    item.index ===
                    timeOrIndex
            ) || null
        );

    }


    // ------------------------------------------------------
    // Theo thời gian
    // ------------------------------------------------------

    const target =
        String(
            timeOrIndex
        ).trim();


    return (
        series.find(
            item =>
                String(
                    item.time
                ).trim() === target
        ) || null
    );
}


// ==========================================================
// 3. GET FORECAST PERIOD
// ==========================================================

export async function getForecastPeriod(
    maTram,
    options = {}
) {

    const series =
        await buildForecastSeries(
            maTram
        );


    if (!series.length) {
        return null;
    }


    let {

        hours =
            DEFAULT_PERIOD_HOURS,

        startIndex = null,

        endIndex = null,

        startTime = null,

        endTime = null,

    } = options;


    // ======================================================
    // 1. THEO THỜI GIAN CỤ THỂ
    // ======================================================

    if (
        startTime ||
        endTime
    ) {

        const start =
            startTime
                ? parseDateTime(
                    startTime
                )
                : null;


        const end =
            endTime
                ? parseDateTime(
                    endTime
                )
                : null;


        const filtered =
            series.filter(
                item => {

                    const date =
                        parseDateTime(
                            item.time
                        );


                    if (!date) {
                        return false;
                    }


                    if (
                        start &&
                        date < start
                    ) {
                        return false;
                    }


                    if (
                        end &&
                        date > end
                    ) {
                        return false;
                    }


                    return true;
                }
            );


        return {

            MaTram:
                normalizeStationCode(
                    maTram
                ),

            startTime:
                filtered[0]?.time ||
                null,

            endTime:
                filtered[
                    filtered.length - 1
                ]?.time || null,

            numberOfHours:
                filtered.length,

            series:
                filtered,

        };
    }


    // ======================================================
    // 2. XÁC ĐỊNH START INDEX
    // ======================================================

    /*
     * Nếu người dùng truyền startIndex
     * → giữ nguyên hành vi cũ.
     *
     * Nếu KHÔNG truyền startIndex
     * → tự động tìm mốc forecast đầu tiên >= NOW.
     */

    if (
        startIndex === null ||
        startIndex === undefined
    ) {

        const now =
            new Date();


        startIndex =
            series.findIndex(
                item => {

                    const date =
                        parseDateTime(
                            item.time
                        );


                    if (!date) {
                        return false;
                    }


                    return date >= now;
                }
            );


        // Không còn mốc forecast nào
        if (
            startIndex === -1
        ) {
            return null;
        }

    } else {

        startIndex =
            Math.max(
                0,
                Number(startIndex) || 0
            );
    }


    // ======================================================
    // 3. XÁC ĐỊNH END INDEX
    // ======================================================

    if (
        endIndex === null ||
        endIndex === undefined
    ) {

        const requestedHours =
            Math.min(
                Number(hours) ||
                    DEFAULT_PERIOD_HOURS,

                MAX_FORECAST_HOURS
            );


        endIndex =
            startIndex +
            requestedHours;

    } else {

        endIndex =
            Number(endIndex);
    }


    // ======================================================
    // 4. GIỚI HẠN SERIES
    // ======================================================

    endIndex =
        Math.min(
            endIndex,
            series.length
        );


    // ======================================================
    // 5. LẤY CHUỖI
    // ======================================================

    const selected =
        series.slice(
            startIndex,
            endIndex
        );


    // ======================================================
    // 6. TRẢ KẾT QUẢ
    // ======================================================

    return {

        MaTram:
            normalizeStationCode(
                maTram
            ),

        startIndex,

        endIndex,

        startTime:
            selected[0]?.time ||
            null,

        endTime:
            selected[
                selected.length - 1
            ]?.time || null,

        numberOfHours:
            selected.length,

        series:
            selected,

    };
}


// ==========================================================
// 4. SUMMARIZE FORECAST
// ==========================================================

export async function summarizeForecast(
    maTram,
    options = {}
) {

    const station =
        await findStation(
            maTram
        );


    if (!station) {
        return null;
    }


    const period =
        await getForecastPeriod(
            maTram,
            options
        );


    if (
        !period ||
        !period.series.length
    ) {
        return null;
    }


    const values =
        period.series
            .map(
                item =>
                    item.value
            )
            .filter(
                isValidNumber
            );


    if (!values.length) {
        return null;
    }


    const total =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    const min =
        Math.min(...values);


    const max =
        Math.max(...values);


    const mean =
        total /
        values.length;


    const peakItem =
        period.series.reduce(
            (current, item) => {

                if (!current) {
                    return item;
                }


                return (
                    item.value >
                    current.value
                )
                    ? item
                    : current;

            },
            null
        );


    return {

        MaTram:
            station.MaTram,

        TenTram:
            station.TenTram,

        Tinh:
            station.Tinh,

        Lat:
            Number(station.Lat),

        Lon:
            Number(station.Lon),


        startTime:
            period.startTime,

        endTime:
            period.endTime,


        numberOfHours:
            values.length,


        total:
            round(total),


        min:
            round(min),


        max:
            round(max),


        mean:
            round(mean),


        peakValue:
            peakItem
                ? round(
                    peakItem.value
                )
                : null,


        peakTime:
            peakItem
                ? peakItem.time
                : null,


        peakIndex:
            peakItem
                ? peakItem.index
                : null,


        series:
            period.series,

    };
}


// ==========================================================
// 5. GET NEAREST STATION
// ==========================================================

export async function getNearestStation(
    lat,
    lon,
    maxDistanceKm =
        DEFAULT_MAX_DISTANCE_KM
) {

    const {
        tramList
    } = await getData();


    lat = Number(lat);

    lon = Number(lon);


    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {
        return null;
    }


    let nearest = null;


    for (
        const station
        of tramList
    ) {

        const stationLat =
            Number(
                station.Lat
            );


        const stationLon =
            Number(
                station.Lon
            );


        if (
            !Number.isFinite(
                stationLat
            ) ||
            !Number.isFinite(
                stationLon
            )
        ) {
            continue;
        }


        const distanceKm =
            haversineDistance(
                lat,
                lon,
                stationLat,
                stationLon
            );


        if (
            !nearest ||
            distanceKm <
                nearest.distanceKm
        ) {

            nearest = {

                station,

                distanceKm,

            };

        }

    }


    if (!nearest) {
        return null;
    }


    if (
        Number.isFinite(
            maxDistanceKm
        ) &&
        nearest.distanceKm >
            maxDistanceKm
    ) {

        return null;
    }


    return {

        MaTram:
            nearest.station.MaTram,

        TenTram:
            nearest.station.TenTram,

        LoaiTram:
            nearest.station.LoaiTram,

        Tinh:
            nearest.station.Tinh,

        Lat:
            Number(
                nearest.station.Lat
            ),

        Lon:
            Number(
                nearest.station.Lon
            ),

        distanceKm:
            round(
                nearest.distanceKm,
                2
            ),

    };
}

// ==========================================================
// 5B. GET STATIONS AROUND LOCATION
// ==========================================================

export async function getStationsAroundLocation(
    lat,
    lon,
    radiusKm = 50
) {

    const {
        tramList,
        mergedData
    } = await getData();


    lat = Number(lat);
    lon = Number(lon);
    radiusKm = Number(radiusKm);


    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {
        return [];
    }


    if (
        !Number.isFinite(radiusKm) ||
        radiusKm <= 0
    ) {
        radiusKm = 50;
    }


    const results = [];


    for (
        const station
        of tramList
    ) {

        const stationLat =
            Number(station.Lat);

        const stationLon =
            Number(station.Lon);


        if (
            !Number.isFinite(stationLat) ||
            !Number.isFinite(stationLon)
        ) {
            continue;
        }


        // ----------------------------------------------------
        // Chỉ lấy trạm có forecast
        // ----------------------------------------------------

        const code =
            normalizeStationCode(
                station.MaTram
            );


        const stationData =
            mergedData?.[code];


        if (
            !stationData ||
            !Array.isArray(
                stationData.forecast
            )
        ) {
            continue;
        }


        // ----------------------------------------------------
        // Khoảng cách
        // ----------------------------------------------------

        const distanceKm =
            haversineDistance(
                lat,
                lon,
                stationLat,
                stationLon
            );


        if (
            distanceKm > radiusKm
        ) {
            continue;
        }


        results.push({

            MaTram:
                station.MaTram,

            TenTram:
                station.TenTram,

            LoaiTram:
                station.LoaiTram,

            Tinh:
                station.Tinh,

            Lat:
                stationLat,

            Lon:
                stationLon,

            distanceKm:
                round(
                    distanceKm,
                    2
                ),

        });

    }


    // Gần nhất → xa nhất
    results.sort(
        (a, b) =>
            a.distanceKm -
            b.distanceKm
    );


    return results;
}

// ==========================================================
// 5C. GET AREA FORECAST AROUND LOCATION
// ==========================================================

export async function getAreaForecastAroundLocation(
    lat,
    lon,
    options = {}
) {

    const {

        hours =
            DEFAULT_PERIOD_HOURS,

        radiusKm = 50,

        threshold = 50,

    } = options;


    const stations =
        await getStationsAroundLocation(
            lat,
            lon,
            radiusKm
        );


    const summaries = [];


    // ------------------------------------------------------
    // Phân tích từng trạm
    // ------------------------------------------------------

    for (
        const station
        of stations
    ) {

        const summary =
            await summarizeForecast(
                station.MaTram,
                {
                    hours
                }
            );


        if (!summary) {
            continue;
        }


        summaries.push({

            ...summary,

            distanceKm:
                station.distanceKm,

        });

    }


    // ------------------------------------------------------
    // Không có trạm
    // ------------------------------------------------------

    if (!summaries.length) {

        return {

            type:
                "AREA_AROUND_LOCATION",

            location: {

                lat:
                    Number(lat),

                lon:
                    Number(lon),

            },

            radiusKm,

            numberOfStations:
                0,

            stations: [],

            areaMin:
                null,

            areaMax:
                null,

            areaMean:
                null,

            maxStation:
                null,

            threshold,

            stationsAboveThreshold:
                0,

            percentageAboveThreshold:
                0,

        };

    }


    // ------------------------------------------------------
    // Tổng lượng mưa 24/48/72... giờ của từng trạm
    // ------------------------------------------------------

    const totals =
        summaries
            .map(
                item =>
                    item.total
            )
            .filter(
                isValidNumber
            );


    const areaMin =
        Math.min(
            ...totals
        );


    const areaMax =
        Math.max(
            ...totals
        );


    const areaMean =
        totals.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        totals.length;


    // ------------------------------------------------------
    // Trạm có tổng mưa lớn nhất
    // ------------------------------------------------------

    const maxStation =
        summaries.reduce(
            (current, item) => {

                if (!current) {
                    return item;
                }


                return (
                    item.total >
                    current.total
                )
                    ? item
                    : current;

            },
            null
        );


    // ------------------------------------------------------
    // Số trạm vượt ngưỡng
    // ------------------------------------------------------

    const validThreshold =
        Number.isFinite(
            Number(threshold)
        )
            ? Number(threshold)
            : 50;


    const stationsAboveThreshold =
        summaries.filter(
            item =>
                isValidNumber(item.total) &&
                item.total >=
                    validThreshold
        );


    const percentageAboveThreshold =
        summaries.length > 0
            ? (
                stationsAboveThreshold.length /
                summaries.length
            ) * 100
            : 0;


    // ------------------------------------------------------
    // Phân loại mức mưa khu vực
    // ------------------------------------------------------

    let assessment =
        "MƯA NHẸ";


    if (
        areaMax >= 50
    ) {
        assessment =
            "CÓ KHẢ NĂNG MƯA LỚN CỤC BỘ";
    }


    if (
        areaMean >= 50
    ) {
        assessment =
            "MƯA LỚN TRÊN DIỆN RỘNG";
    }


    if (
        areaMean >= 100
    ) {
        assessment =
            "MƯA RẤT LỚN";
    }


    return {

        type:
            "AREA_AROUND_LOCATION",

        location: {

            lat:
                Number(lat),

            lon:
                Number(lon),

        },

        radiusKm,

        hours,

        numberOfStations:
            summaries.length,

        stations:
            summaries,

        areaMin:
            round(areaMin),

        areaMax:
            round(areaMax),

        areaMean:
            round(areaMean),

        maxStation,

        threshold:
            validThreshold,

        stationsAboveThreshold:
            stationsAboveThreshold.length,

        percentageAboveThreshold:
            round(
                percentageAboveThreshold
            ),

        assessment,

    };
}

// ==========================================================
// 6. GET FORECAST AT LOCATION
// ==========================================================

export async function getForecastAtLocation(
    lat,
    lon,
    options = {}
) {

    const nearest =
        await getNearestStation(
            lat,
            lon,
            options.maxDistanceKm ??
                DEFAULT_MAX_DISTANCE_KM
        );


    if (!nearest) {
        return null;
    }


    const summary =
        await summarizeForecast(
            nearest.MaTram,
            options
        );


    if (!summary) {
        return null;
    }


    return {

        location: {

            lat:
                Number(lat),

            lon:
                Number(lon),

        },


        nearestStation:
            nearest,


        rainfall: {

            startTime:
                summary.startTime,

            endTime:
                summary.endTime,

            numberOfHours:
                summary.numberOfHours,

            total:
                summary.total,

            min:
                summary.min,

            max:
                summary.max,

            mean:
                summary.mean,

            peakValue:
                summary.peakValue,

            peakTime:
                summary.peakTime,

        },


        series:
            summary.series,

    };
}


// ==========================================================
// 7. GET STATIONS BY PROVINCE
// ==========================================================

function normalizeVietnameseText(value = "") {

    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .toLowerCase()
        .trim();

}


export async function getStationsByProvince(
    province
) {

    const {
        tramList
    } = await getData();


    if (!province) {
        return [...tramList];
    }


    const target =
        normalizeVietnameseText(
            province
        );


    return tramList.filter(
        station => {

            const stationProvince =
                normalizeVietnameseText(
                    station.Tinh || ""
                );


            return (
                stationProvince ===
                target
            );

        }
    );
}


// ==========================================================
// 8. GET AREA FORECAST
// ==========================================================

export async function getAreaForecast(
    province,
    options = {}
) {

    const stations =
        await getStationsByProvince(
            province
        );


    const summaries = [];


    for (
        const station
        of stations
    ) {

        const summary =
            await summarizeForecast(
                station.MaTram,
                options
            );


        if (summary) {
            summaries.push(
                summary
            );
        }
    }


    if (!summaries.length) {

        return {

            province,

            numberOfStations: 0,

            stations: [],

            areaMin: null,

            areaMax: null,

            areaMean: null,

            maxStation: null,

        };
    }


    const totals =
        summaries
            .map(
                item =>
                    item.total
            )
            .filter(
                isValidNumber
            );


    const areaMin =
        Math.min(...totals);


    const areaMax =
        Math.max(...totals);


    const areaMean =
        totals.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        totals.length;


    const maxStation =
        summaries.reduce(
            (current, item) => {

                if (!current) {
                    return item;
                }


                return (
                    item.total >
                    current.total
                )
                    ? item
                    : current;

            },
            null
        );


    return {

        province,

        numberOfStations:
            summaries.length,

        stations:
            summaries,

        areaMin:
            round(areaMin),

        areaMax:
            round(areaMax),

        areaMean:
            round(areaMean),

        maxStation,

    };
}


// ==========================================================
// 9. GET HEAVY RAINFALL STATIONS
// ==========================================================

export async function getHeavyRainfallStations(
    options = {}
) {

    const {

        hours = 24,

        threshold = 50,

        province = null,

        limit = 20,

    } = options;


    const stations =
        province
            ? await getStationsByProvince(
                province
            )
            : (
                await getData()
            ).tramList;


    const results = [];


    for (
        const station
        of stations
    ) {

        const summary =
            await summarizeForecast(
                station.MaTram,
                {
                    hours
                }
            );


        if (!summary) {
            continue;
        }


        if (
            summary.total >=
            threshold
        ) {

            results.push(
                summary
            );

        }
    }


    results.sort(
        (a, b) =>
            b.total - a.total
    );


    return results.slice(
        0,
        limit
    );
}


// ==========================================================
// 10. GET FORECAST TIMES
// ==========================================================

export async function getForecastTimes() {

    return [
        ...(
            await getForecastTimesInternal()
        )
    ];
}


// ==========================================================
// 11. GET FORECAST INFO
// ==========================================================

export async function getForecastInfo() {

    const times =
        await getForecastTimesInternal();


    const {
        tramList
    } = await getData();


    return {

        model:
            "GFS",

        numberOfStations:
            tramList.length,

        numberOfForecastSteps:
            times.length,

        forecastHours:
            times.length,

        startTime:
            times[0] || null,

        endTime:
            times[
                times.length - 1
            ] || null,

        timestepHours:
            1,

    };
}


// ==========================================================
// 12. SEARCH STATION
// ==========================================================

export async function searchStations(
    keyword,
    options = {}
) {

    if (!keyword) {
        return [];
    }


    const {

        province = null,

        limit = 20,

    } = options;


    const text =
        normalizeVietnameseText(
            keyword
        );


    const candidates =
        province
            ? await getStationsByProvince(
                province
            )
            : (
                await getData()
            ).tramList;


    const results =
        candidates.filter(
            station => {

                const code =
                    normalizeVietnameseText(
                        station.MaTram || ""
                    );


                const name =
                    normalizeVietnameseText(
                        station.TenTram || ""
                    );


                const stationProvince =
                    normalizeVietnameseText(
                        station.Tinh || ""
                    );


                return (

                    code.includes(text) ||

                    name.includes(text) ||

                    stationProvince.includes(text)

                );

            }
        );


    return results.slice(
        0,
        limit
    );
}


// ==========================================================
// 13. GET ALL FORECAST STATIONS
// ==========================================================

export async function getForecastStations() {

    const {
        mergedData,
        tramList
    } = await getData();


    return tramList.filter(
        station => {

            const code =
                normalizeStationCode(
                    station.MaTram
                );


            const data =
                mergedData?.[code];


            return (

                data &&

                Array.isArray(
                    data.forecast
                )

            );

        }
    );
}

// ==========================================================
// 14. GET FORECAST TIMESERIES
// ==========================================================

export async function getForecastTimeseries(
    maTram,
    options = {}
) {

    const period =
        await getForecastPeriod(
            maTram,
            options
        );

    if (
        !period ||
        !period.series ||
        !period.series.length
    ) {
        return [];
    }

    // ======================================================
    // THỜI GIAN HIỆN TẠI
    // ======================================================

    const now = new Date();


    // ======================================================
    // TÌM MỐC FORECAST ĐẦU TIÊN >= HIỆN TẠI
    // ======================================================

    const startIndex =
        period.series.findIndex(
            item =>
                new Date(item.time) >= now
        );


    if (startIndex === -1) {
        return [];
    }


    // ======================================================
    // SỐ GIỜ CẦN LẤY
    // ======================================================

    const hours =
        options.hours ??
        24;


    // GFS: 6 giờ / bước
    const STEP_HOURS = 6;

    const numberOfSteps =
        Math.ceil(
            hours / STEP_HOURS
        );


    // ======================================================
    // LẤY CHUỖI TỪ MỐC HIỆN TẠI
    // ======================================================

    return period.series
        .slice(
            startIndex,
            startIndex + numberOfSteps
        )
        .map(item => ({
            time: item.time,

            rainfall:
                round(
                    item.value
                ),
        }));
}

// ==========================================================
// 15. GET PEAK FORECAST
// ==========================================================

export async function getPeakForecast(
    maTram,
    options = {}
) {

    const {

        hours =
            MAX_FORECAST_HOURS,

        topN = 5,

    } = options;


    const period =
        await getForecastPeriod(
            maTram,
            {
                hours
            }
        );


    if (
        !period ||
        !period.series.length
    ) {
        return [];
    }


    const sorted =
        [...period.series]
            .sort(
                (a, b) =>
                    b.value -
                    a.value
            );


    return sorted
        .slice(0, topN)
        .map(
            item => ({

                index:
                    item.index,

                time:
                    item.time,

                rainfall:
                    round(
                        item.value
                    ),

            })
        );
}


// ==========================================================
// 16. GET FORECAST TOTAL
// ==========================================================

export async function getForecastTotal(
    maTram,
    hours = 24
) {

    const summary =
        await summarizeForecast(
            maTram,
            {
                hours
            }
        );


    if (!summary) {
        return null;
    }


    return {

        MaTram:
            summary.MaTram,

        TenTram:
            summary.TenTram,

        hours:
            summary.numberOfHours,

        total:
            summary.total,

    };
}


// ==========================================================
// 17. GET FORECAST MAX
// ==========================================================

export async function getForecastMax(
    maTram,
    hours = 24
) {

    const summary =
        await summarizeForecast(
            maTram,
            {
                hours
            }
        );


    if (!summary) {
        return null;
    }


    return {

        MaTram:
            summary.MaTram,

        TenTram:
            summary.TenTram,

        hours:
            summary.numberOfHours,

        max:
            summary.max,

        peakTime:
            summary.peakTime,

    };
}


// ==========================================================
// 18. VALIDATE FORECAST DATA
// ==========================================================

export async function validateForecastData() {

    const {
        mergedData,
        timeData,
        tramList
    } = await getData();


    const times =
        Array.isArray(
            timeData?.forecast
        )
            ? timeData.forecast
            : [];


    const stationCount =
        tramList.length;


    let validStations = 0;

    let invalidStations = 0;


    const problems = [];


    for (
        const station
        of tramList
    ) {

        const code =
            normalizeStationCode(
                station.MaTram
            );


        const data =
            mergedData?.[code];


        if (
            !data ||
            !Array.isArray(
                data.forecast
            )
        ) {

            invalidStations++;


            problems.push({

                MaTram:
                    code,

                problem:
                    "Không có forecast",

            });


            continue;
        }


        const forecastLength =
            data.forecast.length;


        if (
            forecastLength !==
            times.length
        ) {

            invalidStations++;


            problems.push({

                MaTram:
                    code,

                problem:
                    "Số bước forecast không khớp",

                forecastLength,

                timeLength:
                    times.length,

            });


            continue;
        }


        validStations++;

    }


    return {

        valid:
            problems.length === 0,

        stationCount,

        validStations,

        invalidStations,

        forecastTimeSteps:
            times.length,

        forecastStart:
            times[0] || null,

        forecastEnd:
            times[
                times.length - 1
            ] || null,

        problems,

    };
}


// ==========================================================
// DEFAULT EXPORT
// ==========================================================

const forecastRainfallService = {

    loadForecastData,

    clearForecastCache,

    getStationForecast,

    getForecastAtTime,

    getForecastPeriod,

    summarizeForecast,

    getNearestStation,

    getStationsAroundLocation,

    getAreaForecastAroundLocation,

    getForecastAtLocation,

    getStationsByProvince,

    getAreaForecast,

    getHeavyRainfallStations,

    getForecastTimes,

    getForecastInfo,

    searchStations,

    getForecastStations,

    getForecastTimeseries,

    getPeakForecast,

    getForecastTotal,

    getForecastMax,

    validateForecastData,

};


export default forecastRainfallService;