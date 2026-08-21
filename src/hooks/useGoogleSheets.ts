import { useState, useCallback, useEffect } from "react";
import {
  DashboardData,
  SheetConfig,
  BrandConfig,
  OfficialPeriod,
  CampaignGroupRule,
  GlobalExclusion,
  PlatformRule,
  VisibleMetric,
  DeduplicatedReach,
  Finding,
  CampaignMeta,
  PaidCampaignRow,
  TopPostEmbed,
  GAdsTopVideo,
  GAdsTopDisplay,
  GAdsTopKeyword,
  GACountry,
  GADevice,
  GATopPage,
  ManualMetricOverride,
} from "../types";
import { assignPlatform } from "../utils/grouping";
import { DEFAULT_DATA } from "../data/defaults";
import { SHEET_CONFIG } from "../config";

const parseNumber = (val: string | undefined | null): number => {
  if (val === null || val === undefined) return 0;
  const s = String(val).replace(/[$,%\s]/g, "").trim();
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const parseBool = (val: string | undefined | null): boolean => {
  if (!val) return false;
  const s = String(val).toLowerCase().trim();
  return ["sí", "si", "yes", "true", "1", "x", "✓"].includes(s);
};

const parseCSV = (val: string | undefined | null): string[] => {
  if (!val) return [];
  return String(val)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const parseDate = (val: string | undefined | null): string => {
  if (!val) return "";
  const s = String(val).trim();
  // Formato ya correcto YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Formato con hora
  const withTime = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (withTime) return withTime[1];
  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Serial de Excel
  const n = parseFloat(s);
  if (!isNaN(n) && n > 40000 && n < 60000) {
    const base = new Date(1899, 11, 30);
    const result = new Date(base.getTime() + n * 86400000);
    return result.toISOString().split("T")[0];
  }
  return s;
};

const RANGES = {
  config: "Configuración!A:C",
  periods: "Periodos_Oficiales!A:E",
  rules: "Reglas_Agrupacion!A:G",
  visibleMetrics: "Metricas_Visibles!A:E",
  dedupReach: "Alcance_Deduplicado!A:E",
  manualMetrics: "Metricas_Manuales!A:F",
  findings: "Hallazgos!A:E",
  campaignMetas: "Metas_Campañas!A:F",
  fbInsights: "Facebook_Insights!A:H",
  igInsights: "Instagram_Insights!A:J",
  ttInsights: "TikTok_Insights!A:I",
  fbAds: "Facebook_Ads!A:S",
  igAds: "Instagram_Ads!A:T",
  ttAds: "TikTok_Ads!A:R",
  gAds: "Google_Ads!A:M",
  ga: "Google_Analytics!A:M",
  gaCountries: "GA_Paises!A:D",
  gaDevices: "GA_Dispositivos!A:D",
  gaTopPages: "GA_Top_Paginas!A:E",
  topFB: "Top_Posts_Facebook!A:F",
  topIG: "Top_Posts_Instagram!A:F",
  topTT: "Top_Posts_TikTok!A:F",
  gAdsVideo: "GAds_Top_Video!A:F",
  gAdsDisplay: "GAds_Top_Display!A:F",
  gAdsKeywords: "GAds_Top_Keywords!A:G",
};

const CACHE_KEY = "rac-dashboard-cache-v2";
const CACHE_TS_KEY = "rac-dashboard-cache-ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      // 429 o 5xx => retry
      if (res.status === 429 || res.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await sleep(delay);
        lastErr = new Error(`HTTP ${res.status} ${res.statusText}`);
        continue;
      }
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 800 + Math.random() * 400;
        await sleep(delay);
      }
    }
  }
  throw lastErr || new Error("Fetch failed");
};

export const useGoogleSheets = () => {
  const [data, setData] = useState<DashboardData>(() => {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) return JSON.parse(cached) as DashboardData;
      }
    } catch { /* ignore */ }
    return DEFAULT_DATA;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchSheetData = useCallback(async () => {
    const config = SHEET_CONFIG;
    setLoading(true);
    setError(null);
    try {
      const fetchRange = async (range: string): Promise<string[][]> => {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(
          range,
        )}?key=${config.apiKey}`;
        const res = await fetchWithRetry(url, 3);
        const json = await res.json();
        return (json.values || []) as string[][];
      };

      // Concurrencia limitada en lotes de 6 para evitar 429
      const entries = Object.entries(RANGES) as [keyof typeof RANGES, string][];
      const batchSize = 6;
      const results: Record<string, string[][]> = {};
      const failedRanges: string[] = [];
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch.map(([key, range]) => fetchRange(range).then((v) => ({ key, v }))));
        batchResults.forEach((r, idx) => {
          const [key] = batch[idx];
          if (r.status === "fulfilled") {
            results[key] = r.value.v;
          } else {
            failedRanges.push(key);
            results[key] = [];
            console.warn(`[Sheets] fallo ${key}:`, r.reason);
          }
        });
        if (i + batchSize < entries.length) await sleep(200);
      }

      if (failedRanges.length > 0 && failedRanges.length === entries.length) {
        throw new Error(`No se pudo cargar ninguna hoja: ${failedRanges.join(", ")}`);
      }

      const configRows = results.config || [];
      const periodsRows = results.periods || [];
      const rulesRows = results.rules || [];
      const visibleMetricsRows = results.visibleMetrics || [];
      const dedupReachRows = results.dedupReach || [];
      const manualMetricsRows = results.manualMetrics || [];
      const findingsRows = results.findings || [];
      const campaignMetasRows = results.campaignMetas || [];
      const fbInsightRows = results.fbInsights || [];
      const igInsightRows = results.igInsights || [];
      const ttInsightRows = results.ttInsights || [];
      const fbAdsRows = results.fbAds || [];
      const igAdsRows = results.igAds || [];
      const ttAdsRows = results.ttAds || [];
      const gAdsRows = results.gAds || [];
      const gaRows = results.ga || [];
      const gaCountriesRows = results.gaCountries || [];
      const gaDevicesRows = results.gaDevices || [];
      const gaTopPagesRows = results.gaTopPages || [];
      const topFBRows = results.topFB || [];
      const topIGRows = results.topIG || [];
      const topTTRows = results.topTT || [];
      const gAdsVideoRows = results.gAdsVideo || [];
      const gAdsDisplayRows = results.gAdsDisplay || [];
      const gAdsKeywordsRows = results.gAdsKeywords || [];

      // ---- Configuración (clave, valor, descripción) — filas 3+
      const brandMap: Record<string, string> = {};
      configRows.slice(2).forEach((row) => {
        if (row[0] && row[1]) brandMap[row[0].trim()] = row[1].trim();
      });
      const brand: BrandConfig = {
        accountName: brandMap["accountName"] || "RAC",
        logoUrl: brandMap["logoUrl"] || "",
        primaryColor: brandMap["primaryColor"] || "#E30613",
        secondaryColor: brandMap["secondaryColor"] || "#1B365D",
        accentColor: brandMap["accentColor"] || "#FFD100",
        textColor: brandMap["textColor"] || "#1B365D",
        bgColor: brandMap["bgColor"] || "#F8FAFC",
        cardBg: brandMap["cardBg"] || "#FFFFFF",
      };

      // ---- Periodos Oficiales (header row 3, data from row 4)
      const periods: OfficialPeriod[] = periodsRows
        .slice(3)
        .map((r) => ({
          id: r[0] || "",
          name: r[1] || "",
          startDate: parseDate(r[2]),
          endDate: parseDate(r[3]),
          active: parseBool(r[4]),
        }))
        .filter((p) => p.id && p.active);

      // ---- Reglas_Agrupacion: tiene 3 secciones. Leemos por cada una buscando encabezados.
      const groupRules: CampaignGroupRule[] = [];
      const globalExclusions: GlobalExclusion[] = [];
      const platformRules: PlatformRule[] = [];

      // parse basado en detectar encabezados
      let sectionMode: "groups" | "exclusions" | "platforms" | null = null;
      for (let i = 0; i < rulesRows.length; i++) {
        const row = rulesRows[i];
        const firstCell = (row[0] || "").toLowerCase().trim();
        if (firstCell === "orden") {
          sectionMode = "groups";
          continue;
        }
        if (firstCell === "palabra_excluir") {
          sectionMode = "exclusions";
          continue;
        }
        if (firstCell === "plataforma_dashboard") {
          sectionMode = "platforms";
          continue;
        }
        if (!firstCell || firstCell.startsWith("🗂") || firstCell.startsWith("grupos de") ||
            firstCell.startsWith("exclusiones") || firstCell.startsWith("reglas de")) {
          continue;
        }
        if (sectionMode === "groups" && parseNumber(row[0]) > 0) {
          groupRules.push({
            order: parseNumber(row[0]),
            name: row[1] || "",
            keywords: parseCSV(row[2]),
            excludeKeywords: parseCSV(row[3]),
            color: row[4] || "#6366F1",
            appliesFrom: parseDate(row[5]),
            active: parseBool(row[6]),
          });
        } else if (sectionMode === "exclusions" && row[0]) {
          globalExclusions.push({
            keyword: row[0],
            reason: row[1] || "",
            appliesFrom: parseDate(row[2]),
            active: parseBool(row[3]),
          });
        } else if (sectionMode === "platforms" && row[0]) {
          platformRules.push({
            platform: row[0],
            keywords: parseCSV(row[1]),
            priority: parseNumber(row[2]) || 99,
          });
        }
      }

      // ---- Métricas Visibles
      const visibleMetrics: VisibleMetric[] = visibleMetricsRows
        .slice(3)
        .map((r) => ({
          section: r[0] || "",
          metric: r[1] || "",
          label: r[2] || "",
          visible: parseBool(r[3]),
          order: parseNumber(r[4]) || 99,
        }))
        .filter((v) => v.section && v.metric);

      // ---- Alcance Deduplicado
      const deduplicatedReach: DeduplicatedReach[] = dedupReachRows
        .slice(3)
        .map((r) => ({
          periodId: r[0] || "",
          platform: (r[1] || "").toLowerCase(),
          reach: parseNumber(r[2]),
          source: r[3] || "",
          notes: r[4] || "",
        }))
        .filter((d) => d.periodId);

      // ---- Métricas Manuales por Periodo
      // Header row at index 2 (row 3 in sheet), data starts at index 3
      const manualMetricOverrides: ManualMetricOverride[] = manualMetricsRows
        .slice(3)
        .map((r) => ({
          periodId: r[0] || "",
          section: r[1] || "",
          metric: r[2] || "",
          value: r[3] !== undefined && r[3] !== null && r[3] !== "" ? parseNumber(r[3]) : null,
          source: r[4] || "",
          notes: r[5] || "",
        }))
        .filter((m) => m.periodId && m.section && m.metric && m.value !== null && !isNaN(m.value as number));

      // ---- Hallazgos
      const findings: Finding[] = findingsRows
        .slice(3)
        .map((r) => ({
          periodId: r[0] || "",
          section: r[1] || "general",
          type: (r[2] || "neutro") as Finding["type"],
          title: r[3] || "",
          detail: r[4] || "",
        }))
        .filter((f) => f.periodId && f.title);

      // ---- Insights orgánicos
      const facebookInsights = fbInsightRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        pageName: r[1] || "",
        followers: parseNumber(r[2]),
        reach: parseNumber(r[3]),
        impressions: parseNumber(r[4]),
        engagement: parseNumber(r[5]),
        pageViews: parseNumber(r[6]),
        newFollowers: parseNumber(r[7]),
      })).filter((i) => i.date);

      const instagramInsights = igInsightRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        accountName: r[1] || "",
        followers: parseNumber(r[2]),
        reach: parseNumber(r[3]),
        impressions: parseNumber(r[4]),
        engagement: parseNumber(r[5]),
        profileVisits: parseNumber(r[6]),
        newFollowers: parseNumber(r[7]),
        stories: parseNumber(r[8]),
        reels: parseNumber(r[9]),
      })).filter((i) => i.date);

      const tiktokInsights = ttInsightRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        accountName: r[1] || "",
        followers: parseNumber(r[2]),
        videoViews: parseNumber(r[3]),
        likes: parseNumber(r[4]),
        comments: parseNumber(r[5]),
        shares: parseNumber(r[6]),
        profileViews: parseNumber(r[7]),
        newFollowers: parseNumber(r[8]),
      })).filter((i) => i.date);

      // ---- Paid ads parsers (columnas específicas por sheet origen)
      const parseFbRow = (r: string[], rawPlatform = "Facebook_Ads"): PaidCampaignRow => ({
        date: parseDate(r[0]),
        campaignName: r[1] || "",
        status: r[2] || "ACTIVE",
        objective: r[3] || "",
        spend: parseNumber(r[4]),
        impressions: parseNumber(r[5]),
        reach: parseNumber(r[6]),
        frequency: parseNumber(r[7]),
        clicks: parseNumber(r[8]),
        ctr: parseNumber(r[9]),
        cpc: parseNumber(r[10]),
        cpm: parseNumber(r[11]),
        interactions: parseNumber(r[12]),
        likes: parseNumber(r[13]),
        leads: parseNumber(r[14]),
        cpl: parseNumber(r[15]),
        conversions: parseNumber(r[16]),
        costPerConversion: parseNumber(r[17]),
        videoViews: parseNumber(r[18]),
        platform: "Facebook",
        rawPlatform,
      });

      const parseIgRow = (r: string[], rawPlatform = "Instagram_Ads"): PaidCampaignRow => ({
        date: parseDate(r[0]),
        campaignName: r[1] || "",
        status: r[2] || "ACTIVE",
        objective: r[3] || "",
        spend: parseNumber(r[4]),
        impressions: parseNumber(r[5]),
        reach: parseNumber(r[6]),
        frequency: parseNumber(r[7]),
        clicks: parseNumber(r[8]),
        ctr: parseNumber(r[9]),
        cpc: parseNumber(r[10]),
        cpm: parseNumber(r[11]),
        interactions: parseNumber(r[12]),
        profileVisits: parseNumber(r[13]),
        landingPageVisits: parseNumber(r[14]),
        thruplays: parseNumber(r[15]),
        leads: parseNumber(r[16]),
        conversions: parseNumber(r[17]),
        costPerConversion: parseNumber(r[18]),
        videoViews: parseNumber(r[19]),
        platform: "Instagram",
        rawPlatform,
      });

      const parseTtRow = (r: string[]): PaidCampaignRow => ({
        date: parseDate(r[0]),
        campaignName: r[1] || "",
        status: "ACTIVE",
        objective: r[2] || "",
        spend: parseNumber(r[3]),
        impressions: parseNumber(r[4]),
        reach: parseNumber(r[5]),
        frequency: parseNumber(r[6]),
        clicks: parseNumber(r[7]),
        ctr: parseNumber(r[8]),
        cpc: parseNumber(r[9]),
        cpm: parseNumber(r[10]),
        interactions: parseNumber(r[11]),
        landingPageVisits: parseNumber(r[12]),
        leads: parseNumber(r[13]),
        conversions: parseNumber(r[14]),
        costPerConversion: parseNumber(r[15]),
        views6s: parseNumber(r[16]),
        videoViews: parseNumber(r[17]),
        platform: "TikTok",
        rawPlatform: "TikTok_Ads",
      });

      // Parsear todos los ads de los 3 sheets base
      const fbAdsRaw = fbAdsRows.slice(3).map((r) => parseFbRow(r)).filter((c) => c.campaignName && c.date);
      const igAdsRaw = igAdsRows.slice(3).map((r) => parseIgRow(r)).filter((c) => c.campaignName && c.date);
      const ttAdsRaw = ttAdsRows.slice(3).map((r) => parseTtRow(r)).filter((c) => c.campaignName && c.date);

      // Facebook: campañas del sheet Facebook_Ads que tengan FB, Facebook o META en el nombre
      // Fix: usar word boundary para no fallar con "META- Extra" o "FB-"
      const facebookAds: PaidCampaignRow[] = fbAdsRaw
        .filter((c) => /\bFB\b/i.test(c.campaignName) || /facebook/i.test(c.campaignName) || /\bMETA\b/i.test(c.campaignName))
        .map((c) => ({ ...c, platform: "Facebook" }));

      // Instagram: campañas del sheet Instagram_Ads que tengan IG o Instagram en el nombre
      const instagramAds: PaidCampaignRow[] = igAdsRaw
        .filter((c) => /\bIG\b/i.test(c.campaignName) || /instagram/i.test(c.campaignName))
        .map((c) => ({ ...c, platform: "Instagram" }));

      const tiktokAds = ttAdsRaw;

      // Google Ads
      const googleAds = gAdsRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        campaignName: r[1] || "",
        campaignType: r[2] || "SEARCH",
        cost: parseNumber(r[3]),
        impressions: parseNumber(r[4]),
        clicks: parseNumber(r[5]),
        ctr: parseNumber(r[6]),
        avgCpc: parseNumber(r[7]),
        cpm: parseNumber(r[8]),
        cpv: parseNumber(r[9]),
        conversions: parseNumber(r[10]),
        costPerConversion: parseNumber(r[11]),
        videoViews: parseNumber(r[12]),
      })).filter((c) => c.campaignName && c.date);

      // Google Analytics
      const googleAnalytics = gaRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        sessions: parseNumber(r[1]),
        users: parseNumber(r[2]),
        newUsers: parseNumber(r[3]),
        pageViews: parseNumber(r[4]),
        pagesPerSession: parseNumber(r[5]),
        avgSessionDuration: parseNumber(r[6]),
        bounceRate: parseNumber(r[7]),
        conversions: parseNumber(r[8]),
        conversionRate: parseNumber(r[9]),
        source: r[10] || "",
        medium: r[11] || "",
        channel: r[12] || "",
      })).filter((r) => r.date);

      // Top posts
      const parseTopPost = (r: string[], platform: TopPostEmbed["platform"]): TopPostEmbed => ({
        date: parseDate(r[0]),
        url: r[1] || "",
        title: r[2] || "",
        objective: r[3] || "",
        featured: parseBool(r[4]),
        notes: r[5] || "",
        platform,
      });
      const topPostsFB = topFBRows.slice(3).map((r) => parseTopPost(r, "facebook")).filter((p) => p.url);
      const topPostsIG = topIGRows.slice(3).map((r) => parseTopPost(r, "instagram")).filter((p) => p.url);
      const topPostsTT = topTTRows.slice(3).map((r) => parseTopPost(r, "tiktok")).filter((p) => p.url);

      const gAdsTopVideo: GAdsTopVideo[] = gAdsVideoRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        url: r[1] || "",
        title: r[2] || "",
        campaign: r[3] || "",
        views: parseNumber(r[4]),
        featured: parseBool(r[5]),
      })).filter((v) => v.url);

      const gAdsTopDisplay: GAdsTopDisplay[] = gAdsDisplayRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        imageUrl: r[1] || "",
        title: r[2] || "",
        campaign: r[3] || "",
        impressions: parseNumber(r[4]),
        featured: parseBool(r[5]),
      })).filter((d) => d.imageUrl);

      const gAdsTopKeywords: GAdsTopKeyword[] = gAdsKeywordsRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        keyword: r[1] || "",
        campaign: r[2] || "",
        impressions: parseNumber(r[3]),
        clicks: parseNumber(r[4]),
        ctr: parseNumber(r[5]),
        conversions: parseNumber(r[6]),
      })).filter((k) => k.keyword);

      // Campaign Metas
      const campaignMetas: CampaignMeta[] = campaignMetasRows.slice(3).map((r) => ({
        periodId: r[0] || "",
        campaignName: r[1] || "",
        budget: parseNumber(r[2]),
        projectedResult: parseNumber(r[3]),
        resultType: r[4] || "",
        projectedCPR: parseNumber(r[5]),
      })).filter((m) => m.periodId && m.campaignName);

      // GA Countries
      const gaCountries: GACountry[] = gaCountriesRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        country: r[1] || "",
        sessions: parseNumber(r[2]),
        users: parseNumber(r[3]),
      })).filter((c) => c.country);

      // GA Devices
      const gaDevices: GADevice[] = gaDevicesRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        device: r[1] || "",
        sessions: parseNumber(r[2]),
        users: parseNumber(r[3]),
      })).filter((d) => d.device);

      // GA Top Pages
      const gaTopPages: GATopPage[] = gaTopPagesRows.slice(3).map((r) => ({
        date: parseDate(r[0]),
        url: r[1] || "",
        title: r[2] || "",
        pageViews: parseNumber(r[3]),
        avgTime: parseNumber(r[4]),
      })).filter((p) => p.url);

      const newData: DashboardData = {
        brand,
        periods,
        groupRules,
        globalExclusions,
        platformRules,
        visibleMetrics,
        deduplicatedReach,
        manualMetricOverrides,
        findings,
        campaignMetas,
        facebookInsights,
        instagramInsights,
        tiktokInsights,
        facebookAds,
        instagramAds,
        tiktokAds,
        googleAds,
        googleAnalytics,
        gaCountries,
        gaDevices,
        gaTopPages,
        topPostsFB,
        topPostsIG,
        topPostsTT,
        gAdsTopVideo,
        gAdsTopDisplay,
        gAdsTopKeywords,
      };
      setData(newData);
      try {
        if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
          localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
          localStorage.setItem(CACHE_TS_KEY, new Date().toISOString());
        }
      } catch { /* quota */ }
      setConnected(true);
      if (failedRanges.length > 0) {
        setError(`Algunas hojas no cargaron (${failedRanges.join(", ")}). Mostrando datos parciales. Reintenta con el botón Actualizar.`);
        setConnected(false);
      } else {
        setError(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar con Google Sheets";
      // Fallback a cache si existe
      try {
        if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached) as DashboardData;
            setData(parsed);
            setError(`${msg} — Mostrando datos en caché de ${localStorage.getItem(CACHE_TS_KEY) || "sesión anterior"}.`);
            setConnected(false);
            return;
          }
        }
      } catch { /* ignore */ }
      setError(msg);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setData(DEFAULT_DATA);
    setConnected(false);
    setError(null);
  }, []);

  // Auto-conectar al cargar
  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  return {
    data,
    loading,
    error,
    connected,
    fetchSheetData,
    disconnect,
    setData,
  };
};
