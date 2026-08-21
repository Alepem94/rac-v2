import React from "react";
import { CalendarClock } from "lucide-react";
import { BrandConfig, OfficialPeriod } from "../../types";

interface PeriodSelectorProps {
  periods: OfficialPeriod[];
  currentRange: { start: string; end: string };
  onSelect: (range: { start: string; end: string }) => void;
  brand: BrandConfig;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periods,
  currentRange,
  onSelect,
  brand,
}) => {
  const activePeriod = periods.find(
    (p) => p.startDate === currentRange.start && p.endDate === currentRange.end,
  );
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div
        className="flex items-center gap-1.5 text-xs font-medium"
        style={{ color: `${brand.textColor}88` }}
      >
        <CalendarClock size={13} />
        Periodo:
      </div>
      {periods.map((p) => {
        const isActive = activePeriod?.id === p.id;
        return (
          <button
            key={p.id}
            onClick={() =>
              onSelect({ start: p.startDate, end: p.endDate })
            }
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all border"
            style={{
              backgroundColor: isActive ? brand.primaryColor : "transparent",
              color: isActive ? "#FFFFFF" : brand.textColor,
              borderColor: isActive
                ? brand.primaryColor
                : `${brand.primaryColor}33`,
            }}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
};
