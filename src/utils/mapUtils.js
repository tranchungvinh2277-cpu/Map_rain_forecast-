export const VIETNAM_BOUNDS = [
  [8.18, 102.14],
  [23.39, 109.46],
];

export function getNextHour(date = new Date()) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

export function getChartData(maTram, mergedData) {
  const nextHour = getNextHour();
  const station = mergedData?.find((item) => item.MaTram === maTram);

  if (!station || !Array.isArray(station.forecast)) return [];

  return station.forecast
    .map((forecast) => {
      const time = parseForecastTime(forecast.time);

      return {
        time: time.getTime(),
        "Mưa dự báo": Number.isFinite(Number(forecast.value))
          ? Number(forecast.value)
          : null,
      };
    })
    .filter((forecast) => forecast.time >= nextHour.getTime())
    .sort((a, b) => a.time - b.time);
}

export function getStationKey(station) {
  return [
    station.MaTram,
    station.Tinh,
    station.TenTram,
    station.LoaiTram,
    station.Lat,
    station.Lon,
  ]
    .map((part) => String(part ?? "").trim())
    .join("|");
}

export function isSameStation(a, b) {
  if (!a || !b) return false;
  return getStationKey(a) === getStationKey(b);
}

function parseForecastTime(value) {
  if (typeof value !== "string") return new Date(value);

  const [datePart, timePart = "00:00"] = value.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if ([year, month, day, hour, minute].some((part) => Number.isNaN(part))) {
    return new Date(value);
  }

  return new Date(year, month - 1, day, hour, minute);
}
