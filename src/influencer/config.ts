export const INFLUENCER_SHEET_CONFIG = {
  // Hardcodeado para deploy automático en Vercel — Sheet subido por el cliente
  sheetId: ((import.meta as any).env?.VITE_INFLUENCER_SHEET_ID) || "1M_Y19t1_AqUUgPxNHgj_NvV5LwQDiL9yl7dvnySKgCg",
  apiKey: ((import.meta as any).env?.VITE_SHEETS_API_KEY) || "AIzaSyCcLcjEOgEQLd-FuiAINd7JqL5zzggkmP0",
};

export const INFLUENCER_RANGES = {
  campaigns: "01_CAMPAIGNS!A:AA",
  influencers: "02_INFLUENCERS!A:S",
  campaignInfluencers: "02B_CAMPAIGN_INFLUENCERS!A:F",
  contents: "03_CONTENT!A:R",
  metrics: "04_METRICS!A:AA",
  sentiments: "05_SENTIMENT!A:M",
  comments: "06_COMMENTS!A:R",
  insights: "07_INSIGHTS!A:I",
  media: "08_MEDIA!A:J",
  projections: "09_PROJECTIONS!A:G",
  config: "10_CONFIG!A:B",
  readme: "00_README!A:B",
};
