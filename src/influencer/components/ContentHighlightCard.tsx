import React, { useState } from "react";
import { Trophy, Sparkles } from "lucide-react";
import { Content, Influencer, Metrics } from "../types";
import { PlatformIcon, PLATFORM_COLORS } from "./PlatformIcon";
import { InfluencerAvatar } from "./InfluencerAvatar";
import { getStandoutMetric } from "../utils/highlights";
import { resolveImageUrl } from "../utils/media";

interface Props {
  content: Content;
  influencer?: Influencer;
  metrics?: Metrics;
  /** Set de Metrics a comparar (debe incluir el propio `metrics`). Cambia según
   *  la sección: toda la campaña, solo esa plataforma, o solo ese influencer. */
  comparisonSet: Metrics[];
  primaryColor: string;
  /** Alto de la miniatura de fondo cuando sí hay thumbnail real. Ej: "h-16", "h-24". */
  imageHeightClass?: string;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Reemplaza a ContentThumb en las zonas donde antes se dependía de una imagen
 * (Resumen > Top Contenidos, Plataformas, Influencers, Contenidos). Si hay una
 * miniatura real válida se usa de fondo decorativo; si no, la tarjeta se arma
 * 100% con datos: plataforma + influencer + en qué KPI destacó ese contenido
 * frente al resto del `comparisonSet`.
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
  const [imgFailed, setImgFailed] = useState(false);
  const bgImage = resolveImageUrl(content.thumbnail_url);
  const showBgImage = !!bgImage && !imgFailed;

  const standout = getStandoutMetric(metrics, comparisonSet);
  const platformColor = PLATFORM_COLORS[content.platform] || primaryColor;

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${className}`}
      style={{ backgroundColor: `${platformColor}0d`, border: `1px solid ${platformColor}22` }}
      onClick={onClick}
    >
      {showBgImage && (
        <img
          src={bgImage}
          alt={content.content_title || content.platform}
          className={`w-full ${imageHeightClass} object-cover`}
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      )}

      <div className={showBgImage ? "absolute inset-0 flex flex-col justify-between p-2" : `flex flex-col justify-between p-2 ${imageHeightClass}`}>
        {showBgImage && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/40 -z-0" />}

        <div className="relative flex items-center justify-between gap-1 z-10">
          <PlatformIcon platform={content.platform} size={compact ? 18 : 22} />
          {influencer && (
            <div className={`flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5 ${showBgImage ? "bg-black/40" : ""}`}>
              <InfluencerAvatar influencer={influencer} size={compact ? 16 : 18} brandColor={primaryColor} />
              {!compact && (
                <span className={`text-[9px] font-medium truncate max-w-[70px] ${showBgImage ? "text-white" : ""}`} style={!showBgImage ? { color: primaryColor } : undefined}>
                  {influencer.influencer_name}
                </span>
              )}
            </div>
          )}
        </div>

        {standout && (
          <div className="relative z-10">
            <div
              className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${showBgImage ? "text-white" : "text-white"}`}
              style={{ backgroundColor: standout.tier === "top" ? "#F59E0B" : standout.tier === "good" ? platformColor : `${platformColor}99` }}
            >
              {standout.tier === "top" ? <Trophy size={9} /> : <Sparkles size={9} />}
              <span className="truncate">{standout.tier !== "plain" ? standout.label : `${standout.label}`}</span>
            </div>
            <div className={`text-xs font-bold mt-0.5 ${showBgImage ? "text-white" : ""}`} style={!showBgImage ? { color: platformColor } : undefined}>
              {standout.formattedValue}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
