import React, { useMemo } from "react";
import { Users, Eye, Heart, UserPlus, Camera } from "lucide-react";
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

interface InstagramSectionProps {
  data: DashboardData;
  brand: BrandConfig;
  dateRange: { start: string; end: string };
  subTab: string;
  onSubTabChange: (tab: string) => void;
  officialPeriod: OfficialPeriod | null;
}

const IG_COLOR = "#E4405F";

export const InstagramSection: React.FC<InstagramSectionProps> = ({
  data,
  brand,
  dateRange,
  subTab,
  onSubTabChange,
  officialPeriod,
}) => {
  const filtered = useMemo(() => {
    const f = filterByDateRange(data.instagramInsights, dateRange.start, dateRange.end);
    return sortByDateAsc(f);
  }, [data.instagramInsights, dateRange]);

  const posts = data.topPostsIG;

  const visibleCards = data.visibleMetrics
    .filter((v) => v.section === "instagram_overview" && v.visible)
    .sort((a, b) => a.order - b.order);

  const findings = data.findings.filter(
    (f) =>
      officialPeriod &&
      f.periodId === officialPeriod.id &&
      (f.section === "instagram" || f.section === "general"),
  );

  const tabs = [
    { id: "overview", label: "Resumen General" },
    { id: "paid", label: "Paid Media Instagram" },
  ];

  if (subTab === "paid") {
    return (
      <div className="space-y-5">
        <TabBar
          tabs={tabs}
          activeTab={subTab}
          onChange={onSubTabChange}
          brand={{ ...brand, primaryColor: IG_COLOR }}
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
          campaigns={data.instagramAds}
          groupRules={data.groupRules}
          globalExclusions={data.globalExclusions}
          visibleMetrics={data.visibleMetrics}
          platformSection="instagram_paid"
          brand={brand}
          dateRange={dateRange}
          platformColor={IG_COLOR}
          periods={data.periods}
          officialPeriod={officialPeriod}
          campaignMetas={data.campaignMetas}
          deduplicatedReach={data.deduplicatedReach}
          manualMetricOverrides={data.manualMetricOverrides}
          platformKey="instagram"
        />
      </div>
    );
  }

  const SECTION = "instagram_overview";
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
    profileVisits: sumField(filtered, "profileVisits"),
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
    profileVisits: formatNumber(resolvedValues.profileVisits.value),
    newFollowers: formatNumber(resolvedValues.newFollowers.value),
  };
  const iconMap: Record<string, any> = {
    followers: Users,
    reach: Eye,
    impressions: Eye,
    engagement: Heart,
    interactions: Heart,
    profileVisits: Camera,
    newFollowers: UserPlus,
  };

  const rawChartData = useMemo(
    () =>
      sortByDateAsc(data.instagramInsights).map((d) => ({
        date: d.date,
        reach: d.reach,
        impressions: d.impressions,
        engagement: d.engagement,
        interactions: d.engagement,
        followers: d.followers,
        profileVisits: d.profileVisits,
        newFollowers: d.newFollowers,
      })),
    [data.instagramInsights],
  );

  const colorMap: Record<string, string> = {
    followers: IG_COLOR,
    reach: IG_COLOR,
    impressions: brand.accentColor,
    engagement: "#EC4899",
    interactions: "#EC4899",
    profileVisits: "#8B5CF6",
    newFollowers: "#10B981",
  };

  const fallbackMetrics: MetricOption[] = [
    { key: "reach", label: "Alcance", color: colorMap["reach"] },
    { key: "impressions", label: "Impresiones", color: colorMap["impressions"] },
    { key: "engagement", label: "Engagement", color: colorMap["engagement"] },
    { key: "newFollowers", label: "Nuevos Seguidores", color: colorMap["newFollowers"] },
    { key: "followers", label: "Seguidores", color: colorMap["followers"] },
    { key: "profileVisits", label: "Visitas Perfil", color: colorMap["profileVisits"] },
  ];

  const availableMetrics: MetricOption[] = (() => {
    if (visibleCards.length > 0) {
      return visibleCards.map((m) => ({
        key: m.metric,
        label: m.label,
        color: colorMap[m.metric] || IG_COLOR,
      }));
    }
    return fallbackMetrics;
  })();

  const chart1Defaults = (() => {
    const keys = availableMetrics.map((m) => m.key);
    const pref = ["reach", "impressions"];
    const f = pref.filter((k) => keys.includes(k));
    if (f.length >= 2) return f.slice(0, 2);
    if (f.length === 1 && keys.length >= 2) return [f[0], keys.find((k) => k !== f[0])!];
    return keys.slice(0, 2);
  })();
  const chart2Defaults = (() => {
    const keys = availableMetrics.map((m) => m.key);
    const pref = ["engagement", "newFollowers", "interactions", "profileVisits"];
    const f = pref.filter((k) => keys.includes(k));
    if (f.length >= 2) return f.slice(0, 2);
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
        brand={{ ...brand, primaryColor: IG_COLOR }}
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {visibleCards.map((m) => {
          if (m.metric === "reach") {
            return (
              <ReachCard
                key={m.metric}
                accumulatedReach={sumField(filtered, "reach")}
                platform="instagram_organico"
                officialPeriod={officialPeriod}
                deduplicatedReach={data.deduplicatedReach}
                brand={brand}
                color={IG_COLOR}
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
              color={IG_COLOR}
              isManual={resolvedValues[m.metric]?.isManual}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DynamicTimeSeriesChart
          brand={brand}
          title="Gráfico 1 · Alcance e Impresiones"
          subtitle="Selecciona frecuencia y métricas"
          rawData={rawChartData}
          availableMetrics={availableMetrics}
          defaultMetrics={chart1Defaults}
          chartType="area"
          idPrefix="ig-1"
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
          idPrefix="ig-2"
          lastKeys={["followers"]}
        />
      </div>

      {posts.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brand.textColor }}>
            ⭐ Top Posts de Instagram
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
