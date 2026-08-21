export interface BrandConfig {
  accountName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  bgColor: string;
  cardBg: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface OfficialPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface CampaignGroupRule {
  order: number;
  name: string;
  keywords: string[];
  excludeKeywords: string[];
  color: string;
  appliesFrom: string;
  active: boolean;
}

export interface GlobalExclusion {
  keyword: string;
  reason: string;
  appliesFrom: string;
  active: boolean;
}

export interface PlatformRule {
  platform: string; // 'Facebook' | 'Instagram' | 'TikTok' | 'Google'
  keywords: string[];
  priority: number;
}

export interface VisibleMetric {
  section: string; // 'facebook_overview', 'paid_common', etc.
  metric: string; // key: 'followers', 'spend', ...
  label: string;
  visible: boolean;
  order: number;
}

export interface DeduplicatedReach {
  periodId: string;
  platform: string; // 'facebook' | 'instagram' | 'tiktok' | 'google'
  reach: number;
  source: string;
  notes: string;
}

export interface Finding {
  periodId: string;
  section: string; // 'general' | 'facebook' | 'instagram' | 'tiktok' | 'google_ads' | 'analytics'
  type: "positivo" | "neutro" | "alerta";
  title: string;
  detail: string;
}

// ---- Datos crudos (sheet) ----

export interface FacebookInsight {
  date: string;
  pageName: string;
  followers: number;
  reach: number;
  impressions: number;
  engagement: number;
  pageViews: number;
  newFollowers: number;
}

export interface InstagramInsight {
  date: string;
  accountName: string;
  followers: number;
  reach: number;
  impressions: number;
  engagement: number;
  profileVisits: number;
  newFollowers: number;
  stories: number;
  reels: number;
}

export interface TikTokInsight {
  date: string;
  accountName: string;
  followers: number;
  videoViews: number;
  likes: number;
  comments: number;
  shares: number;
  profileViews: number;
  newFollowers: number;
}

export interface PaidCampaignRow {
  date: string;
  campaignName: string;
  status: string;
  objective: string;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  interactions: number;
  profileVisits?: number; // IG
  landingPageVisits?: number; // IG/TikTok
  likes?: number; // FB
  thruplays?: number; // IG
  leads: number;
  cpl?: number; // FB
  conversions: number;
  costPerConversion: number;
  views6s?: number; // TikTok
  videoViews: number;
  platform: "Facebook" | "Instagram" | "TikTok" | "Google";
  rawPlatform: string; // original origin sheet name
}

export interface GoogleAdsRow {
  date: string;
  campaignName: string;
  campaignType: string; // SEARCH, DISPLAY, VIDEO, DEMAND_GEN
  cost: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  cpm: number;
  cpv: number;
  conversions: number;
  costPerConversion: number;
  videoViews: number;
}

export interface GoogleAnalyticsRow {
  date: string;
  sessions: number;
  users: number;
  newUsers: number;
  pageViews: number;
  pagesPerSession: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversions: number;
  conversionRate: number;
  source: string;
  medium: string;
  channel: string;
}

export interface TopPostEmbed {
  date: string;
  url: string;
  title: string;
  objective: string;
  featured: boolean;
  notes: string;
  platform: "facebook" | "instagram" | "tiktok";
}

export interface GAdsTopVideo {
  date: string;
  url: string;
  title: string;
  campaign: string;
  views: number;
  featured: boolean;
}

export interface GAdsTopDisplay {
  date: string;
  imageUrl: string;
  title: string;
  campaign: string;
  impressions: number;
  featured: boolean;
}

export interface GAdsTopKeyword {
  date: string;
  keyword: string;
  campaign: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
}

export interface CampaignMeta {
  periodId: string;
  campaignName: string;
  budget: number;
  projectedResult: number;
  resultType: string;
  projectedCPR: number;
}

export interface GACountry {
  date: string;
  country: string;
  sessions: number;
  users: number;
}

export interface GADevice {
  date: string;
  device: string;
  sessions: number;
  users: number;
}

export interface GATopPage {
  date: string;
  url: string;
  title: string;
  pageViews: number;
  avgTime: number;
}

// ---- Estado completo del dashboard ----

export interface DashboardData {
  brand: BrandConfig;
  periods: OfficialPeriod[];
  groupRules: CampaignGroupRule[];
  globalExclusions: GlobalExclusion[];
  platformRules: PlatformRule[];
  visibleMetrics: VisibleMetric[];
  deduplicatedReach: DeduplicatedReach[];
  findings: Finding[];
  campaignMetas: CampaignMeta[];

  facebookInsights: FacebookInsight[];
  instagramInsights: InstagramInsight[];
  tiktokInsights: TikTokInsight[];

  facebookAds: PaidCampaignRow[];
  instagramAds: PaidCampaignRow[];
  tiktokAds: PaidCampaignRow[];
  googleAds: GoogleAdsRow[];
  googleAnalytics: GoogleAnalyticsRow[];

  gaCountries: GACountry[];
  gaDevices: GADevice[];
  gaTopPages: GATopPage[];

  topPostsFB: TopPostEmbed[];
  topPostsIG: TopPostEmbed[];
  topPostsTT: TopPostEmbed[];
  gAdsTopVideo: GAdsTopVideo[];
  gAdsTopDisplay: GAdsTopDisplay[];
  gAdsTopKeywords: GAdsTopKeyword[];
  manualMetricOverrides: ManualMetricOverride[];
}

export interface SheetConfig {
  sheetId: string;
  apiKey: string;
}

export interface ManualMetricOverride {
  periodId: string;
  section: string;  // 'facebook_overview' | 'instagram_overview' | 'tiktok_overview' | 'facebook_paid' | 'instagram_paid' | 'tiktok_paid' | 'google_paid' | 'analytics'
  metric: string;   // key de la métrica, ej: 'followers', 'impressions', 'spend', etc.
  value: number | null;
  source: string;
  notes: string;
}
