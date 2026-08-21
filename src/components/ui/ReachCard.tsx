import React from "react";
import { Globe, AlertCircle, Info } from "lucide-react";
import { BrandConfig, DeduplicatedReach, OfficialPeriod } from "../../types";
import { formatNumber } from "../../utils/formatters";

interface ReachCardProps {
  accumulatedReach: number;
  platform: string;
  officialPeriod: OfficialPeriod | null;
  deduplicatedReach: DeduplicatedReach[];
  brand: BrandConfig;
  color?: string;
}

export const ReachCard: React.FC<ReachCardProps> = ({
  accumulatedReach,
  platform,
  officialPeriod,
  deduplicatedReach,
  brand,
  color,
}) => {
  const accent = color || brand.primaryColor;
  const dedupEntry = officialPeriod
    ? deduplicatedReach.find(
        (d) => d.periodId === officialPeriod.id && d.platform === platform,
      )
    : null;
  const hasDedup = dedupEntry && dedupEntry.reach > 0;

  return (
    <div
      className="rounded-2xl p-4 border shadow-sm"
      style={{
        backgroundColor: brand.cardBg,
        borderColor: `${accent}22`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: `${brand.textColor}88` }}
        >
          Alcance
        </span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}15` }}
        >
          <Globe size={15} style={{ color: accent }} />
        </div>
      </div>
      <div
        className="text-xl md:text-2xl font-bold"
        style={{ color: brand.textColor }}
      >
        {hasDedup
          ? formatNumber(dedupEntry!.reach)
          : formatNumber(accumulatedReach)}
      </div>
      {hasDedup ? (
        <div
          className="mt-2 text-[10px] flex items-start gap-1 rounded-lg p-1.5"
          style={{
            backgroundColor: "#DCFCE7",
            color: "#166534",
          }}
        >
          <Info size={10} className="shrink-0 mt-0.5" />
          <span>
            Alcance deduplicado del periodo oficial ({dedupEntry!.source})
          </span>
        </div>
      ) : (
        <div
          className="mt-2 text-[10px] flex items-start gap-1 rounded-lg p-1.5"
          style={{
            backgroundColor: "#FEF3C7",
            color: "#92400E",
          }}
        >
          <AlertCircle size={10} className="shrink-0 mt-0.5" />
          <span>
            Acumulado por días (no único). Usa un periodo oficial para ver el alcance deduplicado.
          </span>
        </div>
      )}
    </div>
  );
};
