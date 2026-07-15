import React, { memo, useMemo } from "react";
import RainChart from "./RainChart";
import { getChartData } from "../utils/mapUtils";

function RainPopup({ station, mergedData, timeData, summary, isMobile }) {
  const chartData = useMemo(
      () => getChartData(station.MaTram, mergedData, timeData),
      [station.MaTram, mergedData, timeData ]
  );
  console.log(station.MaTram);
  console.log(chartData.slice(0, 5));
  return (
    <>
      <b>{station.TenTram}</b>
      <br />
      Mã trạm: {station.MaTram}
      <div style={{ marginTop: 5 }}>
        <div>
          <strong>Tổng 24h:</strong> {summary.total24h} mm{" "}
          {summary.warning24h && (
            <span style={{ color: "red" }}>{summary.warning24h}</span>
          )}
        </div>
        <div>
          <strong>Tổng 72h:</strong> {summary.total72h} mm{" "}
          {summary.warning72h && (
            <span style={{ color: "red" }}>{summary.warning72h}</span>
          )}
        </div>
        <div>
          <strong>Tổng 120h:</strong> {summary.total120h} mm{" "}
          {summary.warning120h && (
            <span style={{ color: "red" }}>{summary.warning120h}</span>
          )}
        </div>
        {summary.ratio120_72 !== null && (
          <div>
            <em>Tỷ lệ 120h/72h:</em> {(summary.ratio120_72 * 100).toFixed(0)}%
          </div>
        )}
      </div>

      <div
        style={{
          width: isMobile ? 320 : 500,
          height: 250,
          marginTop: 10,
        }}
      >
        <RainChart data={chartData} />
      </div>

      <div
        style={{
          marginTop: 10,
          padding: 8,
          border: `2px solid ${summary.riskColor}`,
          borderRadius: 6,
          background: "#fff8e1",
        }}
      >
        <strong style={{ color: summary.riskColor }}>Mức cảnh báo:</strong>{" "}
        <span style={{ color: summary.riskColor }}>{summary.riskLabel}</span>
      </div>
    </>
  );
}

export default memo(RainPopup);
