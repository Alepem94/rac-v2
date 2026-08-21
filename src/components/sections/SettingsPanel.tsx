import React, { useState } from "react";
import { X, Key, Link2, Save, Unlink, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { BrandConfig, SheetConfig } from "../../types";

interface SettingsPanelProps {
  brand: BrandConfig;
  sheetConfig: SheetConfig | null;
  connected: boolean;
  loading: boolean;
  error: string | null;
  onConnect: (config: SheetConfig) => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  brand,
  sheetConfig,
  connected,
  loading,
  error,
  onConnect,
  onDisconnect,
  onClose,
}) => {
  const [sheetId, setSheetId] = useState(sheetConfig?.sheetId || "");
  const [apiKey, setApiKey] = useState(sheetConfig?.apiKey || "");

  const handleSave = () => {
    if (!sheetId.trim() || !apiKey.trim()) return;
    onConnect({ sheetId: sheetId.trim(), apiKey: apiKey.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto scrollbar-thin"
        style={{ backgroundColor: brand.cardBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-5 border-b sticky top-0 z-10"
          style={{
            borderColor: `${brand.primaryColor}15`,
            backgroundColor: brand.cardBg,
          }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: brand.textColor }}>
              Configuración
            </h2>
            <p className="text-xs" style={{ color: `${brand.textColor}77` }}>
              Conecta tu Google Sheets para cargar los datos reales
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:opacity-70"
            style={{ backgroundColor: `${brand.primaryColor}10` }}
          >
            <X size={16} style={{ color: brand.textColor }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status */}
          <div
            className="rounded-xl p-3 flex items-center gap-2 text-sm"
            style={{
              backgroundColor: connected ? "#DCFCE7" : "#FEF3C7",
              color: connected ? "#166534" : "#92400E",
            }}
          >
            {connected ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {connected
              ? "Conectado a Google Sheets"
              : "No conectado. Ingresa tus credenciales para conectar."}
          </div>

          {error && (
            <div
              className="rounded-xl p-3 flex items-start gap-2 text-xs"
              style={{
                backgroundColor: "#FEE2E2",
                color: "#991B1B",
              }}
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Error al conectar</div>
                <div className="mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* Sheet ID */}
          <div>
            <label
              className="flex items-center gap-2 text-xs font-semibold mb-1.5"
              style={{ color: brand.textColor }}
            >
              <Link2 size={12} />
              Google Sheet ID
            </label>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="1g-uu7-TJ7FsjE69H4zoavBQBbFJa5LaoyC-9TMfSVHg"
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-offset-1"
              style={{
                borderColor: `${brand.primaryColor}33`,
                color: brand.textColor,
              }}
            />
            <p className="text-[10px] mt-1" style={{ color: `${brand.textColor}66` }}>
              El ID está en la URL: docs.google.com/spreadsheets/d/<b>ID</b>/edit
            </p>
          </div>

          {/* API Key */}
          <div>
            <label
              className="flex items-center gap-2 text-xs font-semibold mb-1.5"
              style={{ color: brand.textColor }}
            >
              <Key size={12} />
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy…"
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{
                borderColor: `${brand.primaryColor}33`,
                color: brand.textColor,
              }}
            />
            <p className="text-[10px] mt-1" style={{ color: `${brand.textColor}66` }}>
              Genera una API Key en{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="underline"
                style={{ color: brand.primaryColor }}
              >
                Google Cloud Console
              </a>{" "}
              habilitando Google Sheets API.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={loading || !sheetId.trim() || !apiKey.trim()}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                backgroundColor: brand.primaryColor,
                color: "#FFFFFF",
              }}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {connected ? "Actualizar conexión" : "Conectar"}
            </button>
            {connected && (
              <button
                onClick={onDisconnect}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: `${brand.primaryColor}10`,
                  color: brand.primaryColor,
                }}
              >
                <Unlink size={14} />
                Desconectar
              </button>
            )}
          </div>

          <div
            className="text-xs rounded-xl p-3 mt-4"
            style={{
              backgroundColor: `${brand.secondaryColor}08`,
              color: `${brand.textColor}88`,
            }}
          >
            <div className="font-semibold mb-1" style={{ color: brand.textColor }}>
              💡 Tips
            </div>
            <ul className="space-y-1 list-disc list-inside">
              <li>El sheet debe estar compartido con "Cualquier persona con el enlace" (lector).</li>
              <li>Las credenciales se guardan localmente en tu navegador.</li>
              <li>Refresca con el botón 🔄 del header para recargar datos.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
