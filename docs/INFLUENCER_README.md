# Influencer Dashboard — README

## Resumen
Dashboard profesional de reporting de campañas de influencer marketing, integrado al mismo repo y deploy que el Dashboard Mensual RAC. Permite seleccionar una campaña y explorar en 6 niveles: Resumen, Plataformas, Influencers, Contenidos, Sentimiento, Insights, con drill-down Campaign → Platform → Influencer → Content.

**Stack:** Vite + React 18 + TypeScript + Tailwind (Inter, RAC palette #E30613/#1B365D/#FFD100), Recharts, date-fns, lucide-react. Reusa `MetricCard`, `ChartCard`, `TabBar` del dashboard mensual para familia visual coherente.

## Estructura
- `src/influencer/types.ts` — modelo normalizado (10 tablas)
- `src/influencer/config.ts` — `INFLUENCER_SHEET_CONFIG` (env)
- `src/influencer/hooks/useInfluencerSheets.ts` — fetch con retry+batches+cache, fallback a `MOCK_INFLUENCER_DATA`
- `src/influencer/utils/calculations.ts` — ER, CPV/CPE/CPC, Achievement/Variance
- `src/influencer/data/mocks.ts` — 2 campañas, 5 influencers, 12 contenidos demo
- `src/influencer/InfluencerDashboard.tsx` — layout + 6 tabs + drill-down
- `src/App.tsx` — landing selector `mensual` vs `influencer` (localStorage `rac-dashboard-mode`)

## Google Sheets
Plantilla en `docs/influencer-template/*.csv` (11 pestañas: 00_README a 10_CONFIG). Ver `INFLUENCER_SETUP.md` y `INFLUENCER_DATA_DICTIONARY.md`.

## Cálculo clave
- `interactions = likes+comments+shares+saves` (auto)
- `ER = interactions / views` (null si views 0 → "—")
- `CPV/CPE/CPC` solo a nivel Campaña e Influencer, no Plataforma/Contenido
- `Total Investment = SUM(02B.influencer_cost) + paid_media_investment si paid_media_enabled`
- `Achievement = Actual/Projected`, `Variance = (Actual-Projected)/Projected`
- Si no hay `09_PROJECTIONS`, el módulo se oculta.

## Navegación
Header con selector de campaña (global), tabs, y `onBack` a landing. Resumen sin scroll en 1440x900: Header, KPI row (6), Platform compact, Top Influencers (5), Top Contents (6), Sentiment, Key Findings.

## Ejecutar
```
npm install
npm run dev
# selector -> Dashboard Influencers -> CAMP-001
npm run build
```

## Configurar Sheets
Ver `INFLUENCER_SETUP.md`. Si `VITE_INFLUENCER_SHEET_ID` no está, usa mocks.
