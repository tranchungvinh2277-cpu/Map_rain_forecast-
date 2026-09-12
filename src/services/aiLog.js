
// ==========================================================
// AI LOG SERVICE
// React WebGIS
// React → Cloudflare Worker → D1
// ==========================================================


const API_URL = (
    process.env.REACT_APP_AI_LOG_API_URL || ""
).trim();


// ==========================================================
// SESSION ID
// ==========================================================

function getSessionId() {

    const KEY =
        "rain_ai_session_id";

    try {

        const existing =
            localStorage.getItem(KEY);

        if (existing) {

            return existing;

        }


        const id =
            `rain-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 10)}`;


        localStorage.setItem(
            KEY,
            id
        );


        return id;

    } catch (error) {

        return `rain-${Date.now()}`;

    }

}


// ==========================================================
// NUMBER
// ==========================================================

function getNumber(value) {

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
// NORMALIZE STATION ID
// OBSERVED có thể trả về dạng "76241.0"
// Chuẩn hóa thành "76241"
// ==========================================================

function normalizeStationId(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }


    const text =
        String(value).trim();


    // Ví dụ: "76241.0" → "76241"
    if (
        /^-?\d+\.0+$/.test(text)
    ) {

        return text.split(".")[0];

    }


    return text;

}

// ==========================================================
// STATION INFORMATION
// ==========================================================

function getStationInfo(
    selectedStation
) {

    if (
        !selectedStation ||
        typeof selectedStation !== "object"
    ) {

        return {};

    }


    return {

        selectedStation:
            selectedStation.TenTram ||
            selectedStation.name ||
            null,

        stationId:
            normalizeStationId(
                selectedStation.MaTram ||
                selectedStation.id ||
                null
            ),

        latitude:
            Number.isFinite(
                Number(selectedStation.Lat)
            )
                ? Number(selectedStation.Lat)
                : null,

        longitude:
            Number.isFinite(
                Number(selectedStation.Lon)
            )
                ? Number(selectedStation.Lon)
                : null

    };

}


// ==========================================================
// MAX STATION
// ==========================================================

function getPeakStation(
    data = {}
) {

    const station =
        data.maxStation ||
        data.peakStation ||
        data.station ||
        {};


    if (
        typeof station !== "object"
    ) {

        return {

            name:
                typeof station === "string"
                    ? station
                    : null,

            id:
                null

        };

    }


    return {

        name:
            station.TenTram ||
            station.name ||
            station.stationName ||
            null,

        id:
            normalizeStationId(
                station.MaTram ||
                station.id ||
                station.stationId ||
                null
            )

    };

}


// ==========================================================
// BUILD OBSERVED / FORECAST SUMMARY
// ==========================================================

function buildSummary(
    result
) {

    if (
        !result ||
        result.success === false
    ) {

        return null;

    }


    const data =
        result.data || {};


    const peakStation =
        getPeakStation(data);


    // ======================================================
    // AREA RESULT
    // ======================================================

    const areaMean =
        getNumber(
            data.areaMean
        );


    const areaMax =
        getNumber(
            data.areaMax
        );


    const stationCount =
        getNumber(
            data.numberOfStations
        );


    if (
        areaMean !== null ||
        areaMax !== null ||
        stationCount !== null
    ) {

        return {

            mean:
                areaMean,

            max:
                areaMax,

            stationCount:
                stationCount,

            peakStation:
                peakStation.name,

            peakStationId:
                peakStation.id,

            period:
                result.period ||
                null

        };

    }


    // ======================================================
    // STATION RESULT
    // ======================================================

    const summary =
        result.summary || {};


    const total =
        result.total;


    const peak =
        result.peak;


    /*
     * Observed station query commonly returns:
     *
     * summary
     * total
     * peak
     *
     * Example:
     *
     * total = 36.10
     * peak = 18.00
     */


    const stationTotal =
        getNumber(
            typeof total === "object"
                ? total.value ??
                  total.rain ??
                  total.amount
                : total
        );


    const stationPeak =
        getNumber(
            typeof peak === "object"
                ? peak.value ??
                  peak.rain ??
                  peak.amount
                : peak
        );


    /*
     * Some engines may put the values
     * inside result.summary.
     */

    const summaryTotal =
        getNumber(
            summary.total ??
            summary.totalRain ??
            summary.rainTotal ??
            summary.amount
        );


    const summaryPeak =
        getNumber(
            summary.peak ??
            summary.max ??
            summary.maxRain
        );


    const finalTotal =
        stationTotal !== null
            ? stationTotal
            : summaryTotal;


    const finalPeak =
        stationPeak !== null
            ? stationPeak
            : summaryPeak;


    /*
     * Number of rainy hours can be useful
     * for station observations.
     */

    const rainyHours =
        getNumber(
            summary.rainyHours ??
            summary.hoursWithRain ??
            summary.numberOfRainHours ??
            result.rainyHours
        );


    if (
        finalTotal !== null ||
        finalPeak !== null ||
        rainyHours !== null
    ) {

        return {

            total:
                finalTotal,

            peak:
                finalPeak,

            rainyHours:
                rainyHours,

            station:
                peakStation.name ||
                null,

            stationId:
                peakStation.id ||
                null,

            period:
                result.period ||
                null

        };

    }


    // ======================================================
    // HEAVY RAIN / OTHER RESULT
    // ======================================================

    if (
        data.numberOfHeavyStations !==
            undefined ||
        data.heavyStations
    ) {

        return {

            heavyStationCount:
                getNumber(
                    data.numberOfHeavyStations
                ),

            threshold:
                getNumber(
                    result.threshold
                ),

            period:
                result.period ||
                null

        };

    }


    return {

        period:
            result.period ||
            null

    };

}


// ==========================================================
// LOG AI QUERY
// ==========================================================

export function logAiQuery(
    options = {}
) {

    /*
     * IMPORTANT:
     *
     * Logging must NEVER interfere
     * with the AI response.
     *
     * This function is intentionally
     * fire-and-forget from AIChat.
     */


    if (!API_URL) {

        return Promise.resolve(false);

    }


    try {

        const {

            question = "",

            answer = "",

            messageId = null,

            intent = null,

            dataSource = null,

            selectedProvince = null,

            selectedStation = null,

            mapContext = {},

            result = null,

            observedResult = null,

            forecastResult = null,

            success = true,

            errorMessage = null

        } = options;


        // ==================================================
        // STATION / MAP CONTEXT
        // ==================================================

        const station =
            getStationInfo(
                selectedStation ||
                mapContext.selectedStation
            );


        // ==================================================
        // RESULT
        // ==================================================

        const resultData =
            result || {};


        // ==================================================
        // OBSERVED RESULT
        // ==================================================

        const observed =
            observedResult ||
            (
                dataSource === "OBSERVED"
                    ? result
                    : null
            );


        // ==================================================
        // FORECAST RESULT
        // ==================================================

        const forecast =
            forecastResult ||
            (
                dataSource === "GFS"
                    ? result
                    : null
            );


        // ==================================================
        // PAYLOAD
        // ==================================================

        const payload = {

            session_id:
                getSessionId(),


            message_id:
                messageId,


            question:
                String(question || ""),


            intent:
                intent ||
                resultData.intent ||
                null,


            data_source:
                dataSource ||
                resultData.source ||
                null,


            selected_province:
                selectedProvince ||
                mapContext.selectedProvince ||
                resultData.province ||
                null,


            selected_station:
                station.selectedStation,


            station_id:
                station.stationId,


            latitude:
                station.latitude ??
                getNumber(
                    mapContext.lat
                ),


            longitude:
                station.longitude ??
                getNumber(
                    mapContext.lon
                ),


            hours:
                getNumber(
                    resultData.hours
                ),


            radius_km:
                getNumber(
                    resultData.data?.radiusKm
                ),


            threshold_mm:
                getNumber(
                    resultData.threshold
                ),


            observed_summary:
                buildSummary(
                    observed
                ),


            forecast_summary:
                buildSummary(
                    forecast
                ),


            answer:
                String(answer || ""),


            success:
                success ? 1 : 0,


            error_message:
                errorMessage
                    ? String(errorMessage)
                    : null,


            client:
                "React-WebGIS",


            app_version:
                process.env.REACT_APP_VERSION ||
                "web"

        };


        // ==================================================
        // SEND TO CLOUDFLARE WORKER
        // ==================================================

        return fetch(
            `${API_URL}/api/ai-log`,
            {

                method:
                    "POST",


                headers: {

                    "Content-Type":
                        "application/json"

                },


                body:
                    JSON.stringify(
                        payload
                    )

            }
        )

        .then(
            async response => {

                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );

                }


                return response.json();

            }
        )

        .then(
            () => true
        )

        .catch(
            error => {

                console.warn(
                    "[AI Log] Không thể ghi log:",
                    error
                );


                return false;

            }
        );


    } catch (error) {

        console.warn(
            "[AI Log] Lỗi tạo payload:",
            error
        );


        return Promise.resolve(false);

    }

}
