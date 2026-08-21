import React from "react";
import { Lightbulb, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { BrandConfig, Finding } from "../../types";

interface FindingsBannerProps {
  findings: Finding[];
  brand: BrandConfig;
  periodName?: string;
}

const typeConfig = {
  positivo: {
    icon: CheckCircle2,
    bg: "#DCFCE7",
    border: "#86EFAC",
    color: "#166534",
  },
  alerta: {
    icon: AlertTriangle,
    bg: "#FEF3C7",
    border: "#FCD34D",
    color: "#92400E",
  },
  neutro: {
    icon: Info,
    bg: "#DBEAFE",
    border: "#93C5FD",
    color: "#1E3A8A",
  },
};

export const FindingsBanner: React.FC<FindingsBannerProps> = ({
  findings,
  brand,
  periodName,
}) => {
  if (findings.length === 0) return null;
  return (
    <div
      className="rounded-2xl p-4 border-2 shadow-sm"
      style={{
        backgroundColor: `${brand.accentColor}15`,
        borderColor: `${brand.accentColor}88`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={16} style={{ color: brand.secondaryColor }} />
        <h3
          className="font-bold text-sm"
          style={{ color: brand.secondaryColor }}
        >
          Hallazgos {periodName ? `· ${periodName}` : ""}
        </h3>
      </div>
      <div className="space-y-2.5">
        {findings.map((f, i) => {
          const conf = typeConfig[f.type] || typeConfig.neutro;
          const Icon = conf.icon;
          return (
            <div
              key={i}
              className="rounded-xl p-3 border flex gap-3"
              style={{ backgroundColor: conf.bg, borderColor: conf.border }}
            >
              <Icon size={16} style={{ color: conf.color }} className="shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div
                  className="font-semibold text-sm"
                  style={{ color: conf.color }}
                >
                  {f.title}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: `${conf.color}CC` }}
                >
                  {f.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
