export const formatNumber = (num: number): string => {
  if (!num || isNaN(num)) return "0";
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString("es-MX", { maximumFractionDigits: 0 });
};

export const formatNumberFull = (num: number): string => {
  if (!num || isNaN(num)) return "0";
  return num.toLocaleString("es-MX", { maximumFractionDigits: 0 });
};

export const formatCurrency = (num: number): string => {
  if (!num || isNaN(num)) return "$0";
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 10_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
};

export const formatCurrencyFull = (num: number): string => {
  if (!num || isNaN(num)) return "$0.00";
  return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatPercent = (num: number, decimals = 1): string => {
  if (!num || isNaN(num)) return "0%";
  return `${num.toFixed(decimals)}%`;
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "0m 0s";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

export const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  } catch {
    return dateStr.slice(5);
  }
};

export const filterByDateRange = <T extends { date: string }>(
  items: T[],
  start: string,
  end: string,
): T[] => {
  if (!start && !end) return items;
  return items.filter((item) => {
    const d = item.date;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
};

export const sumField = <T,>(items: T[], field: keyof T): number => {
  return items.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
};

export const avgField = <T,>(items: T[], field: keyof T): number => {
  if (!items.length) return 0;
  // solo promediamos valores no-cero para evitar sesgo
  const nonZero = items.filter((i) => Number(i[field]) > 0);
  if (!nonZero.length) return 0;
  return sumField(nonZero, field) / nonZero.length;
};

export const weightedAvgField = <T,>(
  items: T[],
  valueField: keyof T,
  weightField: keyof T,
): number => {
  const totalWeight = sumField(items, weightField);
  if (!totalWeight) return 0;
  const weightedSum = items.reduce(
    (acc, item) =>
      acc + (Number(item[valueField]) || 0) * (Number(item[weightField]) || 0),
    0,
  );
  return weightedSum / totalWeight;
};

export const getLatestValue = <T extends { date: string }>(
  items: T[],
  field: keyof T,
): number => {
  if (!items.length) return 0;
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  return Number(sorted[0][field]) || 0;
};

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 227, g: 6, b: 19 };
};

export const withAlpha = (hex: string, alphaHex: string): string => {
  return `${hex}${alphaHex}`;
};
