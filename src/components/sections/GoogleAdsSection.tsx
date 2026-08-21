import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  DollarSign, MousePointer, Eye, TrendingUp, Target, Play,
  ChevronDown, ChevronUp, Layers,
} from "lucide-react";
import { MetricCard } from "../ui/MetricCard";
import { ChartCard } from "../ui/ChartCard";
import { SearchBar } from "../ui/SearchBar";
import { YouTubeEmbedCard, DisplayBannerCard } from "../ui/TopPostEmbedCard";
import { FindingsBanner } from "../ui/FindingsBanner";
import { DataTable, Column } from "../ui/DataTable";
import { CampaignBreakdownTable } from "../ui/CampaignBreakdownTable";
import { DashboardData, BrandConfig, OfficialPeriod, PaidCampaignRow, CampaignMeta } from "../../types";
import {
  formatNumber, formatCurrency, formatPercent,
  filterByDateRange, sumField,
} from "../../utils/formatters";
import { resolveMetricValue, hasSectionManualData } from "../../utils/manualOverrides";
import { ManualDataLegend } from "../ui/ManualDataLegend";
import {
  isGloballyExcluded, cleanCampaigns, groupCampaigns, calcCampaignTotals,
} from "../../utils/grouping";
import { inferCampaignResult } from "../../utils/resultInference";

interface GoogleAdsSectionProps {
  data: DashboardData;
  brand: BrandConfig;
  dateRange: { start: string; end: string };
  officialPeriod: OfficialPeriod | null;
}

const GA_COLOR = "#4285F4";

/**
 * Clasifica una campaña de Google Ads en Video, Display o Search
 * según keywords en su nombre. Retorna null si no aplica ninguna.
 */
const classifyGoogleCampaign = (name: string): "Video" | "Display" | "Search" | null => {
  const lower = name.toLowerCase();
  if (lower.includes("video")) return "Video";
  if (lower.includes("dsp")) return "Display";
  if (lower.includes("sea")) return "Search";
  return null;
};

/**
 * Resultado fijo por tipo de campaña de Google Ads:
 * - Video   → Thruviews
 * - Display → Clics
 * - Search  → Clics
 */
const inferGoogleResult = (
  campaignName: string,
  rows: PaidCampaignRow[],
): { value: number; label: string; field: string } => {
  const type = classifyGoogleCampaign(campaignName);
  const totalClicks    = rows.reduce((a, r) => a + (r.clicks || 0), 0);
  const totalThruviews = rows.reduce((a, r) => a + (r.videoViews || 0), 0);

  if (type === "Video") {
    return { value: totalThruviews, label: "Thruviews", field: "videoViews" };
  }
  // Display, Search y cualquier otro tipo → Clics
  return { value: totalClicks, label: "Clics", field: "clicks" };
};

export const GoogleAdsSection: React.FC<GoogleAdsSectionProps> = ({
  data, brand, dateRange, officialPeriod,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filtrar campañas de Google Ads como PaidCampaignRow para reutilizar groupCampaigns
  const googleAsPaid = useMemo((): PaidCampaignRow[] => {
    return filterByDateRange(data.googleAds, dateRange.start, dateRange.end)
      .filter((c) => !isGloballyExcluded(c.campaignName, c.date, data.globalExclusions, data.periods))
      .map((r) => ({
        date: r.date,
        campaignName: r.campaignName,
        status: "ACTIVE",
        objective: r.campaignType,
        spend: r.cost,
        impressions: r.impressions,
        reach: 0,
        frequency: 0,
        clicks: r.clicks,
        ctr: r.ctr,
        cpc: r.avgCpc,
        cpm: r.cpm,
        interactions: 0,
        leads: 0,
        conversions: r.conversions,
        costPerConversion: r.costPerConversion,
        videoViews: r.videoViews,
        platform: "Google" as const,
        rawPlatform: "Google_Ads",
      }));
  }, [data.googleAds, dateRange, data.globalExclusions, data.periods]);

  const searched = useMemo(() => {
    if (!searchTerm.trim()) return googleAsPaid;
    const q = searchTerm.toLowerCase();
    return googleAsPaid.filter((c) => c.campaignName.toLowerCase().includes(q));
  }, [googleAsPaid, searchTerm]);

  // Agrupar igual que FB/IG usando las mismas groupRules
  const grouped = useMemo(() => {
    return groupCampaigns(searched, data.groupRules, data.periods);
  }, [searched, data.groupRules, data.periods]);

  const totals = useMemo(() => calcCampaignTotals(searched), [searched]);

  const totalCost = totals.spend;
  const totalClicks = totals.clicks;
  const totalConversions = totals.conversions;
  const totalImpressions = totals.impressions;
  const totalVideoViews = totals.videoViews;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalCost / totalClicks : 0;

  const chartData = useMemo(() => {
    const byDate: Record<string, { date: string; cost: number; clicks: number; conversions: number }> = {};
    searched.forEach((c) => {
      if (!byDate[c.date]) byDate[c.date] = { date: c.date, cost: 0, clicks: 0, conversions: 0 };
      byDate[c.date].cost += c.spend;
      byDate[c.date].clicks += c.clicks;
      byDate[c.date].conversions += c.conversions;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, date: d.date.slice(5) }));
  }, [searched]);

  // Visible cards
  const visibleCards = data.visibleMetrics
    .filter((v) => v.section === "google_paid" && v.visible)
    .sort((a, b) => a.order - b.order);

  const iconMap: Record<string, any> = {
    cost: DollarSign, clicks: MousePointer, conversions: Target,
    thruviews: Play, ctr: TrendingUp, avgCpc: DollarSign,
  };
  const rawValMap: Record<string, number> = {
    cost: totalCost, clicks: totalClicks, conversions: totalConversions,
    thruviews: totalVideoViews, ctr: ctr, avgCpc: avgCpc,
  };
  const fmtMap: Record<string, (n: number) => string> = {
    cost: formatCurrency, clicks: formatNumber, conversions: formatNumber,
    thruviews: formatNumber, ctr: (n) => formatPercent(n, 2), avgCpc: formatCurrency,
  };

  const SECTION = "google_paid";
  const overrides = data.manualMetricOverrides;
  const resolvedValues: Record<string, { value: number; isManual: boolean }> = {};
  Object.keys(rawValMap).forEach((key) => {
    resolvedValues[key] = resolveMetricValue(overrides, officialPeriod, SECTION, key, rawValMap[key]);
  });

  // Metas de Google para el periodo
  const periodMetas = officialPeriod
    ? data.campaignMetas.filter((m) => m.periodId === officialPeriod.id)
    : [];
  const googleMetas = periodMetas.filter((m) => {
    const n = m.campaignName.toLowerCase();
    return n.includes("sea") || n.includes("dsp") || n.includes("youtube") || n.includes("video");
  });

  const findings = data.findings.filter(
    (f) => officialPeriod && f.periodId === officialPeriod.id &&
      (f.section === "google_ads" || f.section === "general"),
  );

  // Top Keywords
  const kwColumns: Column<any>[] = [
    { key: "keyword", label: "Keyword" },
    { key: "campaign", label: "Campaña" },
    { key: "impressions", label: "Impr.", align: "right", render: (r: any) => formatNumber(r.impressions) },
    { key: "clicks", label: "Clics", align: "right", render: (r: any) => formatNumber(r.clicks) },
    { key: "ctr", label: "CTR", align: "right", render: (r: any) => formatPercent(r.ctr, 2) },
    { key: "conversions", label: "Conv.", align: "right", render: (r: any) => formatNumber(r.conversions) },
  ];
  const topKw = filterByDateRange(data.gAdsTopKeywords, dateRange.start, dateRange.end);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {findings.length > 0 && (
        <FindingsBanner findings={findings} brand={brand} periodName={officialPeriod?.name} />
      )}

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar campaña…" brand={brand} />

      {/* Cards */}
      {hasSectionManualData(overrides, officialPeriod, SECTION) && (
        <ManualDataLegend brand={brand} />
      )}

      {visibleCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {visibleCards.map((m) => {
            const Icon = iconMap[m.metric] || Target;
            const { value: resolvedVal, isManual } = resolvedValues[m.metric] || { value: rawValMap[m.metric] || 0, isManual: false };
            const fmt = fmtMap[m.metric] || formatNumber;
            return (
              <MetricCard key={m.metric} title={m.label} value={fmt(resolvedVal)} icon={Icon} brand={brand} color={GA_COLOR} isManual={isManual} />
            );
          })}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Inversión diaria" brand={brand}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${brand.textColor}10`} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: `${brand.textColor}77` }} />
              <YAxis tick={{ fontSize: 10, fill: `${brand.textColor}77` }} tickFormatter={formatNumber} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="cost" name="Inversión" fill={GA_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Clics y conversiones" brand={brand}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${brand.textColor}10`} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: `${brand.textColor}77` }} />
              <YAxis tick={{ fontSize: 10, fill: `${brand.textColor}77` }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="clicks" name="Clics" stroke={GA_COLOR} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="conversions" name="Conv." stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Grupos de campaña (igual que FB/IG, con sub-agrupación Video/Display/Search) */}
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
            const color = rule?.color || GA_COLOR;
            const name = rule?.name || "Sin grupo";
            const t = calcCampaignTotals(rows);
            const isExpanded = expandedGroups.has(name);
            const pctInv = totals.spend > 0 ? (t.spend / totals.spend) * 100 : 0;

            // Desglose de indicadores para el header del grupo
            const byIndicator: Record<string, { label: string; total: number; platformTotal: number }> = {};
            uniqueCampaigns.forEach((cn) => {
              const cr = rows.filter((r) => r.campaignName === cn);
              const res = inferGoogleResult(cn, cr);
              if (!byIndicator[res.label]) {
                byIndicator[res.label] = { label: res.label, total: 0, platformTotal: 0 };
              }
              byIndicator[res.label].total += res.value;
            });
            const allCampaignNames = [...new Set(searched.map((r) => r.campaignName))];
            allCampaignNames.forEach((cn) => {
              const cr = searched.filter((r) => r.campaignName === cn);
              const res = inferGoogleResult(cn, cr);
              if (byIndicator[res.label]) {
                byIndicator[res.label].platformTotal += res.value;
              }
            });
            const indicators = Object.values(byIndicator);

            // ── Sub-agrupación Google: Video / Display / Search ──
            // Agrupar las filas del grupo por tipo (video/dsp/sea)
            const subGroups: { subName: string; subRows: PaidCampaignRow[] }[] = [];
            const subBuckets: Record<string, PaidCampaignRow[]> = {};
            rows.forEach((r) => {
              const type = classifyGoogleCampaign(r.campaignName);
              const key = type || "__other__";
              if (!subBuckets[key]) subBuckets[key] = [];
              subBuckets[key].push(r);
            });
            // Orden fijo: Video, Display, Search, resto
            const subOrder = ["Video", "Display", "Search", "__other__"];
            subOrder.forEach((key) => {
              if (subBuckets[key] && subBuckets[key].length > 0) {
                const subSpend = subBuckets[key].reduce((a, r) => a + (r.spend || 0), 0);
                if (subSpend > 0) {
                  subGroups.push({
                    subName: key === "__other__" ? "Otros" : key,
                    subRows: subBuckets[key],
                  });
                }
              }
            });

            // Metas del grupo para la tabla
            const groupMetas = periodMetas.filter((m) =>
              uniqueCampaigns.some(
                (cn) => cn.toLowerCase().trim() === m.campaignName.toLowerCase().trim(),
              ),
            );

            return (
              <div
                key={name}
                className="rounded-2xl border overflow-hidden shadow-sm"
                style={{ borderColor: `${color}44`, backgroundColor: brand.cardBg }}
              >
                {/* Header del grupo */}
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
                      </div>
                      {isExpanded ? <ChevronUp size={16} style={{ color: `${brand.textColor}88` }} /> : <ChevronDown size={16} style={{ color: `${brand.textColor}88` }} />}
                    </div>
                  </div>

                  {/* Indicadores */}
                  <div className="mt-3 flex flex-wrap gap-3">
                    {indicators.map((ind) => (
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
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contenido expandido: una tabla por cada sub-grupo (Video/Display/Search) */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {subGroups.map(({ subName, subRows }) => {
                      // Cada sub-grupo se muestra como una sola "campaña" con el nombre Video/Display/Search
                      const subCampaignEntry = [{
                        name: subName,
                        rows: subRows,
                        status: "ACTIVE",
                        objective: subRows[0]?.objective || "",
                      }];

                      // Metas para el sub-tipo: buscar por nombre del sub-grupo o por campañas individuales
                      const subMetas: CampaignMeta[] = googleMetas.filter((m) => {
                        const mn = m.campaignName.toLowerCase();
                        if (subName === "Video") return mn.includes("video");
                        if (subName === "Display") return mn.includes("dsp");
                        if (subName === "Search") return mn.includes("sea");
                        return false;
                      });

                      return (
                        <div key={subName}>
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="text-[11px] font-semibold px-2 py-0.5 rounded"
                              style={{ backgroundColor: `${color}18`, color: color }}
                            >
                              {subName}
                            </div>
                          </div>
                          <CampaignBreakdownTable
                            campaigns={subCampaignEntry}
                            brand={brand}
                            groupColor={color}
                            metas={subMetas.length > 0 ? subMetas : groupMetas}
                            isOfficialPeriod={!!officialPeriod}
                            resultFn={inferGoogleResult}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Videos */}
      {data.gAdsTopVideo.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brand.textColor }}>🎬 Top Videos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.gAdsTopVideo.slice(0, 6).map((v, i) => (
              <YouTubeEmbedCard key={`${v.url}-${i}`} url={v.url} title={v.title} campaign={v.campaign} subtitle={`${formatNumber(v.views)} vistas`} brand={brand} />
            ))}
          </div>
        </div>
      )}

      {/* Top Display */}
      {data.gAdsTopDisplay.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brand.textColor }}>🖼️ Top Display</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.gAdsTopDisplay.slice(0, 6).map((d, i) => (
              <DisplayBannerCard key={`${d.imageUrl}-${i}`} imageUrl={d.imageUrl} title={d.title} campaign={d.campaign} subtitle={`${formatNumber(d.impressions)} impresiones`} brand={brand} />
            ))}
          </div>
        </div>
      )}

      {/* Top Keywords */}
      {topKw.length > 0 && (
        <ChartCard title="🔑 Top Keywords" brand={brand}>
          <DataTable columns={kwColumns} data={topKw} brand={brand} maxHeight="400px" />
        </ChartCard>
      )}
    </div>
  );
};
