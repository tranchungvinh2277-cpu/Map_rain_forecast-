import React, { memo, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  Label,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getNextHour } from "../utils/mapUtils";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div style={{ background: "#fff", padding: 5, border: "1px solid #ccc" }}>
      <p>{format(new Date(label), "dd/MM HH'h'")}</p>
      {payload.map((item) => (
        <p key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {item.value == null ? "---" : item.value}
        </p>
      ))}
    </div>
  );
};

function RainChart({ data }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const timeout = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(timeout);
  }, [data]);

  if (!ready) {
    return <p style={{ textAlign: "center" }}>Đang tải biểu đồ...</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis
          dataKey="time"
          domain={[getNextHour().getTime(), "auto"]}
          tickFormatter={(time) => format(new Date(time), "dd/MM HH'h'")}
          tick={{ fontSize: 9, angle: 45, textAnchor: "start" }}
          height={60}
          interval="preserveStartEnd"
          allowDataOverflow
          padding={{ right: 50 }}
        />
        <YAxis domain={[0, "dataMax * 1.1"]}>
          <Label
            value="Lượng mưa (mm)"
            angle={-90}
            position="insideLeft"
            style={{ textAnchor: "middle" }}
          />
        </YAxis>
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="top" align="center" layout="horizontal" />
        <Bar dataKey="Mưa dự báo" fill="#ff7f0e" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(RainChart);
