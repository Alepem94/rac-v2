# Guía de Uso — Influencer Dashboard (para no técnicos)

## ¿Cómo agrego una nueva campaña? (Solo filas, sin tocar código)

**1. Crea `campaign_id`**: Ej. `CAMP-003` (único, sin espacios)

**2. Agrega campaña en `01_CAMPAIGNS`**: 1 fila con `campaign_id`, `campaign_name`, `client_name`, `brand_name`, `campaign_status`, `start_date`, `end_date`, `objective`, `description`, `currency`, `paid_media_enabled` (TRUE/FALSE), `paid_media_investment`, `campaign_thumbnail` (URL de imagen), `has_projections` (TRUE si vas a llenar `09_PROJECTIONS`)

**3. Agrega influencers en `02_INFLUENCERS`** (si son nuevos): 1 fila por influencer con `influencer_id` (INF-006), `influencer_name`, `instagram_handle`, `instagram_followers`, `instagram_photo` (URL), etc. Puedes dejar plataformas vacías.

**4. Agrega participación y costos en `02B_CAMPAIGN_INFLUENCERS`**: 1 fila por influencer en esa campaña. **Aquí va el costo**: `CAMP-003 | INF-001 | 150000`. Este costo se usa para CPV/CPE/CPC.

**5. Agrega contenidos en `03_CONTENT`**: 1 fila por pieza. `content_id` único (CONT-015), `campaign_id`, `influencer_id`, `platform` (Instagram/TikTok/Facebook/YouTube), `format` (Reel/TikTok/etc), `content_type` (Video/Story/Image), `publication_date`, `content_title`, `content_url` (link público), `thumbnail_url` (imagen 600px), `is_collaboration` (TRUE), `content_status` (Published)

**6. Agrega métricas en `04_METRICS`**: 1 fila por `content_id`. Llena `views`, `reach`, `impressions`, `likes`, `comments`, `shares`, `saves` -> `interactions` se calcula solo como suma, pero si lo dejas vacío el dashboard lo suma. También `clicks`, `video_views`, etc. Si un campo no aplica (ej. `story_reach` para Video) deja 0.

**7. Agrega sentimiento en `05_SENTIMENT`**: 1 fila por contenido (o 1 fila por campaña con `content_id` vacío para el promedio). Llena `comments_analyzed`, `positive/neutral/negative_percentage` (suma 100), `sentiment_summary`, `positive_themes`.

**8. Agrega comentarios en `06_COMMENTS`**: 1 fila por comentario destacado. Marca `is_highlighted` TRUE para que aparezca. Si tienes `screenshot_url`, se muestra la imagen; si no, tarjeta de texto.

**9. Agrega media en `08_MEDIA`**: Opcional para covers/galería.

**10. Agrega insights en `07_INSIGHTS`**: 1 fila por hallazgo. `scope` = Campaign/Platform/Influencer/Content, `scope_id` = ID correspondiente (ej. `CAMP-003` o `INF-001` o `TikTok`), `insight_type` = Achievement/Learning/Opportunity, `priority` High/Medium/Low, `is_featured` TRUE para que aparezca en Resumen.

**11. Agrega proyecciones en `09_PROJECTIONS`** (opcional): 1 fila por influencer con `projected_views`, etc. Si no hay filas, el módulo Forecast no se muestra.

**12. Abre dashboard**: `https://tu-dominio.vercel.app` -> selector -> `Dashboard Influencers` -> elige `CAMP-003` en el dropdown del header. Todo se recalcula automáticamente.

## Tips
- No crees nuevas pestañas por campaña. Siempre nuevas filas.
- Usa fechas `YYYY-MM-DD`.
- Porcentajes de sentimiento deben sumar 100.
- Usa URLs públicas para thumbnails (imgur, drive público, unsplash).
- Si algo aparece como "—" significa que faltan datos base (ej. views 0).
