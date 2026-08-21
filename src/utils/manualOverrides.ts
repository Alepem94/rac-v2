import { ManualMetricOverride, OfficialPeriod } from "../types";

/**
 * Busca si existe un valor manual configurado en el sheet Metricas_Manuales
 * para un periodo oficial específico, sección y métrica.
 */
export const getManualOverride = (
  overrides: ManualMetricOverride[],
  officialPeriod: OfficialPeriod | null,
  section: string,
  metric: string,
): number | null => {
  if (!officialPeriod) return null;
  const entry = overrides.find(
    (o) =>
      o.periodId === officialPeriod.id &&
      o.section === section &&
      o.metric === metric &&
      o.value !== null,
  );
  return entry ? (entry.value as number) : null;
};

/**
 * Devuelve el valor del card: override manual si existe, o el valor calculado.
 */
export const resolveMetricValue = (
  overrides: ManualMetricOverride[],
  officialPeriod: OfficialPeriod | null,
  section: string,
  metric: string,
  calculatedValue: number,
): { value: number; isManual: boolean } => {
  const manual = getManualOverride(overrides, officialPeriod, section, metric);
  if (manual !== null) {
    return { value: manual, isManual: true };
  }
  return { value: calculatedValue, isManual: false };
};

/**
 * Comprueba si hay al menos un dato manual activo en la sección para el periodo actual.
 * Usado para decidir si mostrar la leyenda en esa sección.
 */
export const hasSectionManualData = (
  overrides: ManualMetricOverride[],
  officialPeriod: OfficialPeriod | null,
  section: string,
): boolean => {
  if (!officialPeriod) return false;
  return overrides.some(
    (o) => o.periodId === officialPeriod.id && o.section === section && o.value !== null,
  );
};

/** Color institucional para métricas con dato manual */
export const MANUAL_COLOR = "#0EA5E9";
