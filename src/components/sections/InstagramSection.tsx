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
import { Users, Eye, Heart, UserPlus, Camera } from "lucide-react";
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
  const filtered = useMemo(
    () => filterByDateRange(data.instagramInsights, dateRange.start, dateRange.end),
    [data.instagramInsights, dateRange],
  );

  const posts = data.topPostsIG;

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
        <ChartCard title="Alcance e Impresiones diarias" brand={brand}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="igReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={IG_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={IG_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="igImpr" x1="0" y1="0" x2="0" y2="1">
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
                  border: `1px solid ${IG_COLOR}33`,
                }}
              />
              <Area
                type="monotone"
                dataKey="Alcance"
                stroke={IG_COLOR}
                fill="url(#igReach)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Impresiones"
                stroke={brand.accentColor}
                fill="url(#igImpr)"
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
                  border: `1px solid ${IG_COLOR}33`,
                }}
              />
              <Bar dataKey="Engagement" fill={IG_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Nuevos Seguidores" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
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
