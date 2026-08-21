import { useState, useCallback, useEffect } from "react";
import { InfluencerDashboardData } from "../types";
import { INFLUENCER_SHEET_CONFIG, INFLUENCER_RANGES } from "../config";
import { MOCK_INFLUENCER_DATA } from "../data/mocks";

const parseNumber = (v: any): number => {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/[$,%\s]/g, "").trim();
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const parseBool = (v: any): boolean => {
  if (!v) return false;
  return ["sí","si","yes","true","1","x","✓","TRUE","true"].includes(String(v).toLowerCase().trim());
};
const parseDate = (v: any): string => {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;
  const n = parseFloat(s);
  if (!isNaN(n) && n>40000 && n<60000) {
    const base = new Date(1899,11,30);
    return new Date(base.getTime()+n*86400000).toISOString().split("T")[0];
  }
  return s;
};

const CACHE_KEY = "influencer-dashboard-cache";
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));
const fetchWithRetry = async (url:string, retries=3): Promise<Response> => {
  let lastErr:Error|null=null;
  for(let i=0;i<retries;i++){
    try{
      const res=await fetch(url);
      if(res.ok) return res;
      if(res.status===429||res.status>=500){ await sleep(Math.pow(2,i)*1000+Math.random()*500); lastErr=new Error(`HTTP ${res.status}`); continue; }
      throw new Error(`HTTP ${res.status}`);
    }catch(e){ lastErr=e as Error; if(i<retries-1) await sleep(Math.pow(2,i)*800); }
  }
  throw lastErr!;
};

export const useInfluencerSheets = () => {
  const [data, setData] = useState<InfluencerDashboardData>(()=>{
    try{
      if(typeof window!=="undefined"){
        const c=localStorage.getItem(CACHE_KEY);
        if(c) return JSON.parse(c);
      }
    }catch{}
    return MOCK_INFLUENCER_DATA;
  });
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [connected,setConnected]=useState(false);
  const [usingMock,setUsingMock]=useState(true);

  const fetchData = useCallback(async()=>{
    const cfg=INFLUENCER_SHEET_CONFIG;
    // Si es placeholder, usa mocks directo
    if(!cfg.sheetId || cfg.sheetId.includes("Placeholder")){
      setData(MOCK_INFLUENCER_DATA);
      setConnected(false);
      setUsingMock(true);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try{
      const fetchRange=async(range:string)=>{
        const url=`https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheetId}/values/${encodeURIComponent(range)}?key=${cfg.apiKey}`;
        const res=await fetchWithRetry(url,3);
        const j=await res.json();
        return (j.values||[]) as string[][];
      };
      const entries=Object.entries(INFLUENCER_RANGES) as [keyof typeof INFLUENCER_RANGES, string][];
      const batchSize=5;
      const results:Record<string,string[][]>={};
      const failed:string[]=[];
      for(let i=0;i<entries.length;i+=batchSize){
        const batch=entries.slice(i,i+batchSize);
        const r=await Promise.allSettled(batch.map(([k,range])=> fetchRange(range).then(v=>({k,v}))));
        r.forEach((res,idx)=>{
          const [k]=batch[idx];
          if(res.status==="fulfilled") results[k]=res.value.v;
          else { failed.push(k); results[k]=[]; }
        });
        if(i+batchSize<entries.length) await sleep(150);
      }
      if(failed.length===entries.length) throw new Error("No se pudo cargar ninguna hoja");

      // Detecta automáticamente en qué fila están los encabezados reales.
      // Soporta ambos formatos: con fila de título (título en fila 1, headers en fila 2)
      // o sin ella (headers directo en fila 1), como los CSV de docs/influencer-template.
      const findHeaderRow = (rows: string[][], markers: string[]): number => {
        const limit = Math.min(rows.length, 5);
        for (let i = 0; i < limit; i++) {
          const rowLower = (rows[i] || []).map(c => String(c).trim().toLowerCase());
          if (markers.some(m => rowLower.includes(m))) return i;
        }
        return 0;
      };

      // Helpers para mapear por header
      const toObjects = (rows: string[][], headerRowIdx: number) => {
        if (rows.length <= headerRowIdx) return [];
        const headers = rows[headerRowIdx].map(h => h.trim().toLowerCase());
        return rows.slice(headerRowIdx + 1).map(r => {
          const o: any = {};
          headers.forEach((h, i) => o[h] = r[i] || "");
          return o;
        });
      };

      // 01_CAMPAIGNS
      const campHeaderIdx = findHeaderRow(results.campaigns || [], ["campaign_id"]);
      const campRows=toObjects(results.campaigns||[],campHeaderIdx);
      const campaigns=campRows.filter(r=>r.campaign_id).map((r:any)=>({
        campaign_id: r.campaign_id,
        campaign_name: r.campaign_name||r.campaign_id,
        client_name: r.client_name||"",
        brand_name: r.brand_name||"",
        campaign_status: r.campaign_status||"Completed",
        start_date: parseDate(r.start_date),
        end_date: parseDate(r.end_date),
        objective: r.objective||"",
        description: r.description||"",
        currency: r.currency||"MXN",
        influencer_investment: parseNumber(r.influencer_investment),
        paid_media_enabled: parseBool(r.paid_media_enabled),
        paid_media_investment: parseNumber(r.paid_media_investment),
        total_investment: parseNumber(r.total_investment) || parseNumber(r.influencer_investment)+parseNumber(r.paid_media_investment),
        campaign_thumbnail: r.campaign_thumbnail||"",
        campaign_cover: r.campaign_cover||"",
        total_influencers: parseNumber(r.total_influencers),
        total_contents: parseNumber(r.total_contents),
        total_platforms: parseNumber(r.total_platforms),
        total_views: parseNumber(r.total_views),
        total_reach: parseNumber(r.total_reach),
        total_impressions: parseNumber(r.total_impressions),
        total_interactions: parseNumber(r.total_interactions),
        total_clicks: parseNumber(r.total_clicks),
        engagement_rate: parseNumber(r.engagement_rate),
        cpv: parseNumber(r.cpv),
        cpe: parseNumber(r.cpe),
        cpc: parseNumber(r.cpc),
        has_projections: parseBool(r.has_projections),
      }));

      const infHeaderIdx = findHeaderRow(results.influencers || [], ["influencer_id"]);
      const infRows=toObjects(results.influencers||[],infHeaderIdx);
      const influencers=infRows.filter(r=>r.influencer_id).map((r:any)=>({
        influencer_id: r.influencer_id,
        influencer_name: r.influencer_name||r.influencer_id,
        instagram_handle: r.instagram_handle||"",
        instagram_followers: parseNumber(r.instagram_followers),
        instagram_profile_url: r.instagram_profile_url||"",
        instagram_photo: r.instagram_photo||"",
        tiktok_handle: r.tiktok_handle||"",
        tiktok_followers: parseNumber(r.tiktok_followers),
        tiktok_profile_url: r.tiktok_profile_url||"",
        tiktok_photo: r.tiktok_photo||"",
        facebook_handle: r.facebook_handle||"",
        facebook_followers: parseNumber(r.facebook_followers),
        facebook_profile_url: r.facebook_profile_url||"",
        facebook_photo: r.facebook_photo||"",
        content_style: r.content_style||"",
        content_description: r.content_description||"",
        audience_description: r.audience_description||"",
        influencer_notes: r.influencer_notes||"",
      }));

      const ciHeaderIdx = findHeaderRow(results.campaignInfluencers || [], ["influencer_cost"]);
      const ciRows=toObjects(results.campaignInfluencers||[],ciHeaderIdx);
      const campaignInfluencers=ciRows.filter(r=>r.campaign_id&&r.influencer_id).map((r:any)=>({
        campaign_id: r.campaign_id,
        influencer_id: r.influencer_id,
        influencer_cost: parseNumber(r.influencer_cost),
        participation_status: r.participation_status||"",
        deliverables: r.deliverables||"",
        notes: r.notes||"",
      }));

      const contentHeaderIdx = findHeaderRow(results.contents || [], ["content_id"]);
      const contentRows=toObjects(results.contents||[],contentHeaderIdx);
      const contents=contentRows.filter(r=>r.content_id).map((r:any)=>({
        content_id: r.content_id,
        campaign_id: r.campaign_id,
        influencer_id: r.influencer_id,
        platform: r.platform||"Instagram",
        format: r.format||r.content_type||"Reel",
        content_type: r.content_type||"Video",
        publication_date: parseDate(r.publication_date),
        content_title: r.content_title||"",
        content_description: r.content_description||"",
        content_url: r.content_url||"",
        embed_url: r.embed_url||"",
        thumbnail_url: r.thumbnail_url||"",
        video_embed: r.video_embed||"",
        is_collaboration: parseBool(r.is_collaboration),
        is_paid: parseBool(r.is_paid),
        paid_media_type: r.paid_media_type||"None",
        content_status: r.content_status||"Published",
        notes: r.notes||"",
      }));

      const metHeaderIdx = findHeaderRow(results.metrics || [], ["video_views", "impressions"]);
      const metRows=toObjects(results.metrics||[],metHeaderIdx);
      const metrics=metRows.filter(r=>r.content_id).map((r:any)=>{
        const likes=parseNumber(r.likes), comments=parseNumber(r.comments), shares=parseNumber(r.shares), saves=parseNumber(r.saves);
        let interactions=parseNumber(r.interactions);
        if(!interactions) interactions=likes+comments+shares+saves;
        return {
          campaign_id: r.campaign_id,
          content_id: r.content_id,
          influencer_id: r.influencer_id,
          platform: r.platform||"",
          views: parseNumber(r.views),
          reach: parseNumber(r.reach),
          impressions: parseNumber(r.impressions),
          likes, comments, shares, saves, interactions,
          clicks: parseNumber(r.clicks)||parseNumber(r.link_clicks),
          link_clicks: parseNumber(r.link_clicks),
          video_views: parseNumber(r.video_views)||parseNumber(r.views),
          video_views_3s: parseNumber(r.video_views_3s),
          video_views_6s: parseNumber(r.video_views_6s),
          average_watch_time: parseNumber(r.average_watch_time),
          video_completion_rate: parseNumber(r.video_completion_rate),
          story_reach: parseNumber(r.story_reach),
          story_impressions: parseNumber(r.story_impressions),
          story_exits: parseNumber(r.story_exits),
          story_replies: parseNumber(r.story_replies),
          story_link_clicks: parseNumber(r.story_link_clicks),
          followers_gained: parseNumber(r.followers_gained),
          mentions: parseNumber(r.mentions),
          profile_visits: parseNumber(r.profile_visits),
        };
      });

      const sentHeaderIdx = findHeaderRow(results.sentiments || [], ["positive_percentage"]);
      const sentRows=toObjects(results.sentiments||[],sentHeaderIdx);
      const sentiments=sentRows.filter(r=>r.campaign_id).map((r:any)=>({
        campaign_id: r.campaign_id,
        content_id: r.content_id||"",
        influencer_id: r.influencer_id||"",
        platform: r.platform||"",
        comments_analyzed: parseNumber(r.comments_analyzed),
        positive_percentage: parseNumber(r.positive_percentage),
        neutral_percentage: parseNumber(r.neutral_percentage),
        negative_percentage: parseNumber(r.negative_percentage),
        sentiment_summary: r.sentiment_summary||"",
        positive_themes: r.positive_themes||"",
        neutral_themes: r.neutral_themes||"",
        negative_themes: r.negative_themes||"",
        sentiment_notes: r.sentiment_notes||"",
      }));

      const comHeaderIdx = findHeaderRow(results.comments || [], ["comment_text"]);
      const comRows=toObjects(results.comments||[],comHeaderIdx);
      const comments=comRows.filter(r=>r.comment_id||r.comment_text).map((r:any)=>({
        comment_id: r.comment_id||`${r.campaign_id}-${Math.random()}`,
        campaign_id: r.campaign_id,
        content_id: r.content_id||"",
        influencer_id: r.influencer_id||"",
        platform: r.platform||"",
        comment_author: r.comment_author||"",
        comment_text: r.comment_text||"",
        comment_date: parseDate(r.comment_date),
        sentiment: r.sentiment||"Neutral",
        theme: r.theme||"",
        is_highlighted: parseBool(r.is_highlighted),
        highlight_reason: r.highlight_reason||"",
        screenshot_url: r.screenshot_url||"",
        screenshot_embed: r.screenshot_embed||"",
        comment_url: r.comment_url||"",
      }));

      const insHeaderIdx = findHeaderRow(results.insights || [], ["insight_type"]);
      const insRows=toObjects(results.insights||[],insHeaderIdx);
      const insights=insRows.filter(r=>r.insight_id||r.title).map((r:any)=>({
        insight_id: r.insight_id||`${r.campaign_id}-${Math.random()}`,
        campaign_id: r.campaign_id,
        scope: r.scope||"Campaign",
        scope_id: r.scope_id||r.campaign_id,
        insight_type: r.insight_type||"Observation",
        title: r.title||"",
        description: r.description||"",
        priority: r.priority||"Medium",
        display_order: parseNumber(r.display_order)||99,
        is_featured: parseBool(r.is_featured),
      }));

      const mediaHeaderIdx = findHeaderRow(results.media || [], ["media_type"]);
      const mediaRows=toObjects(results.media||[],mediaHeaderIdx);
      const media=mediaRows.filter(r=>r.media_id||r.url).map((r:any)=>({
        media_id: r.media_id||`${r.campaign_id}-${Math.random()}`,
        campaign_id: r.campaign_id,
        content_id: r.content_id||"",
        influencer_id: r.influencer_id||"",
        media_type: r.media_type||"Image",
        media_role: r.media_role||"Content",
        url: r.url||"",
        embed_url: r.embed_url||"",
        thumbnail_url: r.thumbnail_url||"",
        caption: r.caption||"",
        is_featured: parseBool(r.is_featured),
      }));

      const projHeaderIdx = findHeaderRow(results.projections || [], ["projected_views"]);
      const projRows=toObjects(results.projections||[],projHeaderIdx);
      const projections=projRows.filter(r=>r.campaign_id).map((r:any)=>({
        campaign_id: r.campaign_id,
        influencer_id: r.influencer_id||"",
        projected_views: parseNumber(r.projected_views),
        projected_reach: parseNumber(r.projected_reach),
        projected_interactions: parseNumber(r.projected_interactions),
        projected_clicks: parseNumber(r.projected_clicks),
        projected_er: parseNumber(r.projected_er),
        projection_notes: r.projection_notes||"",
      }));

      // Si tras parsear no hay ninguna campaña con campaign_id válido, usa mocks
      if(campaigns.length===0){
        setData(MOCK_INFLUENCER_DATA);
        setUsingMock(true);
        setConnected(false);
        setError(`No se encontraron campañas en 01_CAMPAIGNS. Revisa que la fila de encabezados tenga la columna "campaign_id" y que haya al menos una fila de datos debajo.${failed.length>0 ? ` Hojas no encontradas: ${failed.join(", ")}` : ""}`);
        return;
      }

      const newData={ campaigns, influencers, campaignInfluencers, contents, metrics, sentiments, comments, insights, media, projections };
      setData(newData as any);
      try{ localStorage.setItem(CACHE_KEY, JSON.stringify(newData)); }catch{}
      setConnected(true);
      setUsingMock(false);
      if(failed.length>0) setError(`Algunas hojas no cargaron: ${failed.join(", ")}`);
      else setError(null);
    }catch(e:any){
      setError(e.message||"Error Sheets");
      setConnected(false);
      // fallback ya está en mocks
      try{
        const c=localStorage.getItem(CACHE_KEY);
        if(c){ setData(JSON.parse(c)); setUsingMock(false); }
      }catch{}
    }finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ fetchData(); },[fetchData]);

  return { data, loading, error, connected, usingMock, fetchData };
};
