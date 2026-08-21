import React from "react";
import { BrandConfig } from "../../types";

interface ChartCardProps {
  title: string;
  brand: BrandConfig;
  children: React.ReactNode;
  action?: React.ReactNode;
  subtitle?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  brand,
  children,
  action,
  subtitle,
}) => (
  <div
    className="rounded-2xl p-4 border shadow-sm"
    style={{ backgroundColor: brand.cardBg, borderColor: `${brand.primaryColor}15` }}
  >
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3
          className="font-semibold text-sm"
          style={{ color: brand.textColor }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: `${brand.textColor}66` }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
    {children}
  </div>
);
