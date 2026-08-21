import React from "react";
import { LucideIcon } from "lucide-react";
import { BrandConfig } from "../../types";
import { MANUAL_COLOR } from "../../utils/manualOverrides";

interface MetricCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  brand: BrandConfig;
  color?: string;
  subtitle?: string;
  trend?: { value: number; label?: string };
  isManual?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  brand,
  color,
  subtitle,
  trend,
  isManual = false,
}) => {
  const accent = color || brand.primaryColor;
  const valueColor = isManual ? MANUAL_COLOR : brand.textColor;

  return (
    <div
      className="rounded-2xl p-4 border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{
        backgroundColor: brand.cardBg,
        borderColor: isManual ? `${MANUAL_COLOR}44` : `${accent}22`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: `${brand.textColor}88` }}
        >
          {title}
        </span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: isManual ? `${MANUAL_COLOR}15` : `${accent}15` }}
        >
          {Icon && <Icon size={15} style={{ color: isManual ? MANUAL_COLOR : accent }} />}
        </div>
      </div>

      <div className="text-xl md:text-2xl font-bold" style={{ color: valueColor }}>
        {value}
      </div>

      {subtitle && (
        <div className="text-xs mt-1" style={{ color: `${brand.textColor}66` }}>
          {subtitle}
        </div>
      )}

      {trend && (
        <div className="text-xs mt-1 flex items-center gap-1">
          <span
            className={`font-semibold ${
              trend.value >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}%
          </span>
          {trend.label && (
            <span style={{ color: `${brand.textColor}55` }}>{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
};
