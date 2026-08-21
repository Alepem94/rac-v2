import React, { useMemo, useState } from "react";
import {
  DollarSign, MousePointer, Eye, TrendingUp, Target,
  ChevronDown, ChevronUp, Layers, Users, Play, Heart,
} from "lucide-react";
import {
  PaidCampaignRow, CampaignGroupRule, GlobalExclusion, BrandConfig,
  VisibleMetric, OfficialPeriod, CampaignMeta, DeduplicatedReach,
  ManualMetricOverride,
} from "../../types";
import { MetricCard } from "../ui/MetricCard";
import { ReachCard } from "../ui/ReachCard";
import { SearchBar } from "../ui/SearchBar";
import { CampaignBreakdownTable } from "../ui/CampaignBreakdownTable";
import { DynamicTimeSeriesChart, MetricOption } from "../ui/DynamicTimeSeriesChart";
import {
  formatNumber, formatCurrency, formatPercent,
} from "../../utils/formatters";
import {
  cleanCampaigns, groupCampaigns, calcCampaignTotals, isGloballyExcluded,
} from "../../utils/grouping";
import { inferCampaignResult } from "../../utils/resultInference";
import { resolveMetricValue, hasSectionManualData } from "../../utils/manualOverrides";
import { ManualDataLegend } from "../ui/ManualDataLegend";

interface PaidMediaSectionProps {
  campaigns: PaidCampaignRow[];
  groupRules: CampaignGroupRule[];
  globalExclusions: GlobalExclusion[];
  visibleMetrics: VisibleMetric[];
  platformSection: string;
  brand: BrandConfig;
  dateRange: { start: string; end: string };
  platformColor: string;
  periods: OfficialPeriod[];
  officialPeriod: OfficialPeriod | null;
  campaignMetas: CampaignMeta[];
  deduplicatedReach: DeduplicatedReach[];
  manualMetricOverrides?: ManualMetricOverride[];
  platformKey: string;
  forceGeneralGroup?: boolean;
}

const ALL_ICONS: Record<string, any> = {
  spend: DollarSign, cost: DollarSign, impressions: Eye, clicks: MousePointer,
  ctr: TrendingUp, conversions: Target, leads: Users, cpc: DollarSign,
  cpm: DollarSign, reach: Eye, views6s: Play, thruviews: Play, thruplays: Play,
  profileVisits: Users, interactions: Heart, cpr: DollarSign, avgCpc: DollarSign,
};

const metricFormatter = (key: string, val: number): string => {
  if (["spend", "cost", "cpc", "cpm", "cpr", "avgCpc"].includes(key))
    return formatCurrency(val);
  if (["ctr"].includes(key)) return formatPercent(val, 2);
  return formatNumber(val);
};

export const PaidMediaSection: React.FC<PaidMediaSectionProps> = ({
  campaigns, groupRules, globalExclusions, visibleMetrics,
  platformSection, brand, dateRange, platformColor, periods,
  officialPeriod, campaignMetas, deduplicatedReach, manualMetricOverrides = [],
  platformKey, forceGeneralGroup = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const cleaned = useMemo(
    () => cleanCampaigns(campaigns, dateRange, globalExclusions, periods),
    [campaigns, dateRange, globalExclusions, periods],
  );

  const searched = useMemo(() => {
    if (!searchTerm.trim()) return cleaned;
    const q = searchTerm.toLowerCase();
    return cleaned.filter((c) => c.campaignName.toLowerCase().includes(q));
  }, [cleaned, searchTerm]);

  const grouped = useMemo(() => {
    if (forceGeneralGroup) {
      const totalSpend = searched.reduce((a, r) => a + (r.spend || 0), 0);
      if (totalSpend <= 0) return [];
      return [{
        rule: { order: 0, name: "General", keywords: [], excludeKeywords: [], color: platformColor, appliesFrom: "", active: true },
        rows: searched,
        uniqueCampaigns: [...new Set(searched.map((r) => r.campaignName))],
      }];
    }
    return groupCampaigns(searched, groupRules, periods);
  }, [searched, groupRules, periods, forceGeneralGroup, platformColor]);

  const totals = useMemo(() => calcCampaignTotals(searched), [searched]);

  const totalViews6s = searched.reduce((a, r) => a + ((r as any).views6s || 0), 0);
  const totalThruplays = searched.reduce((a, r) => a + ((r as any).thruplays || 0), 0);
  const totalProfileVisits = searched.reduce((a, r) => a + ((r as any).profileVisits || 0), 0);
  const totalVideoViews = searched.reduce((a, r) => a + (r.videoViews || 0), 0);
  const cpr = totals.conversions > 0 ? totals.spend / totals.conversions : 0;

  const metricValueMap: Record<string, number> = {
    spend: totals.spend, cost: totals.spend, impressions: totals.impressions,
    clicks: totals.clicks, conversions: totals.conversions, ctr: totals.ctr,
    cpc: totals.cpc, cpm: totals.cpm, reach: totals.reach, leads: totals.leads,
    views6s: totalViews6s, thruviews: totalVideoViews + totalThruplays, thruplays: totalThruplays,
    profileVisits: totalProfileVisits, interactions: totals.interactions,
    cpr: cpr, avgCpc: totals.cpc,
  };

  const periodMetas = officialPeriod
    ? campaignMetas.filter((m) => m.periodId === officialPeriod.id)
    : [];
  const metasForPlatform = periodMetas.filter((m) => {
    const n = m.campaignName.toLowerCase();
    if (platformKey === "facebook") return n.includes(" fb ") || n.includes("facebook") || n.includes("meta");
    if (platformKey === "instagram") return n.includes(" ig ") || n.includes("instagram");
    if (platformKey === "tiktok") return n.includes("tiktok");
    if (platformKey === "google") return n.includes("sea") || n.includes("dsp") || n.includes("youtube") || n.includes("video");
    return false;
  });
  const totalMetaBudget = metasForPlatform.reduce((a, m) => a + m.budget, 0);
  const totalMetaResult = metasForPlatform.reduce((a, m) => a + m.projectedResult, 0);

  // ---- Datos diarios para gráficos dinámicos (ventana fija, ignoran calendario) ----
  const chartBaseFiltered = useMemo(() => {
    let base = campaigns.filter((c) => !isGloballyExcluded(c.campaignName, c.date, globalExclusions, periods));
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      base = base.filter((c) => c.campaignName.toLowerCase().includes(q));
    }
    return base;
  }, [campaigns, globalExclusions, periods, searchTerm]);

  const rawPaidDaily = useMemo(() => {
    const byDate: Record<string, any> = {};
    chartBaseFiltered.forEach((c) => {
      if (!byDate[c.date]) {
        byDate[c.date] = {
          date: c.date,
          spend: 0, cost: 0, clicks: 0, impressions: 0, conversions: 0, reach: 0, leads: 0,
          videoViews: 0, interactions: 0, views6s: 0, thruplays: 0, profileVisits: 0, thruviews: 0,
        };
      }
      byDate[c.date].spend += c.spend || 0;
      byDate[c.date].cost += c.spend || 0;
      byDate[c.date].clicks += c.clicks || 0;
      byDate[c.date].impressions += c.impressions || 0;
      byDate[c.date].conversions += c.conversions || 0;
      byDate[c.date].reach += c.reach || 0;
      byDate[c.date].leads += c.leads || 0;
      byDate[c.date].videoViews += c.videoViews || 0;
      byDate[c.date].interactions += c.interactions || 0;
      byDate[c.date].views6s += (c as any).views6s || 0;
      byDate[c.date].thruplays += (c as any).thruplays || 0;
      byDate[c.date].profileVisits += (c as any).profileVisits || 0;
    });
    // thruviews composite
    Object.values(byDate).forEach((r: any) => {
      r.thruviews = (r.videoViews || 0) + (r.thruplays || 0);
    });
    return Object.values(byDate).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [chartBaseFiltered]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const visibleCards = visibleMetrics
    .filter((v) => v.section === platformSection && v.visible)
    .sort((a, b) => a.order - b.order);

  // Métricas disponibles para gráficos (solo sumables, excluye tasas ponderadas)
  const chartSummableKeys = ["spend","cost","impressions","clicks","conversions","reach","leads","videoViews","interactions","views6s","thruplays","profileVisits","thruviews"];
  const colorMapPaid: Record<string, string> = {
    spend: platformColor,
    cost: platformColor,
    impressions: "#64748B",
    clicks: brand.secondaryColor,
    conversions: "#10B981",
    reach: "#0EA5E9",
    leads: "#8B5CF6",
    videoViews: "#F59E0B",
    thruviews: "#F59E0B",
    thruplays: "#F97316",
    views6s: "#06B6D4",
    interactions: "#EC4899",
    profileVisits: "#6366F1",
  };
  const fallbackPaidMetrics: MetricOption[] = [
    { key: "spend", label: "Inversión", color: colorMapPaid["spend"] },
    { key: "impressions", label: "Impresiones", color: colorMapPaid["impressions"] },
    { key: "clicks", label: "Clics", color: colorMapPaid["clicks"] },
    { key: "conversions", label: "Conversiones", color: colorMapPaid["conversions"] },
    { key: "reach", label: "Alcance", color: colorMapPaid["reach"] },
    { key: "leads", label: "Leads", color: colorMapPaid["leads"] },
  ];
  const availableChartMetrics: MetricOption[] = (() => {
    if (visibleCards.length > 0) {
      const filtered = visibleCards
        .filter((m) => chartSummableKeys.includes(m.metric))
        .map((m) => ({
          key: m.metric,
          label: m.label,
          color: colorMapPaid[m.metric] || platformColor,
        }));
      if (filtered.length >= 2) return filtered;
      if (filtered.length > 0) {
        // complementar con fallback
        const missing = fallbackPaidMetrics.filter((f) => !filtered.some((x) => x.key === f.key));
        return [...filtered, ...missing].slice(0, Math.max(4, filtered.length + 2));
      }
    }
    return fallbackPaidMetrics;
  })();

  const chart1Defaults = (() => {
    const keys = availableChartMetrics.map((m) => m.key);
    const pref = ["spend","cost","impressions"];
    const f = pref.filter((k) => keys.includes(k));
    if (f.length >= 2) return f.slice(0,2);
    if (f.length === 1 && keys.length >=2) return [f[0], keys.find(k=>k!==f[0])!];
    return keys.slice(0,2);
  })();
  const chart2Defaults = (() => {
    const keys = availableChartMetrics.map((m) => m.key);
    const pref = ["clicks","conversions","leads","reach"];
    const f = pref.filter((k) => keys.includes(k));
    if (f.length >= 2) return f.slice(0,2);
    const remaining = keys.filter((k) => !chart1Defaults.includes(k));
    if (remaining.length >=2) return remaining.slice(0,2);
    if (remaining.length === 1 && keys.length>=2) return [remaining[0], keys.find(k=>k!==remaining[0])!];
    return keys.slice(0,2);
  })();

  return (
    <div className="space-y-5">
      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar campaña por nombre…" brand={brand} />

      {hasSectionManualData(manualMetricOverrides, officialPeriod, platformSection) && (
        <ManualDataLegend brand={brand} />
      )}

      {visibleCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {visibleCards.map((m) => {
            if (m.metric === "reach") {
              return (
                <ReachCard
                  key={m.metric}
                  accumulatedReach={totals.reach}
                  platform={`${platformKey}_paid` as any}
                  officialPeriod={officialPeriod}
                  deduplicatedReach={deduplicatedReach}
                  brand={brand}
                  color={platformColor}
                />
              );
            }
            const val = metricValueMap[m.metric] || 0;
            const { value: resolvedVal, isManual } = resolveMetricValue(
              manualMetricOverrides, officialPeriod, platformSection, m.metric, val,
            );
            const Icon = ALL_ICONS[m.metric] || Target;
            let subtitle: string | undefined;
            if (officialPeriod && totalMetaBudget > 0 && m.metric === "spend") {
              subtitle = `Meta: ${formatCurrency(totalMetaBudget)} · ${formatPercent((totals.spend / totalMetaBudget) * 100, 1)}`;
            }
            return (
              <MetricCard
                key={m.metric}
                title={m.label}
                value={metricFormatter(m.metric, resolvedVal)}
                icon={Icon}
                brand={brand}
                color={platformColor}
                subtitle={subtitle}
                isManual={isManual}
              />
            );
          })}
        </div>
      )}

      {officialPeriod && metasForPlatform.length > 0 && (
        <div
          className="rounded-xl p-3 border text-xs flex flex-wrap gap-4"
          style={{ backgroundColor: `${platformColor}08`, borderColor: `${platformColor}33` }}
        >
          <div>
            <span style={{ color: `${brand.textColor}77` }}>Presupuesto total: </span>
            <span className="font-semibold" style={{ color: brand.textColor }}>{formatCurrency(totalMetaBudget)}</span>
            <span className="ml-1 font-medium" style={{ color: totals.spend / totalMetaBudget >= 0.95 ? "#16A34A" : "#DC2626" }}>
              ({formatPercent((totals.spend / totalMetaBudget) * 100, 1)})
            </span>
          </div>
          <div>
            <span style={{ color: `${brand.textColor}77` }}>Resultados proyectados: </span>
            <span className="font-semibold" style={{ color: brand.textColor }}>{formatNumber(totalMetaResult)}</span>
          </div>
        </div>
      )}

      {/* Charts dinámicos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DynamicTimeSeriesChart
          brand={brand}
          title="Gráfico 1 · Inversión"
          subtitle="Frecuencia y métricas seleccionables"
          rawData={rawPaidDaily}
          availableMetrics={availableChartMetrics}
          defaultMetrics={chart1Defaults}
          chartType="bar"
          idPrefix={`${platformKey}-paid-1`}
        />
        <DynamicTimeSeriesChart
          brand={brand}
          title="Gráfico 2 · Resultados"
          subtitle="Frecuencia y métricas seleccionables"
          rawData={rawPaidDaily}
          availableMetrics={availableChartMetrics}
          defaultMetrics={chart2Defaults}
          chartType="line"
          idPrefix={`${platformKey}-paid-2`}
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers size={15} style={{ color: brand.primaryColor }} />
          <h3 className="font-semibold text-sm" style={{ color: brand.textColor }}>Grupos de campaña</h3>
        </div>

        <div className="space-y-3">
          {grouped.length === 0 && (
            <div className="rounded-2xl p-6 text-center border" style={{ borderColor: `${brand.primaryColor}22`, backgroundColor: brand.cardBg, color: `${brand.textColor}77` }}>
              <div className="text-sm">No se encontraron campañas en este rango.</div>
            </div>
          )}

          {grouped.map(({ rule, rows, uniqueCampaigns }) => {
            const color = rule?.color || "#94A3B8";
            const name = rule?.name || "Sin grupo";
            const t = calcCampaignTotals(rows);
            const isExpanded = expandedGroups.has(name);
            const pctInv = totals.spend > 0 ? (t.spend / totals.spend) * 100 : 0;
            const byIndicator: Record<string, { label: string; total: number; platformTotal: number }> = {};
            uniqueCampaigns.forEach((cn) => {
              const cr = rows.filter((r) => r.campaignName === cn);
              const res = inferCampaignResult(cn, cr[0]?.objective || "", cr);
              if (!byIndicator[res.label]) {
                byIndicator[res.label] = { label: res.label, total: 0, platformTotal: 0 };
              }
              byIndicator[res.label].total += res.value;
            });
            const allCampaignNames = [...new Set(searched.map((r) => r.campaignName))];
            allCampaignNames.forEach((cn) => {
              const cr = searched.filter((r) => r.campaignName === cn);
              const res = inferCampaignResult(cn, cr[0]?.objective || "", cr);
              if (byIndicator[res.label]) {
                byIndicator[res.label].platformTotal += res.value;
              }
            });
            const indicators = Object.values(byIndicator);
            const groupMetas = periodMetas.filter((m) =>
              uniqueCampaigns.some(
                (cn) => cn.toLowerCase().trim() === m.campaignName.toLowerCase().trim(),
              ),
            );
            const campaignDetails = uniqueCampaigns.map((n) => {
              const cr = rows.filter((r) => r.campaignName === n);
              return {
                name: n,
                rows: cr,
                status: cr[0]?.status || "ACTIVE",
                objective: cr[0]?.objective || "",
              };
            });
            return (
              <div
                key={name}
                className="rounded-2xl border overflow-hidden shadow-sm"
                style={{ borderColor: `${color}44`, backgroundColor: brand.cardBg }}
              >
                <div
                  className="p-4 cursor-pointer hover:opacity-95 transition-opacity"
                  style={{ backgroundColor: `${color}10` }}
                  onClick={() => toggleGroup(name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm" style={{ color: brand.textColor }}>{name}</div>
                        <div className="text-xs mt-0.5" style={{ color: `${brand.textColor}77` }}>
                          {uniqueCampaigns.length} campaña{uniqueCampaigns.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex gap-5">
                        <div className="text-center">
                          <div className="text-[10px] uppercase tracking-wide" style={{ color: `${brand.textColor}66` }}>Inversión</div>
                          <div className="text-sm font-bold" style={{ color: color }}>{formatCurrency(t.spend)}</div>
                          <div className="text-[10px]" style={{ color: `${brand.textColor}55` }}>{formatPercent(pctInv, 1)} del total</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] uppercase tracking-wide" style={{ color: `${brand.textColor}66` }}>Alcance</div>
                          <div className="text-sm font-bold" style={{ color: brand.textColor }}>{formatNumber(t.reach)}</div>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} style={{ color: `${brand.textColor}88` }} /> : <ChevronDown size={16} style={{ color: `${brand.textColor}88` }} />}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {indicators.map((ind) => {
                      const pctResult = ind.platformTotal > 0 ? (ind.total / ind.platformTotal) * 100 : 0;
                      return (
                        <div
                          key={ind.label}
                          className="rounded-lg px-3 py-1.5 border text-xs"
                          style={{ borderColor: `${color}33`, backgroundColor: `${color}08` }}
                        >
                          <span className="font-semibold" style={{ color: brand.textColor }}>
                            {formatNumber(ind.total)}
                          </span>
                          <span className="ml-1" style={{ color: `${brand.textColor}77` }}>
                            {ind.label}
                          </span>
                          {!forceGeneralGroup && (
                            <span className="ml-1.5 font-medium" style={{ color: color }}>
                              ({formatPercent(pctResult, 0)})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-4">
                    <CampaignBreakdownTable
                      campaigns={campaignDetails}
                      brand={brand}
                      groupColor={color}
                      metas={groupMetas}
                      isOfficialPeriod={!!officialPeriod}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
