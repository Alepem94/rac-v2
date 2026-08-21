import { format } from "date-fns";
import { es } from "date-fns/locale";

export type Frequency = "diaria" | "semanal" | "mensual" | "anual";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  mensual: "Mensual",
  anual: "Anual",
};

/**
 * Parsea YYYY-MM-DD a Date local sin zona horaria
 */
const parseISODate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/**
 * Devuelve key de bucket y label para mostrar
 */
export const getBucketKey = (dateStr: string, frequency: Frequency): string => {
  const d = parseISODate(dateStr);
  switch (frequency) {
    case "diaria":
      return dateStr; // YYYY-MM-DD
    case "semanal": {
      // Inicio de semana ISO (lunes)
      const day = d.getDay(); // 0 dom, 1 lun...
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      return monday.toISOString().split("T")[0];
    }
    case "mensual":
      return dateStr.slice(0, 7); // YYYY-MM
    case "anual":
      return dateStr.slice(0, 4); // YYYY
    default:
      return dateStr;
  }
};

export const getBucketLabel = (bucketKey: string, frequency: Frequency): string => {
  try {
    if (frequency === "diaria") {
      const d = parseISODate(bucketKey);
      return format(d, "dd MMM", { locale: es });
    }
    if (frequency === "semanal") {
      const d = parseISODate(bucketKey);
      const end = new Date(d);
      end.setDate(end.getDate() + 6);
      return `${format(d, "dd MMM", { locale: es })} - ${format(end, "dd MMM", { locale: es })}`;
    }
    if (frequency === "mensual") {
      const d = parseISODate(bucketKey + "-01");
      return format(d, "MMM yyyy", { locale: es });
    }
    if (frequency === "anual") {
      return bucketKey;
    }
  } catch {
    // fallback
  }
  return bucketKey;
};

/**
 * Ordena ascendente por fecha (corrige el bug "al revés")
 */
export const sortByDateAsc = <T extends { date: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Agrega datos diarios a la frecuencia seleccionada.
 * - sumKeys: campos que se suman
 * - lastKeys: campos que toman el último valor del bucket (ej followers)
 * - avgKeys: campos que se promedian (si se requiere)
 *
 * Retorna array ordenado ascendente por bucket.
 */
export interface AggregationOptions {
  sumKeys: string[];
  lastKeys?: string[];
  avgKeys?: string[];
}

export const aggregateChartData = (
  dailyData: Record<string, any>[],
  frequency: Frequency,
  options: AggregationOptions,
): Record<string, any>[] => {
  if (frequency === "diaria") {
    return sortByDateAsc(dailyData as any).map((r) => ({
      ...r,
      date: r.date.slice(5), // MM-DD para labels diarios (compat)
      _bucketKey: r.date,
      _label: getBucketLabel(r.date, "diaria"),
    }));
  }

  const buckets = new Map<string, Record<string, any>[]>();
  const sorted = sortByDateAsc(dailyData as any);

  for (const row of sorted) {
    const key = getBucketKey(row.date, frequency);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(row);
  }

  const result: Record<string, any>[] = [];
  // Ordenar buckets por key ascendente (cronológico)
  const orderedKeys = [...buckets.keys()].sort((a, b) => a.localeCompare(b));

  for (const key of orderedKeys) {
    const rows = buckets.get(key)!;
    const aggregated: Record<string, any> = {
      date: getBucketLabel(key, frequency),
      _bucketKey: key,
      _label: getBucketLabel(key, frequency),
      _count: rows.length,
    };

    // Sum
    for (const k of options.sumKeys) {
      aggregated[k] = rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
    }
    // Last
    if (options.lastKeys) {
      for (const k of options.lastKeys) {
        const lastRow = rows[rows.length - 1];
        aggregated[k] = Number(lastRow[k]) || 0;
      }
    }
    // Avg
    if (options.avgKeys) {
      for (const k of options.avgKeys) {
        const vals = rows.map((r) => Number(r[k]) || 0).filter((v) => v !== 0);
        aggregated[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }
    }
    // Copiar cualquier otro campo no listado como suma? No, solo los listados.
    result.push(aggregated);
  }

  return result;
};

/**
 * Helper para agregar datos crudos de insights (array con date y campos numéricos)
 * Atajo: construye dailyData y luego agrega.
 */
export const buildAggregatedData = <T extends { date: string }>(
  filtered: T[],
  frequency: Frequency,
  sumKeys: (keyof T)[],
  lastKeys: (keyof T)[] = [],
  mapFn?: (item: T) => Record<string, any>,
): Record<string, any>[] => {
  const daily = sortByDateAsc(filtered).map((item) => {
    if (mapFn) return { date: item.date, ...mapFn(item) };
    const out: Record<string, any> = { date: item.date };
    for (const k of sumKeys) out[k as string] = Number((item as any)[k]) || 0;
    for (const k of lastKeys) out[k as string] = Number((item as any)[k]) || 0;
    return out;
  });
  return aggregateChartData(daily, frequency, {
    sumKeys: [...sumKeys.map(String), ...[]],
    lastKeys: lastKeys.map(String),
  });
};

/**
 * Para paid campaigns: agrupa por fecha y suma métricas, luego re-agrega por frecuencia
 */
export const aggregatePaidByFrequency = (
  searched: { date: string; spend: number; clicks: number; impressions: number; conversions: number; [k: string]: any }[],
  frequency: Frequency,
): Record<string, any>[] => {
  // Primero agrupar por día (sum)
  const byDay: Record<string, Record<string, any>> = {};
  for (const c of searched) {
    if (!byDay[c.date]) byDay[c.date] = { date: c.date, spend: 0, clicks: 0, impressions: 0, conversions: 0, reach: 0, leads: 0, videoViews: 0, interactions: 0 };
    byDay[c.date].spend += c.spend || 0;
    byDay[c.date].clicks += c.clicks || 0;
    byDay[c.date].impressions += c.impressions || 0;
    byDay[c.date].conversions += c.conversions || 0;
    byDay[c.date].reach += c.reach || 0;
    byDay[c.date].leads += c.leads || 0;
    byDay[c.date].videoViews += c.videoViews || 0;
    byDay[c.date].interactions += c.interactions || 0;
    // Campos extra dinámicos
    for (const k of Object.keys(c)) {
      if (!["date", "spend", "clicks", "impressions", "conversions", "reach", "leads", "videoViews", "interactions"].includes(k)) {
        if (typeof c[k] === "number") {
          byDay[c.date][k] = (byDay[c.date][k] || 0) + (c[k] || 0);
        }
      }
    }
  }
  const daily = Object.values(byDay);
  // Luego agregar por frecuencia
  if (frequency === "diaria") {
    return sortByDateAsc(daily as any).map((r: any) => ({
      ...r,
      date: getBucketLabel(r.date, "diaria"),
      _bucketKey: r.date,
    }));
  }
  // Usar aggregateChartData para sumKeys genéricos
  const allKeys = daily.length ? Object.keys(daily[0]).filter((k) => k !== "date" && k !== "_bucketKey" && k !== "_label") : [];
  return aggregateChartData(daily as any, frequency, { sumKeys: allKeys });
};
