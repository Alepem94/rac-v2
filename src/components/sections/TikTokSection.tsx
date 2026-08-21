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
import { Users, Heart, MessageCircle, Share2, UserPlus, Eye } from "lucide-react";
import { TabBar } from "../ui/TabBar";
import { MetricCard } from "../ui/MetricCard";
import { ChartCard } from "../ui/ChartCard";
import { TopPostEmbedCard } from "../ui/TopPostEmbedCard";
import { FindingsBanner } from "../ui/FindingsBanner";
import { PaidMediaSection } from "./PaidMediaSection";
import { DashboardData, BrandConfig, OfficialPeriod } from "../../types";
import {
  filterByDateRange,
  sumField,
  getLatestValue,
  formatNumber,
} from "../../utils/formatters";
import { resolveMetricValue, hasSectionManualData } from "../../utils/manualOverrides";
import { ManualDataLegend } from "../ui/ManualDataLegend";

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
  const filtered = useMemo(
    () => filterByDateRange(data.tiktokInsights, dateRange.start, dateRange.end),
    [data.tiktokInsights, dateRange],
  );

  const posts = data.topPostsTT;

  const chartData = useMemo(
    () =>
      filtered.map((d) => ({
        date: d.date.slice(5),
        Vistas: d.videoViews,
        Likes: d.likes,
        Comentarios: d.comments,
        Compartidos: d.shares,
      })),
    [filtered],
  );

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
        <ChartCard title="Vistas de video por día" brand={brand}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="ttViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TT_ACCENT} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={TT_ACCENT} stopOpacity={0} />
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
                  border: `1px solid ${TT_ACCENT}33`,
                }}
              />
              <Area
                type="monotone"
                dataKey="Vistas"
                stroke={TT_ACCENT}
                fill="url(#ttViews)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Interacciones diarias" brand={brand}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${brand.textColor}10`} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: `${brand.textColor}77` }} />
              <YAxis tick={{ fontSize: 10, fill: `${brand.textColor}77` }} />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: `1px solid ${TT_ACCENT}33`,
                }}
              />
              <Bar dataKey="Likes" fill={TT_ACCENT} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Comentarios" fill={TT_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Compartidos" fill={brand.accentColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
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
