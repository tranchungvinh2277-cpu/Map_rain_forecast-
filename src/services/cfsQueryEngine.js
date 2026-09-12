// ==========================================================
// CFS MONTHLY RAINFALL QUERY ENGINE
// ==========================================================
// Source:
// /data/cfs/latest.json
//
// CFS structure:
//
// [
//   {
//     MaTram: "...",
//     TenTram: "...",
//     Tinh: "...",
//     Lat: ...,
//     Lon: ...,
//
//     DataInfo: {
//       TimeSteps: 5,
//       StartTime: "2026/09/01",
//       LastTime: "2027/02/01",
//       LastUpdate: "..."
//     },
//
//     Forecast: {
//       values: [ ... ]
//     }
//   }
// ]
//
// IMPORTANT
// ----------------------------------------------------------
// Month index = StartTime + index
//
// Example:
//
// StartTime = 2026/09/01
// values    = [A, B, C, D, E]
//
// A -> 2026-09
// B -> 2026-10
// C -> 2026-11
// D -> 2026-12
// E -> 2027-01
//
// LastTime is the exclusive end marker.
//
// AREA MODE
// ----------------------------------------------------------
// When the question refers to "khu vực", "quanh trạm",
// "bán kính", etc., the engine calculates the mean of
// all CFS stations within 50 km of the selected station.
//
// Example:
//
// selected station = 375932
// radius = 50 km
//
// For each month:
//
// CFS station 1
// CFS station 2
// CFS station 3
// ...
//        ↓
// mean of valid stations
//        ↓
// regional monthly CFS
// ==========================================================


const CFS_FILE =
    "/data/cfs/latest.json";

const DEFAULT_CFS_RADIUS_KM =
    50;


let cfsCache =
    null;

let cfsLoadingPromise =
    null;


// ==========================================================
// 1. NORMALIZE TEXT
// ==========================================================

function normalizeText(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /đ/g,
            "d"
        )
        .toLowerCase()
        .trim()
        .replace(
            /\s+/g,
            " "
        );
}


// ==========================================================
// 2. SAFE NUMBER
// ==========================================================

function toFiniteNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


// ==========================================================
// 3. LOAD CFS DATA
// ==========================================================

export async function loadCFSData() {

    if (
        Array.isArray(cfsCache)
    ) {

        console.log(
            "[CFS] Using cached data:",
            cfsCache.length,
            "stations"
        );

        return cfsCache;
    }


    if (cfsLoadingPromise) {

        return cfsLoadingPromise;
    }


    console.log(
        "[CFS] Loading:",
        CFS_FILE
    );


    cfsLoadingPromise =
        fetch(
            `${CFS_FILE}?t=${Date.now()}`,
            {
                method: "GET",

                cache: "no-store",

                headers: {
                    "Accept":
                        "application/json, text/plain, */*"
                }
            }
        )

        .then(
            async response => {

                if (!response.ok) {

                    throw new Error(
                        `[CFS] HTTP ${response.status} while loading ${CFS_FILE}`
                    );
                }


                const text =
                    await response.text();


                const trimmed =
                    text.trim();


                if (!trimmed) {

                    throw new Error(
                        `[CFS] Empty CFS file: ${CFS_FILE}`
                    );
                }


                console.log(
                    "[CFS] Response content-type:",
                    response.headers.get(
                        "content-type"
                    )
                );


                console.log(
                    "[CFS] Response preview:",
                    trimmed.slice(
                        0,
                        120
                    )
                );


                if (
                    trimmed.startsWith(
                        "<!DOCTYPE"
                    ) ||
                    trimmed.startsWith(
                        "<html"
                    ) ||
                    trimmed.startsWith(
                        "<HTML"
                    )
                ) {

                    throw new Error(
                        `[CFS] URL trả về HTML thay vì JSON: ${CFS_FILE}.`
                    );
                }


                let data;


                try {

                    data =
                        JSON.parse(
                            trimmed
                        );

                } catch (jsonError) {

                    let jsonText =
                        trimmed;


                    jsonText =
                        jsonText
                            .replace(
                                /^\s*(?:const|let|var)\s+\w+\s*=\s*/,
                                ""
                            )
                            .replace(
                                /^\s*export\s+default\s+/,
                                ""
                            )
                            .replace(
                                /^\s*window\.\w+\s*=\s*/,
                                ""
                            )
                            .replace(
                                /;\s*$/,
                                ""
                            )
                            .trim();


                    try {

                        data =
                            JSON.parse(
                                jsonText
                            );

                    } catch (secondError) {

                        console.error(
                            "[CFS] JSON PARSE ERROR:",
                            jsonError
                        );


                        console.error(
                            "[CFS] Response preview:",
                            trimmed.slice(
                                0,
                                500
                            )
                        );


                        throw new Error(
                            `[CFS] File ${CFS_FILE} không phải JSON hợp lệ. ` +
                            `Preview: ${trimmed.slice(0, 100)}`
                        );
                    }
                }


                if (
                    !Array.isArray(data)
                ) {

                    throw new Error(
                        `[CFS] CFS data must be an array. Received: ${typeof data}`
                    );
                }


                const validStations =
                    data.filter(
                        station =>
                            station &&
                            station.MaTram !==
                                undefined &&
                            station.Forecast &&
                            Array.isArray(
                                station.Forecast.values
                            )
                    );


                console.log(
                    "[CFS] Loaded:",
                    data.length,
                    "stations"
                );


                console.log(
                    "[CFS] Valid stations:",
                    validStations.length
                );


                if (
                    validStations.length
                ) {

                    const sample =
                        validStations[0];


                    console.log(
                        "[CFS] Sample:",
                        {
                            MaTram:
                                sample.MaTram,

                            TenTram:
                                sample.TenTram,

                            StartTime:
                                sample.DataInfo?.StartTime,

                            LastTime:
                                sample.DataInfo?.LastTime,

                            TimeSteps:
                                sample.DataInfo?.TimeSteps,

                            values:
                                sample.Forecast?.values
                        }
                    );
                }


                cfsCache =
                    data;


                return cfsCache;
            }
        )

        .catch(
            error => {

                console.error(
                    "[CFS] LOAD ERROR:",
                    error
                );


                cfsCache =
                    null;


                throw error;
            }
        )

        .finally(
            () => {

                cfsLoadingPromise =
                    null;
            }
        );


    return cfsLoadingPromise;
}


// ==========================================================
// 4. PARSE START DATE
// ==========================================================

function parseStartDate(
    station
) {

    const raw =
        station?.DataInfo?.StartTime;


    if (!raw) {

        return null;
    }


    const match =
        String(raw).match(
            /^(\d{4})[-/](\d{2})[-/](\d{2})/
        );


    if (!match) {

        console.warn(
            "[CFS] Invalid StartTime:",
            raw
        );

        return null;
    }


    const year =
        Number(match[1]);

    const month =
        Number(match[2]);

    const day =
        Number(match[3]);


    if (
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
    ) {

        return null;
    }


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


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
// 5. ADD MONTHS
// ==========================================================

function addMonths(
    date,
    count
) {

    const result =
        new Date(
            date.getTime()
        );


    result.setUTCDate(
        1
    );


    result.setUTCMonth(
        result.getUTCMonth() +
        count
    );


    return result;
}


// ==========================================================
// 6. FORMAT YYYY-MM
// ==========================================================

function formatMonth(
    date
) {

    if (
        !(date instanceof Date) ||
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";
    }


    const year =
        date.getUTCFullYear();


    const month =
        String(
            date.getUTCMonth() + 1
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}`;
}


// ==========================================================
// 7. FORMAT VIETNAMESE MONTH
// ==========================================================

function formatVietnameseMonth(
    monthKey
) {

    if (
        typeof monthKey !==
        "string"
    ) {

        return "";
    }


    const parts =
        monthKey.split("-");


    if (
        parts.length !== 2
    ) {

        return monthKey;
    }


    const year =
        parts[0];


    const month =
        Number(parts[1]);


    if (
        !Number.isFinite(month)
    ) {

        return monthKey;
    }


    return `tháng ${month}/${year}`;
}


// ==========================================================
// 8. GET STATION MONTHLY SERIES
// ==========================================================

export function getStationCFSMonthlySeries(
    station
) {

    if (!station) {

        return [];
    }


    const values =
        Array.isArray(
            station?.Forecast?.values
        )
            ? station.Forecast.values
            : [];


    const startDate =
        parseStartDate(
            station
        );


    if (
        !startDate ||
        !values.length
    ) {

        console.warn(
            "[CFS] Cannot build monthly series:",
            station?.MaTram
        );

        return [];
    }


    return values.map(
        (
            rawValue,
            index
        ) => {

            const date =
                addMonths(
                    startDate,
                    index
                );


            const month =
                formatMonth(
                    date
                );


            return {

                index,

                month,

                label:
                    formatVietnameseMonth(
                        month
                    ),

                value:
                    toFiniteNumber(
                        rawValue
                    ),

                stationId:
                    station?.MaTram ??
                    null,

                stationName:
                    station?.TenTram ??
                    "",

                province:
                    station?.Tinh ??
                    "",

                lat:
                    toFiniteNumber(
                        station?.Lat
                    ),

                lon:
                    toFiniteNumber(
                        station?.Lon
                    )
            };
        }
    );
}


// ==========================================================
// 9. FIND STATION BY CODE
// ==========================================================

export async function findCFSStation(
    stationCode
) {

    if (
        stationCode === null ||
        stationCode === undefined ||
        stationCode === ""
    ) {

        return null;
    }


    const data =
        await loadCFSData();


    const target =
        normalizeText(
            stationCode
        );


    const station =
        data.find(
            item =>
                normalizeText(
                    item?.MaTram
                ) === target
        );


    console.log(
        "[CFS] FIND STATION:",
        stationCode,
        "=>",
        station
            ? station.TenTram
            : "NOT FOUND"
    );


    return station || null;
}


// ==========================================================
// 10. FIND STATION BY NAME
// ==========================================================

export async function findCFSStationByName(
    stationName
) {

    if (!stationName) {

        return null;
    }


    const data =
        await loadCFSData();


    const target =
        normalizeText(
            stationName
        );


    const exact =
        data.find(
            station =>
                normalizeText(
                    station?.TenTram
                ) === target
        );


    if (exact) {

        return exact;
    }


    const partial =
        data.find(
            station => {

                const name =
                    normalizeText(
                        station?.TenTram
                    );


                return (
                    name.includes(target) ||
                    target.includes(name)
                );
            }
        );


    return partial || null;
}


// ==========================================================
// 11. FIND STATIONS BY PROVINCE
// ==========================================================

export async function getCFSStationsByProvince(
    province
) {

    if (!province) {

        return [];
    }


    const data =
        await loadCFSData();


    const target =
        normalizeText(
            province
        );


    return data.filter(
        station =>
            normalizeText(
                station?.Tinh
            ) === target
    );
}


// ==========================================================
// 12. GET STATION MONTHS
// ==========================================================

export async function getCFSMonths(
    stationCode
) {

    const station =
        await findCFSStation(
            stationCode
        );


    if (!station) {

        return [];
    }


    return getStationCFSMonthlySeries(
        station
    );
}


// ==========================================================
// 13. GET ONE MONTH
// ==========================================================

export async function getCFSMonthlyRain(
    stationCode,
    month
) {

    const series =
        await getCFSMonths(
            stationCode
        );


    if (!series.length) {

        return null;
    }


    return (
        series.find(
            item =>
                item.month === month
        ) ||
        null
    );
}


// ==========================================================
// 14. SUM PERIOD
// ==========================================================

export async function getCFSSum(
    stationCode,
    startIndex = 0,
    endIndex = null
) {

    const series =
        await getCFSMonths(
            stationCode
        );


    if (!series.length) {

        return null;
    }


    const parsedStart =
        Number(
            startIndex
        );


    const safeStart =
        Number.isFinite(
            parsedStart
        )
            ? Math.max(
                0,
                Math.floor(
                    parsedStart
                )
            )
            : 0;


    let end;


    if (
        endIndex === null ||
        endIndex === undefined
    ) {

        end =
            series.length;

    } else {

        const parsedEnd =
            Number(
                endIndex
            );


        end =
            Number.isFinite(
                parsedEnd
            )
                ? Math.min(
                    series.length,
                    Math.floor(
                        parsedEnd
                    ) + 1
                )
                : series.length;
    }


    const selected =
        series.slice(
            safeStart,
            end
        );


    const valid =
        selected.filter(
            item =>
                Number.isFinite(
                    item?.value
                )
        );


    if (!valid.length) {

        return null;
    }


    const total =
        valid.reduce(
            (
                sum,
                item
            ) =>
                sum + item.value,
            0
        );


    return {

        stationId:
            series[0]?.stationId ??
            stationCode,

        stationName:
            series[0]?.stationName ??
            "",

        province:
            series[0]?.province ??
            "",

        months:
            valid.length,

        total,

        mean:
            total /
            valid.length,

        series:
            selected
    };
}


// ==========================================================
// 15. SUMMARY ONE STATION
// ==========================================================

export async function summarizeCFS(
    stationCode
) {

    const series =
        await getCFSMonths(
            stationCode
        );


    if (!series.length) {

        return null;
    }


    const valid =
        series.filter(
            item =>
                Number.isFinite(
                    item?.value
                )
        );


    if (!valid.length) {

        return null;
    }


    const max =
        valid.reduce(
            (
                a,
                b
            ) =>
                b.value > a.value
                    ? b
                    : a
        );


    const min =
        valid.reduce(
            (
                a,
                b
            ) =>
                b.value < a.value
                    ? b
                    : a
        );


    const total =
        valid.reduce(
            (
                sum,
                item
            ) =>
                sum + item.value,
            0
        );


    return {

        stationId:
            stationCode,

        stationName:
            series[0]?.stationName ??
            "",

        province:
            series[0]?.province ??
            "",

        months:
            series.length,

        validMonths:
            valid.length,

        total,

        mean:
            total /
            valid.length,

        max,

        min,

        series
    };
}


// ==========================================================
// 16. PROVINCE MONTHLY STATISTICS
// ==========================================================

export async function summarizeCFSProvince(
    province
) {

    const stations =
        await getCFSStationsByProvince(
            province
        );


    if (!stations.length) {

        return null;
    }


    const stationSeries =
        stations.map(
            station => ({

                station,

                series:
                    getStationCFSMonthlySeries(
                        station
                    )
            })
        );


    const allMonths =
        new Set();


    stationSeries.forEach(
        item => {

            item.series.forEach(
                month => {

                    if (
                        month?.month
                    ) {

                        allMonths.add(
                            month.month
                        );
                    }
                }
            );
        }
    );


    const sortedMonths =
        Array.from(
            allMonths
        ).sort();


    const monthly =
        sortedMonths.map(
            month => {

                const values =
                    [];


                stationSeries.forEach(
                    item => {

                        const record =
                            item.series.find(
                                x =>
                                    x.month ===
                                    month
                            );


                        if (
                            record &&
                            Number.isFinite(
                                record.value
                            )
                        ) {

                            values.push({
                                station:
                                    item.station,

                                value:
                                    record.value
                            });
                        }
                    }
                );


                if (!values.length) {

                    return {

                        month,

                        label:
                            formatVietnameseMonth(
                                month
                            ),

                        count: 0,

                        mean: null,

                        max: null,

                        min: null
                    };
                }


                const total =
                    values.reduce(
                        (
                            sum,
                            item
                        ) =>
                            sum + item.value,
                        0
                    );


                const max =
                    values.reduce(
                        (
                            a,
                            b
                        ) =>
                            b.value > a.value
                                ? b
                                : a
                    );


                const min =
                    values.reduce(
                        (
                            a,
                            b
                        ) =>
                            b.value < a.value
                                ? b
                                : a
                    );


                return {

                    month,

                    label:
                        formatVietnameseMonth(
                            month
                        ),

                    count:
                        values.length,

                    mean:
                        total /
                        values.length,

                    max: {

                        value:
                            max.value,

                        stationId:
                            max.station?.MaTram ??
                            null,

                        stationName:
                            max.station?.TenTram ??
                            ""
                    },

                    min: {

                        value:
                            min.value,

                        stationId:
                            min.station?.MaTram ??
                            null,

                        stationName:
                            min.station?.TenTram ??
                            ""
                    }
                };
            }
        );


    return {

        province,

        stationCount:
            stations.length,

        months:
            monthly,

        stations
    };
}


// ==========================================================
// 17. HAVERSINE DISTANCE
// ==========================================================

function haversineDistanceKm(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R =
        6371;


    const dLat =
        (
            lat2 - lat1
        ) *
        Math.PI /
        180;


    const dLon =
        (
            lon2 - lon1
        ) *
        Math.PI /
        180;


    const lat1Rad =
        lat1 *
        Math.PI /
        180;


    const lat2Rad =
        lat2 *
        Math.PI /
        180;


    const a =
        Math.sin(
            dLat / 2
        ) ** 2 +
        Math.cos(
            lat1Rad
        ) *
        Math.cos(
            lat2Rad
        ) *
        Math.sin(
            dLon / 2
        ) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(
                1 - a
            )
        );


    return R * c;
}


// ==========================================================
// 18. GET CFS STATIONS WITHIN RADIUS
// ==========================================================

export async function getCFSStationsWithinRadius(
    stationCode,
    radiusKm = DEFAULT_CFS_RADIUS_KM
) {

    const stations =
        await loadCFSData();


    const center =
        stations.find(
            station =>
                normalizeText(
                    station?.MaTram
                ) ===
                normalizeText(
                    stationCode
                )
        );


    if (!center) {

        console.warn(
            "[CFS AREA] Center station not found:",
            stationCode
        );

        return [];
    }


    const centerLat =
        toFiniteNumber(
            center.Lat
        );


    const centerLon =
        toFiniteNumber(
            center.Lon
        );


    if (
        centerLat === null ||
        centerLon === null
    ) {

        console.warn(
            "[CFS AREA] Center station has invalid coordinates:",
            stationCode
        );

        return [];
    }


    const safeRadius =
        Number.isFinite(
            Number(radiusKm)
        )
            ? Number(radiusKm)
            : DEFAULT_CFS_RADIUS_KM;


    const result =
        stations
            .map(
                station => {

                    const lat =
                        toFiniteNumber(
                            station?.Lat
                        );


                    const lon =
                        toFiniteNumber(
                            station?.Lon
                        );


                    if (
                        lat === null ||
                        lon === null
                    ) {

                        return null;
                    }


                    const distanceKm =
                        haversineDistanceKm(
                            centerLat,
                            centerLon,
                            lat,
                            lon
                        );


                    return {

                        station,

                        distanceKm
                    };
                }
            )
            .filter(
                item =>
                    item &&
                    item.distanceKm <=
                        safeRadius
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.distanceKm -
                    b.distanceKm
            );


    console.log(
        "[CFS AREA] Center:",
        {
            MaTram:
                center.MaTram,

            TenTram:
                center.TenTram,

            Lat:
                centerLat,

            Lon:
                centerLon
        }
    );


    console.log(
        "[CFS AREA] Radius:",
        safeRadius,
        "km"
    );


    console.log(
        "[CFS AREA] Stations:",
        result.length
    );


    console.log(
        "[CFS AREA] Station list:",
        result.map(
            item => ({
                MaTram:
                    item.station?.MaTram,

                TenTram:
                    item.station?.TenTram,

                distanceKm:
                    Number(
                        item.distanceKm.toFixed(
                            2
                        )
                    )
            })
        )
    );


    return result;
}


// ==========================================================
// 19. SUMMARIZE CFS AREA
// ==========================================================

export async function summarizeCFSArea(
    stationCode,
    options = {}
) {

    const radiusKm =
        Number.isFinite(
            Number(
                options.radiusKm
            )
        )
            ? Number(
                options.radiusKm
            )
            : DEFAULT_CFS_RADIUS_KM;


    const nearby =
        await getCFSStationsWithinRadius(
            stationCode,
            radiusKm
        );


    if (!nearby.length) {

        console.warn(
            "[CFS AREA] No stations within radius:",
            stationCode,
            radiusKm
        );

        return null;
    }


    const center =
        nearby[0];


    const monthlyMap =
        new Map();


    // ------------------------------------------------------
    // Collect each station's monthly value
    // ------------------------------------------------------

    nearby.forEach(
        item => {

            const station =
                item.station;


            const series =
                getStationCFSMonthlySeries(
                    station
                );


            series.forEach(
                record => {

                    if (
                        !record?.month ||
                        !Number.isFinite(
                            record.value
                        )
                    ) {

                        return;
                    }


                    if (
                        !monthlyMap.has(
                            record.month
                        )
                    ) {

                        monthlyMap.set(
                            record.month,
                            []
                        );
                    }


                    monthlyMap
                        .get(
                            record.month
                        )
                        .push({
                            value:
                                record.value,

                            stationId:
                                station.MaTram,

                            stationName:
                                station.TenTram,

                            distanceKm:
                                item.distanceKm
                        });
                }
            );
        }
    );


    const sortedMonths =
        Array.from(
            monthlyMap.keys()
        ).sort();


    const monthly =
        sortedMonths.map(
            month => {

                const values =
                    monthlyMap.get(
                        month
                    ) || [];


                if (!values.length) {

                    return {

                        month,

                        label:
                            formatVietnameseMonth(
                                month
                            ),

                        count: 0,

                        mean: null,

                        max: null,

                        min: null
                    };
                }


                const total =
                    values.reduce(
                        (
                            sum,
                            item
                        ) =>
                            sum +
                            item.value,
                        0
                    );


                const mean =
                    total /
                    values.length;


                const max =
                    values.reduce(
                        (
                            a,
                            b
                        ) =>
                            b.value >
                            a.value
                                ? b
                                : a
                    );


                const min =
                    values.reduce(
                        (
                            a,
                            b
                        ) =>
                            b.value <
                            a.value
                                ? b
                                : a
                    );


                return {

                    month,

                    label:
                        formatVietnameseMonth(
                            month
                        ),

                    count:
                        values.length,

                    mean,

                    max: {

                        value:
                            max.value,

                        stationId:
                            max.stationId,

                        stationName:
                            max.stationName,

                        distanceKm:
                            max.distanceKm
                    },

                    min: {

                        value:
                            min.value,

                        stationId:
                            min.stationId,

                        stationName:
                            min.stationName,

                        distanceKm:
                            min.distanceKm
                    }
                };
            }
        );


    const validMonthly =
        monthly.filter(
            item =>
                Number.isFinite(
                    item.mean
                )
        );


    if (!validMonthly.length) {

        return null;
    }


    const total =
        validMonthly.reduce(
            (
                sum,
                item
            ) =>
                sum + item.mean,
            0
        );


    const mean =
        total /
        validMonthly.length;


    const max =
        validMonthly.reduce(
            (
                a,
                b
            ) =>
                b.mean > a.mean
                    ? b
                    : a
        );


    const min =
        validMonthly.reduce(
            (
                a,
                b
            ) =>
                b.mean < a.mean
                    ? b
                    : a
        );


    return {

        success: true,

        source: "CFS",

        area: true,

        stationCode,

        station:
            center.station?.TenTram ??
            "",

        province:
            center.station?.Tinh ??
            "",

        centerStation: {

            MaTram:
                center.station?.MaTram ??
                stationCode,

            TenTram:
                center.station?.TenTram ??
                "",

            Tinh:
                center.station?.Tinh ??
                "",

            Lat:
                toFiniteNumber(
                    center.station?.Lat
                ),

            Lon:
                toFiniteNumber(
                    center.station?.Lon
                )
        },

        radiusKm,

        stationCount:
            nearby.length,

        monthly:

            validMonthly,

        total,

        mean,

        max,

        min,

        series:
            validMonthly
    };
}


// ==========================================================
// 20. EXTRACT EXPLICIT MONTH
// ==========================================================

function extractMonth(
    question
) {

    const q =
        normalizeText(
            question
        );


    let match =
        q.match(
            /\b(0?[1-9]|1[0-2])\s*[-/]\s*(20\d{2})\b/
        );


    if (match) {

        return `${match[2]}-${String(
            Number(match[1])
        ).padStart(
            2,
            "0"
        )}`;
    }


    match =
        q.match(
            /thang\s+(0?[1-9]|1[0-2])\s+nam\s+(20\d{2})/
        );


    if (match) {

        return `${match[2]}-${String(
            Number(match[1])
        ).padStart(
            2,
            "0"
        )}`;
    }


    return null;
}


// ==========================================================
// 21. EXTRACT MONTH NUMBER
// ==========================================================

function extractMonthNumber(
    question
) {

    const q =
        normalizeText(
            question
        );


    const match =
        q.match(
            /\bthang\s+(0?[1-9]|1[0-2])\b/
        );


    if (!match) {

        return null;
    }


    return Number(
        match[1]
    );
}


// ==========================================================
// 22. RESOLVE MONTH AGAINST CFS SERIES
// ==========================================================

function resolveMonthFromSeries(
    question,
    series
) {

    if (
        !Array.isArray(series) ||
        !series.length
    ) {

        return null;
    }


    const explicitMonth =
        extractMonth(
            question
        );


    if (explicitMonth) {

        const exists =
            series.some(
                item =>
                    item?.month ===
                    explicitMonth
            );


        return exists
            ? explicitMonth
            : null;
    }


    const monthNumber =
        extractMonthNumber(
            question
        );


    if (!monthNumber) {

        return null;
    }


    const monthText =
        String(
            monthNumber
        ).padStart(
            2,
            "0"
        );


    const candidates =
        series
            .filter(
                item =>
                    typeof item?.month ===
                        "string" &&
                    item.month.endsWith(
                        `-${monthText}`
                    )
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.month.localeCompare(
                        b.month
                    )
            );


    if (!candidates.length) {

        return null;
    }


    return candidates[0].month;
}


// ==========================================================
// 23. EXTRACT NUMBER OF MONTHS
// ==========================================================

function extractMonths(
    question
) {

    const q =
        normalizeText(
            question
        );


    let match =
        q.match(
            /\b(\d+)\s*thang\b/
        );


    if (match) {

        const value =
            Number(
                match[1]
            );


        if (
            Number.isFinite(value) &&
            value > 0
        ) {

            return value;
        }
    }


    if (
        q.includes("ba thang")
    ) {

        return 3;
    }


    if (
        q.includes("sau thang")
    ) {

        return 6;
    }


    if (
        q.includes("bon thang")
    ) {

        return 4;
    }


    if (
        q.includes("nam thang")
    ) {

        return 5;
    }


    if (
        q.includes("bay thang")
    ) {

        return 7;
    }


    if (
        q.includes("tam thang")
    ) {

        return 8;
    }


    if (
        q.includes("chin thang")
    ) {

        return 9;
    }


    if (
        q.includes("muoi thang")
    ) {

        return 10;
    }


    return null;
}


// ==========================================================
// 24. DETECT AREA QUESTION
// ==========================================================

export function isCFSAreaQuestion(
    question
) {

    const q =
        normalizeText(
            question
        );


    const areaKeywords = [

        "khu vuc",

        "khu vuc nay",

        "khu vuc quanh day",

        "quanh tram",

        "quanh tram nay",

        "xung quanh tram",

        "xung quanh day",

        "ban kinh",

        "pham vi",

        "trong khu vuc",

        "toan khu vuc",

        "khu vuc lan can",

        "lan can tram",

        "gan tram",

        "quanh day"
    ];


    return areaKeywords.some(
        keyword =>
            q.includes(
                keyword
            )
    );
}


// ==========================================================
// 25. DETECT CFS INTENT
// ==========================================================

export function detectCFSIntent(
    question
) {

    const q =
        normalizeText(
            question
        );


    const asksMaxMonth =
        (
            q.includes("thang nao") ||
            q.includes("thang nao mua") ||
            q.includes("thang mua")
        ) &&
        (
            q.includes("mua nhieu") ||
            q.includes("cao nhat") ||
            q.includes("lon nhat") ||
            q.includes("nhieu nhat") ||
            q.includes("cao") ||
            q.includes("lon")
        );


    if (
        asksMaxMonth
    ) {

        return "CFS_MAX_MONTH";
    }


    if (
        q.includes(
            "thang co luong mua cao nhat"
        ) ||
        q.includes(
            "thang co mua cao nhat"
        ) ||
        q.includes(
            "thang mua lon nhat"
        ) ||
        q.includes(
            "thang mua nhieu nhat"
        )
    ) {

        return "CFS_MAX_MONTH";
    }


    if (
        q.includes("tong mua") ||
        q.includes("tong luong mua") ||
        q.includes("tong du bao") ||
        q.includes("cong luong mua")
    ) {

        return "CFS_TOTAL";
    }


    if (
        q.includes("trung binh") ||
        q.includes("mua trung binh") ||
        q.includes("luong mua trung binh")
    ) {

        return "CFS_MEAN";
    }


    if (
        extractMonth(question) ||
        (
            /thang\s+(0?[1-9]|1[0-2])\b/.test(q) &&
            !q.includes("thang nao")
        )
    ) {

        return "CFS_MONTH";
    }


    if (
        extractMonths(question) ||
        q.includes("cac thang") ||
        q.includes("nhung thang") ||
        q.includes("thang toi") ||
        q.includes("cac thang toi") ||
        q.includes("nhung thang toi") ||
        q.includes("du bao mua thang") ||
        q.includes("du bao theo thang") ||
        q.includes("trong cac thang")
    ) {

        return "CFS_PERIOD";
    }


    return "CFS_SUMMARY";
}


// ==========================================================
// 26. GET PERIOD FROM SERIES
// ==========================================================

function getPeriodSeries(
    series,
    question
) {

    if (
        !Array.isArray(series) ||
        !series.length
    ) {

        return [];
    }


    const numberOfMonths =
        extractMonths(
            question
        );


    if (
        numberOfMonths
    ) {

        return series.slice(
            0,
            numberOfMonths
        );
    }


    return series;
}


// ==========================================================
// 27. QUERY AREA
// ==========================================================

async function queryCFSArea(
    stationCode,
    question,
    intent
) {

    const result =
        await summarizeCFSArea(
            stationCode,
            {
                radiusKm:
                    DEFAULT_CFS_RADIUS_KM
            }
        );


    if (!result) {

        return {

            success: false,

            source: "CFS",

            intent,

            area: true,

            stationCode,

            message:
                `Không có đủ dữ liệu CFS trong bán kính ${DEFAULT_CFS_RADIUS_KM} km quanh trạm ${stationCode}.`
        };
    }


    const fullSeries =
        result.series;


    // ------------------------------------------------------
    // ONE MONTH
    // ------------------------------------------------------

    if (
        intent === "CFS_MONTH"
    ) {

        const month =
            resolveMonthFromSeries(
                question,
                fullSeries
            );


        if (!month) {

            return {

                ...result,

                success: false,

                intent,

                message:
                    "Không xác định được tháng cần tra cứu trong chuỗi CFS khu vực."
            };
        }


        const record =
            fullSeries.find(
                item =>
                    item.month ===
                    month
            );


        if (!record) {

            return {

                ...result,

                success: false,

                intent,

                message:
                    `Không có dữ liệu CFS khu vực cho ${formatVietnameseMonth(month)}.`
            };
        }


        return {

            ...result,

            success: true,

            intent,

            month,

            value:
                record.mean,

            unit: "mm",

            record
        };
    }


    // ------------------------------------------------------
    // SELECT PERIOD
    // ------------------------------------------------------

    const periodSeries =
        getPeriodSeries(
            fullSeries,
            question
        );


    const periodValid =
        periodSeries.filter(
            item =>
                Number.isFinite(
                    item?.mean
                )
        );


    if (!periodValid.length) {

        return {

            ...result,

            success: false,

            intent,

            message:
                "Không có dữ liệu CFS hợp lệ để tính toán khu vực."
        };
    }


    const periodTotal =
        periodValid.reduce(
            (
                sum,
                item
            ) =>
                sum + item.mean,
            0
        );


    const periodMean =
        periodTotal /
        periodValid.length;


    const periodMax =
        periodValid.reduce(
            (
                a,
                b
            ) =>
                b.mean > a.mean
                    ? b
                    : a
        );


    const periodMin =
        periodValid.reduce(
            (
                a,
                b
            ) =>
                b.mean < a.mean
                    ? b
                    : a
        );


    if (
        intent ===
        "CFS_MAX_MONTH"
    ) {

        return {

            ...result,

            success: true,

            intent,

            months:
                periodValid.length,

            max:
                periodMax,

            series:
                periodValid
        };
    }


    if (
        intent ===
        "CFS_TOTAL"
    ) {

        return {

            ...result,

            success: true,

            intent,

            months:
                periodValid.length,

            total:
                periodTotal,

            mean:
                periodMean,

            series:
                periodValid
        };
    }


    if (
        intent ===
        "CFS_MEAN"
    ) {

        return {

            ...result,

            success: true,

            intent,

            months:
                periodValid.length,

            total:
                periodTotal,

            mean:
                periodMean,

            series:
                periodValid
        };
    }


    return {

        ...result,

        success: true,

        intent,

        months:
            periodValid.length,

        total:
            periodTotal,

        mean:
            periodMean,

        max:
            periodMax,

        min:
            periodMin,

        series:
            periodValid
    };
}


// ==========================================================
// 28. QUERY ONE STATION
// ==========================================================

export async function queryCFSStation(
    stationCode,
    question = ""
) {

    console.log(
        "================================"
    );


    console.log(
        "[CFS] QUERY:",
        question
    );


    console.log(
        "[CFS] STATION:",
        stationCode
    );


    try {

        // --------------------------------------------------
        // AREA DETECTION
        // --------------------------------------------------

        const areaQuestion =
            isCFSAreaQuestion(
                question
            );


        console.log(
            "[CFS] AREA QUESTION:",
            areaQuestion
        );


        const intent =
            detectCFSIntent(
                question
            );


        console.log(
            "[CFS] INTENT:",
            intent
        );


        // --------------------------------------------------
        // AREA MODE
        // --------------------------------------------------

        if (
            areaQuestion
        ) {

            console.log(
                "[CFS] MODE: AREA"
            );


            return await queryCFSArea(
                stationCode,
                question,
                intent
            );
        }


        // --------------------------------------------------
        // STATION MODE
        // --------------------------------------------------

        console.log(
            "[CFS] MODE: STATION"
        );


        const station =
            await findCFSStation(
                stationCode
            );


        if (!station) {

            return {

                success: false,

                source: "CFS",

                intent,

                stationCode,

                message:
                    `Không tìm thấy dữ liệu CFS của trạm ${stationCode}.`
            };
        }


        const series =
            getStationCFSMonthlySeries(
                station
            );


        if (!series.length) {

            return {

                success: false,

                source: "CFS",

                intent,

                stationCode,

                station:
                    station.TenTram,

                message:
                    `Trạm ${station.TenTram} không có chuỗi dự báo CFS hợp lệ.`
            };
        }


        const valid =
            series.filter(
                item =>
                    Number.isFinite(
                        item?.value
                    )
            );


        if (!valid.length) {

            return {

                success: false,

                source: "CFS",

                intent,

                stationCode,

                station:
                    station.TenTram,

                message:
                    `Trạm ${station.TenTram} không có giá trị mưa CFS hợp lệ.`
            };
        }


        const total =
            valid.reduce(
                (
                    sum,
                    item
                ) =>
                    sum + item.value,
                0
            );


        const mean =
            total /
            valid.length;


        const max =
            valid.reduce(
                (
                    a,
                    b
                ) =>
                    b.value > a.value
                        ? b
                        : a
            );


        const min =
            valid.reduce(
                (
                    a,
                    b
                ) =>
                    b.value < a.value
                        ? b
                        : a
            );


        const summary = {

            stationId:
                station.MaTram,

            stationName:
                station.TenTram,

            province:
                station.Tinh,

            months:
                series.length,

            validMonths:
                valid.length,

            total,

            mean,

            max,

            min,

            series
        };


        console.log(
            "[CFS] SERIES:",
            series
        );


        // ==================================================
        // ONE MONTH
        // ==================================================

        if (
            intent === "CFS_MONTH"
        ) {

            const month =
                resolveMonthFromSeries(
                    question,
                    series
                );


            if (!month) {

                const explicitMonth =
                    extractMonth(
                        question
                    );


                if (
                    explicitMonth
                ) {

                    return {

                        success: false,

                        source: "CFS",

                        intent,

                        stationCode,

                        station:
                            summary.stationName,

                        month:
                            explicitMonth,

                        message:
                            `Không có dữ liệu CFS cho ${formatVietnameseMonth(explicitMonth)} trong chuỗi hiện tại.`
                    };
                }


                return {

                    success: false,

                    source: "CFS",

                    intent,

                    stationCode,

                    station:
                        summary.stationName,

                    message:
                        "Không xác định được tháng cần tra cứu trong chuỗi CFS hiện tại."
                };
            }


            const record =
                series.find(
                    item =>
                        item.month ===
                        month
                );


            if (!record) {

                return {

                    success: false,

                    source: "CFS",

                    intent,

                    stationCode,

                    station:
                        summary.stationName,

                    month,

                    message:
                        `Không có dữ liệu CFS cho ${formatVietnameseMonth(month)}.`
                };
            }


            return {

                success: true,

                source: "CFS",

                intent,

                stationCode,

                station:
                    summary.stationName,

                province:
                    summary.province,

                month,

                value:
                    record.value,

                unit: "mm",

                record
            };
        }


        // ==================================================
        // TOTAL
        // ==================================================

        if (
            intent === "CFS_TOTAL"
        ) {

            const periodSeries =
                getPeriodSeries(
                    series,
                    question
                );


            const periodValid =
                periodSeries.filter(
                    item =>
                        Number.isFinite(
                            item?.value
                        )
                );


            if (!periodValid.length) {

                return {

                    success: false,

                    source: "CFS",

                    intent,

                    stationCode,

                    station:
                        summary.stationName,

                    message:
                        "Không có dữ liệu hợp lệ để tính tổng lượng mưa."
                };
            }


            const periodTotal =
                periodValid.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum + item.value,
                    0
                );


            return {

                success: true,

                source: "CFS",

                intent,

                stationCode,

                station:
                    summary.stationName,

                province:
                    summary.province,

                months:
                    periodValid.length,

                total:
                    periodTotal,

                mean:
                    periodTotal /
                    periodValid.length,

                series:
                    periodSeries
            };
        }


        // ==================================================
        // MAX MONTH
        // ==================================================

        if (
            intent === "CFS_MAX_MONTH"
        ) {

            const periodSeries =
                getPeriodSeries(
                    series,
                    question
                );


            const periodValid =
                periodSeries.filter(
                    item =>
                        Number.isFinite(
                            item?.value
                        )
                );


            if (!periodValid.length) {

                return {

                    success: false,

                    source: "CFS",

                    intent,

                    stationCode,

                    station:
                        summary.stationName,

                    message:
                        "Không có dữ liệu hợp lệ để tìm tháng mưa lớn nhất."
                };
            }


            const periodMax =
                periodValid.reduce(
                    (
                        a,
                        b
                    ) =>
                        b.value > a.value
                            ? b
                            : a
                );


            return {

                success: true,

                source: "CFS",

                intent,

                stationCode,

                station:
                    summary.stationName,

                province:
                    summary.province,

                max:
                    periodMax,

                months:
                    periodValid.length,

                series:
                    periodSeries
            };
        }


        // ==================================================
        // MEAN
        // ==================================================

        if (
            intent === "CFS_MEAN"
        ) {

            const periodSeries =
                getPeriodSeries(
                    series,
                    question
                );


            const periodValid =
                periodSeries.filter(
                    item =>
                        Number.isFinite(
                            item?.value
                        )
                );


            if (!periodValid.length) {

                return {

                    success: false,

                    source: "CFS",

                    intent,

                    stationCode,

                    station:
                        summary.stationName,

                    message:
                        "Không có dữ liệu hợp lệ để tính lượng mưa trung bình."
                };
            }


            const periodTotal =
                periodValid.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum + item.value,
                    0
                );


            return {

                success: true,

                source: "CFS",

                intent,

                stationCode,

                station:
                    summary.stationName,

                province:
                    summary.province,

                mean:
                    periodTotal /
                    periodValid.length,

                months:
                    periodValid.length,

                total:
                    periodTotal,

                series:
                    periodSeries
            };
        }


        // ==================================================
        // PERIOD / SUMMARY
        // ==================================================

        const periodSeries =
            getPeriodSeries(
                series,
                question
            );


        const periodValid =
            periodSeries.filter(
                item =>
                    Number.isFinite(
                        item?.value
                    )
            );


        const periodTotal =
            periodValid.reduce(
                (
                    sum,
                    item
                ) =>
                    sum + item.value,
                0
            );


        const periodMean =
            periodValid.length
                ? periodTotal /
                  periodValid.length
                : null;


        const periodMax =
            periodValid.length
                ? periodValid.reduce(
                    (
                        a,
                        b
                    ) =>
                        b.value > a.value
                            ? b
                            : a
                )
                : null;


        const periodMin =
            periodValid.length
                ? periodValid.reduce(
                    (
                        a,
                        b
                    ) =>
                        b.value < a.value
                            ? b
                            : a
                )
                : null;


        return {

            success: true,

            source: "CFS",

            intent,

            stationCode,

            station:
                summary.stationName,

            province:
                summary.province,

            months:
                periodValid.length,

            total:
                periodTotal,

            mean:
                periodMean,

            max:
                periodMax,

            min:
                periodMin,

            series:
                periodSeries
        };

    } catch (error) {

        console.error(
            "[CFS] QUERY ERROR:",
            error
        );


        return {

            success: false,

            source: "CFS",

            intent: "CFS_ERROR",

            stationCode,

            message:
                `Lỗi khi truy vấn dữ liệu CFS tại trạm ${stationCode}: ${error?.message || error}`
        };
    }
}


// ==========================================================
// 29. FORMAT NUMBER
// ==========================================================

function formatNumber(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "N/A";
    }


    return number.toFixed(2);
}


// ==========================================================
// 30. FORMAT ANSWER
// ==========================================================

export function formatCFSAnswer(
    result
) {

    if (!result) {

        return "Không có dữ liệu CFS.";
    }


    if (!result.success) {

        return (
            result.message ||
            "Không có dữ liệu CFS."
        );
    }


    // ======================================================
    // AREA PREFIX
    // ======================================================

    const areaPrefix =
        result.area
            ? (
                `khu vực quanh trạm ` +
                `${result.station} ` +
                `(${result.stationCode}), ` +
                `bán kính ${formatNumber(result.radiusKm)} km`
            )
            : (
                `trạm ${result.station} ` +
                `(${result.stationCode})`
            );


    // ======================================================
    // ONE MONTH
    // ======================================================

    if (
        result.intent ===
        "CFS_MONTH"
    ) {

        if (result.area) {

            return (
                `Dự báo CFS khu vực quanh trạm ` +
                `${result.station} ` +
                `(${result.stationCode}), ` +
                `bán kính ${formatNumber(result.radiusKm)} km, ` +
                `trong ${formatVietnameseMonth(result.month)} ` +
                `trung bình khoảng ` +
                `${formatNumber(result.value)} mm ` +
                `(${result.record?.count ?? 0} trạm CFS).`
            );
        }


        return (
            `Dự báo CFS tại trạm ` +
            `${result.station} ` +
            `(${result.stationCode}) ` +
            `trong ${formatVietnameseMonth(result.month)} ` +
            `là khoảng ` +
            `${formatNumber(result.value)} mm.`
        );
    }


    // ======================================================
    // MAX MONTH
    // ======================================================

    if (
        result.intent ===
        "CFS_MAX_MONTH"
    ) {

        if (!result.max) {

            return (
                `Không có dữ liệu để xác định tháng có lượng mưa lớn nhất tại ${areaPrefix}.`
            );
        }


        const label =
            result.max.label ||
            formatVietnameseMonth(
                result.max.month
            );


        if (result.area) {

            return (
                `Theo dự báo CFS tại ${areaPrefix}, ` +
                `tháng có lượng mưa trung bình khu vực lớn nhất là ` +
                `${label}, ` +
                `khoảng ${formatNumber(result.max.mean)} mm ` +
                `(${result.max.count ?? 0} trạm).`
            );
        }


        return (
            `Theo dự báo CFS tại trạm ` +
            `${result.station} ` +
            `(${result.stationCode}), ` +
            `tháng có lượng mưa lớn nhất là ` +
            `${label}, ` +
            `khoảng ${formatNumber(result.max.value)} mm.`
        );
    }


    // ======================================================
    // TOTAL
    // ======================================================

    if (
        result.intent ===
        "CFS_TOTAL"
    ) {

        if (result.area) {

            return (
                `Theo dự báo CFS tại ${areaPrefix}, ` +
                `tổng lượng mưa trung bình khu vực ` +
                `trong ${result.months} tháng khoảng ` +
                `${formatNumber(result.total)} mm.`
            );
        }


        return (
            `Theo CFS, tổng lượng mưa dự báo ` +
            `trong ${result.months} tháng tại trạm ` +
            `${result.station} ` +
            `(${result.stationCode}) ` +
            `khoảng ${formatNumber(result.total)} mm.`
        );
    }


    // ======================================================
    // MEAN
    // ======================================================

    if (
        result.intent ===
        "CFS_MEAN"
    ) {

        if (result.area) {

            return (
                `Lượng mưa CFS trung bình khu vực ` +
                `quanh trạm ${result.station} ` +
                `(${result.stationCode}), ` +
                `bán kính ${formatNumber(result.radiusKm)} km, ` +
                `khoảng ${formatNumber(result.mean)} mm/tháng ` +
                `trong ${result.months} tháng ` +
                `(${result.stationCount} trạm CFS).`
            );
        }


        return (
            `Lượng mưa CFS trung bình ` +
            `tại trạm ${result.station} ` +
            `(${result.stationCode}) ` +
            `khoảng ${formatNumber(result.mean)} mm/tháng ` +
            `trong ${result.months} tháng.`
        );
    }


    // ======================================================
    // PERIOD / SUMMARY
    // ======================================================

    const lines = [];


    if (result.area) {

        lines.push(
            `Dự báo CFS khu vực quanh trạm ` +
            `${result.station} ` +
            `(${result.stationCode}), ` +
            `bán kính ${formatNumber(result.radiusKm)} km:`
        );


        lines.push(
            `• Số trạm CFS phân tích: ${result.stationCount}`
        );

    } else {

        lines.push(
            `Dự báo CFS tại trạm ` +
            `${result.station} ` +
            `(${result.stationCode}):`
        );
    }


    if (
        Array.isArray(
            result.series
        )
    ) {

        result.series.forEach(
            item => {

                if (
                    result.area
                ) {

                    if (
                        Number.isFinite(
                            item?.mean
                        )
                    ) {

                        lines.push(
                            `• ${item.label || formatVietnameseMonth(item.month)}: ` +
                            `${formatNumber(item.mean)} mm`
                        );
                    }

                } else {

                    if (
                        Number.isFinite(
                            item?.value
                        )
                    ) {

                        lines.push(
                            `• ${item.label || formatVietnameseMonth(item.month)}: ` +
                            `${formatNumber(item.value)} mm`
                        );
                    }
                }
            }
        );
    }


    if (
        Number.isFinite(
            result.total
        )
    ) {

        lines.push(
            `• Tổng: ${formatNumber(result.total)} mm`
        );
    }


    if (
        Number.isFinite(
            result.mean
        )
    ) {

        lines.push(
            `• Trung bình: ` +
            `${formatNumber(result.mean)} mm/tháng`
        );
    }


    if (
        result.max
    ) {

        const maxValue =
            result.area
                ? result.max.mean
                : result.max.value;


        if (
            Number.isFinite(
                maxValue
            )
        ) {

            lines.push(
                `• Cao nhất: ` +
                `${result.max.label || formatVietnameseMonth(result.max.month)} ` +
                `(${formatNumber(maxValue)} mm)`
            );
        }
    }


    if (
        result.min
    ) {

        const minValue =
            result.area
                ? result.min.mean
                : result.min.value;


        if (
            Number.isFinite(
                minValue
            )
        ) {

            lines.push(
                `• Thấp nhất: ` +
                `${result.min.label || formatVietnameseMonth(result.min.month)} ` +
                `(${formatNumber(minValue)} mm)`
            );
        }
    }


    return lines.join(
        "\n"
    );
}


// ==========================================================
// 31. GET CFS INFO
// ==========================================================

export async function getCFSInfo() {

    const data =
        await loadCFSData();


    if (!data.length) {

        return {

            stationCount: 0,

            minStartTime: null,

            maxLastTime: null,

            sampleStation: null
        };
    }


    const stationsWithStart =
        data.filter(
            station =>
                station?.DataInfo?.StartTime
        );


    const starts =
        stationsWithStart
            .map(
                station =>
                    station.DataInfo.StartTime
            )
            .filter(Boolean)
            .sort();


    const lasts =
        data
            .map(
                station =>
                    station?.DataInfo?.LastTime
            )
            .filter(Boolean)
            .sort();


    const sample =
        data.find(
            station =>
                Array.isArray(
                    station?.Forecast?.values
                ) &&
                station.Forecast.values.length
        );


    return {

        stationCount:
            data.length,

        minStartTime:
            starts.length
                ? starts[0]
                : null,

        maxLastTime:
            lasts.length
                ? lasts[lasts.length - 1]
                : null,

        sampleStation:
            sample
                ? {

                    MaTram:
                        sample.MaTram,

                    TenTram:
                        sample.TenTram,

                    Tinh:
                        sample.Tinh,

                    StartTime:
                        sample.DataInfo?.StartTime,

                    LastTime:
                        sample.DataInfo?.LastTime,

                    TimeSteps:
                        sample.DataInfo?.TimeSteps,

                    valuesLength:
                        Array.isArray(
                            sample.Forecast?.values
                        )
                            ? sample.Forecast.values.length
                            : 0
                }
                : null
    };
}


// ==========================================================
// 32. CACHE RESET
// ==========================================================

export function clearCFSCache() {

    console.log(
        "[CFS] Cache cleared"
    );


    cfsCache =
        null;


    cfsLoadingPromise =
        null;
}


// ==========================================================
// END OF FILE
// ==========================================================