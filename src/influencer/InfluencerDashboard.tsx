import React, { useState, useMemo } from "react";
import { Users, Eye, Heart, MousePointer, TrendingUp, DollarSign, Play, MessageCircle, Star, Layers, BarChart3, Search, Filter, ArrowLeft, ExternalLink, Quote, Award, Lightbulb, Target, AlertCircle } from "lucide-react";
import { useInfluencerSheets } from "./hooks/useInfluencerSheets";
import { BrandConfig } from "../types";
import { Metrics } from "./types";
import { MetricCard } from "../components/ui/MetricCard";
import { ChartCard } from "../components/ui/ChartCard";
import { calculateER, calculateCPV, calculateCPE, calculateCPC, formatNumber, formatCurrency, formatPercent, sumMetrics } from "./utils/calculations";
import { InfluencerAvatar } from "./components/InfluencerAvatar";
import { ContentEmbed } from "./components/ContentEmbed";
import { ContentHighlightCard } from "./components/ContentHighlightCard";
import { PlatformIcon } from "./components/PlatformIcon";
import { resolveImageUrl } from "./utils/media";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "plataformas", label: "Plataformas" },
  { id: "influencers", label: "Influencers" },
  { id: "contenidos", label: "Contenidos" },
  { id: "sentimiento", label: "Sentimiento" },
  { id: "insights", label: "Insights" },
];

export const InfluencerDashboard: React.FC<{ brand: BrandConfig; onBack: () => void }> = ({ brand, onBack }) => {
  const { data, loading, error, usingMock } = useInfluencerSheets();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("resumen");
  const [platformFilter, setPlatformFilter] = useState<string>("Todas");
  const [influencerFilter, setInfluencerFilter] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const [contentView, setContentView] = useState<"gallery"|"table">("gallery");
  const [selectedInfluencer, setSelectedInfluencer] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const campaigns = data.campaigns;
  const selectedCampaign = useMemo(() => {
    if (selectedCampaignId) return campaigns.find(c => c.campaign_id === selectedCampaignId);
    return campaigns[0];
  }, [campaigns, selectedCampaignId]);

  // Auto-select first campaign
  React.useEffect(() => {
    if (!selectedCampaignId && campaigns.length) setSelectedCampaignId(campaigns[0].campaign_id);
  }, [campaigns, selectedCampaignId]);

  const campaignId = selectedCampaign?.campaign_id || "";

  // Derived data for selected campaign
  const campaignInfluencers = useMemo(() => data.campaignInfluencers.filter(ci => ci.campaign_id === campaignId), [data.campaignInfluencers, campaignId]);
  const contents = useMemo(() => data.contents.filter(c => c.campaign_id === campaignId), [data.contents, campaignId]);
  const metrics = useMemo(() => data.metrics.filter(m => m.campaign_id === campaignId), [data.metrics, campaignId]);
  const sentiments = useMemo(() => data.sentiments.filter(s => s.campaign_id === campaignId), [data.sentiments, campaignId]);
  const comments = useMemo(() => data.comments.filter(c => c.campaign_id === campaignId), [data.comments, campaignId]);
  const insights = useMemo(() => data.insights.filter(i => i.campaign_id === campaignId), [data.insights, campaignId]);
  const projections = useMemo(() => data.projections.filter(p => p.campaign_id === campaignId), [data.projections, campaignId]);

  const influencerMap = useMemo(() => new Map(data.influencers.map(i => [i.influencer_id, i])), [data.influencers]);
  const metricsByContent = useMemo(() => new Map(metrics.map(m => [m.content_id, m])), [metrics]);

  // Aggregations
  const totals = useMemo(() => {
    const summed = sumMetrics(metrics);
    const influencerInvestment = campaignInfluencers.reduce((a,c)=>a+(c.influencer_cost||0),0);
    const paidEnabled = selectedCampaign?.paid_media_enabled || false;
    const paidInv = paidEnabled ? (selectedCampaign?.paid_media_investment || 0) : 0;
    const totalInv = paidEnabled ? influencerInvestment + paidInv : influencerInvestment;
    const er = calculateER(summed.interactions, summed.views);
    const cpv = calculateCPV(totalInv, summed.views);
    const cpe = calculateCPE(totalInv, summed.interactions);
    const cpc = calculateCPC(totalInv, summed.clicks);
    return { ...summed, influencerInvestment, paidInv, totalInv, er, cpv, cpe, cpc, contentCount: contents.length, influencerCount: campaignInfluencers.length, platforms: [...new Set(contents.map(c=>c.platform))] };
  }, [metrics, campaignInfluencers, selectedCampaign, contents]);

  // Platform breakdown
  const platformData = useMemo(() => {
    const map: Record<string, any> = {};
    contents.forEach(c=>{
      const m = metricsByContent.get(c.content_id);
      if(!m) return;
      const p = c.platform;
      if(!map[p]) map[p]={ platform:p, views:0, reach:0, impressions:0, interactions:0, clicks:0, contents:0, influencers: new Set() };
      map[p].views+= m.views||0;
      map[p].reach+= m.reach||0;
      map[p].impressions+= m.impressions||0;
      map[p].interactions+= m.interactions||0;
      map[p].clicks+= m.clicks||0;
      map[p].contents+=1;
      map[p].influencers.add(c.influencer_id);
    });
    return Object.values(map).map((p:any)=>({
      ...p,
      influencerCount: p.influencers.size,
      er: calculateER(p.interactions, p.views),
      pctViews: totals.views ? (p.views/totals.views)*100 : 0,
      pctInteractions: totals.interactions ? (p.interactions/totals.interactions)*100 : 0,
    })).sort((a,b)=>b.views-a.views);
  }, [contents, metricsByContent, totals]);

  // Influencer breakdown
  const influencerData = useMemo(() => {
    return campaignInfluencers.map(ci=>{
      const inf = influencerMap.get(ci.influencer_id);
      if(!inf) return null;
      const infContents = contents.filter(c=>c.influencer_id===ci.influencer_id);
      const infMetrics = infContents.map(c=> metricsByContent.get(c.content_id)).filter(Boolean) as any[];
      const summed = sumMetrics(infMetrics);
      const er = calculateER(summed.interactions, summed.views);
      const cpv = calculateCPV(ci.influencer_cost, summed.views);
      const cpe = calculateCPE(ci.influencer_cost, summed.interactions);
      const cpc = calculateCPC(ci.influencer_cost, summed.clicks);
      const platforms = [...new Set(infContents.map(c=>c.platform))];
      // breakdown by platform
      const byPlat: any = {};
      infContents.forEach(c=>{
        const m = metricsByContent.get(c.content_id);
        if(!m) return;
        if(!byPlat[c.platform]) byPlat[c.platform]={ platform:c.platform, views:0, interactions:0, contents:0 };
        byPlat[c.platform].views+=m.views||0;
        byPlat[c.platform].interactions+=m.interactions||0;
        byPlat[c.platform].contents+=1;
      });
      const platformBreakdown = Object.values(byPlat).map((p:any)=> ({ ...p, er: calculateER(p.interactions, p.views)}));
      return {
        influencer: inf,
        campaignCost: ci.influencer_cost,
        ...summed,
        er, cpv, cpe, cpc,
        contentCount: infContents.length,
        platforms,
        platformBreakdown,
        contents: infContents,
      };
    }).filter(Boolean).sort((a:any,b:any)=> b.views - a.views);
  }, [campaignInfluencers, influencerMap, contents, metricsByContent]);

  // Content with metrics
  const contentData = useMemo(() => {
    return contents.map(c=>{
      const m = metricsByContent.get(c.content_id);
      const inf = influencerMap.get(c.influencer_id);
      const er = m ? calculateER(m.interactions, m.views) : null;
      return { content: c, influencer: inf, metrics: m, er };
    }).sort((a,b)=> (b.metrics?.views||0) - (a.metrics?.views||0));
  }, [contents, metricsByContent, influencerMap]);

  // Métricas de toda la campaña, usadas como set de comparación para
  // ContentHighlightCard en las zonas que muestran contenido a nivel campaña.
  const campaignMetricsPool = useMemo(
    () => contentData.map(c=>c.metrics).filter((m): m is Metrics => !!m),
    [contentData]
  );

  // Sentiment campaign level (first without content_id or with empty)
  const campaignSentiment = useMemo(()=> sentiments.find(s=> !s.content_id) || sentiments[0], [sentiments]);
  const highlightedComments = useMemo(()=> comments.filter(c=> c.is_highlighted).slice(0,6), [comments]);

  if(loading) return <div className="p-8 text-center" style={{color:brand.textColor}}>Cargando influencer dashboard…</div>;
  if(!selectedCampaign) return <div className="p-8 text-center" style={{color:brand.textColor}}>No hay campañas. {error && <span className="text-red-600">{error}</span>}</div>;

  const renderResumen = () => (
    <div className="space-y-4 h-full flex flex-col">
      {/* KPI ROW - 6 cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Views" value={formatNumber(totals.views)} icon={Eye} brand={brand} color={brand.primaryColor} />
        <MetricCard title="Reach" value={formatNumber(totals.reach)} icon={Users} brand={brand} color="#0EA5E9" />
        <MetricCard title="Interacciones" value={formatNumber(totals.interactions)} icon={Heart} brand={brand} color="#EC4899" />
        <MetricCard title="ER" value={formatPercent(totals.er)} icon={TrendingUp} brand={brand} color="#8B5CF6" />
        <MetricCard title="Clicks" value={formatNumber(totals.clicks)} icon={MousePointer} brand={brand} color="#10B981" />
        <MetricCard title="Inversión" value={formatCurrency(totals.totalInv)} icon={DollarSign} brand={brand} color="#F59E0B" subtitle={totals.paidInv ? `Influencers ${formatCurrency(totals.influencerInvestment)} + Paid ${formatCurrency(totals.paidInv)}` : undefined} />
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left: Platform performance compact */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <ChartCard title="Performance por plataforma" subtitle={`${totals.platforms.length} plataformas • ${totals.influencerCount} influencers`} brand={brand}>
            <div className="space-y-2">
              {platformData.map(p=>(
                <div key={p.platform} className="flex items-center gap-3 p-2 rounded-xl" style={{backgroundColor:`${brand.primaryColor}08`}}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{backgroundColor: p.platform==="Instagram"? "#E4405F" : p.platform==="TikTok"? "#000" : p.platform==="Facebook"? "#1877F2" : "#FF0000"}}>{p.platform[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{color:brand.textColor}}>{p.platform} <span className="font-normal" style={{color:`${brand.textColor}66`}}>• {p.contentCount} contenidos</span></div>
                    <div className="w-full h-1.5 rounded-full mt-1" style={{backgroundColor:`${brand.primaryColor}15`}}>
                      <div className="h-1.5 rounded-full" style={{width:`${p.pctViews}%`, backgroundColor: brand.primaryColor}}/>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold" style={{color:brand.textColor}}>{formatNumber(p.views)}</div>
                    <div className="text-[10px]" style={{color:`${brand.textColor}66`}}>{formatPercent(p.pctViews,0)} views • {formatPercent(p.er,1)} ER</div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Sentiment compact */}
          {campaignSentiment && (
            <ChartCard title="Sentimiento" brand={brand}>
              <div className="flex gap-2">
                <div className="flex-1 text-center p-2 rounded-xl" style={{backgroundColor:"#10B98115"}}><div className="text-lg font-bold" style={{color:"#10B981"}}>{campaignSentiment.positive_percentage}%</div><div className="text-[10px]" style={{color:`${brand.textColor}66`}}>Positivo</div></div>
                <div className="flex-1 text-center p-2 rounded-xl" style={{backgroundColor:"#64748B15"}}><div className="text-lg font-bold" style={{color:"#64748B"}}>{campaignSentiment.neutral_percentage}%</div><div className="text-[10px]" style={{color:`${brand.textColor}66`}}>Neutral</div></div>
                <div className="flex-1 text-center p-2 rounded-xl" style={{backgroundColor:"#EF444415"}}><div className="text-lg font-bold" style={{color:"#EF4444"}}>{campaignSentiment.negative_percentage}%</div><div className="text-[10px]" style={{color:`${brand.textColor}66`}}>Negativo</div></div>
              </div>
              {campaignSentiment.sentiment_summary && <div className="text-xs mt-2" style={{color:`${brand.textColor}77`}}>{campaignSentiment.sentiment_summary}</div>}
            </ChartCard>
          )}
        </div>

        {/* Center: Top influencers */}
        <div className="col-span-12 lg:col-span-4">
          <ChartCard title="Top Influencers" subtitle="Ordenado por views" brand={brand} action={<button onClick={()=>setActiveTab("influencers")} className="text-xs" style={{color:brand.primaryColor}}>Ver todos →</button>}>
            <div className="space-y-2">
              {influencerData.slice(0,5).map((inf:any)=>(
                <div key={inf.influencer.influencer_id} className="flex items-center gap-3 p-2 rounded-xl hover:opacity-80 cursor-pointer" style={{border:`1px solid ${brand.primaryColor}10`}} onClick={()=>{setSelectedInfluencer(inf.influencer.influencer_id); setActiveTab("influencers");}}>
                  <InfluencerAvatar influencer={inf.influencer} size={36} brandColor={brand.primaryColor} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{color:brand.textColor}}>{inf.influencer.influencer_name}</div>
                    <div className="text-[10px]" style={{color:`${brand.textColor}66`}}>{inf.platforms.join(" • ")} • {inf.contentCount} contenidos</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold" style={{color:brand.textColor}}>{formatNumber(inf.views)}</div>
                    <div className="text-[10px]" style={{color:`${brand.textColor}66`}}>{formatPercent(inf.er,1)} ER</div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Right: Top content + Insights */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <ChartCard title="Top Contenidos" brand={brand} action={<button onClick={()=>setActiveTab("contenidos")} className="text-xs" style={{color:brand.primaryColor}}>Ver todos →</button>}>
            <div className="grid grid-cols-3 gap-2">
              {contentData.slice(0,6).map(({content, influencer, metrics})=>(
                <ContentHighlightCard
                  key={content.content_id}
                  content={content}
                  influencer={influencer}
                  metrics={metrics}
                  comparisonSet={campaignMetricsPool}
                  primaryColor={brand.primaryColor}
                  imageHeightClass="h-16"
                  compact
                  className="cursor-pointer"
                  onClick={()=>{setSelectedContent(content.content_id); setActiveTab("contenidos");}}
                />
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Key Findings" brand={brand}>
            <div className="space-y-2">
              {insights.filter(i=>i.is_featured).slice(0,3).map(ins=>(
                <div key={ins.insight_id} className="p-2 rounded-xl border" style={{borderColor:`${brand.primaryColor}15`, backgroundColor: ins.insight_type==="Achievement" ? "#10B98108" : ins.insight_type==="Learning" ? "#F59E0B08" : "#0EA5E908"}}>
                  <div className="flex items-center gap-1.5">
                    {ins.insight_type==="Achievement" ? <Award size={12} style={{color:"#10B981"}}/> : ins.insight_type==="Learning" ? <Lightbulb size={12} style={{color:"#F59E0B"}}/> : <Target size={12} style={{color:"#0EA5E9"}}/>}
                    <span className="text-[10px] font-bold uppercase" style={{color:brand.textColor}}>{ins.insight_type}</span>
                  </div>
                  <div className="text-xs font-semibold mt-1" style={{color:brand.textColor}}>{ins.title}</div>
                  <div className="text-[11px] mt-0.5 line-clamp-2" style={{color:`${brand.textColor}77`}}>{ins.description}</div>
                </div>
              ))}
              {insights.filter(i=>i.is_featured).length===0 && <div className="text-xs" style={{color:`${brand.textColor}66`}}>No hay hallazgos destacados</div>}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );

  const renderPlataformas = () => (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button onClick={()=>setSelectedPlatform(null)} className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${!selectedPlatform ? "text-white" : ""}`} style={{backgroundColor: !selectedPlatform ? brand.primaryColor : `${brand.primaryColor}08`, borderColor:`${brand.primaryColor}22`, color: !selectedPlatform ? "#fff" : brand.textColor}}>Todas</button>
        {platformData.map(p=>(
          <button key={p.platform} onClick={()=> setSelectedPlatform(p.platform===selectedPlatform ? null : p.platform)} className={`px-3 py-1.5 rounded-xl text-xs font-medium border`} style={{backgroundColor: selectedPlatform===p.platform ? brand.primaryColor : `${brand.primaryColor}08`, borderColor:`${brand.primaryColor}22`, color: selectedPlatform===p.platform ? "#fff" : brand.textColor}}>{p.platform} • {formatNumber(p.views)}</button>
        ))}
      </div>

      {platformData.filter(p=> !selectedPlatform || p.platform===selectedPlatform).map(p=>(
        <ChartCard key={p.platform} title={p.platform} subtitle={`${p.influencerCount} influencers • ${p.contentCount} contenidos`} brand={brand}>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <MetricCard title="Views" value={formatNumber(p.views)} icon={Eye} brand={brand} color={brand.primaryColor} />
            <MetricCard title="Reach" value={formatNumber(p.reach)} icon={Users} brand={brand} color="#0EA5E9" />
            <MetricCard title="Interacciones" value={formatNumber(p.interactions)} icon={Heart} brand={brand} color="#EC4899" />
            <MetricCard title="ER" value={formatPercent(p.er)} icon={TrendingUp} brand={brand} color="#8B5CF6" />
            <MetricCard title="Clicks" value={formatNumber(p.clicks)} icon={MousePointer} brand={brand} color="#10B981" />
            <MetricCard title="% Views" value={formatPercent(p.pctViews)} icon={BarChart3} brand={brand} color="#F59E0B" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{color:brand.textColor}}>Top Influencers en {p.platform}</h4>
              <div className="space-y-1.5">
                {influencerData.filter((inf:any)=> inf.platforms.includes(p.platform)).slice(0,5).map((inf:any)=>{
                  const plat = inf.platformBreakdown.find((x:any)=> x.platform===p.platform);
                  return (
                    <div key={inf.influencer.influencer_id} className="flex items-center gap-2 p-2 rounded-lg border" style={{borderColor:`${brand.primaryColor}10`}}>
                      <InfluencerAvatar influencer={inf.influencer} size={28} brandColor={brand.primaryColor} />
                      <span className="text-xs flex-1" style={{color:brand.textColor}}>{inf.influencer.influencer_name}</span>
                      <span className="text-xs font-semibold" style={{color:brand.textColor}}>{formatNumber(plat?.views||0)} • {formatPercent(plat?.er,1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{color:brand.textColor}}>Top Contenidos en {p.platform}</h4>
              <div className="grid grid-cols-3 gap-2">
                {(() => {
                  const platformContents = contentData.filter(c=> c.content.platform===p.platform);
                  const platformMetricsPool = platformContents.map(c=>c.metrics).filter((m): m is Metrics => !!m);
                  return platformContents.slice(0,6).map(({content, influencer, metrics})=>(
                    <ContentHighlightCard
                      key={content.content_id}
                      content={content}
                      influencer={influencer}
                      metrics={metrics}
                      comparisonSet={platformMetricsPool}
                      primaryColor={brand.primaryColor}
                      imageHeightClass="h-14"
                      compact
                      className="cursor-pointer"
                      onClick={()=>{setSelectedContent(content.content_id); setActiveTab("contenidos");}}
                    />
                  ));
                })()}
              </div>
            </div>
          </div>

          {insights.filter(i=> i.scope==="Platform" && i.scope_id===p.platform).length>0 && (
            <div className="mt-3 p-2 rounded-xl" style={{backgroundColor:`${brand.primaryColor}05`}}>
              <div className="text-xs font-semibold" style={{color:brand.textColor}}>Observaciones {p.platform}</div>
              {insights.filter(i=> i.scope==="Platform" && i.scope_id===p.platform).map(ins=>(
                <div key={ins.insight_id} className="text-xs mt-1" style={{color:`${brand.textColor}77`}}><b>{ins.title}:</b> {ins.description}</div>
              ))}
            </div>
          )}
        </ChartCard>
      ))}
    </div>
  );

  const renderInfluencers = () => {
    const filtered = influencerData.filter((inf:any)=>{
      if(platformFilter!=="Todas" && !inf.platforms.includes(platformFilter)) return false;
      if(search && !inf.influencer.influencer_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if(selectedInfluencer){
      const inf:any = influencerData.find((x:any)=> x.influencer.influencer_id===selectedInfluencer);
      if(!inf) return null;
      const infSent = sentiments.filter(s=> s.influencer_id===selectedInfluencer && !s.content_id);
      const infComments = comments.filter(c=> c.influencer_id===selectedInfluencer && c.is_highlighted);
      const infInsights = insights.filter(i=> i.scope==="Influencer" && i.scope_id===selectedInfluencer);
      const proj = projections.find(p=> p.influencer_id===selectedInfluencer);
      const actualViews = inf.views;
      return (
        <div className="space-y-4">
          <button onClick={()=> setSelectedInfluencer(null)} className="flex items-center gap-1 text-xs" style={{color:brand.primaryColor}}><ArrowLeft size={14}/> Volver al ranking</button>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-3">
              <ChartCard title={inf.influencer.influencer_name} brand={brand}>
                <div className="mx-auto w-fit"><InfluencerAvatar influencer={inf.influencer} size={80} brandColor={brand.primaryColor} /></div>
                <div className="text-center mt-2">
                  <div className="text-sm font-bold" style={{color:brand.textColor}}>{inf.influencer.influencer_name}</div>
                  <div className="text-xs" style={{color:`${brand.textColor}66`}}>{inf.influencer.content_style}</div>
                  <div className="text-xs mt-1" style={{color:`${brand.textColor}77`}}>{inf.platforms.join(" • ")}</div>
                  <div className="flex justify-center gap-2 mt-2 text-xs">
                    {inf.influencer.instagram_handle && <a href={inf.influencer.instagram_profile_url} target="_blank" className="px-2 py-1 rounded-full" style={{backgroundColor:`${brand.primaryColor}10`, color:brand.primaryColor}}>{inf.influencer.instagram_handle}</a>}
                    {inf.influencer.tiktok_handle && <a href={inf.influencer.tiktok_profile_url} target="_blank" className="px-2 py-1 rounded-full" style={{backgroundColor:"#000", color:"#fff"}}>{inf.influencer.tiktok_handle}</a>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                  <div className="p-2 rounded-lg" style={{backgroundColor:`${brand.primaryColor}08`}}><div className="text-xs" style={{color:`${brand.textColor}66`}}>Followers IG</div><div className="text-sm font-bold" style={{color:brand.textColor}}>{formatNumber(inf.influencer.instagram_followers)}</div></div>
                  <div className="p-2 rounded-lg" style={{backgroundColor:`${brand.primaryColor}08`}}><div className="text-xs" style={{color:`${brand.textColor}66`}}>Followers TikTok</div><div className="text-sm font-bold" style={{color:brand.textColor}}>{formatNumber(inf.influencer.tiktok_followers)}</div></div>
                </div>
              </ChartCard>
            </div>
            <div className="col-span-12 lg:col-span-9 space-y-3">
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard title="Views" value={formatNumber(inf.views)} icon={Eye} brand={brand} />
                <MetricCard title="Reach" value={formatNumber(inf.reach)} icon={Users} brand={brand} />
                <MetricCard title="Interacciones" value={formatNumber(inf.interactions)} icon={Heart} brand={brand} />
                <MetricCard title="ER" value={formatPercent(inf.er)} icon={TrendingUp} brand={brand} />
                <MetricCard title="Clicks" value={formatNumber(inf.clicks)} icon={MousePointer} brand={brand} />
                <MetricCard title="Inversión" value={formatCurrency(inf.campaignCost)} icon={DollarSign} brand={brand} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MetricCard title="CPV" value={inf.cpv ? formatCurrency(inf.cpv) : "—"} icon={Play} brand={brand} />
                <MetricCard title="CPE" value={inf.cpe ? formatCurrency(inf.cpe) : "—"} icon={Heart} brand={brand} />
                <MetricCard title="CPC" value={inf.cpc ? formatCurrency(inf.cpc) : "—"} icon={MousePointer} brand={brand} />
              </div>

              <ChartCard title="Performance por plataforma" brand={brand}>
                <div className="grid grid-cols-2 gap-3">
                  {inf.platformBreakdown.map((p:any)=>(
                    <div key={p.platform} className="p-3 rounded-xl border" style={{borderColor:`${brand.primaryColor}15`}}>
                      <div className="text-xs font-bold" style={{color:brand.textColor}}>{p.platform} • {p.contents} contenidos</div>
                      <div className="text-xs mt-1" style={{color:`${brand.textColor}77`}}>{formatNumber(p.views)} views • {formatPercent(p.er,1)} ER</div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              {proj && (
                <ChartCard title="Proyección vs Actual" brand={brand}>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div><div className="text-xs" style={{color:`${brand.textColor}66`}}>Proyectado</div><div className="font-bold" style={{color:brand.textColor}}>{formatNumber(proj.projected_views)}</div></div>
                    <div><div className="text-xs" style={{color:`${brand.textColor}66`}}>Actual</div><div className="font-bold" style={{color:brand.textColor}}>{formatNumber(actualViews)}</div></div>
                    <div><div className="text-xs" style={{color:`${brand.textColor}66`}}>Achievement</div><div className="font-bold" style={{color: actualViews>=proj.projected_views ? "#10B981" : "#EF4444"}}>{formatPercent(actualViews/proj.projected_views*100,1)}</div></div>
                    <div><div className="text-xs" style={{color:`${brand.textColor}66`}}>Variance</div><div className="font-bold" style={{color: actualViews>=proj.projected_views ? "#10B981" : "#EF4444"}}>{formatPercent((actualViews-proj.projected_views)/proj.projected_views*100,1)}</div></div>
                  </div>
                </ChartCard>
              )}

              <ChartCard title={`Contenidos de ${inf.influencer.influencer_name} (${inf.contents.length})`} brand={brand}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {(() => {
                    const infMetricsPool = inf.contents.map((c:any)=>metricsByContent.get(c.content_id)).filter((m): m is Metrics => !!m);
                    return inf.contents.map((c:any)=>{
                      const m = metricsByContent.get(c.content_id);
                      return (
                        <div key={c.content_id} className="rounded-xl border overflow-hidden" style={{borderColor:`${brand.primaryColor}10`}}>
                          <ContentHighlightCard
                            content={c}
                            influencer={inf.influencer}
                            metrics={m}
                            comparisonSet={infMetricsPool}
                            primaryColor={brand.primaryColor}
                            imageHeightClass="h-24"
                          />
                          <div className="p-2">
                            <div className="text-xs font-semibold truncate" style={{color:brand.textColor}}>{c.content_title || c.format}</div>
                            <div className="text-[10px]" style={{color:`${brand.textColor}66`}}>{c.platform} • {formatNumber(m?.views||0)} • {formatPercent(m ? (m.interactions/m.views*100) : null,1)}</div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </ChartCard>

              {infSent.length>0 && (
                <ChartCard title="Sentimiento" brand={brand}>
                  <div className="flex gap-2">
                    <div className="flex-1 text-center p-2 rounded-lg" style={{backgroundColor:"#10B98115"}}>{infSent[0].positive_percentage}% Pos</div>
                    <div className="flex-1 text-center p-2 rounded-lg" style={{backgroundColor:"#64748B15"}}>{infSent[0].neutral_percentage}% Neu</div>
                    <div className="flex-1 text-center p-2 rounded-lg" style={{backgroundColor:"#EF444415"}}>{infSent[0].negative_percentage}% Neg</div>
                  </div>
                  <div className="text-xs mt-2" style={{color:`${brand.textColor}77`}}>{infSent[0].sentiment_summary}</div>
                </ChartCard>
              )}

              {infComments.length>0 && (
                <ChartCard title="Comentarios destacados" brand={brand}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {infComments.map(com=>(
                      <div key={com.comment_id} className="p-3 rounded-xl border" style={{borderColor:`${brand.primaryColor}10`, backgroundColor:`${brand.primaryColor}05`}}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{color:brand.textColor}}>{com.comment_author}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{backgroundColor: com.sentiment==="Positive" ? "#10B981" : com.sentiment==="Negative" ? "#EF4444" : "#64748B", color:"#fff"}}>{com.sentiment}</span>
                        </div>
                        <div className="text-xs mt-1" style={{color:brand.textColor}}>"{com.comment_text}"</div>
                        {resolveImageUrl(com.screenshot_url || com.screenshot_embed) && (
                          <img src={resolveImageUrl(com.screenshot_url || com.screenshot_embed)} className="w-full mt-2 rounded-lg" alt="" onError={(e)=> (e.currentTarget.style.display="none")} />
                        )}
                      </div>
                    ))}
                  </div>
                </ChartCard>
              )}

              {infInsights.length>0 && (
                <ChartCard title="Insights" brand={brand}>
                  {infInsights.map(ins=>(
                    <div key={ins.insight_id} className="p-2 border-b last:border-0" style={{borderColor:`${brand.primaryColor}10`}}>
                      <div className="text-xs font-bold" style={{color:brand.textColor}}>{ins.title}</div>
                      <div className="text-xs" style={{color:`${brand.textColor}77`}}>{ins.description}</div>
                    </div>
                  ))}
                </ChartCard>
              )}
            </div>
          </div>
        </div>
      );
    };
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <Filter size={14} style={{color:brand.primaryColor}}/>
            <select value={platformFilter} onChange={e=> setPlatformFilter(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border" style={{borderColor:`${brand.primaryColor}22`, backgroundColor: brand.cardBg, color: brand.textColor}}>
              <option>Todas</option>
              <option>Instagram</option>
              <option>TikTok</option>
              <option>Facebook</option>
              <option>YouTube</option>
            </select>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg border flex-1 max-w-xs" style={{borderColor:`${brand.primaryColor}22`, backgroundColor: brand.cardBg}}>
            <Search size={12} style={{color:`${brand.textColor}66`}}/>
            <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Buscar influencer..." className="flex-1 text-xs bg-transparent outline-none" style={{color:brand.textColor}} />
          </div>
          <span className="text-xs" style={{color:`${brand.textColor}66`}}>{filtered.length} influencers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((inf:any)=>(
            <div key={inf.influencer.influencer_id} className="rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all" style={{backgroundColor: brand.cardBg, borderColor:`${brand.primaryColor}15`}} onClick={()=> setSelectedInfluencer(inf.influencer.influencer_id)}>
              <div className="flex gap-3">
                <InfluencerAvatar influencer={inf.influencer} size={48} brandColor={brand.primaryColor} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{color:brand.textColor}}>{inf.influencer.influencer_name}</div>
                  <div className="text-xs truncate" style={{color:`${brand.textColor}66`}}>{inf.influencer.content_style}</div>
                  <div className="text-[10px]" style={{color:`${brand.textColor}55`}}>{inf.platforms.join(" • ")}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold" style={{color:brand.textColor}}>{formatNumber(inf.views)}</div>
                  <div className="text-[10px]" style={{color:`${brand.textColor}66`}}>{inf.contentCount} contenidos</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-1.5 rounded-lg" style={{backgroundColor:`${brand.primaryColor}05`}}><div className="text-[10px]" style={{color:`${brand.textColor}66`}}>ER</div><div className="text-xs font-bold" style={{color:brand.textColor}}>{formatPercent(inf.er,1)}</div></div>
                <div className="p-1.5 rounded-lg" style={{backgroundColor:`${brand.primaryColor}05`}}><div className="text-[10px]" style={{color:`${brand.textColor}66`}}>CPV</div><div className="text-xs font-bold" style={{color:brand.textColor}}>{inf.cpv ? formatCurrency(inf.cpv) : "—"}</div></div>
                <div className="p-1.5 rounded-lg" style={{backgroundColor:`${brand.primaryColor}05`}}><div className="text-[10px]" style={{color:`${brand.textColor}66`}}>CPE</div><div className="text-xs font-bold" style={{color:brand.textColor}}>{inf.cpe ? formatCurrency(inf.cpe) : "—"}</div></div>
              </div>
              <div className="flex gap-1 mt-2">
                {inf.platforms.map((p:string)=> <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{backgroundColor:`${brand.primaryColor}10`, color:brand.primaryColor}}>{p}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContenidos = () => {
    let filtered = contentData;
    if(platformFilter!=="Todas") filtered=filtered.filter(c=> c.content.platform===platformFilter);
    if(influencerFilter!=="Todos") filtered=filtered.filter(c=> c.content.influencer_id===influencerFilter);
    if(search) filtered=filtered.filter(c=> c.content.content_title.toLowerCase().includes(search.toLowerCase()) || c.influencer?.influencer_name.toLowerCase().includes(search.toLowerCase()));
    if(selectedContent){
      const item = contentData.find(c=> c.content.content_id===selectedContent);
      if(item){
        const m=item.metrics;
        const sent = sentiments.find(s=> s.content_id===selectedContent);
        const comms = comments.filter(c=> c.content_id===selectedContent);
        const ins = insights.filter(i=> i.scope==="Content" && i.scope_id===selectedContent);
        return (
          <div className="space-y-3">
            <button onClick={()=> setSelectedContent(null)} className="flex items-center gap-1 text-xs" style={{color:brand.primaryColor}}><ArrowLeft size={14}/> Volver a contenidos</button>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-5">
                <ChartCard title={item.content.content_title || item.content.format} brand={brand}>
                  <ContentEmbed content={item.content} primaryColor={brand.primaryColor} textColor={brand.textColor} />
                  <a href={item.content.content_url} target="_blank" className="flex items-center gap-1 text-xs mt-2" style={{color:brand.primaryColor}}><ExternalLink size={12}/> Ver contenido original</a>
                  <div className="text-xs mt-2" style={{color:`${brand.textColor}77`}}>{item.content.content_description}</div>
                </ChartCard>
              </div>
              <div className="col-span-12 lg:col-span-7 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <MetricCard title="Views" value={formatNumber(m?.views||0)} icon={Eye} brand={brand} />
                  <MetricCard title="Reach" value={formatNumber(m?.reach||0)} icon={Users} brand={brand} />
                  <MetricCard title="Interacciones" value={formatNumber(m?.interactions||0)} icon={Heart} brand={brand} />
                  <MetricCard title="ER" value={formatPercent(item.er,1)} icon={TrendingUp} brand={brand} />
                  <MetricCard title="Likes" value={formatNumber(m?.likes||0)} icon={Heart} brand={brand} />
                  <MetricCard title="Clicks" value={formatNumber(m?.clicks||0)} icon={MousePointer} brand={brand} />
                </div>
                {sent && (
                  <ChartCard title="Sentimiento del contenido" brand={brand}>
                    <div className="flex gap-2">
                      <div className="flex-1 text-center p-3 rounded-xl" style={{backgroundColor:"#10B98115"}}><div className="font-bold" style={{color:"#10B981"}}>{sent.positive_percentage}%</div><div className="text-[10px]" style={{color:`${brand.textColor}66`}}>Positivo</div></div>
                      <div className="flex-1 text-center p-3 rounded-xl" style={{backgroundColor:"#64748B15"}}><div className="font-bold" style={{color:"#64748B"}}>{sent.neutral_percentage}%</div><div className="text-[10px]" style={{color:`${brand.textColor}66`}}>Neutral</div></div>
                      <div className="flex-1 text-center p-3 rounded-xl" style={{backgroundColor:"#EF444415"}}><div className="font-bold" style={{color:"#EF4444"}}>{sent.negative_percentage}%</div><div className="text-[10px]" style={{color:`${brand.textColor}66`}}>Negativo</div></div>
                    </div>
                    <div className="text-xs mt-2" style={{color:`${brand.textColor}77`}}>{sent.sentiment_summary}</div>
                    {sent.positive_themes && <div className="text-xs mt-1"><b style={{color:brand.textColor}}>Temas positivos:</b> <span style={{color:`${brand.textColor}77`}}>{sent.positive_themes}</span></div>}
                  </ChartCard>
                )}
                {comms.filter(c=>c.is_highlighted).length>0 && (
                  <ChartCard title="Comentarios destacados" brand={brand}>
                    {comms.filter(c=>c.is_highlighted).map(c=>(
                      <div key={c.comment_id} className="p-2 border-b last:border-0" style={{borderColor:`${brand.primaryColor}10`}}>
                        <div className="text-xs font-bold" style={{color:brand.textColor}}>{c.comment_author} <span className="text-[10px] px-1 rounded" style={{backgroundColor: c.sentiment==="Positive" ? "#10B981" : c.sentiment==="Negative" ? "#EF4444" : "#64748B", color:"#fff"}}>{c.sentiment}</span></div>
                        <div className="text-xs" style={{color:brand.textColor}}>"{c.comment_text}"</div>
                        {resolveImageUrl(c.screenshot_url || c.screenshot_embed) && (
                          <img src={resolveImageUrl(c.screenshot_url || c.screenshot_embed)} className="w-full mt-2 rounded-lg" alt="" onError={(e)=> (e.currentTarget.style.display="none")} />
                        )}
                      </div>
                    ))}
                  </ChartCard>
                )}
                {ins.length>0 && (
                  <ChartCard title="Insights del contenido" brand={brand}>
                    {ins.map(i=> <div key={i.insight_id} className="text-xs"><b style={{color:brand.textColor}}>{i.title}:</b> <span style={{color:`${brand.textColor}77`}}>{i.description}</span></div>)}
                  </ChartCard>
                )}
              </div>
            </div>
          </div>
        );
      }
    }
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select value={platformFilter} onChange={e=> setPlatformFilter(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border" style={{borderColor:`${brand.primaryColor}22`, backgroundColor:brand.cardBg, color:brand.textColor}}>
            <option>Todas</option><option>Instagram</option><option>TikTok</option><option>Facebook</option><option>YouTube</option>
          </select>
          <select value={influencerFilter} onChange={e=> setInfluencerFilter(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border" style={{borderColor:`${brand.primaryColor}22`, backgroundColor:brand.cardBg, color:brand.textColor}}>
            <option value="Todos">Todos influencers</option>
            {data.influencers.filter(i=> campaignInfluencers.some(ci=>ci.influencer_id===i.influencer_id)).map(inf=> <option key={inf.influencer_id} value={inf.influencer_id}>{inf.influencer_name}</option>)}
          </select>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg border flex-1 max-w-xs" style={{borderColor:`${brand.primaryColor}22`, backgroundColor:brand.cardBg}}>
            <Search size={12} style={{color:`${brand.textColor}66`}}/><input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Buscar contenido..." className="flex-1 text-xs bg-transparent outline-none" style={{color:brand.textColor}}/>
          </div>
          <div className="flex gap-1">
            <button onClick={()=> setContentView("gallery")} className={`px-2 py-1 rounded-lg text-xs border ${contentView==="gallery" ? "text-white" : ""}`} style={{backgroundColor: contentView==="gallery" ? brand.primaryColor : `${brand.primaryColor}08`, borderColor:`${brand.primaryColor}22`, color: contentView==="gallery" ? "#fff" : brand.textColor}}>Galería</button>
            <button onClick={()=> setContentView("table")} className={`px-2 py-1 rounded-lg text-xs border ${contentView==="table" ? "text-white" : ""}`} style={{backgroundColor: contentView==="table" ? brand.primaryColor : `${brand.primaryColor}08`, borderColor:`${brand.primaryColor}22`, color: contentView==="table" ? "#fff" : brand.textColor}}>Tabla</button>
          </div>
          <span className="text-xs" style={{color:`${brand.textColor}66`}}>{filtered.length} contenidos</span>
        </div>

        {contentView==="gallery" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(() => {
              const filteredMetricsPool = filtered.map(f=>f.metrics).filter((m): m is Metrics => !!m);
              return filtered.map(({content, influencer, metrics, er})=>(
                <div key={content.content_id} onClick={()=> setSelectedContent(content.content_id)} className="rounded-2xl border overflow-hidden cursor-pointer hover:shadow-md transition-all" style={{backgroundColor:brand.cardBg, borderColor:`${brand.primaryColor}15`}}>
                  <ContentHighlightCard
                    content={content}
                    influencer={influencer}
                    metrics={metrics}
                    comparisonSet={filteredMetricsPool}
                    primaryColor={brand.primaryColor}
                    imageHeightClass="h-32"
                  />
                  <div className="p-2">
                    <div className="text-xs font-semibold truncate" style={{color:brand.textColor}}>{content.content_title || content.format}</div>
                    <div className="text-[10px] flex items-center gap-1" style={{color:`${brand.textColor}66`}}><InfluencerAvatar influencer={influencer} size={16} brandColor={brand.primaryColor} />{influencer?.influencer_name}</div>
                    <div className="flex gap-2 mt-1 text-[10px]">
                      <span style={{color:brand.textColor}}><b>{formatNumber(metrics?.views||0)}</b> views</span>
                      <span style={{color:`${brand.textColor}66`}}>{formatPercent(er,1)} ER</span>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        ) : (
          <div className="overflow-auto rounded-2xl border" style={{borderColor:`${brand.primaryColor}15`, backgroundColor:brand.cardBg}}>
            <table className="w-full text-xs">
              <thead style={{backgroundColor:`${brand.primaryColor}08`}}>
                <tr>
                  <th className="px-3 py-2 text-left" style={{color:brand.textColor}}>Contenido</th>
                  <th className="px-3 py-2 text-left" style={{color:brand.textColor}}>Influencer</th>
                  <th className="px-3 py-2" style={{color:brand.textColor}}>Plataforma</th>
                  <th className="px-3 py-2 text-right" style={{color:brand.textColor}}>Views</th>
                  <th className="px-3 py-2 text-right" style={{color:brand.textColor}}>Interacciones</th>
                  <th className="px-3 py-2 text-right" style={{color:brand.textColor}}>ER</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({content, influencer, metrics, er})=>(
                  <tr key={content.content_id} className="border-t hover:opacity-70 cursor-pointer" style={{borderColor:`${brand.primaryColor}08`}} onClick={()=> setSelectedContent(content.content_id)}>
                    <td className="px-3 py-2 flex items-center gap-2"><PlatformIcon platform={content.platform} size={24} /><span style={{color:brand.textColor}}>{content.content_title || content.format}</span></td>
                    <td className="px-3 py-2" style={{color:brand.textColor}}>{influencer?.influencer_name}</td>
                    <td className="px-3 py-2" style={{color:brand.textColor}}>{content.platform} • {content.format}</td>
                    <td className="px-3 py-2 text-right" style={{color:brand.textColor}}>{formatNumber(metrics?.views||0)}</td>
                    <td className="px-3 py-2 text-right" style={{color:brand.textColor}}>{formatNumber(metrics?.interactions||0)}</td>
                    <td className="px-3 py-2 text-right" style={{color:brand.textColor}}>{formatPercent(er,1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderSentimiento = () => {
    const campSent = campaignSentiment;
    return (
      <div className="space-y-4">
        {campSent ? (
          <ChartCard title="Sentimiento de campaña" brand={brand}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl" style={{backgroundColor:"#10B98112"}}><div className="text-2xl font-bold" style={{color:"#10B981"}}>{campSent.positive_percentage}%</div><div className="text-xs" style={{color:`${brand.textColor}66`}}>Positivo</div><div className="text-xs mt-1" style={{color:`${brand.textColor}77`}}>{campSent.positive_themes}</div></div>
              <div className="p-4 rounded-2xl" style={{backgroundColor:"#64748B12"}}><div className="text-2xl font-bold" style={{color:"#64748B"}}>{campSent.neutral_percentage}%</div><div className="text-xs" style={{color:`${brand.textColor}66`}}>Neutral</div><div className="text-xs mt-1" style={{color:`${brand.textColor}77`}}>{campSent.neutral_themes}</div></div>
              <div className="p-4 rounded-2xl" style={{backgroundColor:"#EF444412"}}><div className="text-2xl font-bold" style={{color:"#EF4444"}}>{campSent.negative_percentage}%</div><div className="text-xs" style={{color:`${brand.textColor}66`}}>Negativo</div><div className="text-xs mt-1" style={{color:`${brand.textColor}77`}}>{campSent.negative_themes}</div></div>
            </div>
            <div className="w-full h-3 rounded-full flex overflow-hidden mt-4">
              <div style={{width:`${campSent.positive_percentage}%`, backgroundColor:"#10B981"}}/>
              <div style={{width:`${campSent.neutral_percentage}%`, backgroundColor:"#64748B"}}/>
              <div style={{width:`${campSent.negative_percentage}%`, backgroundColor:"#EF4444"}}/>
            </div>
            <div className="text-sm mt-3 p-3 rounded-xl" style={{backgroundColor:`${brand.primaryColor}05`, color:brand.textColor}}>{campSent.sentiment_summary}</div>
          </ChartCard>
        ) : <div className="text-sm p-4 rounded-xl border" style={{borderColor:`${brand.primaryColor}15`, color:`${brand.textColor}66`, backgroundColor:brand.cardBg}}>No hay análisis de sentimiento para esta campaña</div>}

        <ChartCard title="Sentimiento por influencer" brand={brand}>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead><tr style={{color:`${brand.textColor}66`}}><th className="text-left p-2">Influencer</th><th className="text-center p-2">Positivo</th><th className="text-center p-2">Neutral</th><th className="text-center p-2">Negativo</th><th className="text-left p-2">Resumen</th></tr></thead>
              <tbody>
                {sentiments.filter(s=> s.influencer_id && !s.content_id).map(s=>{
                  const inf = influencerMap.get(s.influencer_id);
                  return (
                    <tr key={s.influencer_id} className="border-t" style={{borderColor:`${brand.primaryColor}08`}}>
                      <td className="p-2 flex items-center gap-2"><InfluencerAvatar influencer={inf} size={24} brandColor={brand.primaryColor} /><span style={{color:brand.textColor}}>{inf?.influencer_name}</span></td>
                      <td className="p-2 text-center" style={{color:"#10B981"}}>{s.positive_percentage}%</td>
                      <td className="p-2 text-center" style={{color:"#64748B"}}>{s.neutral_percentage}%</td>
                      <td className="p-2 text-center" style={{color:"#EF4444"}}>{s.negative_percentage}%</td>
                      <td className="p-2" style={{color:`${brand.textColor}77`}}>{s.sentiment_summary}</td>
                    </tr>
                  );
                })}
                {sentiments.filter(s=> s.influencer_id && !s.content_id).length===0 && <tr><td colSpan={5} className="p-4 text-center" style={{color:`${brand.textColor}66`}}>Sin desglose por influencer</td></tr>}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Comentarios destacados" subtitle={`${comments.length} comentarios • ${highlightedComments.length} destacados`} brand={brand}>
          <div className="flex gap-2 mb-3">
            {["Todos","Positive","Neutral","Negative"].map(s=>(
              <button key={s} onClick={()=> setPlatformFilter(s)} className={`text-xs px-2 py-1 rounded-full border ${platformFilter===s ? "text-white" : ""}`} style={{backgroundColor: platformFilter===s ? brand.primaryColor : "transparent", borderColor:`${brand.primaryColor}22`, color: platformFilter===s ? "#fff" : brand.textColor}}>{s}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {comments.filter(c=> platformFilter==="Todos" || c.sentiment===platformFilter).slice(0,8).map(c=>{
              const inf = influencerMap.get(c.influencer_id);
              return (
                <div key={c.comment_id} className="p-3 rounded-xl border" style={{borderColor:`${brand.primaryColor}10`, backgroundColor: c.is_highlighted ? `${brand.primaryColor}05` : brand.cardBg}}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{color:brand.textColor}}>{c.comment_author}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{backgroundColor: c.sentiment==="Positive" ? "#10B981" : c.sentiment==="Negative" ? "#EF4444" : "#64748B"}}>{c.sentiment}</span>
                    {c.is_highlighted && <Star size={10} style={{color:"#F59E0B"}}/>}
                  </div>
                  <div className="text-xs mt-1 flex gap-1" style={{color:`${brand.textColor}66`}}><Quote size={10}/>"{c.comment_text}"</div>
                  <div className="text-[10px] mt-1" style={{color:`${brand.textColor}55`}}>{inf?.influencer_name} • {c.platform} {c.theme && `• ${c.theme}`}</div>
                  {resolveImageUrl(c.screenshot_url || c.screenshot_embed) && (
                    <img src={resolveImageUrl(c.screenshot_url || c.screenshot_embed)} alt="screenshot" className="w-full mt-2 rounded-lg border" style={{borderColor:`${brand.primaryColor}10`}} onError={(e)=> (e.currentTarget.style.display="none")} />
                  )}
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    );
  };

  const renderInsights = () => {
    const byType = (type:string)=> insights.filter(i=> i.insight_type===type).sort((a,b)=> a.display_order - b.display_order);
    const featured = insights.filter(i=> i.is_featured);
    return (
      <div className="space-y-4">
        {featured.length>0 && (
          <ChartCard title="Destacados" brand={brand}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {featured.slice(0,3).map(ins=>(
                <div key={ins.insight_id} className="p-3 rounded-xl border" style={{borderColor:`${brand.primaryColor}15`, backgroundColor: ins.insight_type==="Achievement" ? "#10B98108" : ins.insight_type==="Learning" ? "#F59E0B08" : "#0EA5E908"}}>
                  <div className="text-[10px] font-bold uppercase flex items-center gap-1" style={{color:brand.primaryColor}}><Star size={10}/>{ins.insight_type}</div>
                  <div className="text-sm font-bold mt-1" style={{color:brand.textColor}}>{ins.title}</div>
                  <div className="text-xs mt-1" style={{color:`${brand.textColor}77`}}>{ins.description}</div>
                </div>
              ))}
            </div>
          </ChartCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            { type:"Achievement", label:"Logros", icon:Award, color:"#10B981" },
            { type:"Learning", label:"Aprendizajes", icon:Lightbulb, color:"#F59E0B" },
            { type:"Opportunity", label:"Oportunidades", icon:Target, color:"#0EA5E9" },
          ].map(col=>{
            const items = byType(col.type);
            return (
              <ChartCard key={col.type} title={col.label} subtitle={`${items.length} insights`} brand={brand}>
                <div className="space-y-2">
                  {items.map(ins=>(
                    <div key={ins.insight_id} className="p-2 rounded-xl border" style={{borderColor:`${col.color}22`, backgroundColor:`${col.color}08`}}>
                      <div className="flex items-center gap-1.5">
                        <col.icon size={12} style={{color:col.color}}/>
                        <span className="text-xs font-bold" style={{color:brand.textColor}}>{ins.title}</span>
                        {ins.priority==="High" && <span className="text-[9px] px-1 rounded-full text-white ml-auto" style={{backgroundColor:col.color}}>High</span>}
                      </div>
                      <div className="text-xs mt-1" style={{color:`${brand.textColor}77`}}>{ins.description}</div>
                      <div className="text-[10px] mt-1" style={{color:`${brand.textColor}55`}}>{ins.scope} {ins.scope_id && `• ${ins.scope_id}`}</div>
                    </div>
                  ))}
                  {items.length===0 && <div className="text-xs text-center py-4" style={{color:`${brand.textColor}55`}}>Sin {col.label.toLowerCase()}</div>}
                </div>
              </ChartCard>
            );
          })}
        </div>

        {(byType("Observation").length>0 || byType("Recommendation").length>0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {byType("Observation").length>0 && (
              <ChartCard title="Observaciones" brand={brand}>
                {byType("Observation").map(ins=>(
                  <div key={ins.insight_id} className="p-2 border-b last:border-0 flex gap-2" style={{borderColor:`${brand.primaryColor}08`}}>
                    <AlertCircle size={14} style={{color:`${brand.textColor}66`}} className="shrink-0 mt-0.5"/>
                    <div><div className="text-xs font-semibold" style={{color:brand.textColor}}>{ins.title}</div><div className="text-xs" style={{color:`${brand.textColor}77`}}>{ins.description}</div></div>
                  </div>
                ))}
              </ChartCard>
            )}
            {byType("Recommendation").length>0 && (
              <ChartCard title="Recomendaciones" brand={brand}>
                {byType("Recommendation").map(ins=>(
                  <div key={ins.insight_id} className="p-2 border-b last:border-0 flex gap-2" style={{borderColor:`${brand.primaryColor}08`}}>
                    <Lightbulb size={14} style={{color:"#F59E0B"}} className="shrink-0 mt-0.5"/>
                    <div><div className="text-xs font-semibold" style={{color:brand.textColor}}>{ins.title}</div><div className="text-xs" style={{color:`${brand.textColor}77`}}>{ins.description}</div></div>
                  </div>
                ))}
              </ChartCard>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: brand.bgColor}}>
      <header className="sticky top-0 z-30 border-b backdrop-blur-md" style={{backgroundColor:`${brand.cardBg}F0`, borderColor:`${brand.primaryColor}15`}}>
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium shrink-0" style={{backgroundColor:`${brand.primaryColor}08`, borderColor:`${brand.primaryColor}30`, color:brand.primaryColor}}><ArrowLeft size={14}/> <span className="hidden sm:inline">Inicio</span><span className="sm:hidden">Cambiar</span></button>
          <div className="hidden sm:flex items-center gap-2">
            <img src={brand.cardBg ? "https://ajustes-rac.vercel.app/rac-logo.png" : ""} alt="RAC" className="h-6 w-auto object-contain hidden lg:block" onError={(e)=> (e.currentTarget.style.display="none")} />
            <span className="hidden lg:inline text-xs" style={{color:`${brand.textColor}30`}}>×</span>
            <img src="/republica-logo.svg" alt="República" className="h-5 w-auto object-contain hidden lg:block" />
          </div>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {(selectedCampaign.campaign_cover || selectedCampaign.campaign_thumbnail) && (
              <img
                src={selectedCampaign.campaign_cover || selectedCampaign.campaign_thumbnail}
                alt={selectedCampaign.campaign_name}
                className="w-10 h-10 rounded-xl object-cover hidden sm:block"
                onError={(e)=> (e.currentTarget.style.display="none")}
              />
            )}
            <div className="min-w-0">
              <div className="font-bold text-sm truncate" style={{color:brand.textColor}}>{selectedCampaign.campaign_name}</div>
              <div className="text-xs flex items-center gap-2" style={{color:`${brand.textColor}66`}}><span>{selectedCampaign.client_name} • {selectedCampaign.brand_name}</span><span className="px-1.5 py-0.5 rounded-full text-white text-[10px]" style={{backgroundColor: selectedCampaign.campaign_status==="Completed" ? "#10B981" : selectedCampaign.campaign_status==="Active" ? "#F59E0B" : "#64748B"}}>{selectedCampaign.campaign_status}</span></div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <select value={campaignId} onChange={e=> setSelectedCampaignId(e.target.value)} className="text-xs px-3 py-2 rounded-xl border font-medium" style={{borderColor:`${brand.primaryColor}22`, backgroundColor:brand.cardBg, color:brand.textColor}}>
              {campaigns.map(c=> <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>)}
            </select>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs">
            <span style={{color:`${brand.textColor}66`}}>{totals.influencerCount} influencers</span>
            <span style={{color:`${brand.textColor}22`}}>•</span>
            <span style={{color:`${brand.textColor}66`}}>{totals.contentCount} contenidos</span>
            <span style={{color:`${brand.textColor}22`}}>•</span>
            <span style={{color:`${brand.textColor}66`}}>{totals.platforms.length} plataformas</span>
          </div>
        </div>
        <div className="max-w-screen-2xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto scrollbar-thin">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=> setActiveTab(t.id)} className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab===t.id ? "text-white shadow-sm" : ""}`} style={{backgroundColor: activeTab===t.id ? brand.primaryColor : `${brand.primaryColor}08`, color: activeTab===t.id ? "#fff" : brand.textColor, border:`1px solid ${activeTab===t.id ? brand.primaryColor : `${brand.primaryColor}15`}`}}>{t.label}</button>
          ))}
          {usingMock && <span className="ml-auto text-[10px] px-2 py-1 rounded-full" style={{backgroundColor:"#FEF3C7", color:"#92400E"}}>Datos demo • Conecta Sheets</span>}
          {error && <span className="text-xs" style={{color:"#EF4444"}}>{error}</span>}
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-4">
        {activeTab==="resumen" && renderResumen()}
        {activeTab==="plataformas" && renderPlataformas()}
        {activeTab==="influencers" && renderInfluencers()}
        {activeTab==="contenidos" && renderContenidos()}
        {activeTab==="sentimiento" && renderSentimiento()}
        {activeTab==="insights" && renderInsights()}
      </main>

      <footer className="border-t py-4 px-4 mt-6" style={{borderColor:`${brand.primaryColor}10`}}>
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-xs" style={{color:`${brand.textColor}55`}}>
          <span className="flex items-center gap-2">{selectedCampaign.brand_name} • Influencer Dashboard <span style={{color:`${brand.textColor}30`}}>×</span> <span className="flex items-center gap-1"><img src="/republica-logo.svg" alt="República" className="h-3 w-auto" /> República</span></span>
          <span>Powered by Agencia República</span>
        </div>
        <div className="max-w-screen-2xl mx-auto flex justify-between text-[10px] mt-1" style={{color:`${brand.textColor}40`}}>
          <span>{selectedCampaign.start_date} → {selectedCampaign.end_date} • {selectedCampaign.objective}</span>
          <span className="hidden sm:inline">RAC × República</span>
        </div>
      </footer>
    </div>
  );
};
