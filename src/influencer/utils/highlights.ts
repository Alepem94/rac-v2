import { Metrics } from "../types";
import { calculateER, formatNumber, formatPercent } from "./calculations";

/**
 * Reemplazo del "thumbnail bonito" que era imposible de conseguir consistentemente:
 * en vez de depender de una imagen, la tarjeta muestra en qué KPI destacó ese
 * contenido, comparado contra el resto de contenido visible en esa misma sección
 * (campaña completa / esa plataforma / ese influencer / etc).
 *
 * Por qué en código y no en el Sheet: el "conjunto de comparación" cambia según
 * en qué pestaña está el usuario, y ese filtrado ya vive en InfluencerDashboard.tsx
 * (contentData, el filtro por plataforma, inf.contents...). Aquí solo se recibe
 * ese subconjunto ya filtrado y se calcula el ranking sobre él.
 */

export interface StandoutResult {
  key: string;
  label: string;
  formattedValue: string;
  score: number; // 0..1, posición relativa dentro del set de comparación
  isTopRank: boolean; // #1 del set en ese KPI
  tier: "top" | "good" | "plain";
}

interface KpiDef {
  key: string;
  label: string;
  getValue: (m: Metrics) => number | null;
  format: (v: number) => string;
}

// Orden de prioridad: si dos KPIs empatan en score, gana el que esté primero
// (así se prefiere "Views" sobre "Guardados" cuando ambos son igual de altos).
const KPI_DEFS: KpiDef[] = [
  { key: "views", label: "Views", getValue: (m) => m.views || 0, format: formatNumber },
  { key: "interactions", label: "Interacciones", getValue: (m) => m.interactions || 0, format: formatNumber },
  { key: "er", label: "Engagement Rate", getValue: (m) => calculateER(m.interactions, m.views), format: (v) => formatPercent(v, 1) },
  { key: "reach", label: "Alcance", getValue: (m) => m.reach || 0, format: formatNumber },
  { key: "video_completion_rate", label: "Tasa de finalización", getValue: (m) => (m.video_completion_rate ? m.video_completion_rate * (m.video_completion_rate <= 1 ? 100 : 1) : 0), format: (v) => formatPercent(v, 1) },
  { key: "shares", label: "Compartidos", getValue: (m) => m.shares || 0, format: formatNumber },
  { key: "saves", label: "Guardados", getValue: (m) => m.saves || 0, format: formatNumber },
  { key: "comments", label: "Comentarios", getValue: (m) => m.comments || 0, format: formatNumber },
  { key: "likes", label: "Likes", getValue: (m) => m.likes || 0, format: formatNumber },
  { key: "clicks", label: "Clicks", getValue: (m) => m.clicks || m.link_clicks || 0, format: formatNumber },
  { key: "profile_visits", label: "Visitas a perfil", getValue: (m) => m.profile_visits || 0, format: formatNumber },
  { key: "followers_gained", label: "Nuevos seguidores", getValue: (m) => m.followers_gained || 0, format: formatNumber },
];

/**
 * Calcula el KPI donde el contenido `target` más destaca dentro de `comparisonSet`
 * (que debe incluir al propio `target`).
 * Devuelve null si no hay métricas del contenido o el set es demasiado chico
 * para que "destacar" tenga sentido estadístico (<3 elementos con datos).
 */
export const getStandoutMetric = (
  target: Metrics | undefined,
  comparisonSet: Metrics[]
): StandoutResult | null => {
  if (!target) return null;

  let best: StandoutResult | null = null;

  for (const def of KPI_DEFS) {
    const targetValue = def.getValue(target);
    if (targetValue === null || targetValue <= 0) continue;

    const values = comparisonSet
      .map((m) => def.getValue(m))
      .filter((v): v is number => v !== null && v > 0);

    if (values.length < 3) continue; // no hay suficiente base para comparar

    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) continue; // todos iguales, no hay nada que destaque

    const score = (targetValue - min) / (max - min);
    const isTopRank = targetValue >= max;

    if (!best || score > best.score) {
      best = {
        key: def.key,
        label: def.label,
        formattedValue: def.format(targetValue),
        score,
        isTopRank,
        tier: score >= 0.9 ? "top" : score >= 0.6 ? "good" : "plain",
      };
    }
  }

  // Fallback: sin base de comparación suficiente, muestra simplemente Views
  // (o el primer KPI con dato) sin pretender que "destacó".
  if (!best) {
    const fallbackDef = KPI_DEFS.find((d) => (d.getValue(target) || 0) > 0);
    if (!fallbackDef) return null;
    const v = fallbackDef.getValue(target)!;
    return { key: fallbackDef.key, label: fallbackDef.label, formattedValue: fallbackDef.format(v), score: 0, isTopRank: false, tier: "plain" };
  }

  return best;
};
