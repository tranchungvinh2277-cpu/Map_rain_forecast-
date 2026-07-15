import { useMemo } from "react";
import { ALL_VALUE, isAll, normalize } from "../utils/normalize";
import { getRainSummary } from "../utils/utils";

export default function useFilteredStations({
  tramList,
  mergedData,
  timeData,
  filterTinh,
  filterLoaiTram,
  riskFilter,
}) {
  const rainSummaryByStation = useMemo(() => {
    const summary = new Map();

    for (const station of tramList) {
        summary.set(station.MaTram, getRainSummary(station.MaTram, mergedData, timeData));
    }

    return summary;
  }, [tramList, mergedData, timeData]);

  const tinhOptions = useMemo(
    () => [
      ALL_VALUE,
      ...new Set(tramList.map((station) => (station.Tinh || "").trim()).filter(Boolean)),
    ],
    [tramList]
  );

  const loaiOptions = useMemo(
    () => [
      ALL_VALUE,
      ...new Set(
        tramList.map((station) => (station.LoaiTram || "").trim()).filter(Boolean)
      ),
    ],
    [tramList]
  );

  const filteredStations = useMemo(
    () =>
      tramList.filter((station) => {
        const okTinh =
          isAll(filterTinh) || normalize(station.Tinh) === normalize(filterTinh);
        const okLoai =
          isAll(filterLoaiTram) ||
          normalize(station.LoaiTram) === normalize(filterLoaiTram);
        const hasLatLon =
          typeof station.Lat === "number" &&
          typeof station.Lon === "number" &&
          !Number.isNaN(station.Lat) &&
          !Number.isNaN(station.Lon);
        const riskLevel = rainSummaryByStation.get(station.MaTram)?.riskLevel;
        const okRisk = riskFilter === "all" || String(riskLevel) === String(riskFilter);

        return okTinh && okLoai && hasLatLon && okRisk;
      }),
    [tramList, filterTinh, filterLoaiTram, riskFilter, rainSummaryByStation]
  );

  return { filteredStations, tinhOptions, loaiOptions, rainSummaryByStation };
}
