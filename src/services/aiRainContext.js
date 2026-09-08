// ==========================================================
// AI RAIN CONTEXT
// ==========================================================

import {
    getObservedAIData
} from "./observedRain";


// ==========================================================
// GET RAIN AI CONTEXT
// ==========================================================
//
// Lấy dữ liệu quan trắc:
//
//   metadata_observed_qc_last24.json
//   metadata_observed_qc_last72.json
//
// GFS KHÔNG lấy ở đây.
// GFS tiếp tục do forecastRainfallService.js xử lý.
//
// ==========================================================

export async function getRainAIContext(
    maTram,
    options = {}
) {

    const {
        includeObserved = true,
    } = options;


    if (!maTram) {

        return {
            observed: null,
        };

    }


    const observed =
        includeObserved
            ? await getObservedAIData(
                maTram
            )
            : null;


    return {

        observed,

    };

}