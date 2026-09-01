import React from "react";
import { Trophy, Sparkles } from "lucide-react";
import { Content, Influencer, Metrics } from "../types";
import { PlatformIcon, PLATFORM_COLORS, PLATFORM_ICON_PATHS } from "./PlatformIcon";
import { InfluencerAvatar } from "./InfluencerAvatar";
import { getStandoutMetric } from "../utils/highlights";

interface Props {
  content: Content;
  influencer?: Influencer;
  metrics?: Metrics;
  /** Set de Metrics a comparar (debe incluir el propio `metrics`). Cambia según
   *  la sección: toda la campaña, solo esa plataforma, o solo ese influencer. */
  comparisonSet: Metrics[];
  primaryColor: string;
  /** Alto del área de la tarjeta. Ej: "h-16", "h-24", "h-32". */
  imageHeightClass?: string;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Reemplaza a ContentThumb en las zonas donde antes se dependía de una imagen
 * (Resumen > Top Contenidos, Plataformas, Influencers, Contenidos).
 *
 * A propósito NO usa thumbnail_url / ninguna imagen del Sheet: el llenado real
 * traía la misma foto de stock de Unsplash repetida en varias filas (relleno,
 * no una miniatura real), así que mostrarla como fondo era peor que no mostrar
 * nada. La tarjeta se arma 100% con datos que sí son reales y confiables:
 * plataforma + influencer + en qué KPI destacó ese contenido frente al resto
 * del `comparisonSet` — con un fondo degradado del color de marca y el glyph
 * de la plataforma como watermark para que no se vea plana.
 */
export const ContentHighlightCard: React.FC<Props> = ({
  content,
  influencer,
  metrics,
  comparisonSet,
  primaryColor,
  imageHeightClass = "h-20",
  compact = false,
  className = "",
  onClick,
}) => {
  const standout = getStandoutMetric(metrics, comparisonSet);
  const platformColor = PLATFORM_COLORS[content.platform] || primaryColor;
  const watermarkPath = PLATFORM_ICON_PATHS[content.platform];

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${imageHeightClass} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${platformColor}26 0%, ${platformColor}0a 60%, ${platformColor}14 100%)`,
        border: `1px solid ${platformColor}22`,
      }}
      onClick={onClick}
    >
      {/* Watermark decorativo: el glyph de la plataforma, grande y traslúcido,
          para que la tarjeta se sienta diseñada y no un rectángulo vacío. */}
      {watermarkPath && (
        <svg
          viewBox="0 0 16 16"
          className="absolute -right-2 -bottom-2 pointer-events-none"
          style={{ width: compact ? 44 : 64, height: compact ? 44 : 64, fill: platformColor, opacity: 0.14 }}
        >
          <path d={watermarkPath} />
        </svg>
      )}

      <div className="relative h-full flex flex-col justify-between p-2 z-10">
        <div className="flex items-center justify-between gap-1">
          <PlatformIcon platform={content.platform} size={compact ? 18 : 22} />
          {influencer && (
            <div className="flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5">
              <InfluencerAvatar influencer={influencer} size={compact ? 16 : 18} brandColor={primaryColor} />
              {!compact && (
                <span className="text-[9px] font-medium truncate max-w-[70px]" style={{ color: primaryColor }}>
                  {influencer.influencer_name}
                </span>
              )}
            </div>
          )}
        </div>

        {standout && (
          <div>
            <div
              className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: standout.tier === "top" ? "#F59E0B" : standout.tier === "good" ? platformColor : `${platformColor}99` }}
            >
              {standout.tier === "top" ? <Trophy size={9} /> : <Sparkles size={9} />}
              <span className="truncate">{standout.label}</span>
            </div>
            <div className="text-xs font-bold mt-0.5" style={{ color: platformColor }}>
              {standout.formattedValue}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
