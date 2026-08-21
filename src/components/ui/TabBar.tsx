import React from "react";
import { BrandConfig } from "../../types";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  brand: BrandConfig;
  size?: "sm" | "md";
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onChange,
  brand,
  size = "md",
}) => {
  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-2xl border shadow-sm overflow-x-auto scrollbar-thin"
      style={{
        backgroundColor: `${brand.primaryColor}08`,
        borderColor: `${brand.primaryColor}22`,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-xl font-medium transition-all whitespace-nowrap ${padding}`}
            style={{
              backgroundColor: isActive ? brand.primaryColor : "transparent",
              color: isActive ? "#FFFFFF" : brand.textColor,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
