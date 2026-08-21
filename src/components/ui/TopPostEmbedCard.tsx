import React, { useEffect, useState, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { BrandConfig, TopPostEmbed } from "../../types";
import { getEmbedHtml } from "../../utils/grouping";
import { formatDate } from "../../utils/formatters";

interface TopPostEmbedCardProps {
  post: TopPostEmbed;
  brand: BrandConfig;
}

/**
 * Carga los scripts oficiales de cada plataforma para que los embeds se rendericen bien.
 */
const loadPlatformScript = (platform: string) => {
  if (typeof window === "undefined") return;
  const scripts: Record<string, string> = {
    instagram: "https://www.instagram.com/embed.js",
    tiktok: "https://www.tiktok.com/embed.js",
  };
  const src = scripts[platform];
  if (!src) return;
  if (document.querySelector(`script[src="${src}"]`)) {
    // script ya cargado, reprocesar
    const w = window as any;
    if (platform === "instagram" && w.instgrm?.Embeds?.process) {
      w.instgrm.Embeds.process();
    }
    return;
  }
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  document.body.appendChild(s);
};

export const TopPostEmbedCard: React.FC<TopPostEmbedCardProps> = ({
  post,
  brand,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [embedReady, setEmbedReady] = useState(false);

  useEffect(() => {
    loadPlatformScript(post.platform);
    const t = setTimeout(() => setEmbedReady(true), 50);
    return () => clearTimeout(t);
  }, [post.platform, post.url]);

  useEffect(() => {
    if (!embedReady || !containerRef.current) return;
    // Forzar reprocesamiento del embed al montar
    const w = window as any;
    if (post.platform === "instagram" && w.instgrm?.Embeds?.process) {
      w.instgrm.Embeds.process();
    }
  }, [embedReady, post]);

  const embedHtml = getEmbedHtml(post.platform, post.url);

  return (
    <div
      className="rounded-2xl border overflow-hidden shadow-sm flex flex-col"
      style={{
        backgroundColor: brand.cardBg,
        borderColor: `${brand.primaryColor}22`,
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: `${brand.primaryColor}10` }}
      >
        <div className="min-w-0">
          <div
            className="text-sm font-semibold truncate"
            style={{ color: brand.textColor }}
          >
            {post.title || "Post destacado"}
          </div>
          <div
            className="text-xs mt-0.5 flex items-center gap-2"
            style={{ color: `${brand.textColor}66` }}
          >
            {post.date && <span>{formatDate(post.date)}</span>}
            {post.objective && (
              <>
                <span>·</span>
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${brand.accentColor}30`,
                    color: brand.secondaryColor,
                  }}
                >
                  {post.objective}
                </span>
              </>
            )}
          </div>
        </div>
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 ml-2 text-xs flex items-center gap-1 opacity-70 hover:opacity-100"
          style={{ color: brand.primaryColor }}
        >
          <ExternalLink size={12} />
        </a>
      </div>
      <div
        ref={containerRef}
        className="flex items-center justify-center p-3 min-h-[400px]"
        style={{ backgroundColor: "#FAFAFA" }}
        dangerouslySetInnerHTML={{ __html: embedHtml }}
      />
    </div>
  );
};

interface YouTubeEmbedCardProps {
  url: string;
  title: string;
  campaign?: string;
  subtitle?: string;
  brand: BrandConfig;
}

export const YouTubeEmbedCard: React.FC<YouTubeEmbedCardProps> = ({
  url,
  title,
  campaign,
  subtitle,
  brand,
}) => {
  const embedHtml = getEmbedHtml("youtube", url);
  return (
    <div
      className="rounded-2xl border overflow-hidden shadow-sm"
      style={{
        backgroundColor: brand.cardBg,
        borderColor: `${brand.primaryColor}22`,
      }}
    >
      <div
        className="aspect-video w-full"
        dangerouslySetInnerHTML={{ __html: embedHtml }}
      />
      <div className="p-3">
        <div
          className="text-sm font-semibold truncate"
          style={{ color: brand.textColor }}
        >
          {title}
        </div>
        {campaign && (
          <div
            className="text-xs mt-0.5 truncate"
            style={{ color: `${brand.textColor}77` }}
          >
            {campaign}
          </div>
        )}
        {subtitle && (
          <div
            className="text-xs mt-1"
            style={{ color: `${brand.textColor}66` }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

interface DisplayBannerCardProps {
  imageUrl: string;
  title: string;
  campaign?: string;
  subtitle?: string;
  brand: BrandConfig;
}

export const DisplayBannerCard: React.FC<DisplayBannerCardProps> = ({
  imageUrl,
  title,
  campaign,
  subtitle,
  brand,
}) => (
  <div
    className="rounded-2xl border overflow-hidden shadow-sm"
    style={{
      backgroundColor: brand.cardBg,
      borderColor: `${brand.primaryColor}22`,
    }}
  >
    <div className="aspect-video w-full bg-slate-100 flex items-center justify-center overflow-hidden">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="text-xs" style={{ color: `${brand.textColor}55` }}>
          Sin imagen
        </span>
      )}
    </div>
    <div className="p-3">
      <div
        className="text-sm font-semibold truncate"
        style={{ color: brand.textColor }}
      >
        {title}
      </div>
      {campaign && (
        <div
          className="text-xs mt-0.5 truncate"
          style={{ color: `${brand.textColor}77` }}
        >
          {campaign}
        </div>
      )}
      {subtitle && (
        <div className="text-xs mt-1" style={{ color: `${brand.textColor}66` }}>
          {subtitle}
        </div>
      )}
    </div>
  </div>
);
