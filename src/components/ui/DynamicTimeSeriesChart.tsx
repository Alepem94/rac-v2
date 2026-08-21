import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChevronDown, ChevronUp, Calendar, BarChart3 } from "lucide-react";
import { BrandConfig } from "../../types";
import { Frequency, FREQUENCY_LABELS, aggregateChartData } from "../../utils/chartAggregation";
import { formatNumber } from "../../utils/formatters";
import { addDays, addMonths, addYears, format } from "date-fns";

export interface MetricOption {
  key: string;
  label: string;
  color: string;
}

interface DynamicTimeSeriesChartProps {
  brand: BrandConfig;
  title: string;
  subtitle?: string;
  rawData: Record<string, any>[];
  availableMetrics: MetricOption[];
  defaultMetrics?: string[];
  defaultFrequency?: Frequency;
  chartType?: "area" | "bar" | "line";
  height?: number;
  sumKeys?: string[];
  lastKeys?: string[];
  idPrefix: string;
  /** Si true (default), ignora el filtro de calendario y muestra ventana fija según frecuencia */
  fixedWindow?: boolean;
}

const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const DynamicTimeSeriesChart: React.FC<DynamicTimeSeriesChartProps> = ({
  brand,
  title,
  subtitle,
  rawData,
  availableMetrics,
  defaultMetrics,
  defaultFrequency = "diaria",
  chartType = "area",
  height = 220,
  sumKeys,
  lastKeys,
  idPrefix,
  fixedWindow = true,
}) => {
  const [frequency, setFrequency] = useState<Frequency>(defaultFrequency);
  const [freqOpen, setFreqOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);

  // Filtrar métricas disponibles válidas (por si vienen vacías, fallback a disponibles)
  const validOptions = availableMetrics.length > 0 ? availableMetrics : [];

  const initialMetrics = useMemo(() => {
    if (defaultMetrics && defaultMetrics.length) {
      const filtered = defaultMetrics.filter((k) => validOptions.some((o) => o.key === k));
      if (filtered.length) return filtered.slice(0, 2);
    }
    return validOptions.slice(0, 2).map((o) => o.key);
  }, [validOptions, defaultMetrics]);

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(initialMetrics);

  // Si availableMetrics cambia (ej. datos cargan), ajustar selección si está vacía
  React.useEffect(() => {
    if (selectedMetrics.length === 0 && validOptions.length > 0) {
      setSelectedMetrics(validOptions.slice(0, 2).map((o) => o.key));
    }
    // Si alguna seleccionada ya no existe, limpiar
    const stillValid = selectedMetrics.filter((k) => validOptions.some((o) => o.key === k));
    if (stillValid.length !== selectedMetrics.length) {
      setSelectedMetrics(stillValid.length ? stillValid : validOptions.slice(0, 2).map((o) => o.key));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validOptions]);

  // Ventana fija: diaria 15d, semanal 4sem, mensual 12m, anual 5a
  const windowFilteredData = useMemo(() => {
    if (!rawData.length) return [];
    if (!fixedWindow) return rawData;
    const maxDateStr = rawData.reduce((max, r) => (r.date > max ? r.date : max), rawData[0].date);
    const maxDate = parseLocalDate(maxDateStr);
    let startDate: Date;
    switch (frequency) {
      case "diaria":
        startDate = addDays(maxDate, -14);
        break;
      case "semanal":
        startDate = addDays(maxDate, -27); // 4 semanas
        break;
      case "mensual": {
        const d = addMonths(maxDate, -11);
        startDate = new Date(d.getFullYear(), d.getMonth(), 1);
        break;
      }
      case "anual": {
        const d = addYears(maxDate, -4); // últimos 5 años
        startDate = new Date(d.getFullYear(), 0, 1);
        break;
      }
      default:
        startDate = addDays(maxDate, -14);
    }
    const startStr = format(startDate, "yyyy-MM-dd");
    return rawData.filter((r) => r.date >= startStr && r.date <= maxDateStr);
  }, [rawData, frequency, fixedWindow]);

  const chartData = useMemo(() => {
    const src = windowFilteredData;
    if (!src.length) return [];
    const allKeys = validOptions.map((o) => o.key);
    const sKeys = sumKeys || allKeys.filter((k) => !(lastKeys || []).includes(k));
    const lKeys = lastKeys || [];
    return aggregateChartData(src, frequency, {
      sumKeys: sKeys,
      lastKeys: lKeys,
    });
  }, [windowFilteredData, frequency, validOptions, sumKeys, lastKeys]);

  const windowLabel = useMemo(() => {
    if (!fixedWindow) return "";
    switch (frequency) {
      case "diaria": return "Últimos 15 días";
      case "semanal": return "Últimas 4 semanas";
      case "mensual": return "Últimos 12 meses";
      case "anual": return "Últimos 5 años";
      default: return "";
    }
  }, [frequency, fixedWindow]);

  const toggleMetric = (key: string) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) {
        // si solo queda 1, no permitir deseleccionar todas (al menos 1)
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      } else {
        if (prev.length >= 2) {
          // reemplazar el último? o ignorar. Mejor ignorar y avisar visualmente
          return prev;
        }
        return [...prev, key];
      }
    });
  };

  const getMetricColor = (key: string, idx: number) => {
    const opt = validOptions.find((o) => o.key === key);
    if (opt?.color) return opt.color;
    const fallbacks = [brand.primaryColor, brand.secondaryColor, brand.accentColor, "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];
    return fallbacks[idx % fallbacks.length];
  };

  if (!validOptions.length) {
    return (
      <div className="rounded-2xl p-4 border" style={{ backgroundColor: brand.cardBg, borderColor: `${brand.primaryColor}15` }}>
        <div className="text-sm" style={{ color: `${brand.textColor}88` }}>No hay métricas configuradas para esta sección</div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 border shadow-sm"
      style={{ backgroundColor: brand.cardBg, borderColor: `${brand.primaryColor}15` }}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm" style={{ color: brand.textColor }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: `${brand.textColor}66` }}>
              {subtitle} • {FREQUENCY_LABELS[frequency]} {fixedWindow && `• ${windowLabel}`}
            </p>
          )}
          {!subtitle && (
            <p className="text-xs mt-0.5" style={{ color: `${brand.textColor}66` }}>
              Frecuencia: {FREQUENCY_LABELS[frequency]} {fixedWindow && `• ${windowLabel}`} • {selectedMetrics.length} métrica(s)
            </p>
          )}
          {fixedWindow && (
            <p className="text-[11px] mt-0.5" style={{ color: `${brand.textColor}55` }}>
              Ventana fija independiente del calendario
            </p>
          )}
        </div>
      </div>

      {/* Controles colapsables */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* Frecuencia */}
        <div className="relative">
          <button
            onClick={() => {
              setFreqOpen(!freqOpen);
              setMetricsOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all"
            style={{
              borderColor: `${brand.primaryColor}33`,
              backgroundColor: freqOpen ? `${brand.primaryColor}12` : `${brand.primaryColor}08`,
              color: brand.textColor,
            }}
          >
            <Calendar size={12} style={{ color: brand.primaryColor }} />
            {FREQUENCY_LABELS[frequency]}
            {freqOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {freqOpen && (
            <div
              className="absolute top-full left-0 mt-1.5 w-40 rounded-xl border shadow-lg z-20 overflow-hidden"
              style={{ backgroundColor: brand.cardBg, borderColor: `${brand.primaryColor}22` }}
            >
              {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((freq) => (
                <button
                  key={freq}
                  onClick={() => {
                    setFrequency(freq);
                    setFreqOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:opacity-80 transition-colors flex items-center justify-between ${
                    frequency === freq ? "font-semibold" : ""
                  }`}
                  style={{
                    backgroundColor: frequency === freq ? `${brand.primaryColor}15` : "transparent",
                    color: frequency === freq ? brand.primaryColor : brand.textColor,
                  }}
                >
                  {FREQUENCY_LABELS[freq]}
                  {frequency === freq && <span className="text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Métricas */}
        <div className="relative">
          <button
            onClick={() => {
              setMetricsOpen(!metricsOpen);
              setFreqOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all"
            style={{
              borderColor: `${brand.primaryColor}33`,
              backgroundColor: metricsOpen ? `${brand.primaryColor}12` : `${brand.primaryColor}08`,
              color: brand.textColor,
            }}
          >
            <BarChart3 size={12} style={{ color: brand.primaryColor }} />
            Métricas ({selectedMetrics.length}/2)
            {metricsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {metricsOpen && (
            <div
              className="absolute top-full left-0 mt-1.5 w-56 rounded-xl border shadow-lg z-20 overflow-hidden"
              style={{ backgroundColor: brand.cardBg, borderColor: `${brand.primaryColor}22` }}
            >
              <div className="px-3 py-2 border-b" style={{ borderColor: `${brand.primaryColor}10` }}>
                <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: `${brand.textColor}88` }}>
                  Selecciona hasta 2 métricas
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {validOptions.map((opt) => {
                  const isSelected = selectedMetrics.includes(opt.key);
                  const isDisabled = !isSelected && selectedMetrics.length >= 2;
                  return (
                    <label
                      key={opt.key}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isDisabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-80"
                      }`}
                      style={{
                        backgroundColor: isSelected ? `${opt.color}12` : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => toggleMetric(opt.key)}
                        className="rounded"
                        style={{ accentColor: opt.color }}
                      />
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                      <span className="flex-1" style={{ color: brand.textColor }}>
                        {opt.label}
                      </span>
                      {isSelected && <span style={{ color: opt.color }} className="text-[10px]">✓</span>}
                    </label>
                  );
                })}
              </div>
              {selectedMetrics.length >= 2 && (
                <div className="px-3 py-1.5 text-[10px] text-center" style={{ color: `${brand.textColor}55`, backgroundColor: `${brand.primaryColor}05` }}>
                  Máximo 2 métricas. Deselecciona una para elegir otra.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chips de métricas seleccionadas */}
        <div className="flex flex-wrap items-center gap-1.5 ml-1">
          {selectedMetrics.map((k, idx) => {
            const opt = validOptions.find((o) => o.key === k);
            if (!opt) return null;
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                style={{
                  backgroundColor: `${opt.color}10`,
                  borderColor: `${opt.color}33`,
                  color: opt.color,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }} />
                {opt.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {chartType === "area" ? (
          <AreaChart data={chartData}>
            <defs>
              {selectedMetrics.map((k, idx) => {
                const c = getMetricColor(k, idx);
                return (
                  <linearGradient key={k} id={`${idPrefix}-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={`${brand.textColor}10`} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: `${brand.textColor}77` }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: `${brand.textColor}77` }} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: `1px solid ${brand.primaryColor}33`,
                backgroundColor: brand.cardBg,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedMetrics.map((k, idx) => {
              const c = getMetricColor(k, idx);
              const label = validOptions.find((o) => o.key === k)?.label || k;
              return (
                <Area
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={label}
                  stroke={c}
                  fill={`url(#${idPrefix}-${k})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              );
            })}
          </AreaChart>
        ) : chartType === "bar" ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${brand.textColor}10`} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: `${brand.textColor}77` }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: `${brand.textColor}77` }} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: `1px solid ${brand.primaryColor}33`,
                backgroundColor: brand.cardBg,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedMetrics.map((k, idx) => {
              const c = getMetricColor(k, idx);
              const label = validOptions.find((o) => o.key === k)?.label || k;
              return <Bar key={k} dataKey={k} name={label} fill={c} radius={[4, 4, 0, 0]} />;
            })}
          </BarChart>
        ) : (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${brand.textColor}10`} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: `${brand.textColor}77` }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: `${brand.textColor}77` }} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: `1px solid ${brand.primaryColor}33`,
                backgroundColor: brand.cardBg,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedMetrics.map((k, idx) => {
              const c = getMetricColor(k, idx);
              const label = validOptions.find((o) => o.key === k)?.label || k;
              return (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={label}
                  stroke={c}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              );
            })}
          </LineChart>
        )}
      </ResponsiveContainer>

      {chartData.length === 0 && (
        <div className="text-center text-xs py-6" style={{ color: `${brand.textColor}66` }}>
          {fixedWindow ? `No hay datos en ${windowLabel.toLowerCase()}` : "No hay datos en el rango seleccionado"}
        </div>
      )}
    </div>
  );
};
