export interface InfluencerCampaign {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  brand_name: string;
  campaign_status: "Planning" | "Active" | "Completed" | "Archived" | string;
  start_date: string;
  end_date: string;
  objective: string;
  description: string;
  currency: string;
  influencer_investment: number;
  paid_media_enabled: boolean;
  paid_media_investment: number;
  total_investment: number;
  campaign_thumbnail: string;
  campaign_cover: string;
  total_influencers: number;
  total_contents: number;
  total_platforms: number;
  total_views: number;
  total_reach: number;
  total_impressions: number;
  total_interactions: number;
  total_clicks: number;
  engagement_rate: number;
  cpv: number;
  cpe: number;
  cpc: number;
  has_projections: boolean;
}

export interface Influencer {
  influencer_id: string;
  influencer_name: string;
  instagram_handle: string;
  instagram_followers: number;
  instagram_profile_url: string;
  instagram_photo: string;
  tiktok_handle: string;
  tiktok_followers: number;
  tiktok_profile_url: string;
  tiktok_photo: string;
  facebook_handle: string;
  facebook_followers: number;
  facebook_profile_url: string;
  facebook_photo: string;
  youtube_handle?: string;
  youtube_followers?: number;
  youtube_profile_url?: string;
  youtube_photo?: string;
  content_style: string;
  content_description: string;
  audience_description: string;
  influencer_notes: string;
}

export interface CampaignInfluencer {
  campaign_id: string;
  influencer_id: string;
  influencer_cost: number;
  participation_status: string;
  deliverables: string;
  notes: string;
}

export interface Content {
  content_id: string;
  campaign_id: string;
  influencer_id: string;
  platform: "Instagram" | "TikTok" | "Facebook" | "YouTube" | string;
  format: string;
  content_type: "Video" | "Story" | "Image" | "Other" | string;
  publication_date: string;
  content_title: string;
  content_description: string;
  content_url: string;
  embed_url: string;
  thumbnail_url: string;
  video_embed: string;
  is_collaboration: boolean;
  is_paid: boolean;
  paid_media_type: string;
  content_status: string;
  notes: string;
}

export interface Metrics {
  campaign_id: string;
  content_id: string;
  influencer_id: string;
  platform: string;
  views: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  interactions: number;
  clicks: number;
  link_clicks: number;
  video_views: number;
  video_views_3s: number;
  video_views_6s: number;
  average_watch_time: number;
  video_completion_rate: number;
  story_reach: number;
  story_impressions: number;
  story_exits: number;
  story_replies: number;
  story_link_clicks: number;
  followers_gained: number;
  mentions: number;
  profile_visits: number;
}

export interface Sentiment {
  campaign_id: string;
  content_id: string;
  influencer_id: string;
  platform: string;
  comments_analyzed: number;
  positive_percentage: number;
  neutral_percentage: number;
  negative_percentage: number;
  sentiment_summary: string;
  positive_themes: string;
  neutral_themes: string;
  negative_themes: string;
  sentiment_notes: string;
}

export interface Comment {
  comment_id: string;
  campaign_id: string;
  content_id: string;
  influencer_id: string;
  platform: string;
  comment_author: string;
  comment_text: string;
  comment_date: string;
  sentiment: "Positive" | "Neutral" | "Negative" | string;
  theme: string;
  is_highlighted: boolean;
  highlight_reason: string;
  screenshot_url: string;
  screenshot_embed: string;
  comment_url: string;
}

export interface Insight {
  insight_id: string;
  campaign_id: string;
  scope: "Campaign" | "Platform" | "Influencer" | "Content" | string;
  scope_id: string;
  insight_type: "Achievement" | "Learning" | "Opportunity" | "Observation" | "Recommendation" | string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low" | string;
  display_order: number;
  is_featured: boolean;
}

export interface Media {
  media_id: string;
  campaign_id: string;
  content_id: string;
  influencer_id: string;
  media_type: "Video" | "Image" | "Screenshot" | string;
  media_role: "Content" | "Profile" | "Comment" | "Cover" | string;
  url: string;
  embed_url: string;
  thumbnail_url: string;
  caption: string;
  is_featured: boolean;
}

export interface Projection {
  campaign_id: string;
  influencer_id: string;
  projected_views: number;
  projected_reach: number;
  projected_interactions: number;
  projected_clicks: number;
  projected_er: number;
  projection_notes: string;
}

export interface InfluencerDashboardData {
  campaigns: InfluencerCampaign[];
  influencers: Influencer[];
  campaignInfluencers: CampaignInfluencer[];
  contents: Content[];
  metrics: Metrics[];
  sentiments: Sentiment[];
  comments: Comment[];
  insights: Insight[];
  media: Media[];
  projections: Projection[];
}

export type Platform = "Instagram" | "TikTok" | "Facebook" | "YouTube";

export interface AggregatedCampaign {
  campaign: InfluencerCampaign;
  influencers: Influencer[];
  contents: Content[];
  metrics: Metrics[];
  totalViews: number;
  totalReach: number;
  totalImpressions: number;
  totalInteractions: number;
  totalClicks: number;
  engagementRate: number;
  influencerInvestment: number;
  paidMediaInvestment: number;
  totalInvestment: number;
  cpv: number | null;
  cpe: number | null;
  cpc: number | null;
  platformBreakdown: PlatformBreakdown[];
  influencerBreakdown: InfluencerBreakdown[];
}

export interface PlatformBreakdown {
  platform: string;
  views: number;
  reach: number;
  impressions: number;
  interactions: number;
  clicks: number;
  er: number;
  influencerCount: number;
  contentCount: number;
  pctViews: number;
  pctInteractions: number;
}

export interface InfluencerBreakdown {
  influencer: Influencer;
  campaignCost: number;
  views: number;
  reach: number;
  impressions: number;
  interactions: number;
  clicks: number;
  er: number;
  cpv: number | null;
  cpe: number | null;
  cpc: number | null;
  contentCount: number;
  platforms: string[];
  platformBreakdown: PlatformBreakdown[];
}

export interface ContentWithMetrics {
  content: Content;
  influencer: Influencer | undefined;
  metrics: Metrics | undefined;
  er: number;
}
