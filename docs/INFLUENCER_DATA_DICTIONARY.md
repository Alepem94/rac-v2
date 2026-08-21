# Data Dictionary — Influencer Dashboard

## 01_CAMPAIGNS (1 fila = 1 campaña)
| Campo | Tipo | Obligatorio | Descripción | Ejemplo |
|---|---|---|---|---|
| campaign_id | string | Sí | ID único, ej. CAMP-001 | CAMP-001 |
| campaign_name | string | Sí | Nombre visible | RAC Verano 2026 |
| client_name | string | Sí | Cliente | RAC |
| brand_name | string | Sí | Marca | RAC |
| campaign_status | enum | Sí | Planning/Active/Completed/Archived | Completed |
| start_date | date YYYY-MM-DD | Sí | Inicio | 2026-06-01 |
| end_date | date YYYY-MM-DD | Sí | Fin | 2026-07-15 |
| objective | string | No | Objetivo | Awareness |
| description | string | No | Descripción larga | Lanzamiento... |
| currency | string | Sí | MXN/USD | MXN |
| influencer_investment | number | No* | Calculado: SUM(02B.influencer_cost) si paid_media_enabled=false, sino manual o calculado | 420000 |
| paid_media_enabled | boolean | Sí | TRUE/FALSE | TRUE |
| paid_media_investment | number | No | Inversión paid | 180000 |
| total_investment | number | No* | Calculado: influencer + paid si enabled | 600000 |
| campaign_thumbnail | url | No | Miniatura | https://... |
| campaign_cover | url | No | Cover 1200px | https://... |
| ..._derived | number | No | Dashboard calcula: influencers, contents, platforms, views, etc. | auto |

*El dashboard recalcula totales desde tablas base; los campos derivados pueden dejarse en 0 y el dashboard los computa.

## 02_INFLUENCERS (1 fila = 1 influencer)
| influencer_id | string | Sí | INF-001 |
| influencer_name | string | Sí | Jaz Pellegrin |
| instagram_handle | string | No | @jaz |
| instagram_followers | number | No | 420000 |
| instagram_profile_url | url | No | https://... |
| instagram_photo | url | No | https://... |
| tiktok_* | ... | No | Similar |
| facebook_* | ... | No | Similar |
| content_style | string | No | Lifestyle |
| content_description | string | No | Descripción |
| audience_description | string | No | Mujeres 25-40 |
| influencer_notes | string | No | Notas |

## 02B_CAMPAIGN_INFLUENCERS
| campaign_id | string | Sí | FK a 01 |
| influencer_id | string | Sí | FK a 02 |
| influencer_cost | number | Sí | Costo en esa campaña | 130000 |
| participation_status | string | No | Completed/Active |
| deliverables | string | No | 2 Reels + 2 Stories |
| notes | string | No | |

## 03_CONTENT
| content_id | string | Sí | CONT-001 |
| campaign_id | FK | Sí | CAMP-001 |
| influencer_id | FK | Sí | INF-001 |
| platform | enum | Sí | Instagram/TikTok/Facebook/YouTube |
| format | enum | Sí | Reel/TikTok/Instagram Story/Post |
| content_type | enum | Sí | Video/Story/Image/Other |
| publication_date | date | Sí | 2026-06-05 |
| content_title | string | No | Tour... |
| content_url | url | No | https://... |
| thumbnail_url | url | No | https://... |
| video_embed | html | No | <iframe> |
| is_collaboration | boolean | No | TRUE |
| is_paid | boolean | No | TRUE |
| paid_media_type | enum | No | Whitelisting/None |
| content_status | enum | No | Published |

## 04_METRICS (1 fila = 1 contenido)
Campos: campaign_id, content_id, influencer_id, platform, views, reach, impressions, likes, comments, shares, saves, interactions (auto = likes+comments+shares+saves), clicks, link_clicks, video_views, video_views_3s/6s, average_watch_time, video_completion_rate, story_reach/impressions/exits/replies/link_clicks, followers_gained, mentions, profile_visits. Todos numéricos, 0 si no aplica.

## 05_SENTIMENT
| campaign_id | FK | Sí |
| content_id | FK | No | vacío = agregado campaña |
| influencer_id | FK | No | vacío = agregado campaña |
| platform | string | No | vacío = agregado |
| comments_analyzed | number | No | 1200 |
| positive/neutral/negative_percentage | number 0-100 | No | 72/22/6 suma 100 |
| sentiment_summary | string | No | Texto |
| positive/neutral/negative_themes | string | No | Temas |

## 06_COMMENTS
| comment_id | string | Sí |
| campaign_id, content_id, influencer_id, platform | FK | Sí/No |
| comment_author | string | No |
| comment_text | string | Sí |
| comment_date | date | No |
| sentiment | enum | No | Positive/Neutral/Negative |
| theme | string | No |
| is_highlighted | boolean | No |
| highlight_reason | string | No |
| screenshot_url/embed | url/html | No |

## 07_INSIGHTS
| insight_id | string | Sí |
| campaign_id | FK | Sí |
| scope | enum | Sí | Campaign/Platform/Influencer/Content |
| scope_id | string | Sí | ID del scope (ej. INF-001 o TikTok) |
| insight_type | enum | Sí | Achievement/Learning/Opportunity/Observation/Recommendation |
| title | string | Sí |
| description | string | Sí |
| priority | enum | No | High/Medium/Low |
| display_order | number | No | 1,2,3 |
| is_featured | boolean | No | TRUE para Resumen |

## 08_MEDIA
| media_id | string | Sí |
| campaign_id, content_id, influencer_id | FK | No |
| media_type | enum | No | Video/Image/Screenshot |
| media_role | enum | No | Content/Profile/Comment/Cover |
| url, embed_url, thumbnail_url | url | No |
| caption | string | No |
| is_featured | boolean | No |

## 09_PROJECTIONS (opcional)
| campaign_id | FK | Sí |
| influencer_id | FK | Sí |
| projected_views/reach/interactions/clicks | number | No |
| projected_er | number | No |
| projection_notes | string | No |

Si no hay filas, el módulo Forecast se oculta.

## 10_CONFIG
Catálogos para validaciones dropdown.

## Relaciones
- 01 (1) -> 02B (N) -> 02 (1)
- 01 (1) -> 03 (N) -> 04 (1), 05 (1), 06 (N), 07 (N - scope), 08 (N)
