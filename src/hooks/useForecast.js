import { useEffect, useMemo, useState } from "react";

export default function useForecast() {
  const [tramList, setTramList] = useState([]);
  const [mergedData, setMergedData] = useState([]);
  const [geoData, setGeoData] = useState(null);
  const [forecastTime, setForecastTime] = useState({ start: null, end: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadForecast() {
      try {
        setLoading(true);

        const [tram, merged, geo] = await Promise.all([
          fetch("/tramList.json").then((response) => response.json()),
          fetch("/mergedData.json").then((response) => response.json()),
          fetch("/geojson/vung_tinh.geojson").then((response) => response.json()),
        ]);

        if (cancelled) return;

        setTramList(Array.isArray(tram) ? tram : []);
        setMergedData(Array.isArray(merged) ? merged : []);
        setGeoData(geo);
        setForecastTime(resolveForecastTime(merged));
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadForecast();

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({ tramList, mergedData, geoData, forecastTime, loading, error }),
    [tramList, mergedData, geoData, forecastTime, loading, error]
  );
}

function resolveForecastTime(mergedData) {
  const stationData = mergedData?.find((station) => station.MaTram === "48899");

  if (!stationData?.forecast?.length) {
    return { start: null, end: null };
  }

  const times = stationData.forecast
    .map((forecast) => new Date(forecast.time))
    .filter((time) => !Number.isNaN(time.getTime()));

  const now = new Date();
  now.setMinutes(0, 0, 0);

  if (new Date().getMinutes() > 0) {
    now.setHours(now.getHours() + 1);
  }

  const validTimes = times.filter((time) => time >= now);
  if (!validTimes.length) return { start: null, end: null };

  return {
    start: formatForecastTime(validTimes[0]),
    end: formatForecastTime(validTimes.at(-1)),
  };
}

function formatForecastTime(date) {
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
