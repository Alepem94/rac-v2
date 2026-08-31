import { Content } from "../types";
import { getEmbedHtml } from "../../utils/grouping";

/**
 * Helpers para resolver fotos de perfil, thumbnails y embeds de contenido
 * a partir de lo que venga en el Google Sheet — que en la práctica puede ser:
 *  - una URL de imagen directa (caso ideal)
 *  - un <iframe> de Google Drive pegado como texto (caso real que llenó el cliente)
 *  - HTML de embed real (blockquote de Instagram/TikTok)
 *  - HTML de embed mal pegado / de la plataforma equivocada
 *  - vacío
 *
 * Nada de esto debe romper el render: siempre se degrada a un fallback limpio.
 */

// Extrae el fileId de un link o iframe de Google Drive, venga como venga:
// https://drive.google.com/file/d/<ID>/view
// https://drive.google.com/file/d/<ID>/preview  (dentro de un <iframe src="...">)
// https://drive.google.com/open?id=<ID>
const DRIVE_ID_PATTERNS = [
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  /[?&]id=([a-zA-Z0-9_-]+)/,
];

export const extractDriveFileId = (raw: string): string | null => {
  for (const re of DRIVE_ID_PATTERNS) {
    const m = raw.match(re);
    if (m) return m[1];
  }
  return null;
};

/**
 * Convierte cualquier valor de una celda "foto"/"thumbnail" en una URL de imagen
 * usable directamente en un <img src="">.
 * Devuelve "" si no hay nada aprovechable (el componente debe mostrar su propio fallback).
 */
export const resolveImageUrl = (raw?: string | null): string => {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";

  // Ya es una URL de imagen directa (no contiene markup) -> se usa tal cual.
  if (/^https?:\/\//i.test(value) && !value.includes("<")) {
    return value;
  }

  // Viene como <iframe src="https://drive.google.com/.../preview">, un link normal
  // de Drive, o cualquier texto que contenga un ID de Drive -> lo convertimos al
  // endpoint de thumbnail de Drive, que sí es válido dentro de un <img>.
  if (value.includes("drive.google.com")) {
    const id = extractDriveFileId(value);
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
  }

  return "";
};

/**
 * Avatar de iniciales generado localmente (SVG data-uri), sin depender de ningún
 * servicio externo. Se usa cuando no hay foto real o la foto real falla al cargar,
 * en vez de mostrar un ícono roto o la cara de un desconocido.
 */
export const buildInitialsAvatar = (name: string, color = "#6366F1"): string => {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="64" fill="${color}"/>
    <text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#ffffff">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Marca mínima de que un HTML pegado a mano es un embed real y no basura
// (p.ej. un <script> suelto sin blockquote, que es justo lo que quedó pegado
// por error en filas de TikTok con el script de Instagram).
const hasRealEmbedMarkup = (html: string, platform: string): boolean => {
  const h = html.toLowerCase();
  if (platform === "instagram") return h.includes("instagram-media") || h.includes("<blockquote");
  if (platform === "tiktok") return h.includes("tiktok-embed") || h.includes("<blockquote");
  if (platform === "youtube") return h.includes("<iframe");
  if (platform === "facebook") return h.includes("<iframe");
  return h.includes("<blockquote") || h.includes("<iframe");
};

/**
 * Devuelve el HTML de embed a usar para una pieza de contenido, con esta prioridad:
 *  1) video_embed, si de verdad trae un embed válido para esa plataforma.
 *  2) embed_url, si de verdad trae un embed válido para esa plataforma
 *     (protege contra el caso real: script de Instagram pegado en una fila de TikTok).
 *  3) Se genera el embed oficial automáticamente a partir de platform + content_url,
 *     reutilizando getEmbedHtml (la misma función que ya funciona bien en el resto
 *     del dashboard) — así no depende de que el Sheet traiga HTML pegado a mano.
 * Devuelve "" si no hay forma de armar un embed (ahí el caller debe caer a thumbnail).
 */
export const getContentEmbedHtml = (content: Content): string => {
  const platform = (content.platform || "").toLowerCase();

  const manualCandidates = [content.video_embed, content.embed_url];
  for (const candidate of manualCandidates) {
    if (candidate && hasRealEmbedMarkup(candidate, platform)) {
      return candidate;
    }
  }

  if (["instagram", "tiktok", "facebook", "youtube"].includes(platform) && content.content_url) {
    return getEmbedHtml(platform as any, content.content_url);
  }

  return "";
};
