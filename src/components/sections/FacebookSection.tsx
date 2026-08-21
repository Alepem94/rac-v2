import React, { useMemo } from "react";
import { Users, Eye, Heart, TrendingUp, UserPlus } from "lucide-react";
import { TabBar } from "../ui/TabBar";
import { MetricCard } from "../ui/MetricCard";
import { TopPostEmbedCard } from "../ui/TopPostEmbedCard";
import { ReachCard } from "../ui/ReachCard";
import { FindingsBanner } from "../ui/FindingsBanner";
import { PaidMediaSection } from "./PaidMediaSection";
import { DynamicTimeSeriesChart, MetricOption } from "../ui/DynamicTimeSeriesChart";
import { DashboardData, BrandConfig, OfficialPeriod } from "../../types";
import {
  filterByDateRange,
  sumField,
  getLatestValue,
  formatNumber,
  formatPercent,
} from "../../utils/formatters";
import { resolveMetricValue, hasSectionManualData } from "../../utils/manualOverrides";
import { ManualDataLegend } from "../ui/ManualDataLegend";
import { sortByDateAsc } from "../../utils/chartAggregation";

interface FacebookSectionProps {
  data: DashboardData;
  brand: BrandConfig;
  dateRange: { start: string; end: string };
  subTab: string;
  onSubTabChange: (tab: string) => void;
  officialPeriod: OfficialPeriod | null;
}

const FB_COLOR = "#1877F2";

export const FacebookSection: React.FC<FacebookSectionProps> = ({
  data,
  brand,
  dateRange,
  subTab,
  onSubTabChange,
  officialPeriod,
}) => {
  const filtered = useMemo(() => {
    const f = filterByDateRange(data.facebookInsights, dateRange.start, dateRange.end);
    return sortByDateAsc(f);
  }, [data.facebookInsights, dateRange]);

  const posts = data.topPostsFB;

  const visibleCards = data.visibleMetrics
    .filter((v) => v.section === "facebook_overview" && v.visible)
    .sort((a, b) => a.order - b.order);

  const findings = data.findings.filter(
    (f) =>
      officialPeriod &&
      f.periodId === officialPeriod.id &&
      (f.section === "facebook" || f.section === "general"),
  );

  const tabs = [
    { id: "overview", label: "Resumen General" },
    { id: "paid", label: "Paid Media Facebook" },
  ];

  if (subTab === "paid") {
    return (
      <div className="space-y-5">
        <TabBar
          tabs={tabs}
          activeTab={subTab}
          onChange={onSubTabChange}
          brand={{ ...brand, primaryColor: FB_COLOR }}
          size="sm"
        />
        {findings.length > 0 && (
          <FindingsBanner
            findings={findings}
            brand={brand}
            periodName={officialPeriod?.name}
          />
        )}
        <PaidMediaSection
          campaigns={data.facebookAds}
          groupRules={data.groupRules}
          globalExclusions={data.globalExclusions}
          visibleMetrics={data.visibleMetrics}
          platformSection="facebook_paid"
          brand={brand}
          dateRange={dateRange}
          platformColor={FB_COLOR}
          periods={data.periods}
          officialPeriod={officialPeriod}
          campaignMetas={data.campaignMetas}
          deduplicatedReach={data.deduplicatedReach}
          manualMetricOverrides={data.manualMetricOverrides}
          platformKey="facebook"
        />
      </div>
    );
  }

  const SECTION = "facebook_overview";
  const overrides = data.manualMetricOverrides;

  const rawValues: Record<string, number> = {
    followers: getLatestValue(filtered, "followers"),
    reach: sumField(filtered, "reach"),
    impressions: sumField(filtered, "impressions"),
    interactions: sumField(filtered, "engagement"),
    engagement: (() => {
      const totalInteractions = sumField(filtered, "engagement");
      const totalReach = sumField(filtered, "reach");
      return totalReach > 0 ? (totalInteractions / totalReach) * 100 : 0;
    })(),
    pageViews: sumField(filtered, "pageViews"),
    newFollowers: sumField(filtered, "newFollowers"),
  };

  const resolvedValues: Record<string, { value: number; isManual: boolean }> = {};
  Object.keys(rawValues).forEach((key) => {
    resolvedValues[key] = resolveMetricValue(overrides, officialPeriod, SECTION, key, rawValues[key]);
  });

  const cardValueMap: Record<string, string> = {
    followers: formatNumber(resolvedValues.followers.value),
    reach: formatNumber(resolvedValues.reach.value),
    impressions: formatNumber(resolvedValues.impressions.value),
    interactions: formatNumber(resolvedValues.interactions.value),
    engagement: resolvedValues.engagement.isManual
      ? formatPercent(resolvedValues.engagement.value, 2)
      : (() => {
          const totalInteractions = sumField(filtered, "engagement");
          const totalReach = sumField(filtered, "reach");
          return totalReach > 0
            ? formatPercent((totalInteractions / totalReach) * 100, 2)
            : "0%";
        })(),
    pageViews: formatNumber(resolvedValues.pageViews.value),
    newFollowers: formatNumber(resolvedValues.newFollowers.value),
  };
  const iconMap: Record<string, any> = {
    followers: Users,
    reach: Eye,
    impressions: Eye,
    engagement: Heart,
    interactions: Heart,
    pageViews: TrendingUp,
    newFollowers: UserPlus,
  };

  // ---- Datos para gráficos dinámicos ----
  const rawChartData = useMemo(
    () =>
      filtered.map((d) => ({
        date: d.date,
        reach: d.reach,
        impressions: d.impressions,
        engagement: d.engagement,
        interactions: d.engagement,
        followers: d.followers,
        pageViews: d.pageViews,
        newFollowers: d.newFollowers,
      })),
    [filtered],
  );

  const colorMap: Record<string, string> = {
    followers: FB_COLOR,
    reach: FB_COLOR,
    impressions: brand.accentColor,
    engagement: "#EC4899",
    interactions: "#EC4899",
    pageViews: "#8B5CF6",
    newFollowers: "#10B981",
  };

  const fallbackMetrics: MetricOption[] = [
    { key: "reach", label: "Alcance", color: colorMap["reach"] },
    { key: "impressions", label: "Impresiones", color: colorMap["impressions"] },
    { key: "engagement", label: "Engagement", color: colorMap["engagement"] },
    { key: "newFollowers", label: "Nuevos Seguidores", color: colorMap["newFollowers"] },
    { key: "followers", label: "Seguidores", color: colorMap["followers"] },
    { key: "pageViews", label: "Vistas de página", color: colorMap["pageViews"] },
  ];

  const availableMetrics: MetricOption[] = (() => {
    if (visibleCards.length > 0) {
      return visibleCards.map((m) => ({
        key: m.metric,
        label: m.label,
        color: colorMap[m.metric] || FB_COLOR,
      }));
    }
    return fallbackMetrics;
  })();

  // defaults: primer gráfico alcance+impresiones, segundo engagement+nuevos seguidores si existen
  const chart1Defaults = (() => {
    const keys = availableMetrics.map((m) => m.key);
    const preferred = ["reach", "impressions"];
    const filteredPref = preferred.filter((k) => keys.includes(k));
    if (filteredPref.length >= 2) return filteredPref.slice(0, 2);
    if (filteredPref.length === 1 && keys.length >= 2) {
      const other = keys.find((k) => k !== filteredPref[0]);
      return [filteredPref[0], other!];
    }
    return keys.slice(0, 2);
  })();

  const chart2Defaults = (() => {
    const keys = availableMetrics.map((m) => m.key);
    const preferred = ["engagement", "newFollowers", "interactions", "pageViews"];
    const filteredPref = preferred.filter((k) => keys.includes(k));
    if (filteredPref.length >= 2) return filteredPref.slice(0, 2);
    // fallback: tomar los no usados en chart1
    const remaining = keys.filter((k) => !chart1Defaults.includes(k));
    if (remaining.length >= 2) return remaining.slice(0, 2);
    if (remaining.length === 1 && keys.length >= 2) return [remaining[0], keys.find((k) => k !== remaining[0])!];
    return keys.slice(0, 2);
  })();

  return (
    <div className="space-y-5">
      <TabBar
        tabs={tabs}
        activeTab={subTab}
        onChange={onSubTabChange}
        brand={{ ...brand, primaryColor: FB_COLOR }}
        size="sm"
      />

      {findings.length > 0 && (
        <FindingsBanner
          findings={findings}
          brand={brand}
          periodName={officialPeriod?.name}
        />
      )}

      {hasSectionManualData(overrides, officialPeriod, SECTION) && (
        <ManualDataLegend brand={brand} />
      )}

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {visibleCards.map((m) => {
          if (m.metric === "reach") {
            return (
              <ReachCard
                key={m.metric}
                accumulatedReach={sumField(filtered, "reach")}
                platform="facebook_organico"
                officialPeriod={officialPeriod}
                deduplicatedReach={data.deduplicatedReach}
                brand={brand}
                color={FB_COLOR}
              />
            );
          }
          const Icon = iconMap[m.metric];
          return (
            <MetricCard
              key={m.metric}
              title={m.label}
              value={cardValueMap[m.metric] || "0"}
              icon={Icon}
              brand={brand}
              color={FB_COLOR}
              isManual={resolvedValues[m.metric]?.isManual}
            />
          );
        })}
      </div>

      {/* Charts dinámicos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DynamicTimeSeriesChart
          brand={brand}
          title="Gráfico 1 · Alcance e Impresiones"
          subtitle="Selecciona frecuencia y métricas"
          rawData={rawChartData}
          availableMetrics={availableMetrics}
          defaultMetrics={chart1Defaults}
          chartType="area"
          idPrefix="fb-1"
          lastKeys={["followers"]}
        />
        <DynamicTimeSeriesChart
          brand={brand}
          title="Gráfico 2 · Engagement y Seguidores"
          subtitle="Selecciona frecuencia y métricas"
          rawData={rawChartData}
          availableMetrics={availableMetrics}
          defaultMetrics={chart2Defaults}
          chartType="bar"
          idPrefix="fb-2"
          lastKeys={["followers"]}
        />
      </div>

      {/* Top posts */}
      {posts.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brand.textColor }}>
            ⭐ Top Posts de Facebook
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.slice(0, 6).map((p, i) => (
              <TopPostEmbedCard key={`${p.url}-${i}`} post={p} brand={brand} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
