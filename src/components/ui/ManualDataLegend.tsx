import React from "react";
import { BrandConfig } from "../../types";
import { MANUAL_COLOR } from "../../utils/manualOverrides";

interface ManualDataLegendProps {
  brand: BrandConfig;
}

/**
 * Leyenda única que aparece en una sección cuando hay al menos un dato manual.
 * Solo se monta si el padre decide mostrarla (cuando hasSectionManualData === true).
 */
export const ManualDataLegend: React.FC<ManualDataLegendProps> = ({ brand }) => (
  <div
    className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs border"
    style={{
      backgroundColor: `${MANUAL_COLOR}10`,
      borderColor: `${MANUAL_COLOR}40`,
      color: `${brand.textColor}99`,
    }}
  >
    <span
      className="shrink-0 font-bold text-sm leading-none mt-0.5"
      style={{ color: MANUAL_COLOR }}
    >
      ●
    </span>
    <span>
      Los valores en{" "}
      <span className="font-semibold" style={{ color: MANUAL_COLOR }}>
        azul
      </span>{" "}
      fueron reportados directamente desde la plataforma de origen para mayor
      precisión. Pueden diferir de los totales calculados automáticamente por
      Porter Metrics.
    </span>
  </div>
);
