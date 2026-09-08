// ==========================================================
// OBSERVED RAIN SERVICE
// ==========================================================
//
// Đọc dữ liệu:
//   metadata_observed_qc_last24.json
//   metadata_observed_qc_last72.json
//
// Nguồn:
// C:\Users\minh\OneDrive\NAWAPI\HYDROMET_DATA\
// Scrip\OBS\RainProcessing\QC\output\hourly\all\
//
// Chức năng:
//   - Load JSON
//   - Cache JSON
//   - Tìm trạm
//   - Lấy summary 24h / 72h
//   - Lấy timeseries
//   - Lấy QC
//
// ==========================================================


// ==========================================================
// CONFIG
// ==========================================================

const OBSERVED_FILES = {

    last24:
        "/data/metadata_observed_qc_last24.json",

    last72:
        "/data/metadata_observed_qc_last72.json",

};


// ==========================================================
// CACHE
// ==========================================================

const cache = {

    last24: null,

    last72: null,

};


// ==========================================================
// LOAD JSON
// ==========================================================

async function loadObservedFile(
    period
) {

    if (
        cache[period]
    ) {
        return cache[period];
    }


    const url =
        OBSERVED_FILES[period];


    if (!url) {

        throw new Error(
            `Không có file observed period: ${period}`
        );
    }


    try {

        const response =
            await fetch(
                `${url}?t=${Date.now()}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        if (
            !Array.isArray(data)
        ) {

            throw new Error(
                `Dữ liệu ${period} không phải Array`
            );
        }


        cache[period] =
            data;


        console.log(
            `[OBSERVED] Loaded ${period}:`,
            data.length,
            "stations"
        );


        return data;

    } catch (error) {

        console.error(
            `[OBSERVED] Load ${period} failed:`,
            error
        );


        return [];
    }
}


// ==========================================================
// CLEAR CACHE
// ==========================================================

export function clearObservedCache(
    period = null
) {

    if (period) {

        cache[period] =
            null;

        return;
    }


    cache.last24 = null;

    cache.last72 = null;
}


// ==========================================================
// GET ALL STATIONS
// ==========================================================

export async function getObservedStations(
    period = "last24"
) {

    return loadObservedFile(
        period
    );
}


// ==========================================================
// FIND STATION
// ==========================================================

export async function findObservedStation(
    maTram,
    period = "last24"
) {

    const stations =
        await loadObservedFile(
            period
        );


    if (!stations.length) {
        return null;
    }


    const code =
        String(
            maTram
        ).trim();


    return (
        stations.find(
            station =>
                String(
                    station.MaTram
                ).trim() === code
        ) ||
        null
    );
}


// ==========================================================
// GET OBSERVED SUMMARY
// ==========================================================

export async function getObservedSummary(
    maTram,
    period = "last24"
) {

    const station =
        await findObservedStation(
            maTram,
            period
        );


    if (!station) {
        return null;
    }


    const statistics =
        station
            ?.Observed
            ?.qc
            ?.statistics;


    const qc =
        station
            ?.Observed
            ?.qc;


    const dataInfo =
        station
            ?.DataInfo;


    return {

        // --------------------------------------------------
        // STATION
        // --------------------------------------------------

        MaTram:
            station.MaTram,

        TenTram:
            station.TenTram,

        LoaiTram:
            station.LoaiTram,

        Tinh:
            station.Tinh,

        Lat:
            station.Lat,

        Lon:
            station.Lon,


        // --------------------------------------------------
        // DATA PERIOD
        // --------------------------------------------------

        period,

        startTime:
            dataInfo?.StartTime ||
            null,

        endTime:
            dataInfo?.LastTime ||
            null,

        lastUpdate:
            dataInfo?.LastUpdate ||
            null,

        timeSteps:
            dataInfo?.TimeSteps ??
            0,


        // --------------------------------------------------
        // RAINFALL
        // --------------------------------------------------

        rainSum:
            statistics?.rain_sum ??
            0,

        rainMean:
            statistics?.rain_mean ??
            0,

        rainMeanRain:
            statistics?.rain_mean_rain ??
            0,

        rainMin:
            statistics?.rain_min ??
            0,

        rainMax:
            statistics?.rain_max ??
            0,

        rainHours:
            statistics?.rain_hours ??
            0,

        rainFrequency:
            statistics?.rain_frequency ??
            0,

        dryHours:
            statistics?.dry_hours ??
            0,

        dryRatio:
            statistics?.dry_ratio ??
            0,


        // --------------------------------------------------
        // ROLLING RAIN
        // --------------------------------------------------

        max3Rolling:
            statistics?.max_3rolling ??
            0,

        max6Rolling:
            statistics?.max_6rolling ??
            0,

        max12Rolling:
            statistics?.max_12rolling ??
            0,

        max24Rolling:
            statistics?.max_24rolling ??
            0,

        max72Rolling:
            statistics?.max_72rolling ??
            null,


        // --------------------------------------------------
        // QC
        // --------------------------------------------------

        qc: {

            status:
                qc?.status ||
                null,

            score:
                qc?.score ??
                null,

            grade:
                qc?.grade ||
                null,

            evaluation:
                qc?.evaluation ||
                null,

            recommendation:
                qc?.recommendation ||
                null,

            missing:
                qc?.missing ??
                0,

            negative:
                qc?.negative ??
                0,

            outlier:
                qc?.outlier ??
                0,

            reason:
                qc?.reason ||
                [],

        },

    };
}


// ==========================================================
// GET OBSERVED TIMESERIES
// ==========================================================

export async function getObservedTimeseries(
    maTram,
    period = "last24"
) {

    const station =
        await findObservedStation(
            maTram,
            period
        );


    if (!station) {
        return [];
    }


    const values =
        station
            ?.Observed
            ?.values;


    if (
        !Array.isArray(values)
    ) {
        return [];
    }


    const startTime =
        parseObservedDate(
            station.DataInfo?.StartTime
        );


    if (!startTime) {
        return [];
    }


    return values.map(
        (
            value,
            index
        ) => {

            const time =
                new Date(
                    startTime.getTime() +
                    index * 60 * 60 * 1000
                );


            return {

                time:
                    formatObservedDate(
                        time
                    ),

                rainfall:
                    Number(value) || 0,

            };

        }
    );
}


// ==========================================================
// GET OBSERVED AI DATA
// ==========================================================
//
// Đây là hàm chính để AI sử dụng.
//
// ==========================================================

export async function getObservedAIData(
    maTram
) {

    const [
        last24,
        last72
    ] = await Promise.all([

        getObservedSummary(
            maTram,
            "last24"
        ),

        getObservedSummary(
            maTram,
            "last72"
        ),

    ]);


    if (
        !last24 &&
        !last72
    ) {

        return null;
    }


    const station =
        last24 ||
        last72;


    return {

        station: {

            MaTram:
                station?.MaTram ||
                null,

            TenTram:
                station?.TenTram ||
                null,

            LoaiTram:
                station?.LoaiTram ||
                null,

            Tinh:
                station?.Tinh ||
                null,

            Lat:
                station?.Lat ??
                null,

            Lon:
                station?.Lon ??
                null,

        },


        observed: {

            last24:
                last24
                    ? {
                        startTime:
                            last24.startTime,

                        endTime:
                            last24.endTime,

                        lastUpdate:
                            last24.lastUpdate,

                        rainSum:
                            last24.rainSum,

                        rainMean:
                            last24.rainMean,

                        rainMax:
                            last24.rainMax,

                        rainHours:
                            last24.rainHours,

                        qc:
                            last24.qc,
                    }
                    : null,


            last72:
                last72
                    ? {
                        startTime:
                            last72.startTime,

                        endTime:
                            last72.endTime,

                        lastUpdate:
                            last72.lastUpdate,

                        rainSum:
                            last72.rainSum,

                        rainMean:
                            last72.rainMean,

                        rainMax:
                            last72.rainMax,

                        rainHours:
                            last72.rainHours,

                        qc:
                            last72.qc,
                    }
                    : null,

        },

    };
}


// ==========================================================
// DATE PARSER
// ==========================================================

function parseObservedDate(
    value
) {

    if (!value) {
        return null;
    }


    // YYYY/MM/DD HH:mm

    const match =
        String(value).match(
            /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/
        );


    if (!match) {

        const date =
            new Date(value);

        return isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    const [
        ,
        year,
        month,
        day,
        hour,
        minute
    ] = match;


    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute)
    );
}


// ==========================================================
// DATE FORMAT
// ==========================================================

function formatObservedDate(
    date
) {

    const pad =
        value =>
            String(value)
                .padStart(
                    2,
                    "0"
                );


    return (
        `${date.getFullYear()}/` +
        `${pad(date.getMonth() + 1)}/` +
        `${pad(date.getDate())} ` +
        `${pad(date.getHours())}:` +
        `${pad(date.getMinutes())}`
    );
}
