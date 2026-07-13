import L from "leaflet";

export const SmoothHeatmapLayer = L.Layer.extend({
  initialize: function (data, options) {
    this._data = data || [];
    this._map = null;
    this._canvas = null;
    this._ctx = null;
    this._options = Object.assign(
      {
        radius: 40,
        max: 100, // giá trị mưa lớn nhất để scale
        gradient: {
          0.0: "rgba(0,0,255,0)",   // xanh nhạt (mưa rất nhỏ)
          0.3: "rgba(0,255,255,0.6)", // xanh dương nhạt
          0.5: "rgba(0,255,0,0.7)",   // xanh lá
          0.7: "rgba(255,255,0,0.8)", // vàng
          0.9: "rgba(255,128,0,0.9)", // cam
          1.0: "rgba(255,0,0,1.0)",   // đỏ
        },
      },
      options
    );
  },

  onAdd: function (map) {
    this._map = map;

    this._canvas = L.DomUtil.create("canvas", "leaflet-smooth-heatmap");
    const size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;

    const overlayPane = this._map.getPanes().overlayPane;
    overlayPane.appendChild(this._canvas);

    this._ctx = this._canvas.getContext("2d");

    this._map.on("moveend zoomend resize", this._reset, this);

    this._reset();
  },

  onRemove: function () {
    L.DomUtil.remove(this._canvas);
    this._map.off("moveend zoomend resize", this._reset, this);
  },

  setData: function (data) {
    this._data = data;
    this._reset();
  },

  _reset: function () {
    if (!this._map) return;

    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    const size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;

    this._draw();
  },

  _draw: function () {
    if (!this._ctx) return;

    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    const radius = this._options.radius;
    const grdCanvas = document.createElement("canvas");
    grdCanvas.width = radius * 2;
    grdCanvas.height = radius * 2;
    const grdCtx = grdCanvas.getContext("2d");
    const grd = grdCtx.createRadialGradient(
      radius,
      radius,
      radius / 4,
      radius,
      radius,
      radius
    );
    grd.addColorStop(0, "rgba(0,0,0,1)");
    grd.addColorStop(1, "rgba(0,0,0,0)");

    // Vẽ vòng tròn mờ (alpha theo giá trị mưa)
    for (const p of this._data) {
      const latlng = L.latLng(p.lat, p.lon);
      if (!this._map.getBounds().contains(latlng)) continue;

      const point = this._map.latLngToContainerPoint(latlng);
      const val = Math.min(p.value, this._options.max);
      const alpha = val / this._options.max;

      ctx.globalAlpha = alpha;
      ctx.drawImage(
        grdCanvas,
        point.x - radius,
        point.y - radius,
        radius * 2,
        radius * 2
      );
    }

    // Áp gradient màu
    const img = ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    this._colorize(img.data, this._options.gradient);
    ctx.putImageData(img, 0, 0);
  },

  _colorize: function (pixels, gradientDef) {
    const gradient = this._createGradient(gradientDef);

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3] / 255;
      if (alpha > 0) {
        const color = gradient[Math.floor(alpha * 255)];
        pixels[i] = color[0];
        pixels[i + 1] = color[1];
        pixels[i + 2] = color[2];
      }
    }
  },

  _createGradient: function (grad) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 256;
    canvas.height = 1;

    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    for (let stop in grad) {
      gradient.addColorStop(parseFloat(stop), grad[stop]);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    const data = ctx.getImageData(0, 0, 256, 1).data;
    const result = [];
    for (let i = 0; i < 256; i++) {
      result.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
    }
    return result;
  },
});
