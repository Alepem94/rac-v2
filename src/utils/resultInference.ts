import { PaidCampaignRow } from "../types";

/**
 * Infiere el tipo de resultado de una campaña basándose PRIMERO en el nombre
 * de la campaña (más confiable) y DESPUÉS en el campo objetivo como fallback.
 *
 * Esto resuelve el bug donde Porter Metrics exporta "OUTCOME_LEADS" como
 * objetivo genérico para todas las campañas de conversión en Facebook,
 * cuando en realidad hay campañas de Clic a web, Lead Ads, Conversiones, etc.
 *
 * También resuelve el bug donde `totalLeads > 0` hacía que TODO se clasificara
 * como "Leads" porque muchas campañas tienen leads secundarios.
 */

interface ResultInfo {
  /** Número de resultados */
  value: number;
  /** Etiqueta del tipo de resultado */
  label: string;
  /** Key del campo fuente */
  field: string;
}

/**
 * Determina el resultado principal de una campaña a partir de sus rows diarios.
 */
export const inferCampaignResult = (
  campaignName: string,
  objective: string,
  rows: PaidCampaignRow[],
): ResultInfo => {
  const name = campaignName.toLowerCase();
  const obj = (objective || "").toLowerCase();

  // Totales disponibles
  const totalLeads = rows.reduce((a, r) => a + (r.leads || 0), 0);
  const totalConversions = rows.reduce((a, r) => a + (r.conversions || 0), 0);
  const totalClicks = rows.reduce((a, r) => a + (r.clicks || 0), 0);
  const totalInteractions = rows.reduce((a, r) => a + (r.interactions || 0), 0);
  const totalVideoViews = rows.reduce((a, r) => a + (r.videoViews || 0), 0);
  const totalViews6s = rows.reduce((a, r) => a + ((r as any).views6s || 0), 0);
  const totalThruplays = rows.reduce((a, r) => a + ((r as any).thruplays || 0), 0);
  const totalProfileVisits = rows.reduce((a, r) => a + ((r as any).profileVisits || 0), 0);
  const totalLandingPageVisits = rows.reduce((a, r) => a + ((r as any).landingPageVisits || 0), 0);
  const totalLikes = rows.reduce((a, r) => a + ((r as any).likes || 0), 0);

  // PRIORIDAD 1: Inferir desde el NOMBRE de la campaña (más confiable)
  
  // Lead Ads / Leads
  if (name.includes("lead ads") || name.includes("lead -")) {
    return { value: totalLeads, label: "Leads", field: "leads" };
  }

  // Clic a web
  if (name.includes("clic a web") || name.includes("clic web") || name.includes("link_clicks")) {
    return { value: totalClicks, label: "Clics a web", field: "clicks" };
  }

  // Conversiones (genérico)
  if (
    name.includes("conversiones") ||
    name.includes("convertion") ||
    name.includes("conversion")
  ) {
    // Si es una campaña de conversiones pero no de leads ni clics,
    // usar conversiones o leads según cuál tenga más volumen
    if (totalConversions > 0) {
      return { value: totalConversions, label: "Conv.", field: "conversions" };
    }
    if (totalLeads > 0) {
      return { value: totalLeads, label: "Leads", field: "leads" };
    }
    return { value: totalConversions, label: "Conv.", field: "conversions" };
  }

  // Interacción
  if (
    name.includes("interacción") ||
    name.includes("interaccion") ||
    name.includes("interacciones") ||
    name.includes("engagement")
  ) {
    return { value: totalInteractions, label: "Interacciones", field: "interactions" };
  }

  // Likes
  if (name.includes("likes") || name.includes("like")) {
    return { value: totalLikes, label: "Likes", field: "likes" };
  }

  // Thruplays
  if (name.includes("thruplay") || name.includes("thruplays")) {
    return { value: totalThruplays, label: "Thruplays", field: "thruplays" };
  }

  // Visitas al perfil
  if (name.includes("visitas al perfil") || name.includes("perfil")) {
    return { value: totalProfileVisits, label: "Visitas perfil", field: "profileVisits" };
  }

  // Views 6 seg (TikTok)
  if (name.includes("views 6") || name.includes("views_6") || name.includes("vistas_6")) {
    return { value: totalViews6s || totalVideoViews, label: "Views 6s", field: "views6s" };
  }

  // Views 6s: cuando la campaña tiene "views" en el nombre y hay datos de views6s (TikTok)
  if ((name.includes("views") || name.includes("view")) && totalViews6s > 0) {
    return { value: totalViews6s, label: "Views 6s", field: "views6s" };
  }

  // Video / Views genérico
  if (name.includes("video") || name.includes("views") || name.includes("view")) {
    return { value: totalVideoViews, label: "Views", field: "videoViews" };
  }

  // Alcance
  if (name.includes("alcance") || name.includes("reach")) {
    const totalReach = rows.reduce((a, r) => a + (r.reach || 0), 0);
    return { value: totalReach, label: "Alcance", field: "reach" };
  }

  // Mensajes / WhatsApp
  if (name.includes("mensaje") || name.includes("whatsapp") || name.includes("messaging")) {
    return { value: totalConversions || totalLeads, label: "Mensajes", field: "conversions" };
  }

  // PRIORIDAD 2: Inferir desde el campo objetivo (fallback)

  if (obj.includes("lead")) {
    return { value: totalLeads, label: "Leads", field: "leads" };
  }
  if (obj.includes("link_click") || obj.includes("clic")) {
    return { value: totalClicks, label: "Clics", field: "clicks" };
  }
  if (obj.includes("engagement") || obj.includes("interac")) {
    return { value: totalInteractions, label: "Interacciones", field: "interactions" };
  }
  if (obj.includes("awareness") || obj.includes("reach") || obj.includes("alcance")) {
    const totalReach = rows.reduce((a, r) => a + (r.reach || 0), 0);
    return { value: totalReach, label: "Alcance", field: "reach" };
  }
  if (obj.includes("video") || obj.includes("thru") || obj.includes("view")) {
    return { value: totalVideoViews || totalThruplays, label: "Views", field: "videoViews" };
  }
  if (obj.includes("visita") || obj.includes("perfil")) {
    return { value: totalProfileVisits || totalLandingPageVisits, label: "Visitas", field: "profileVisits" };
  }

  // PRIORIDAD 3: Default - usar conversiones
  if (totalConversions > 0) {
    return { value: totalConversions, label: "Conv.", field: "conversions" };
  }
  if (totalLeads > 0) {
    return { value: totalLeads, label: "Leads", field: "leads" };
  }
  if (totalClicks > 0) {
    return { value: totalClicks, label: "Clics", field: "clicks" };
  }

  return { value: 0, label: "—", field: "conversions" };
};
