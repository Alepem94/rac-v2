# Configuración — Influencer Dashboard

## 1. Crear Google Sheets

1. Crea un nuevo Google Sheet llamado `Influencer Dashboard | Data Source`
2. Crea 11 pestañas con nombres exactos:
   `00_README`, `01_CAMPAIGNS`, `02_INFLUENCERS`, `02B_CAMPAIGN_INFLUENCERS`, `03_CONTENT`, `04_METRICS`, `05_SENTIMENT`, `06_COMMENTS`, `07_INSIGHTS`, `08_MEDIA`, `09_PROJECTIONS`, `10_CONFIG`
3. Copia los headers y ejemplos desde `docs/influencer-template/*.csv` (importa via `Archivo -> Importar -> Subir` o copia/pega)
4. Configura validaciones dropdown en `Datos -> Validación de datos` usando `10_CONFIG` como fuente

## 2. Obtener Sheet ID y API Key

- **Sheet ID**: URL `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit` -> copia `{SHEET_ID}`
- **API Key**:
  1. Ve a `https://console.cloud.google.com`
  2. Crea proyecto o usa existente
  3. Habilita `Google Sheets API`
  4. `Credenciales -> Crear credenciales -> Clave de API`
  5. Restringe la key a `Google Sheets API` y a IPs/dominio si quieres
  6. Comparte el Sheet con `Cualquier persona con el enlace -> Lector` (necesario para API Key sin OAuth)

## 3. Configurar en el proyecto

### Opción A: Variables de entorno (recomendado, no expone secretos en git)
Crea `.env` en raíz:
```
VITE_INFLUENCER_SHEET_ID=1AbC...tu_id...
VITE_SHEETS_API_KEY=AIzaSy...tu_key...
```

### Opción B: Hardcode temporal
Edita `src/influencer/config.ts`:
```ts
export const INFLUENCER_SHEET_CONFIG = {
  sheetId: "1AbC...tu_id...",
  apiKey: "AIzaSy...tu_key...",
}
```

Si `sheetId` contiene `Placeholder`, el dashboard usa automáticamente `MOCK_INFLUENCER_DATA` con 2 campañas demo.

## 4. Probar conexión

```
npm install
npm run dev
# abre http://localhost:5173 -> selector -> Dashboard Influencers
# arriba verás "Datos demo" si está en mock, o "Live" si conecta
```

## 5. Cache y performance

- El hook `useInfluencerSheets` hace cache en `localStorage` (`influencer-dashboard-cache`) y usa `fetchWithRetry` + batches de 5 para evitar cuota 429.
- Si cambias datos en Sheets, pulsa `Actualizar` o recarga con `Ctrl+Shift+R`.

## 6. Seguridad

- No subas `.env` a git (ya está en `.gitignore`).
- En producción Vercel, configura `VITE_INFLUENCER_SHEET_ID` y `VITE_SHEETS_API_KEY` en `Vercel Dashboard -> Settings -> Environment Variables`.
