export const ALL_VALUE = "Tất cả";

export const normalize = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

export const cleanText = (value = "") =>
  normalize(value)
    .replace(/^tinh\s+/i, "")
    .replace(/^thanh pho\s+/i, "")
    .trim();

export const isAll = (value) => normalize(value) === normalize(ALL_VALUE);
