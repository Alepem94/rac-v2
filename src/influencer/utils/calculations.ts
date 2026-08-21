import { Metrics, CampaignInfluencer, Projection } from "../types";

export const calculateER = (interactions: number, views: number): number | null => {
  if (!views || views === 0) return null;
  return (interactions / views) * 100;
};

export const calculateCPV = (investment: number, views: number): number | null => {
  if (!views || views === 0) return null;
  return investment / views;
};

export const calculateCPE = (investment: number, interactions: number): number | null => {
  if (!interactions || interactions === 0) return null;
  return investment / interactions;
};

export const calculateCPC = (investment: number, clicks: number): number | null => {
  if (!clicks || clicks === 0) return null;
  return investment / clicks;
};

export const sumMetrics = (metrics: Metrics[]) => {
  return metrics.reduce(
    (acc, m) => ({
      views: acc.views + (m.views || 0),
      reach: acc.reach + (m.reach || 0),
      impressions: acc.impressions + (m.impressions || 0),
      interactions: acc.interactions + (m.interactions || m.likes + m.comments + m.shares + m.saves || 0),
      clicks: acc.clicks + (m.clicks || m.link_clicks || 0),
      likes: acc.likes + (m.likes || 0),
      comments: acc.comments + (m.comments || 0),
      shares: acc.shares + (m.shares || 0),
      saves: acc.saves + (m.saves || 0),
    }),
    { views: 0, reach: 0, impressions: 0, interactions: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
  );
};

export const aggregateCampaign = (
  metrics: Metrics[],
  campaignInfluencers: CampaignInfluencer[],
  paidMediaEnabled: boolean,
  paidMediaInvestment: number
) => {
  const summed = sumMetrics(metrics);
  const influencerInvestment = campaignInfluencers.reduce((a, c) => a + (c.influencer_cost || 0), 0);
  const totalInvestment = paidMediaEnabled ? influencerInvestment + (paidMediaInvestment || 0) : influencerInvestment;
  const er = calculateER(summed.interactions, summed.views);
  const cpv = calculateCPV(totalInvestment, summed.views);
  const cpe = calculateCPE(totalInvestment, summed.interactions);
  const cpc = calculateCPC(totalInvestment, summed.clicks);
  return {
    ...summed,
    influencerInvestment,
    paidMediaInvestment: paidMediaEnabled ? paidMediaInvestment : 0,
    totalInvestment,
    er,
    cpv,
    cpe,
    cpc,
  };
};

export const calculateAchievement = (actual: number, projected: number): number | null => {
  if (!projected || projected === 0) return null;
  return (actual / projected) * 100;
};

export const calculateVariance = (actual: number, projected: number): number | null => {
  if (!projected || projected === 0) return null;
  return ((actual - projected) / projected) * 100;
};

export const formatMetric = (val: number | null): string => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return "—";
  return val.toLocaleString("es-MX");
};

export const formatCurrency = (val: number | null, currency = "MXN"): string => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(val);
};

export const formatPercent = (val: number | null, decimals = 1): string => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return "—";
  return `${val.toFixed(decimals)}%`;
};

export const formatNumber = (val: number | null): string => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return "—";
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString("es-MX");
};
