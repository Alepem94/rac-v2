/**
 * Configuración hardcodeada del dashboard.
 * 
 * Para cambiar el Google Sheet al que apunta el dashboard,
 * edita estos valores y haz re-deploy.
 * 
 * NO se necesita configurar nada desde el frontend.
 */

export const SHEET_CONFIG = {
  /**
   * ID del Google Sheet.
   * Lo encuentras en la URL: docs.google.com/spreadsheets/d/{ESTE_ES_EL_ID}/edit
   */
  sheetId: "1O5Ke8iSBeeurPQZLxB3p2xGiT2qSHJWm87KQ_ZW9uVo",

  /**
   * API Key de Google Sheets API.
   * Genera una en: console.cloud.google.com → APIs → Credentials
   */
  apiKey: "AIzaSyCcLcjEOgEQLd-FuiAINd7JqL5zzggkmP0",
};
