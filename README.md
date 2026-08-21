# RAC · Marketing Dashboard

Dashboard de marketing digital para RAC, alimentado desde Google Sheets. Incluye **dos dashboards** seleccionables desde la landing inicial:

- **Dashboard Mensual** (existente): Facebook, Instagram, TikTok, Google Ads y Analytics con filtrado por fechas, periodos oficiales, agrupación automática de campañas, y gráficas dinámicas por frecuencia (diaria/semanal/mensual/anual) con ventana fija.
- **Dashboard Influencers** (nuevo): reporting por campañas de influencer marketing con jerarquía `Campaña → Plataforma → Influencer → Contenido`, sentimiento, comentarios destacados, insights y proyecciones. Se alimenta desde un Google Sheets maestro normalizado (11 pestañas) y permite agregar infinitas campañas con nuevas filas sin modificar código.

Al abrir la app verás un selector con `Dashboard Mensual` y `Dashboard Influencers` (guardado en `localStorage`).

---

## 🚀 Despliegue rápido (Vercel + GitHub)

### 1. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Initial commit: RAC Dashboard"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/rac-dashboard.git
git push -u origin main
```

### 2. Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com) y pulsa **Add New → Project**
2. Importa el repositorio `rac-dashboard`
3. Vercel detecta automáticamente que es Vite — déjalo con la configuración por defecto:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Pulsa **Deploy**. En ~1 minuto estará listo.

### 3. Conectar Google Sheets

Al abrir el dashboard por primera vez:

1. Pulsa el ícono ⚙️ (Configuración) en el header
2. Ingresa:
   - **Google Sheet ID**: el ID está en la URL del sheet (`docs.google.com/spreadsheets/d/`**`ESTO_ES_EL_ID`**`/edit`)
   - **API Key**: genérala en [Google Cloud Console](https://console.cloud.google.com/apis/credentials) habilitando la **Google Sheets API**
3. El sheet debe estar compartido con **"Cualquier persona con el enlace" (lector)**
4. Las credenciales se guardan automáticamente en el localStorage del navegador

---

## 📊 Estructura del Google Sheets

El sheet debe tener las siguientes hojas (ya vienen pre-creadas en el archivo `RAC_Dashboard_Sheets.xlsx`):

### Hojas de configuración

| Hoja | Función |
|------|---------|
| `Configuración` | Nombre, logo y colores de marca |
| `Periodos_Oficiales` | Cortes oficiales RAC (Feb, Mar, Abr 2026, …) |
| `Reglas_Agrupacion` | 4 grupos de campaña + exclusiones + reglas de plataforma |
| `Metricas_Visibles` | Qué cards mostrar en cada sección |
| `Alcance_Deduplicado` | Alcance real por periodo oficial (captura manual) |
| `Hallazgos` | Insights que aparecen al filtrar un periodo oficial |

### Hojas de datos (alimentadas desde Porter Metrics)

| Hoja | Contenido |
|------|-----------|
| `Facebook_Insights` | Métricas orgánicas diarias de FB |
| `Instagram_Insights` | Métricas orgánicas diarias de IG |
| `TikTok_Insights` | Métricas orgánicas diarias de TikTok |
| `Facebook_Ads` | Campañas pagadas (una fila por campaña por día) |
| `Instagram_Ads` | Campañas pagadas (una fila por campaña por día) |
| `TikTok_Ads` | Campañas pagadas de TikTok |
| `Google_Ads` | Search, Display, Video, DSP |
| `Google_Analytics` | Tráfico web |

### Hojas de Top Posts

| Hoja | Contenido |
|------|-----------|
| `Top_Posts_Facebook` | URLs de posts para embed |
| `Top_Posts_Instagram` | URLs de posts/reels para embed |
| `Top_Posts_TikTok` | URLs de videos para embed |
| `GAds_Top_Video` | URLs de YouTube para embed |
| `GAds_Top_Display` | URLs de banners (imagen directa) |
| `GAds_Top_Keywords` | Top keywords con métricas |

---

## 🗂️ Lógica de agrupación de campañas

**A partir de Feb 2026** las campañas se agrupan automáticamente en 4 grupos:

1. **5% Plazas Nuevas** — campañas con "nuevas tiendas" o "plazas nuevas"
2. **25% Recuperación** — campañas con "recuperación"
3. **Awareness** — campañas con awareness, alcance, interacción, likes, thruplays, views (y *excluyendo* conversion, convertion, lead)
4. **Conversión** — campañas con convertion, conversion, clic a web, leads, SEA, search (y *excluyendo* nuevas tiendas, recuperación)

Las reglas están en la hoja `Reglas_Agrupacion`. Se evalúan **en orden** (la campaña cae en el primer grupo que matchee).

### Exclusiones globales

Las campañas que contengan palabras como `propósitos`, `buen fin`, `santa claus`, `ofertas de miedo`, `XV de RAC`, `extra vacantes` **no se muestran ni se incluyen en cálculos** a partir de Feb 2026. Puedes editar esta lista en `Reglas_Agrupacion`.

### Split Facebook vs Instagram

A diferencia del dashboard anterior, la plataforma se determina **por el nombre de la campaña**, no por la columna de plataforma:

- Campañas con `FB`, `Facebook` o `META` → Facebook
- Campañas con `IG` o `Instagram` → Instagram
- Campañas con `TikTok` → TikTok
- Campañas con `SEA`, `DSP`, `YouTube`, `Video`, `Google` → Google

Puedes editar estas reglas en la sección **REGLAS DE PLATAFORMA** de `Reglas_Agrupacion`.

---

## 📅 Periodos oficiales y alcance deduplicado

Los **periodos oficiales** son los cortes RAC (ej. 28 ene – 28 feb). Al filtrar fechas que coincidan exactamente con un periodo oficial:

- El dashboard muestra los **Hallazgos** de la hoja `Hallazgos` para ese periodo
- El card de **Alcance** muestra el valor **deduplicado** (de la hoja `Alcance_Deduplicado`) en lugar del acumulado por días
- Aparece un badge "Periodo oficial: Febrero 2026" en la parte superior

Si el rango de fechas **no** coincide con un periodo oficial, el card de Alcance mostrará un aviso amarillo: *"Acumulado por días (no único). Usa un periodo oficial para ver el alcance deduplicado."*

---

## ⚙️ Desarrollo local

### Requisitos

- Node.js 18+
- npm

### Comandos

```bash
npm install           # instalar dependencias
npm run dev           # servidor de desarrollo (localhost:5173)
npm run build         # build de producción
npm run preview       # servir el build localmente
```

---

## 🎨 Branding

Colores RAC por defecto (editables en la hoja `Configuración`):

- **Rojo RAC**: `#E30613` (principal)
- **Azul RAC**: `#1B365D` (secundario)
- **Amarillo RAC**: `#FFD100` (acento)
- **Fondo**: `#F8FAFC` (claro)

---

## 🐛 Solución de problemas

### El dashboard muestra 0 en todas las métricas

- Verifica que los nombres de las hojas sean **exactos** (ej. `Facebook_Ads` no `Facebook Ads`)
- Las fechas deben estar en formato **YYYY-MM-DD**
- El sheet debe estar **compartido públicamente** (lector)

### Los embeds de posts no cargan

- **Instagram**: asegúrate de que el post sea público
- **Facebook**: la URL debe ser de un post público
- **TikTok**: la URL debe incluir `/video/{id}`
- **YouTube**: la URL puede ser `youtube.com/watch?v=...` o `youtu.be/...`

### Las campañas no se agrupan correctamente

- Revisa la hoja `Reglas_Agrupacion`. El orden importa.
- Puedes marcar una regla como `no` en la columna `activo` para desactivarla.

### El alcance muestra números enormes

- Es porque se acumulan los valores diarios. Captura el alcance deduplicado en la hoja `Alcance_Deduplicado` y filtra por un periodo oficial para ver el valor correcto.

---

## 🤳 Dashboard Influencers (nuevo)

Ver `docs/INFLUENCER_README.md`, `docs/INFLUENCER_SETUP.md`, `docs/INFLUENCER_GUIDE.md` y `docs/INFLUENCER_DATA_DICTIONARY.md`.

Plantilla Google Sheets: `docs/influencer-template/*.csv` (11 pestañas: 00_README a 10_CONFIG). Importa los CSV a un nuevo Google Sheet y configura `VITE_INFLUENCER_SHEET_ID` en `.env` o en Vercel.

Si no configuras el Sheet, el dashboard usa datos demo (`src/influencer/data/mocks.ts` con 2 campañas).

Navegación: `Resumen` (sin scroll en 1440x900), `Plataformas`, `Influencers` (con detalle y CPV/CPE/CPC), `Contenidos` (galería/tabla), `Sentimiento` (por campaña/influencer/contenido + comentarios destacados), `Insights` (Logros/Aprendizajes/Oportunidades).

## 📄 Licencia

Proyecto interno RAC.
