# Despliegue — Influencer Dashboard

## Local
```
git clone https://github.com/Alepem94/rac-v2.git
cd rac-v2
npm install
# configura .env con VITE_INFLUENCER_SHEET_ID y VITE_SHEETS_API_KEY
npm run dev     # http://localhost:5173
npm run build   # genera dist/
npm run preview # preview prod
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_INFLUENCER_SHEET_ID` | ID del Google Sheet | `1AbC...` |
| `VITE_SHEETS_API_KEY` | API Key Google Sheets | `AIzaSy...` |
| `VITE_SHEET_ID` (existente) | Para dashboard mensual | `1O5Ke...` |

Si no configuras `VITE_INFLUENCER_SHEET_ID`, el dashboard usa `MOCK_INFLUENCER_DATA` automáticamente (útil para demo).

## Vercel

1. Conecta el repo `Alepem94/rac-v2` en `vercel.com/new`
2. Framework: `Vite`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Añade Environment Variables en `Settings -> Environment Variables`:
   - `VITE_INFLUENCER_SHEET_ID`
   - `VITE_SHEETS_API_KEY`
6. Deploy -> cada `git push origin main` redeploya automáticamente.

`vercel.json` ya está configurado:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

## Build check
```
npx tsc --noEmit
npx vite build
```
Debe dar `✓ built` sin errores.

## Cache
El dashboard guarda último fetch en `localStorage` para fallback offline. Para forzar refresh, `Ctrl+Shift+R` o botón `Actualizar` en header.
