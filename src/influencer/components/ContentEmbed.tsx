import React, { useEffect, useRef } from "react";
import { ExternalLink, PlayCircle } from "lucide-react";
import { Content } from "../types";
import { getContentEmbedHtml } from "../utils/media";
import { loadEmbedScript } from "../../utils/embedScripts";

interface Props {
  content: Content;
  primaryColor: string;
  textColor: string;
}

/**
 * Reemplaza el `dangerouslySetInnerHTML={{__html: item.content.video_embed}}` original.
 * Ese código solo leía la columna `video_embed`, que en el Sheet real siempre viene
 * vacía (el HTML pegado por el cliente quedó en `embed_url`), así que el embed nunca
 * se mostraba y siempre caía a la miniatura. Aquí:
 *  1) Se usa el embed pegado a mano si de verdad es válido para esa plataforma.
 *  2) Si no, se genera el embed oficial solo con platform + content_url (mismo
 *     mecanismo que ya funciona en el resto del dashboard vía getEmbedHtml).
 *  3) Si tampoco hay content_url, se cae a la miniatura o a un placeholder limpio.
 */
export const ContentEmbed: React.FC<Props> = ({ content, primaryColor, textColor }) => {
  const html = getContentEmbedHtml(content);
  const platform = (content.platform || "").toLowerCase();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!html) return;
    loadEmbedScript(platform);
    const t = setTimeout(() => {
      const w = window as any;
      if (platform === "instagram" && w.instgrm?.Embeds?.process) w.instgrm.Embeds.process();
    }, 80);
    return () => clearTimeout(t);
  }, [html, platform]);

  if (html) {
    return (
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center overflow-hidden rounded-xl"
        style={{ backgroundColor: "#FAFAFA", minHeight: 300 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (content.thumbnail_url) {
    return <img src={content.thumbnail_url} className="w-full rounded-xl object-cover" alt={content.content_title || content.format} />;
  }

  return (
    <div
      className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-2 border"
      style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}15` }}
    >
      <PlayCircle size={28} style={{ color: primaryColor }} />
      <span className="text-xs text-center px-4" style={{ color: `${textColor}66` }}>
        Sin miniatura disponible
      </span>
      {content.content_url && (
        <a href={content.content_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium" style={{ color: primaryColor }}>
          <ExternalLink size={12} /> Ver original
        </a>
      )}
    </div>
  );
};
