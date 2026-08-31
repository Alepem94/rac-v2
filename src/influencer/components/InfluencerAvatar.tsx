import React, { useMemo, useState } from "react";
import { Influencer } from "../types";
import { resolveImageUrl, buildInitialsAvatar } from "../utils/media";

interface Props {
  influencer?: Influencer | null;
  size?: number;
  className?: string;
  brandColor?: string;
}

/**
 * Avatar único para todo el módulo de Influencers.
 * Antes cada tarjeta tenía su propio <img src={instagram_photo || tiktok_photo}>
 * sin manejo de errores, por lo que una foto mal pegada (iframe de Drive, celda
 * vacía) se veía como ícono roto — o, peor, caía en una foto random de un
 * desconocido (i.pravatar.cc). Este componente intenta cada foto disponible en
 * orden y, si todas fallan, muestra un avatar de iniciales con la marca.
 */
export const InfluencerAvatar: React.FC<Props> = ({ influencer, size = 40, className = "", brandColor = "#6366F1" }) => {
  const candidates = useMemo(() => {
    return [influencer?.instagram_photo, influencer?.tiktok_photo, influencer?.facebook_photo]
      .map((v) => resolveImageUrl(v))
      .filter((v): v is string => !!v);
  }, [influencer?.instagram_photo, influencer?.tiktok_photo, influencer?.facebook_photo]);

  const fallback = useMemo(
    () => buildInitialsAvatar(influencer?.influencer_name || "?", brandColor),
    [influencer?.influencer_name, brandColor]
  );

  const [idx, setIdx] = useState(0);
  const src = candidates[idx] || fallback;

  return (
    <img
      key={influencer?.influencer_id || "empty"}
      src={src}
      onError={() => setIdx((i) => i + 1)}
      alt={influencer?.influencer_name || "Influencer"}
      className={`rounded-full object-cover shrink-0 bg-slate-100 ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
};
