import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Users, Eye, Heart, TrendingUp, UserPlus } from "lucide-react";
import { TabBar } from "../ui/TabBar";
import { MetricCard } from "../ui/MetricCard";
import { ChartCard } from "../ui/ChartCard";
import { TopPostEmbedCard } from "../ui/TopPostEmbedCard";
import { ReachCard } from "../ui/ReachCard";
import { FindingsBanner } from "../ui/FindingsBanner";
import { PaidMediaSection } from "./PaidMediaSection";
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
  const filtered = useMemo(
    () => filterByDateRange(data.facebookInsights, dateRange.start, dateRange.end),
    [data.facebookInsights, dateRange],
  );

  const posts = data.topPostsFB;

  const chartData = useMemo(
    () =>
      filtered.map((d) => ({
        date: d.date.slice(5),
        Alcance: d.reach,
        Impresiones: d.impressions,
        Engagement: d.engagement,
        "Nuevos Seguidores": d.newFollowers,
      })),
    [filtered],
  );

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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Alcance e Impresiones diarias" brand={brand}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fbReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={FB_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={FB_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fbImpr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={brand.accentColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={brand.accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={`${brand.textColor}10`} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: `${brand.textColor}77` }} />
              <YAxis
                tick={{ fontSize: 10, fill: `${brand.textColor}77` }}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: `1px solid ${FB_COLOR}33`,
                }}
              />
              <Area
                type="monotone"
                dataKey="Alcance"
                stroke={FB_COLOR}
                fill="url(#fbReach)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Impresiones"
                stroke={brand.accentColor}
                fill="url(#fbImpr)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Engagement y Nuevos Seguidores" brand={brand}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${brand.textColor}10`} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: `${brand.textColor}77` }} />
              <YAxis tick={{ fontSize: 10, fill: `${brand.textColor}77` }} />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: `1px solid ${FB_COLOR}33`,
                }}
              />
              <Bar dataKey="Engagement" fill={FB_COLOR} radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="Nuevos Seguidores"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
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
