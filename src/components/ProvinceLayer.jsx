import React, { memo, useMemo } from "react";
import { GeoJSON } from "react-leaflet";

function ProvinceLayer({ data }) {
  const style = useMemo(() => ({ color: "blue", weight: 1 }), []);

  if (!data) return null;

  return <GeoJSON data={data} style={style} />;
}

export default memo(ProvinceLayer);
