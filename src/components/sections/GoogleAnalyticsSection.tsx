import React, { useMemo } from "react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Activity, Users, UserPlus, Eye, Clock, ArrowUpRight } from "lucide-react";
import { MetricCard } from "../ui/MetricCard";
import { ChartCard } from "../ui/ChartCard";
import { FindingsBanner } from "../ui/FindingsBanner";
import { DynamicTimeSeriesChart, MetricOption } from "../ui/DynamicTimeSeriesChart";
import { DashboardData, BrandConfig, OfficialPeriod } from "../../types";
import {
  filterByDateRange, sumField,
  formatNumber, formatPercent, formatDuration,
} from "../../utils/formatters";
import { resolveMetricValue, hasSectionManualData } from "../../utils/manualOverrides";
import { ManualDataLegend } from "../ui/ManualDataLegend";
import { sortByDateAsc } from "../../utils/chartAggregation";

interface GoogleAnalyticsSectionProps {
  data: DashboardData;
  brand: BrandConfig;
  dateRange: { start: string; end: string };
  officialPeriod: OfficialPeriod | null;
}

const GA_COLOR = "#F59E0B";

export const GoogleAnalyticsSection: React.FC<GoogleAnalyticsSectionProps> = ({
  data,
  brand,
  dateRange,
  officialPeriod,
}) => {
  const filtered = useMemo(() => {
    const f = filterByDateRange(data.googleAnalytics, dateRange.start, dateRange.end);
    return sortByDateAsc(f);
  }, [data.googleAnalytics, dateRange]);

  const totalSessions = sumField(filtered, "sessions");
  const totalUsers = sumField(filtered, "users");
  const totalNewUsers = sumField(filtered, "newUsers");
  const totalPageViews = sumField(filtered, "pageViews");
  const avgBounce =
    filtered.length > 0
      ? (filtered.reduce((a, r) => a + r.bounceRate, 0) / filtered.length) * 100
      : 0;
  const avgDur =
    filtered.length > 0
      ? filtered.reduce((a, r) => a + r.avgSessionDuration, 0) / filtered.length
      : 0;

  // Datos diarios para gráficos dinámicos (ventana fija, ignoran calendario)
  const rawAnalyticsDaily = useMemo(
    () =>
      sortByDateAsc(data.googleAnalytics).map((r) => ({
        date: r.date,
        sessions: r.sessions,
        users: r.users,
        newUsers: r.newUsers,
        pageViews: r.pageViews,
        bounceRate: r.bounceRate * 100,
        avgSessionDuration: r.avgSessionDuration,
        conversions: r.conversions,
      })),
    [data.googleAnalytics],
  );

  const channelData = useMemo(() => {
    const byChannel: Record<string, number> = {};
    filtered.forEach((r) => {
      const ch = r.channel || "Direct";
      byChannel[ch] = (byChannel[ch] || 0) + r.sessions;
    });
    return Object.entries(byChannel)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filtered]);

  const CHANNEL_COLORS = [
    brand.primaryColor, brand.secondaryColor, brand.accentColor,
    "#10B981", "#F59E0B", "#8B5CF6",
  ];

  const filteredCountries = useMemo(
    () => filterByDateRange(data.gaCountries, dateRange.start, dateRange.end),
    [data.gaCountries, dateRange],
  );
  const countryChartData = useMemo(() => {
    const byCountry: Record<string, number> = {};
    filteredCountries.forEach((r) => {
      byCountry[r.country] = (byCountry[r.country] || 0) + r.sessions;
    });
    return Object.entries(byCountry)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredCountries]);

  const filteredDevices = useMemo(
    () => filterByDateRange(data.gaDevices, dateRange.start, dateRange.end),
    [data.gaDevices, dateRange],
  );
  const deviceChartData = useMemo(() => {
    const byDevice: Record<string, number> = {};
    filteredDevices.forEach((r) => {
      byDevice[r.device] = (byDevice[r.device] || 0) + r.sessions;
    });
    return Object.entries(byDevice)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredDevices]);

  const filteredTopPages = useMemo(() => {
    const fp = filterByDateRange(data.gaTopPages, dateRange.start, dateRange.end);
    const byUrl: Record<string, { url: string; title: string; pageViews: number; avgTime: number; count: number }> = {};
    fp.forEach((p) => {
      if (!byUrl[p.url]) byUrl[p.url] = { url: p.url, title: p.title, pageViews: 0, avgTime: 0, count: 0 };
      byUrl[p.url].pageViews += p.pageViews;
      byUrl[p.url].avgTime += p.avgTime;
      byUrl[p.url].count++;
    });
    return Object.values(byUrl)
      .map((p) => ({ ...p, avgTime: p.count > 0 ? p.avgTime / p.count : 0 }))
      .sort((a, b) => b.pageViews - a.pageViews);
  }, [data.gaTopPages, dateRange]);

  const visibleCards = data.visibleMetrics
    .filter((v) => v.section === "analytics" && v.visible)
    .sort((a, b) => a.order - b.order);
  const iconMap: Record<string, any> = {
    sessions: Activity,
    users: Users,
    newUsers: UserPlus,
    pageViews: Eye,
    bounceRate: ArrowUpRight,
    avgSessionDuration: Clock,
  };

  const SECTION = "analytics";
  const overrides = data.manualMetricOverrides;
  const rawNums: Record<string, number> = {
    sessions: totalSessions,
    users: totalUsers,
    newUsers: totalNewUsers,
    pageViews: totalPageViews,
    bounceRate: avgBounce,
    avgSessionDuration: avgDur,
  };
  const resolvedValues: Record<string, { value: number; isManual: boolean }> = {};
  Object.keys(rawNums).forEach((key) => {
    resolvedValues[key] = resolveMetricValue(overrides, officialPeriod, SECTION, key, rawNums[key]);
  });

  const valMap: Record<string, string> = {
    sessions: formatNumber(resolvedValues.sessions.value),
    users: formatNumber(resolvedValues.users.value),
    newUsers: formatNumber(resolvedValues.newUsers.value),
    pageViews: formatNumber(resolvedValues.pageViews.value),
    bounceRate: formatPercent(resolvedValues.bounceRate.value, 1),
    avgSessionDuration: formatDuration(resolvedValues.avgSessionDuration.value),
  };

  const findings = data.findings.filter(
    (f) =>
      officialPeriod &&
      f.periodId === officialPeriod.id &&
      (f.section === "analytics" || f.section === "general"),
  );

  // Métricas para gráficos GA: derivadas de analytics
  const colorMapGA: Record<string, string> = {
    sessions: GA_COLOR,
    users: brand.secondaryColor,
    newUsers: "#10B981",
    pageViews: "#8B5CF6",
    bounceRate: "#EF4444",
    avgSessionDuration: "#06B6D4",
    conversions: "#F59E0B",
  };
  const fallbackGAMetrics: MetricOption[] = [
    { key: "sessions", label: "Sesiones", color: colorMapGA["sessions"] },
    { key: "users", label: "Usuarios", color: colorMapGA["users"] },
    { key: "newUsers", label: "Nuevos Usuarios", color: colorMapGA["newUsers"] },
    { key: "pageViews", label: "Páginas vistas", color: colorMapGA["pageViews"] },
    { key: "conversions", label: "Conversiones", color: colorMapGA["conversions"] },
  ];
  const availableGAMetrics: MetricOption[] = (() => {
    const summableKeys = ["sessions","users","newUsers","pageViews","conversions","bounceRate","avgSessionDuration"];
    if (visibleCards.length > 0) {
      const filtered = visibleCards
        .filter(m => summableKeys.includes(m.metric))
        .map(m => ({ key: m.metric, label: m.label, color: colorMapGA[m.metric] || GA_COLOR }));
      if (filtered.length >= 2) return filtered;
      if (filtered.length > 0) {
        const missing = fallbackGAMetrics.filter(f=>!filtered.some(x=>x.key===f.key));
        return [...filtered, ...missing].slice(0, Math.max(4, filtered.length+2));
      }
    }
    return fallbackGAMetrics;
  })();
  const gaChart1Defaults = (() => {
    const keys = availableGAMetrics.map(m=>m.key);
    const pref = ["sessions","users"];
    const f = pref.filter(k=>keys.includes(k));
    if (f.length>=2) return f.slice(0,2);
    if (f.length===1 && keys.length>=2) return [f[0], keys.find(k=>k!==f[0])!];
    return keys.slice(0,2);
  })();
  const gaChart2Defaults = (() => {
    const keys = availableGAMetrics.map(m=>m.key);
    const pref = ["pageViews","newUsers","conversions"];
    const f = pref.filter(k=>keys.includes(k));
    if (f.length>=2) return f.slice(0,2);
    const rem = keys.filter(k=>!gaChart1Defaults.includes(k));
    if (rem.length>=2) return rem.slice(0,2);
    if (rem.length===1 && keys.length>=2) return [rem[0], keys.find(k=>k!==rem[0])!];
    return keys.slice(0,2);
  })();

  return (
    <div className="space-y-5">
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
              value={valMap[m.metric] || "0"}
              icon={Icon}
              brand={brand}
              color={GA_COLOR}
              isManual={resolvedValues[m.metric]?.isManual}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DynamicTimeSeriesChart
          brand={brand}
          title="Gráfico 1 · Sesiones y Usuarios"
          subtitle="Frecuencia y métricas de Analytics"
          rawData={rawAnalyticsDaily}
          availableMetrics={availableGAMetrics}
          defaultMetrics={gaChart1Defaults}
          chartType="area"
          idPrefix="ga-1"
        />
        <DynamicTimeSeriesChart
          brand={brand}
          title="Gráfico 2 · Páginas y Conversiones"
          subtitle="Frecuencia y métricas de Analytics"
          rawData={rawAnalyticsDaily}
          availableMetrics={availableGAMetrics}
          defaultMetrics={gaChart2Defaults}
          chartType="bar"
          idPrefix="ga-2"
        />
      </div>

      {/* Distribución por canal sigue como pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Distribución por canal" brand={brand}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={channelData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                label={(entry: any) => entry.name}
                labelLine={false}
                style={{ fontSize: 10 }}
              >
                {channelData.map((_, idx) => (
                  <Cell key={idx} fill={CHANNEL_COLORS[idx % CHANNEL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: any) => formatNumber(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {filteredCountries.length > 0 && (
          <ChartCard title="🌎 Sesiones por país" brand={brand}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={countryChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={`${brand.textColor}10`} />
                <XAxis type="number" tick={{ fontSize: 10, fill: `${brand.textColor}77` }} tickFormatter={formatNumber} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: `${brand.textColor}77` }} width={80} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="value" fill={GA_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {filteredDevices.length > 0 && (
        <ChartCard title="📱 Sesiones por dispositivo" brand={brand}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={deviceChartData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={3}
                label={(entry: any) => `${entry.name}: ${formatNumber(entry.value)}`}
                labelLine={false}
                style={{ fontSize: 10 }}
              >
                {deviceChartData.map((_, idx) => (
                  <Cell key={idx} fill={CHANNEL_COLORS[idx % CHANNEL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: any) => formatNumber(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {filteredTopPages.length > 0 && (
        <ChartCard title="📄 Top páginas" brand={brand}>
          <div className="overflow-x-auto scrollbar-thin rounded-xl border" style={{ borderColor: `${brand.primaryColor}15` }}>
            <table className="w-full text-xs">
              <thead style={{ backgroundColor: `${brand.secondaryColor}F5` }}>
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-white uppercase tracking-wide">Página</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-white uppercase tracking-wide">Vistas</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-white uppercase tracking-wide">Tiempo prom.</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopPages.slice(0, 15).map((p, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: `${brand.primaryColor}10` }}>
                    <td className="px-3 py-2" style={{ color: brand.textColor }}>
                      <div className="font-medium truncate max-w-[300px]" title={p.url}>{p.title || p.url}</div>
                      <div className="text-[10px]" style={{ color: `${brand.textColor}66` }}>{p.url}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium" style={{ color: brand.textColor }}>{formatNumber(p.pageViews)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: brand.textColor }}>{formatDuration(p.avgTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  );
};
