import React, { useMemo } from "react";
import { Users, Heart, MessageCircle, Share2, UserPlus, Eye } from "lucide-react";
import { TabBar } from "../ui/TabBar";
import { MetricCard } from "../ui/MetricCard";
import { TopPostEmbedCard } from "../ui/TopPostEmbedCard";
import { FindingsBanner } from "../ui/FindingsBanner";
import { PaidMediaSection } from "./PaidMediaSection";
import { DynamicTimeSeriesChart, MetricOption } from "../ui/DynamicTimeSeriesChart";
import { DashboardData, BrandConfig, OfficialPeriod } from "../../types";
import {
  filterByDateRange,
  sumField,
  getLatestValue,
  formatNumber,
} from "../../utils/formatters";
import { resolveMetricValue, hasSectionManualData } from "../../utils/manualOverrides";
import { ManualDataLegend } from "../ui/ManualDataLegend";
import { sortByDateAsc } from "../../utils/chartAggregation";

interface TikTokSectionProps {
  data: DashboardData;
  brand: BrandConfig;
  dateRange: { start: string; end: string };
  subTab: string;
  onSubTabChange: (tab: string) => void;
  officialPeriod: OfficialPeriod | null;
}

const TT_COLOR = "#000000";
const TT_ACCENT = "#FE2C55";

export const TikTokSection: React.FC<TikTokSectionProps> = ({
  data,
  brand,
  dateRange,
  subTab,
  onSubTabChange,
  officialPeriod,
}) => {
  const filtered = useMemo(() => {
    const f = filterByDateRange(data.tiktokInsights, dateRange.start, dateRange.end);
    return sortByDateAsc(f);
  }, [data.tiktokInsights, dateRange]);

  const posts = data.topPostsTT;

  const visibleCards = data.visibleMetrics
    .filter((v) => v.section === "tiktok_overview" && v.visible)
    .sort((a, b) => a.order - b.order);

  const findings = data.findings.filter(
    (f) =>
      officialPeriod &&
      f.periodId === officialPeriod.id &&
      (f.section === "tiktok" || f.section === "general"),
  );

  const tabs = [
    { id: "overview", label: "Resumen General" },
    { id: "paid", label: "Paid Media TikTok" },
  ];

  if (subTab === "paid") {
    return (
      <div className="space-y-5">
        <TabBar
          tabs={tabs}
          activeTab={subTab}
          onChange={onSubTabChange}
          brand={{ ...brand, primaryColor: TT_ACCENT }}
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
          campaigns={data.tiktokAds}
          groupRules={data.groupRules}
          globalExclusions={data.globalExclusions}
          visibleMetrics={data.visibleMetrics}
          platformSection="tiktok_paid"
          brand={brand}
          dateRange={dateRange}
          platformColor={TT_ACCENT}
          periods={data.periods}
          officialPeriod={officialPeriod}
          campaignMetas={data.campaignMetas}
          deduplicatedReach={data.deduplicatedReach}
          manualMetricOverrides={data.manualMetricOverrides}
          platformKey="tiktok"
          forceGeneralGroup
        />
      </div>
    );
  }

  const SECTION = "tiktok_overview";
  const overrides = data.manualMetricOverrides;

  const rawValues: Record<string, number> = {
    followers: getLatestValue(filtered, "followers"),
    videoViews: sumField(filtered, "videoViews"),
    likes: sumField(filtered, "likes"),
    comments: sumField(filtered, "comments"),
    shares: sumField(filtered, "shares"),
    newFollowers: sumField(filtered, "newFollowers"),
  };

  const resolvedValues: Record<string, { value: number; isManual: boolean }> = {};
  Object.keys(rawValues).forEach((key) => {
    resolvedValues[key] = resolveMetricValue(overrides, officialPeriod, SECTION, key, rawValues[key]);
  });

  const cardValueMap: Record<string, string> = {
    followers: formatNumber(resolvedValues.followers.value),
    videoViews: formatNumber(resolvedValues.videoViews.value),
    likes: formatNumber(resolvedValues.likes.value),
    comments: formatNumber(resolvedValues.comments.value),
    shares: formatNumber(resolvedValues.shares.value),
    newFollowers: formatNumber(resolvedValues.newFollowers.value),
  };
  const iconMap: Record<string, any> = {
    followers: Users,
    videoViews: Eye,
    likes: Heart,
    comments: MessageCircle,
    shares: Share2,
    newFollowers: UserPlus,
  };

  const rawChartData = useMemo(
    () =>
      filtered.map((d) => ({
        date: d.date,
        videoViews: d.videoViews,
        likes: d.likes,
        comments: d.comments,
        shares: d.shares,
        followers: d.followers,
        newFollowers: d.newFollowers,
        profileViews: (d as any).profileViews || 0,
      })),
    [filtered],
  );

  const colorMap: Record<string, string> = {
    followers: TT_ACCENT,
    videoViews: TT_ACCENT,
    likes: "#EC4899",
    comments: TT_COLOR,
    shares: brand.accentColor,
    newFollowers: "#10B981",
    profileViews: "#8B5CF6",
  };

  const fallbackMetrics: MetricOption[] = [
    { key: "videoViews", label: "Vistas", color: colorMap["videoViews"] },
    { key: "likes", label: "Likes", color: colorMap["likes"] },
    { key: "comments", label: "Comentarios", color: colorMap["comments"] },
    { key: "shares", label: "Compartidos", color: colorMap["shares"] },
    { key: "newFollowers", label: "Nuevos Seguidores", color: colorMap["newFollowers"] },
    { key: "followers", label: "Seguidores", color: colorMap["followers"] },
  ];

  const availableMetrics: MetricOption[] = (() => {
    if (visibleCards.length > 0) {
      return visibleCards.map((m) => ({
        key: m.metric,
        label: m.label,
        color: colorMap[m.metric] || TT_ACCENT,
      }));
    }
    return fallbackMetrics;
  })();

  const chart1Defaults = (() => {
    const keys = availableMetrics.map((m) => m.key);
    const pref = ["videoViews", "likes"];
    const f = pref.filter((k) => keys.includes(k));
    if (f.length >= 2) return f.slice(0, 2);
    if (f.length === 1 && keys.length >= 2) return [f[0], keys.find((k) => k !== f[0])!];
    return keys.slice(0, 2);
  })();
  const chart2Defaults = (() => {
    const keys = availableMetrics.map((m) => m.key);
    const pref = ["likes", "comments", "shares", "newFollowers"];
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
        brand={{ ...brand, primaryColor: TT_ACCENT }}
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
          const Icon = iconMap[m.metric];
          return (
            <MetricCard
              key={m.metric}
              title={m.label}
              value={cardValueMap[m.metric] || "0"}
              icon={Icon}
              brand={brand}
              color={TT_ACCENT}
              isManual={resolvedValues[m.metric]?.isManual}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DynamicTimeSeriesChart
          brand={brand}
          title="Gráfico 1 · Vistas de video"
          subtitle="Selecciona frecuencia y métricas"
          rawData={rawChartData}
          availableMetrics={availableMetrics}
          defaultMetrics={chart1Defaults}
          chartType="area"
          idPrefix="tt-1"
          lastKeys={["followers"]}
        />
        <DynamicTimeSeriesChart
          brand={brand}
          title="Gráfico 2 · Interacciones"
          subtitle="Selecciona frecuencia y métricas"
          rawData={rawChartData}
          availableMetrics={availableMetrics}
          defaultMetrics={chart2Defaults}
          chartType="bar"
          idPrefix="tt-2"
          lastKeys={["followers"]}
        />
      </div>

      {posts.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brand.textColor }}>
            ⭐ Top Videos de TikTok
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
