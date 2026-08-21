import React from "react";
import { Search, X } from "lucide-react";
import { BrandConfig } from "../../types";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  brand: BrandConfig;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Buscar…",
  brand,
}) => (
  <div
    className="flex items-center gap-2 rounded-xl border px-3 py-2"
    style={{
      backgroundColor: brand.cardBg,
      borderColor: `${brand.primaryColor}22`,
    }}
  >
    <Search size={14} style={{ color: `${brand.textColor}77` }} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 bg-transparent outline-none text-sm"
      style={{ color: brand.textColor }}
    />
    {value && (
      <button
        onClick={() => onChange("")}
        className="opacity-60 hover:opacity-100"
        aria-label="Limpiar"
      >
        <X size={14} style={{ color: brand.textColor }} />
      </button>
    )}
  </div>
);
