import { useEffect, useMemo, useState } from "react";

export default function useForecast() {

    const [tramList, setTramList] = useState([]);
    const [mergedData, setMergedData] = useState({});
    const [geoData, setGeoData] = useState(null);

    const [timeData, setTimeData] = useState({
        observed: [],
        forecast: [],
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        let cancelled = false;

        async function loadData() {

            try {

                setLoading(true);

                const [tram, merged, geo, time] = await Promise.all([

                    fetch("/tramList.json").then(r => r.json()),

                    fetch("/mergedData.json").then(r => r.json()),

                    fetch("/geojson/vung_tinh.geojson").then(r => r.json()),

                    fetch("/timeData.json").then(r => r.json())

                ]);

                if (cancelled) return;

                setTramList(Array.isArray(tram) ? tram : []);

                setMergedData(merged ?? {});

                setGeoData(geo);

                setTimeData({

                    observed: time?.observed ?? [],

                    forecast: time?.forecast ?? []

                });

            }

            catch (err) {

                if (!cancelled)

                    setError(err);

            }

            finally {

                if (!cancelled)

                    setLoading(false);

            }

        }

        loadData();

        return () => {

            cancelled = true;

        };

    }, []);

    return useMemo(() => ({

        tramList,

        mergedData,

        geoData,

        timeData,

        loading,

        error

    }), [

        tramList,

        mergedData,

        geoData,

        timeData,

        loading,

        error

    ]);

}