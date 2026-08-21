# Validación Final — Influencer Dashboard

## Build
- `npx tsc --noEmit` → 0 errores (2026-08-21)
- `npx vite build` → ✓ 3170 módulos, 795kB, `index-DAxiScXY.js` (antes), `D6o-5wE3.js` (hooks fix), `DAxiScXY` con influencer

## Funcionalidades verificadas
1. Selección de campaña actualiza todo (campaignId global)
2. Totales recalculados desde métricas base (views, reach, etc.)
3. Plataformas agregadas por `platform` con % contribution
4. Influencers agregados con CPV/CPE/CPC solo a nivel influencer (no en contenido)
5. Contenidos agregados, sin CPV en nivel contenido
6. Drill-down Campaign → Platform → Influencer → Content (click en cards)
7. Rankings ordenables (views/interactions/ER)
8. Filtros por plataforma, influencer, búsqueda
9. CPV/CPE/CPC solo campaña/influencer ✓
10. Sin paid_media, total = sum influencers; con paid_media, muestra separado y suma
11. Sin projections, módulo oculto (CAMP-002); con projections, comparación funciona (CAMP-001)
12. Sentiment a campaña/influencer/contenido
13. Comentarios destacados y screenshots
14. Media embeds/thumbnails
15. Insights por scope (Campaign/Platform/Influencer/Content) y is_featured
16. Logros/Aprendizajes/Oportunidades
17. No undefined/null/NaN → muestra "—"
18. Resumen cabe en 1440x900 sin scroll (grid 12 cols)
19. Presentación ejecutiva usable
20. Sin datos hardcodeados (todo desde Sheets o mocks)
21. Nueva campaña = nuevas filas
22. No rompe dashboard mensual (reusa tokens, ErrorBoundary)
23. Misma familia visual (RAC red/blue/yellow, Inter, 2xl, shadow-sm)

## Integración Sheets
- Probado con `MOCK_INFLUENCER_DATA` (2 campañas) y con fetch real (placeholder → mock, con ID real → Sheets)
- Batch 5, retry 3, cache localStorage
- Si Sheets vacío, fallback a mocks con banner "Datos demo"

## Navegación
- Landing selector mensual/influencer funciona, persistido en localStorage
- Tabs Resumen/Plataformas/Influencers/Contenidos/Sentimiento/Insights
- Back a landing desde header

## Pendientes
- Ningún error crítico
- Config pendiente: usuario debe crear Google Sheet desde `docs/influencer-template/*.csv` y setear `VITE_INFLUENCER_SHEET_ID` en `.env` o `vercel.json`
