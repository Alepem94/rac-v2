import React from "react";
import { BrandConfig, PaidCampaignRow, CampaignMeta } from "../../types";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "../../utils/formatters";
import { inferCampaignResult } from "../../utils/resultInference";

interface CampaignBreakdownTableProps {
  campaigns: Array<{
    name: string;
    rows: PaidCampaignRow[];
    status: string;
    objective: string;
  }>;
  brand: BrandConfig;
  groupColor: string;
  /** Solo se pasa cuando es periodo oficial */
  metas?: CampaignMeta[];
  isOfficialPeriod: boolean;
  /** Función opcional para calcular el resultado. Si no se pasa usa inferCampaignResult. */
  resultFn?: (name: string, rows: PaidCampaignRow[]) => { value: number; label: string; field: string };
}

export const CampaignBreakdownTable: React.FC<CampaignBreakdownTableProps> = ({
  campaigns,
  brand,
  groupColor,
  metas = [],
  isOfficialPeriod,
  resultFn,
}) => {
  if (campaigns.length === 0) {
    return (
      <div
        className="text-center py-6 text-xs rounded-xl"
        style={{
          backgroundColor: `${brand.primaryColor}05`,
          color: `${brand.textColor}77`,
        }}
      >
        No hay campañas con actividad en este rango.
      </div>
    );
  }

  // Headers para fechas personalizadas (orden original sin cambios)
  const baseHeaders = ["Campaña", "Tipo de compra", "Estatus", "Gasto", "Resultados", "Alcance", "CPR"];

  // Headers para periodo oficial con el nuevo orden:
  // Campaña | Tipo de compra | Estatus | Alcance | Proy. Inv. | Gasto | % Inv. | CPR Proy. | CPR | Var. CPR | Proy. Result. | Resultados | % Result.
  const projHeaders = [
    "Campaña", "Tipo de compra", "Estatus", "Alcance",
    "Proy. Inv.", "Gasto", "% Inv.", "CPR Proy.", "CPR", "Var. CPR",
    "Proy. Result.", "Resultados", "% Result.",
  ];

  const headers = isOfficialPeriod ? projHeaders : baseHeaders;

  const findMeta = (campaignName: string): CampaignMeta | undefined => {
    return metas.find(
      (m) => m.campaignName.toLowerCase().trim() === campaignName.toLowerCase().trim(),
    );
  };

  return (
    <div
      className="overflow-x-auto rounded-xl border scrollbar-thin"
      style={{ borderColor: `${groupColor}33` }}
    >
      <table className="w-full text-[11px]">
        <thead style={{ backgroundColor: `${groupColor}15` }}>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-2.5 py-2 font-semibold uppercase text-[10px] tracking-wide text-left whitespace-nowrap"
                style={{ color: brand.secondaryColor }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns
            .filter((c) => {
              const spend = c.rows.reduce((a, r) => a + (r.spend || 0), 0);
              const result = resultFn ? resultFn(c.name, c.rows) : inferCampaignResult(c.name, c.objective, c.rows);
              return spend > 0 || result.value > 0;
            })
            .map((c, idx) => {
            const totalSpend = c.rows.reduce((a, r) => a + (r.spend || 0), 0);
            const totalReach = c.rows.reduce((a, r) => a + (r.reach || 0), 0);

            const result = resultFn ? resultFn(c.name, c.rows) : inferCampaignResult(c.name, c.objective, c.rows);
            const cpr = result.value > 0 ? totalSpend / result.value : 0;

            const isActive =
              c.status === "ACTIVE" ||
              c.status === "Activo" ||
              c.status === "ENABLED";

            const meta = isOfficialPeriod ? findMeta(c.name) : undefined;

            return (
              <tr
                key={idx}
                className="border-t hover:bg-slate-50"
                style={{ borderColor: `${groupColor}15` }}
              >
                {/* Campaña */}
                <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                  <div className="font-semibold truncate max-w-[260px]" title={c.name}>
                    {c.name}
                  </div>
                </td>
                {/* Tipo de compra */}
                <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                  {c.objective || "—"}
                </td>
                {/* Estatus */}
                <td className="px-2.5 py-2">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: isActive ? "#DCFCE7" : "#F1F5F9",
                      color: isActive ? "#166534" : "#475569",
                    }}
                  >
                    {c.status}
                  </span>
                </td>

                {isOfficialPeriod ? (
                  <>
                    {/* Alcance */}
                    <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                      {formatNumber(totalReach)}
                    </td>
                    {/* Proy. Inv. */}
                    <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                      {meta ? formatCurrency(meta.budget) : "—"}
                    </td>
                    {/* Gasto */}
                    <td className="px-2.5 py-2 font-medium" style={{ color: brand.textColor }}>
                      {formatCurrency(totalSpend)}
                    </td>
                    {/* % Inv. */}
                    <td className="px-2.5 py-2">
                      {meta && meta.budget > 0 ? (
                        <span
                          className="font-medium"
                          style={{
                            color:
                              totalSpend / meta.budget > 1.05
                                ? "#DC2626"
                                : totalSpend / meta.budget > 0.95
                                  ? "#16A34A"
                                  : brand.textColor,
                          }}
                        >
                          {formatPercent((totalSpend / meta.budget) * 100, 1)}
                        </span>
                      ) : "—"}
                    </td>
                    {/* CPR Proy. */}
                    <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                      {meta && meta.projectedCPR > 0 ? formatCurrency(meta.projectedCPR) : "—"}
                    </td>
                    {/* CPR */}
                    <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                      {cpr > 0 ? formatCurrency(cpr) : "—"}
                    </td>
                    {/* Var. CPR */}
                    <td className="px-2.5 py-2">
                      {meta && meta.projectedCPR > 0 && cpr > 0 ? (
                        <span
                          className="font-medium"
                          style={{ color: cpr < meta.projectedCPR ? "#16A34A" : "#DC2626" }}
                        >
                          {cpr < meta.projectedCPR ? "↓" : "↑"}{" "}
                          {formatPercent(
                            Math.abs(((cpr - meta.projectedCPR) / meta.projectedCPR) * 100),
                            1,
                          )}
                        </span>
                      ) : "—"}
                    </td>
                    {/* Proy. Result. */}
                    <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                      {meta ? (
                        <div>
                          <div>{formatNumber(meta.projectedResult)}</div>
                          <div className="text-[10px]" style={{ color: `${brand.textColor}77` }}>
                            {meta.resultType}
                          </div>
                        </div>
                      ) : "—"}
                    </td>
                    {/* Resultados */}
                    <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                      <div className="font-medium">{formatNumber(result.value)}</div>
                      <div className="text-[10px]" style={{ color: `${brand.textColor}77` }}>
                        {result.label}
                      </div>
                    </td>
                    {/* % Result. */}
                    <td className="px-2.5 py-2">
                      {meta && meta.projectedResult > 0 ? (
                        <span
                          className="font-medium"
                          style={{
                            color: result.value / meta.projectedResult >= 1 ? "#16A34A" : "#DC2626",
                          }}
                        >
                          {formatPercent((result.value / meta.projectedResult) * 100, 1)}
                        </span>
                      ) : "—"}
                    </td>
                  </>
                ) : (
                  <>
                    {/* Gasto */}
                    <td className="px-2.5 py-2 font-medium" style={{ color: brand.textColor }}>
                      {formatCurrency(totalSpend)}
                    </td>
                    {/* Resultados */}
                    <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                      <div className="font-medium">{formatNumber(result.value)}</div>
                      <div className="text-[10px]" style={{ color: `${brand.textColor}77` }}>
                        {result.label}
                      </div>
                    </td>
                    {/* Alcance */}
                    <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                      {formatNumber(totalReach)}
                    </td>
                    {/* CPR */}
                    <td className="px-2.5 py-2" style={{ color: brand.textColor }}>
                      {cpr > 0 ? formatCurrency(cpr) : "—"}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
