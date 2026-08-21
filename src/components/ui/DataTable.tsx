import React from "react";
import { BrandConfig } from "../../types";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  brand: BrandConfig;
  emptyMessage?: string;
  maxHeight?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  brand,
  emptyMessage = "No hay datos para mostrar.",
  maxHeight,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div
        className="text-center py-8 text-sm rounded-xl"
        style={{
          backgroundColor: `${brand.primaryColor}05`,
          color: `${brand.textColor}77`,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="overflow-auto scrollbar-thin rounded-xl border"
      style={{
        borderColor: `${brand.primaryColor}15`,
        maxHeight,
      }}
    >
      <table className="w-full text-xs">
        <thead
          className="sticky top-0 z-10"
          style={{ backgroundColor: `${brand.secondaryColor}F5` }}
        >
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2.5 font-semibold uppercase text-[10px] tracking-wide"
                style={{
                  color: "#FFFFFF",
                  textAlign: col.align || "left",
                  width: col.width,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-t hover:bg-slate-50 transition-colors"
              style={{ borderColor: `${brand.primaryColor}10` }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-3 py-2"
                  style={{
                    color: brand.textColor,
                    textAlign: col.align || "left",
                  }}
                >
                  {col.render ? col.render(row) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
