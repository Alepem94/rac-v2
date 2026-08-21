const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Agencia República';
  wb.created = new Date();

  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B365D' } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FF1B365D' } },
      bottom: { style: 'thin', color: { argb: 'FF1B365D' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    },
  };
  const exampleStyle = {
    font: { color: { argb: 'FF475569' }, size: 9 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
    alignment: { vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    },
  };
  const noteStyle = {
    font: { italic: true, color: { argb: 'FF64748B' }, size: 8 },
    alignment: { vertical: 'middle' },
  };

  function addSheet(name, headers, examples, colWidths, validations) {
    const ws = wb.addWorksheet(name);
    ws.properties.defaultRowHeight = 18;
    // Title row
    ws.mergeCells(1, 1, 1, headers.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = name;
    titleCell.font = { bold: true, color: { argb: 'FF1B365D' }, size: 11 };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(1).height = 22;
    // Headers row 2
    const headerRow = ws.getRow(2);
    headerRow.values = headers;
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });
    headerRow.height = 28;
    headerRow.commit();
    // Example rows starting row 3
    examples.forEach((row, idx) => {
      const r = ws.getRow(3 + idx);
      r.values = row;
      r.eachCell((cell) => {
        cell.style = exampleStyle;
      });
      r.height = 18;
      r.commit();
    });
    // Col widths
    headers.forEach((h, i) => {
      ws.getColumn(i + 1).width = colWidths[i] || 18;
    });
    // Validations
    if (validations) {
      validations.forEach((v) => {
        for (let row = 3; row <= 200; row++) {
          ws.getCell(row, v.col).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`"${v.options.join(',')}"`],
            showDropDown: false,
          };
        }
      });
    }
    // Freeze
    ws.views = [{ state: 'frozen', ySplit: 2 }];
    // Auto filter
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: headers.length } };
    return ws;
  }

  // 00_README
  const readme = wb.addWorksheet('00_README');
  readme.getColumn(1).width = 30;
  readme.getColumn(2).width = 100;
  const readmeData = [
    ['Influencer Dashboard | Data Source — README', ''],
    ['Propósito', 'Dashboard de campañas de influencers con jerarquía Campaña → Plataforma → Influencer → Contenido, más Sentimiento, Comentarios, Insights y Proyecciones.'],
    ['Cómo agregar campaña', 'Nueva campaña = nuevas filas en 01, 02B, 03, 04, etc. No crear pestañas nuevas.'],
    ['Flujo', '01_CAMPAIGNS → 02_INFLUENCERS → 02B (costos) → 03_CONTENT → 04_METRICS → 05_SENTIMENT → 06_COMMENTS → 07_INSIGHTS → 08_MEDIA → 09_PROJECTIONS'],
    ['Cálculo clave', 'interactions = likes+comments+shares+saves (auto si vacío). ER = interactions/views. CPV/CPE/CPC solo a nivel Campaña e Influencer.'],
    ['Inversión', 'Si paid_media_enabled=FALSE, Total = SUM(02B.influencer_cost). Si TRUE, Total = SUM + paid_media_investment.'],
    ['IDs', 'campaign_id ej. CAMP-001, influencer_id INF-001, content_id CONT-001 deben ser únicos y consistentes entre pestañas.'],
    ['Fechas', 'Formato YYYY-MM-DD (ej. 2026-06-01)'],
    ['Porcentajes sentimiento', 'Deben sumar 100'],
    ['Vacío', 'Si falta métrica, dejar 0. Si falta texto, dejar vacío → dashboard muestra "—" y no rompe.'],
    ['Validaciones', 'Usa dropdowns de 10_CONFIG. No hardcodees insights en frontend, van en 07_INSIGHTS con is_featured.'],
    ['Demo', 'Ya hay 2 campañas demo (CAMP-001 con paid+projections, CAMP-002 sin). Puedes borrarlas y agregar las tuyas.'],
    ['Conexión', 'Comparte Sheet como "Cualquier persona con el enlace → Lector" y pega el SHEET_ID en .env VITE_INFLUENCER_SHEET_ID.'],
  ];
  readmeData.forEach((row, i) => {
    const r = readme.getRow(i + 1);
    r.getCell(1).value = row[0];
    r.getCell(1).font = { bold: i === 0, color: { argb: i === 0 ? 'FF1B365D' : 'FF334155' } };
    r.getCell(2).value = row[1];
    r.getCell(2).alignment = { wrapText: true };
    r.height = i === 0 ? 24 : 18;
  });
  readme.getRow(1).getCell(1).font = { bold: true, size: 13, color: { argb: 'FF1B365D' } };

  // 01_CAMPAIGNS
  addSheet(
    '01_CAMPAIGNS',
    ['campaign_id','campaign_name','client_name','brand_name','campaign_status','start_date','end_date','objective','description','currency','influencer_investment','paid_media_enabled','paid_media_investment','total_investment','campaign_thumbnail','campaign_cover','total_influencers','total_contents','total_platforms','total_views','total_reach','total_impressions','total_interactions','total_clicks','engagement_rate','cpv','cpe','cpc','has_projections'],
    [
      ['CAMP-001','RAC Verano 2026 - Nuevas Plazas','RAC','RAC','Completed','2026-06-01','2026-07-15','Awareness + Consideración','Lanzamiento de 3 nuevas plazas.','MXN',420000,'TRUE',180000,600000,'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400','https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200',5,12,3,0,0,0,0,0,0,0,0,0,'TRUE'],
      ['CAMP-002','RAC Back to School 2026','RAC','RAC','Active','2026-08-01','2026-09-10','Conversión','Vuelta a clases.','MXN',280000,'FALSE',0,280000,'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400','https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200',3,6,2,0,0,0,0,0,0,0,0,0,'FALSE'],
    ],
    [12,30,12,12,13,12,12,18,40,10,18,16,18,16,45,45,14,14,14,12,12,12,12,12,12,10,10,10,13],
    [{ col: 5, options: ['Planning','Active','Completed','Archived'] }, { col: 12, options: ['TRUE','FALSE'] }, { col: 29, options: ['TRUE','FALSE'] }]
  );

  // 02_INFLUENCERS
  addSheet(
    '02_INFLUENCERS',
    ['influencer_id','influencer_name','instagram_handle','instagram_followers','instagram_profile_url','instagram_photo','tiktok_handle','tiktok_followers','tiktok_profile_url','tiktok_photo','facebook_handle','facebook_followers','facebook_profile_url','facebook_photo','content_style','content_description','audience_description','influencer_notes'],
    [
      ['INF-001','Jaz Pellegrin','@jazpellegrin',420000,'https://instagram.com/jazpellegrin','https://i.pravatar.cc/300?img=5','@jazpellegrin',890000,'https://tiktok.com/@jazpellegrin','https://i.pravatar.cc/300?img=5','','','','','Lifestyle familiar','Madre creativa, home decor','Mujeres 25-40','Top performer'],
      ['INF-002','Alex Torres','@alextorres',180000,'https://instagram.com/alextorres','https://i.pravatar.cc/300?img=8','@alextorres_tk',320000,'https://tiktok.com/@alextorres_tk','https://i.pravatar.cc/300?img=8','@alextorresfb',95000,'https://facebook.com/alextorresfb','https://i.pravatar.cc/300?img=8','Tech & Reviews','Reviews honestos','Hombres 22-35',''],
    ],
    [13,18,18,16,30,30,16,16,30,30,16,16,30,30,18,30,30,20]
  );

  // 02B
  addSheet(
    '02B_CAMPAIGN_INFLUENCERS',
    ['campaign_id','influencer_id','influencer_cost','participation_status','deliverables','notes'],
    [
      ['CAMP-001','INF-001',130000,'Completed','2 Reels + 2 Stories',''],
      ['CAMP-001','INF-002',95000,'Completed','1 TikTok + 1 Reel',''],
      ['CAMP-001','INF-003',110000,'Completed','2 Reels',''],
    ],
    [12,13,16,16,24,20]
  );

  // 03_CONTENT
  addSheet(
    '03_CONTENT',
    ['campaign_id','content_id','influencer_id','platform','format','content_type','publication_date','content_title','content_description','content_url','embed_url','thumbnail_url','video_embed','is_collaboration','is_paid','paid_media_type','content_status','notes'],
    [
      ['CAMP-001','CONT-001','INF-001','Instagram','Reel','Video','2026-06-05','Tour por mi nueva RAC','Jaz muestra su experiencia','https://instagram.com/p/ABC','','https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600','','TRUE','TRUE','Whitelisting','Published',''],
      ['CAMP-001','CONT-002','INF-001','TikTok','TikTok','Video','2026-06-07','Haul RAC','Haul de productos','https://tiktok.com/@jaz/video/123','','https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600','','TRUE','FALSE','None','Published',''],
    ],
    [12,12,13,12,16,13,15,22,30,30,20,45,20,14,10,16,13,14],
    [{ col: 4, options: ['Instagram','TikTok','Facebook','YouTube'] }, { col:5, options: ['Reel','TikTok','Instagram Story','TikTok Story','Facebook Reel','Post','Other'] }, {col:6, options: ['Video','Story','Image','Other']}, {col:14, options:['TRUE','FALSE']}, {col:15, options:['TRUE','FALSE']}, {col:16, options:['None','Whitelisting','Partnership Ad','Boosted Post','Other']}, {col:17, options:['Published','Pending','Draft']}]
  );

  // 04_METRICS
  addSheet(
    '04_METRICS',
    ['campaign_id','content_id','influencer_id','platform','views','reach','impressions','likes','comments','shares','saves','interactions','clicks','link_clicks','video_views','video_views_3s','video_views_6s','average_watch_time','video_completion_rate','story_reach','story_impressions','story_exits','story_replies','story_link_clicks','followers_gained','mentions','profile_visits'],
    [
      ['CAMP-001','CONT-001','INF-001','Instagram',420000,380000,520000,18500,1200,890,2100,22690,3400,1200,420000,310000,250000,12.5,42,0,0,0,0,0,1200,45,3200],
      ['CAMP-001','CONT-002','INF-001','TikTok',720000,650000,780000,28000,2100,3200,850,34150,2100,800,720000,540000,410000,9.2,38,0,0,0,0,0,2100,72,5400],
    ],
    [12,12,13,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12]
  );

  // 05_SENTIMENT
  addSheet(
    '05_SENTIMENT',
    ['campaign_id','content_id','influencer_id','platform','comments_analyzed','positive_percentage','neutral_percentage','negative_percentage','sentiment_summary','positive_themes','neutral_themes','negative_themes','sentiment_notes'],
    [
      ['CAMP-001','CONT-001','INF-001','Instagram',1200,72,22,6,'Muy positivo','Precio, utilidad','Preguntas stock','Envío',''],
      ['CAMP-001','','','',4500,68,24,8,'Promedio campaña','Valor','Disponibilidad','Precio envío',''],
    ],
    [12,12,13,12,16,16,16,16,40,24,24,24,20]
  );

  // 06_COMMENTS
  addSheet(
    '06_COMMENTS',
    ['comment_id','campaign_id','content_id','influencer_id','platform','comment_author','comment_text','comment_date','sentiment','theme','is_highlighted','highlight_reason','screenshot_url','screenshot_embed','comment_url'],
    [
      ['COM-001','CAMP-001','CONT-001','INF-001','Instagram','@ana_home','¡Me encanta! ¿dónde la compraste?','2026-06-06','Positive','Intención de compra','TRUE','Intención clara','','','https://instagram.com/p/ABC'],
      ['COM-002','CAMP-001','CONT-004','INF-002','TikTok','@carlos_review','Se ve resistente, ¿cuánto tiempo de garantía tiene?','2026-06-11','Neutral','Pregunta producto','TRUE','Oportunidad','','',''],
    ],
    [12,12,12,13,12,16,40,12,12,16,13,18,30,20,30],
    [{col:9, options:['Positive','Neutral','Negative']}, {col:11, options:['TRUE','FALSE']}]
  );

  // 07_INSIGHTS
  addSheet(
    '07_INSIGHTS',
    ['insight_id','campaign_id','scope','scope_id','insight_type','title','description','priority','display_order','is_featured'],
    [
      ['INS-001','CAMP-001','Campaign','CAMP-001','Achievement','Superamos proyección en 18%','Proyectado 3.2M vs Actual 3.78M','High',1,'TRUE'],
      ['INS-002','CAMP-001','Campaign','CAMP-001','Learning','Stories generan cercanía','Stories 85K vs Reels 400K','Medium',2,'TRUE'],
      ['INS-003','CAMP-001','Campaign','CAMP-001','Opportunity','Oportunidad Facebook','Sofia en FB alcanzó 78K con costo bajo','High',3,'TRUE'],
    ],
    [12,12,12,14,16,28,45,10,12,11],
    [{col:3, options:['Campaign','Platform','Influencer','Content']}, {col:5, options:['Achievement','Learning','Opportunity','Observation','Recommendation']}, {col:8, options:['High','Medium','Low']}, {col:10, options:['TRUE','FALSE']}]
  );

  // 08_MEDIA
  addSheet(
    '08_MEDIA',
    ['media_id','campaign_id','content_id','influencer_id','media_type','media_role','url','embed_url','thumbnail_url','caption','is_featured'],
    [
      ['MED-001','CAMP-001','CONT-001','INF-001','Image','Content','https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800','','https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400','Jaz tour','TRUE'],
    ],
    [12,12,12,13,12,12,45,30,45,20,11],
    [{col:5, options:['Video','Image','Screenshot']}, {col:6, options:['Content','Profile','Comment','Cover']}, {col:11, options:['TRUE','FALSE']}]
  );

  // 09_PROJECTIONS
  addSheet(
    '09_PROJECTIONS',
    ['campaign_id','influencer_id','projected_views','projected_reach','projected_interactions','projected_clicks','projected_er','projection_notes'],
    [
      ['CAMP-001','INF-001',1000000,850000,45000,5000,4.5,''],
      ['CAMP-001','INF-002',400000,340000,18000,2500,4.5,''],
    ],
    [12,13,16,16,18,16,12,20]
  );

  // 10_CONFIG
  const cfg = wb.addWorksheet('10_CONFIG');
  cfg.getColumn(1).width = 22;
  cfg.getColumn(2).width = 60;
  const cfgData = [
    ['key','value','description'],
    ['platforms','Instagram,TikTok,Facebook,YouTube','Lista plataformas'],
    ['content_types','Video,Story,Image,Other',''],
    ['formats','Reel,TikTok,Instagram Story,TikTok Story,Facebook Reel,Post,Other',''],
    ['sentiments','Positive,Neutral,Negative',''],
    ['insight_types','Achievement,Learning,Opportunity,Observation,Recommendation',''],
    ['priorities','High,Medium,Low',''],
    ['scopes','Campaign,Platform,Influencer,Content',''],
    ['campaign_status','Planning,Active,Completed,Archived',''],
    ['paid_media_type','None,Whitelisting,Partnership Ad,Boosted Post,Other',''],
    ['content_status','Published,Pending,Draft',''],
  ];
  cfgData.forEach((row,i)=>{
    const r=cfg.getRow(i+1);
    r.values=row;
    if(i===0){ r.eachCell(c=> c.style=headerStyle); r.height=22; } else { r.eachCell(c=> c.style=exampleStyle); r.height=16; }
  });
  cfg.views=[{state:'frozen', ySplit:1}];
  cfg.autoFilter={from:{row:1,column:1}, to:{row:1,column:3}};

  // Write file
  const outPath = path.join(__dirname, '..', 'docs', 'Influencer_Dashboard_Template.xlsx');
  const desktopPath = path.join(require('os').homedir(), 'Desktop', 'Influencer_Dashboard_Template.xlsx');
  await wb.xlsx.writeFile(outPath);
  // Also copy to desktop if possible
  try {
    if (fs.existsSync(path.dirname(desktopPath))) {
      await wb.xlsx.writeFile(desktopPath);
      console.log('Template written to', outPath, 'and', desktopPath);
    } else {
      console.log('Template written to', outPath);
    }
  } catch(e){
    console.log('Template written to', outPath, e.message);
  }
  console.log('Done');
}

main().catch(e=>{ console.error(e); process.exit(1); });
