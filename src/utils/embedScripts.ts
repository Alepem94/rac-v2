// Carga (una sola vez) el script oficial de cada plataforma para que los embeds
// pegados como <blockquote> se conviertan en el post/video real renderizado.
// Misma idea que ya usa TopPostEmbedCard.tsx, extraída aquí para poder reusarla
// en el módulo de Influencers sin tocar ese componente.
const SCRIPT_SRC: Record<string, string> = {
  instagram: "https://www.instagram.com/embed.js",
  tiktok: "https://www.tiktok.com/embed.js",
};

export const loadEmbedScript = (platform: string) => {
  if (typeof window === "undefined") return;
  const src = SCRIPT_SRC[platform];
  if (!src) return;

  const w = window as any;
  if (document.querySelector(`script[src="${src}"]`)) {
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
