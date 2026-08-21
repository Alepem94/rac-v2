import {
  CampaignGroupRule,
  GlobalExclusion,
  OfficialPeriod,
  PaidCampaignRow,
  PlatformRule,
  DateRange,
} from "../types";

/**
 * Devuelve true si el nombre de la campaña contiene alguna de las keywords
 * (case-insensitive, substring match).
 */
export const nameContainsAny = (name: string, keywords: string[]): boolean => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return keywords.some((kw) => kw && lower.includes(kw.toLowerCase()));
};

/**
 * Dado un `appliesFrom` (fecha declarada en el sheet, ej "2026-02-01"),
 * devuelve el inicio del periodo oficial que contiene esa fecha,
 * o el inicio del primer periodo cuyo startDate <= appliesFrom <= endDate.
 *
 * Esto resuelve el caso donde los cortes RAC no empiezan el día 1
 * (ej. Febrero 2026 va del 28-ene al 28-feb). Una campaña del 28-29-30 de enero
 * que pertenece al corte de Febrero no debe descartarse solo porque su fecha
 * sea menor al "2026-02-01" declarado.
 *
 * Si no hay periodo que cubra appliesFrom, se devuelve appliesFrom sin cambios.
 */
export const getEffectiveAppliesFrom = (
  appliesFrom: string,
  periods: OfficialPeriod[],
): string => {
  if (!appliesFrom) return appliesFrom;
  // Buscar un periodo oficial que contenga appliesFrom
  const containing = periods.find(
    (p) =>
      p.active &&
      p.startDate &&
      p.endDate &&
      p.startDate <= appliesFrom &&
      appliesFrom <= p.endDate,
  );
  if (containing) return containing.startDate;
  // Si no hay uno que la contenga, buscar el periodo más cercano ANTES de appliesFrom
  // (por si el usuario declaró appliesFrom justo entre dos cortes).
  const before = periods
    .filter((p) => p.active && p.endDate && p.endDate < appliesFrom)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  if (before) {
    // Si el próximo periodo arranca después de appliesFrom, usamos appliesFrom
    // (el usuario quiere que la regla empiece ahí). Si hay un periodo cuyo inicio
    // sea <= appliesFrom pero cuyo fin sea < appliesFrom, usamos appliesFrom tal cual.
    return appliesFrom;
  }
  return appliesFrom;
};

/**
 * Determina si una campaña debe ser excluida globalmente según su nombre y fecha.
 * Usa la fecha efectiva de appliesFrom (inicio del periodo oficial que la contenga).
 */
export const isGloballyExcluded = (
  campaignName: string,
  campaignDate: string,
  exclusions: GlobalExclusion[],
  periods: OfficialPeriod[] = [],
): boolean => {
  return exclusions.some((ex) => {
    if (!ex.active) return false;
    if (ex.appliesFrom) {
      const effective = getEffectiveAppliesFrom(ex.appliesFrom, periods);
      if (campaignDate < effective) return false;
    }
    return nameContainsAny(campaignName, [ex.keyword]);
  });
};

/**
 * Asigna una campaña al primer grupo que matchee (reglas ordenadas).
 * - Debe cumplir una de las palabras_clave
 * - NO debe cumplir ninguna de las palabras_excluir
 * - La regla debe estar activa
 * - La fecha de la campaña debe ser >= la fecha efectiva de appliesFrom
 *   (ajustada al inicio del periodo oficial que contenga appliesFrom)
 * Devuelve la regla, o null si no aplica ninguna.
 */
export const assignGroup = (
  campaignName: string,
  campaignDate: string,
  rules: CampaignGroupRule[],
  periods: OfficialPeriod[] = [],
): CampaignGroupRule | null => {
  const sortedRules = [...rules]
    .filter((r) => r.active)
    .sort((a, b) => a.order - b.order);
  for (const rule of sortedRules) {
    if (rule.appliesFrom) {
      const effective = getEffectiveAppliesFrom(rule.appliesFrom, periods);
      if (campaignDate < effective) continue;
    }
    if (!nameContainsAny(campaignName, rule.keywords)) continue;
    if (
      rule.excludeKeywords.length > 0 &&
      nameContainsAny(campaignName, rule.excludeKeywords)
    )
      continue;
    return rule;
  }
  return null;
};

/**
 * Asigna plataforma a una campaña según su nombre, por reglas de prioridad.
 * Si el nombre contiene palabras de Facebook (incluido META), se asigna a Facebook.
 */
export const assignPlatform = (
  campaignName: string,
  rules: PlatformRule[],
): string | null => {
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sortedRules) {
    if (nameContainsAny(campaignName, rule.keywords)) {
      return rule.platform;
    }
  }
  return null;
};

/**
 * Detecta si el rango de fechas seleccionado coincide EXACTAMENTE con un periodo oficial.
 */
export const detectOfficialPeriod = (
  range: DateRange,
  periods: OfficialPeriod[],
): OfficialPeriod | null => {
  if (!range.start || !range.end) return null;
  return (
    periods.find(
      (p) => p.active && p.startDate === range.start && p.endDate === range.end,
    ) || null
  );
};

/**
 * Filtra campañas:
 * 1. Por rango de fechas
 * 2. Excluye globalmente
 * 3. Excluye las que no tengan gasto en ese rango (se manejan por separado)
 * Devuelve campañas "limpias" listas para agrupar.
 */
export const cleanCampaigns = (
  campaigns: PaidCampaignRow[],
  range: DateRange,
  exclusions: GlobalExclusion[],
  periods: OfficialPeriod[] = [],
): PaidCampaignRow[] => {
  return campaigns.filter((c) => {
    if (range.start && c.date < range.start) return false;
    if (range.end && c.date > range.end) return false;
    if (isGloballyExcluded(c.campaignName, c.date, exclusions, periods))
      return false;
    return true;
  });
};

/**
 * Agrupa campañas por grupo según reglas.
 * Devuelve un mapa { ruleName -> [campañas] } más un "Sin grupo" para las que no aplican.
 * Campañas con gasto 0 en el rango se excluyen.
 */
export interface GroupedCampaigns {
  rule: CampaignGroupRule | null; // null = "Sin grupo"
  rows: PaidCampaignRow[];
  uniqueCampaigns: string[];
}

export const groupCampaigns = (
  campaigns: PaidCampaignRow[],
  rules: CampaignGroupRule[],
  periods: OfficialPeriod[] = [],
): GroupedCampaigns[] => {
  const buckets = new Map<string, PaidCampaignRow[]>();
  const ruleByName = new Map<string, CampaignGroupRule>();

  for (const c of campaigns) {
    const rule = assignGroup(c.campaignName, c.date, rules, periods);
    const key = rule ? rule.name : "__ungrouped__";
    if (rule) ruleByName.set(rule.name, rule);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c);
  }

  // Orden: respetar el orden de las reglas, y poner Sin grupo al final
  const sortedRules = [...rules]
    .filter((r) => r.active)
    .sort((a, b) => a.order - b.order);
  const result: GroupedCampaigns[] = [];
  for (const r of sortedRules) {
    const rows = buckets.get(r.name) || [];
    // Solo mostrar grupos con al menos 1 campaña con gasto
    const totalSpend = rows.reduce((acc, x) => acc + (x.spend || 0), 0);
    if (totalSpend > 0) {
      const uniqueCampaigns = [...new Set(rows.map((x) => x.campaignName))];
      result.push({ rule: r, rows, uniqueCampaigns });
    }
  }
  const ungrouped = buckets.get("__ungrouped__") || [];
  if (ungrouped.length > 0) {
    const totalSpend = ungrouped.reduce((acc, x) => acc + (x.spend || 0), 0);
    if (totalSpend > 0) {
      const uniqueCampaigns = [...new Set(ungrouped.map((x) => x.campaignName))];
      result.push({ rule: null, rows: ungrouped, uniqueCampaigns });
    }
  }
  return result;
};

/**
 * Calcula totales y promedios ponderados para un conjunto de rows.
 */
export const calcCampaignTotals = (rows: PaidCampaignRow[]) => {
  const spend = rows.reduce((a, r) => a + (r.spend || 0), 0);
  const impressions = rows.reduce((a, r) => a + (r.impressions || 0), 0);
  const clicks = rows.reduce((a, r) => a + (r.clicks || 0), 0);
  const conversions = rows.reduce((a, r) => a + (r.conversions || 0), 0);
  const reach = rows.reduce((a, r) => a + (r.reach || 0), 0);
  const leads = rows.reduce((a, r) => a + (r.leads || 0), 0);
  const videoViews = rows.reduce((a, r) => a + (r.videoViews || 0), 0);
  const interactions = rows.reduce((a, r) => a + (r.interactions || 0), 0);

  // CTR, CPC, CPM: ponderados por impresiones/clicks
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const costPerConversion = conversions > 0 ? spend / conversions : 0;
  const cpl = leads > 0 ? spend / leads : 0;

  return {
    spend,
    impressions,
    clicks,
    conversions,
    reach,
    leads,
    videoViews,
    interactions,
    ctr,
    cpc,
    cpm,
    costPerConversion,
    cpl,
  };
};

/**
 * Convierte una URL de post/video en un embed oficial.
 */
export const getEmbedHtml = (
  platform: "facebook" | "instagram" | "tiktok" | "youtube",
  url: string,
): string => {
  if (!url) return "";
  switch (platform) {
    case "facebook":
      return `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(
        url,
      )}&show_text=true&width=350" width="350" height="500" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
    case "instagram":
      // Instagram requiere su script
      return `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="max-width:350px;min-width:326px;background:#FFF;border:0;border-radius:12px;margin:0;padding:0;"></blockquote>`;
    case "tiktok": {
      // Extraer video ID de URL TikTok
      const match = url.match(/\/video\/(\d+)/);
      const videoId = match ? match[1] : "";
      if (!videoId) return "";
      return `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}" style="max-width:325px;min-width:325px;"><section></section></blockquote>`;
    }
    case "youtube": {
      // Extraer video ID (soporta youtube.com/watch?v=... y youtu.be/...)
      const ytMatch = url.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
      const ytId = ytMatch ? ytMatch[1] : "";
      if (!ytId) return "";
      return `<iframe width="350" height="197" src="https://www.youtube.com/embed/${ytId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    default:
      return "";
  }
};
