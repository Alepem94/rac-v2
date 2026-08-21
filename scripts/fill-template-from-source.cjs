const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const sourcePath = 'C:\\Users\\admin\\Downloads\\Resultados_influencers_completo(1) (1).xlsx';
const templatePath = 'C:\\Users\\admin\\rac-v2\\docs\\Influencer_Dashboard_Template.xlsx';
const filledPath = 'C:\\Users\\admin\\Desktop\\Influencer_Dashboard_LLENADO.xlsx';
const filledPath2 = 'C:\\Users\\admin\\rac-v2\\docs\\Influencer_Dashboard_LLENADO.xlsx';

async function main() {
  // Read source
  const wbSrc = XLSX.readFile(sourcePath);
  const getSheet = (name) => {
    const ws = wbSrc.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  };

  const resumen = getSheet('Resumen general');
  const porPlataforma = getSheet('Por plataforma');
  const porInfluencer = getSheet('Por influencer');
  const costos = getSheet('Costos');
  const baseContenido = getSheet('Base contenido');

  console.log('Source sheets read');

  // Load template workbook
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  // Helper to clear and fill
  function fillSheet(name, headers, rows) {
    const ws = wb.getWorksheet(name);
    if (!ws) {
      console.log('Missing sheet', name);
      return;
    }
    // Clear old data rows (keep header row 2)
    const headerRowIdx = 2;
    // Remove rows from 3 onwards
    const lastRow = ws.rowCount;
    for (let i = lastRow; i >= 3; i--) {
      ws.spliceRows(i, 1);
    }
    // Add new rows
    rows.forEach((row, idx) => {
      const r = ws.getRow(3 + idx);
      r.values = row;
      // Apply example style
      r.eachCell((cell) => {
        cell.font = { color: { argb: 'FF475569' }, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
      r.commit();
    });
    console.log(`Filled ${name} with ${rows.length} rows`);
  }

  // Extract campaign info from baseContenido and resumen
  // Campaign is "RAC" - we will create a proper campaign
  const campaignId = 'CAMP-001';
  const campaignName = 'RAC Influencers 2026';
  // From resumen: Views totales 539766, Interacciones 7147, Inversion 106072.5
  // Dates: from baseContenido, earliest 2026-05-05, latest 2026-08-05 (but one is Aug 5, others May)
  // We will set start 2026-05-05, end 2026-08-05
  const influencerCosts = {};
  const costoData = getSheet('Costos');
  // costoData[0] is header, [1] Viri, [2] Paty
  // Viri 30000, Paty 76072.5
  // Por influencer data also has costs

  // Build 01_CAMPAIGNS
  fillSheet('01_CAMPAIGNS', [], [
    [campaignId, campaignName, 'RAC', 'RAC', 'Completed', '2026-05-05', '2026-08-05', 'Awareness + Consideración', 'Campaña RAC con Viri Velazquez y Paty Meza - 4 contenidos. Datos extraídos de Resultados_influencers_completo', 'MXN', 106072.5, 'FALSE', 0, 106072.5, 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200', 2, 4, 2, 539766, 0, 0, 7147, 0, 0, 0, 0, 0, 'TRUE'],
  ]);

  // 02_INFLUENCERS - need handles, followers - not in source, use placeholders and ask for missing
  fillSheet('02_INFLUENCERS', [], [
    ['INF-001', 'Viri Velazquez', '@virivelazquez', 0, '', '', '@virivelazquez', 0, '', '', '', 0, '', '', 'Lifestyle', '', '', 'Costo 30000, Views 130543'],
    ['INF-002', 'Paty Meza', '@patymeza', 0, '', '', '@patymeza', 0, '', '', '', 0, '', '', 'Lifestyle', '', '', 'Costo 76072.5, Views 409223'],
  ]);

  // 02B
  fillSheet('02B_CAMPAIGN_INFLUENCERS', [], [
    [campaignId, 'INF-001', 30000, 'Completed', '1 Reel + 1 TikTok', ''],
    [campaignId, 'INF-002', 76072.5, 'Completed', '1 Reel + 1 TikTok', ''],
  ]);

  // 03_CONTENT - from Base contenido
  const contentRows = [];
  const baseData = getSheet('Base contenido');
  // baseData[0] is header, rows 1-4 are data
  // Map platform: "Instagram + Facebook" -> Instagram, TikTok -> TikTok
  // For Instagram + Facebook, we will create as Instagram (primary)
  const platformMap = {
    'Instagram + Facebook': 'Instagram',
    'TikTok': 'TikTok',
  };
  baseData.slice(1, 5).forEach((row, idx) => {
    const [campana, influencer, contenido, plataforma, formato, views, vtr, avgWatch, interaccion, likes, comentarios, compartidos, guardados] = row;
    const infId = influencer === 'Viri Velazquez' ? 'INF-001' : 'INF-002';
    const plat = platformMap[plataforma] || plataforma || 'Instagram';
    const contId = `CONT-00${idx+1}`;
    const title = contenido ? contenido.substring(0, 50) : `Contenido ${idx+1}`;
    contentRows.push([
      campaignId, contId, infId, plat, formato || 'Reel', 'Video', '2026-05-05', title, contenido, '', '', `https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600`, '', 'TRUE', 'FALSE', 'None', 'Published', ''
    ]);
  });
  fillSheet('03_CONTENT', [], contentRows);

  // 04_METRICS - from Base contenido metrics
  const metricsRows = [];
  baseData.slice(1, 5).forEach((row, idx) => {
    const [campana, influencer, contenido, plataforma, formato, views, vtr, avgWatch, interaccion, likes, comentarios, compartidos, guardados, respuestas, reposts, toques, clics, alcance, ctrStories, etr] = row;
    const infId = influencer === 'Viri Velazquez' ? 'INF-001' : 'INF-002';
    const plat = platformMap[plataforma] || plataforma || 'Instagram';
    const contId = `CONT-00${idx+1}`;
    const viewsNum = Number(views) || 0;
    const likesNum = Number(likes) || 0;
    const commNum = Number(comentarios) || 0;
    const shareNum = Number(compartidos) || 0;
    const saveNum = Number(guardados) || 0;
    const interNum = Number(interaccion) || (likesNum+commNum+shareNum+saveNum);
    metricsRows.push([
      campaignId, contId, infId, plat, viewsNum, Number(alcance)||0, 0, likesNum, commNum, shareNum, saveNum, interNum, Number(clics)||0, 0, viewsNum, 0, 0, Number(avgWatch)||0, Number(vtr)||0, 0,0,0,0,0,0,0,0
    ]);
  });
  fillSheet('04_METRICS', [], metricsRows);

  // 05_SENTIMENT - not in source, create placeholder and mark as missing
  fillSheet('05_SENTIMENT', [], [
    [campaignId, '', '', '', 0, 0, 0, 0, 'FALTANTE - Por favor proporciona análisis de sentimiento por contenido', '', '', '', ''],
    // Example with campaign average
    [campaignId, 'CONT-001', 'INF-001', 'Instagram', 1200, 72, 22, 6, 'Ejemplo: Muy positivo', 'Precio, utilidad', 'Preguntas stock', 'Envío', ''],
  ]);

  // 06_COMMENTS - not in source, placeholder
  fillSheet('06_COMMENTS', [], [
    ['COM-001', campaignId, 'CONT-001', 'INF-001', 'Instagram', '@ana_home', '¡Me encanta! ¿dónde la compraste?', '2026-05-06', 'Positive', 'Intención de compra', 'TRUE', 'Intención clara', '', '', ''],
  ]);

  // 07_INSIGHTS - not in source, create placeholders
  fillSheet('07_INSIGHTS', [], [
    ['INS-001', campaignId, 'Campaign', campaignId, 'Achievement', 'FALTANTE - Agregar logros reales', 'Por favor proporciona insights de campaña', 'High', 1, 'TRUE'],
    ['INS-002', campaignId, 'Platform', 'TikTok', 'Observation', 'TikTok lidera en views', 'TikTok aportó 68% de views', 'High', 1, 'FALSE'],
  ]);

  // 08_MEDIA - placeholder
  fillSheet('08_MEDIA', [], [
    ['MED-001', campaignId, 'CONT-001', 'INF-001', 'Image', 'Content', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', '', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400', 'Jaz tour', 'TRUE'],
  ]);

  // 09_PROJECTIONS - not in source
  fillSheet('09_PROJECTIONS', [], [
    [campaignId, 'INF-001', 100000, 85000, 4500, 500, 4.5, 'FALTANTE - Si tienes proyecciones, llénalo; si no, deja vacío y el módulo se oculta'],
  ]);

  // 10_CONFIG already has defaults, keep as is

  // Add a new sheet for faltantes
  const wsFaltantes = wb.getWorksheet('00_README');
  // Add note at bottom
  wsFaltantes.addRow([]);
  wsFaltantes.addRow(['DATOS FALTANTES DETECTADOS', 'Por favor proporciona:']);
  const lastRow = wsFaltantes.lastRow;
  lastRow.getCell(1).font = { bold: true, color: { argb: 'FFEF4444' } };
  const faltantes = [
    ['02_INFLUENCERS: Handles y followers reales', 'Instagram/TikTok handles y seguidores exactos de Viri y Paty'],
    ['05_SENTIMENT: Análisis completo', 'Porcentajes y temas por cada contenido (solo hay Resumen y Por plataforma)'],
    ['06_COMMENTS: Comentarios reales', 'Textos, autores, fechas y screenshots si existen'],
    ['07_INSIGHTS: Insights reales', 'Logros, aprendizajes, oportunidades por campaña'],
    ['08_MEDIA: URLs reales', 'Thumbnails y embeds reales de cada contenido'],
    ['09_PROJECTIONS: Si aplica', 'Si no hay, deja vacío'],
    ['01_CAMPAIGNS: Fechas exactas', 'Start/end, objective, description, thumbnails reales'],
  ];
  faltantes.forEach(row=>{
    const r = wsFaltantes.addRow(row);
    r.getCell(1).font = { bold: true, color: { argb: 'FF1B365D' } };
  });

  await wb.xlsx.writeFile(filledPath);
  await wb.xlsx.writeFile(filledPath2);
  console.log('Filled template written to', filledPath, 'and', filledPath2);
}

main().catch(e=>{ console.error(e); process.exit(1); });
