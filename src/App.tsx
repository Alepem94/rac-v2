import { useState, useMemo } from "react";
import {
  BarChart2,
  LineChart,
  Calendar,
  RefreshCw,
  Menu,
  X,
  Wifi,
  WifiOff,
  Sparkles,
} from "lucide-react";
import { TabBar } from "./components/ui/TabBar";
import { PeriodSelector } from "./components/ui/PeriodSelector";
import { FacebookSection } from "./components/sections/FacebookSection";
import { InstagramSection } from "./components/sections/InstagramSection";
import { TikTokSection } from "./components/sections/TikTokSection";
import { GoogleAdsSection } from "./components/sections/GoogleAdsSection";
import { GoogleAnalyticsSection } from "./components/sections/GoogleAnalyticsSection";
import { useGoogleSheets } from "./hooks/useGoogleSheets";
import { detectOfficialPeriod } from "./utils/grouping";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

const TikTokIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.79a8.27 8.27 0 004.84 1.54V6.88a4.85 4.85 0 01-1.07-.19z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const MAIN_TABS = [
  { id: "facebook", label: "Facebook", icon: <FacebookIcon /> },
  { id: "instagram", label: "Instagram", icon: <InstagramIcon /> },
  { id: "tiktok", label: "TikTok", icon: <TikTokIcon /> },
  { id: "google-ads", label: "Google Ads", icon: <GoogleIcon /> },
  { id: "analytics", label: "Analytics", icon: <LineChart size={15} /> },
];

const getDefaultDateRange = () => {
  const today = new Date();
  const end = today.toISOString().split("T")[0];
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];
  return { start, end };
};

export default function App() {
  const {
    data,
    loading,
    error,
    connected,
    fetchSheetData,
  } = useGoogleSheets();

  const [activeTab, setActiveTab] = useState("facebook");
  const [fbSubTab, setFbSubTab] = useState("overview");
  const [igSubTab, setIgSubTab] = useState("overview");
  const [ttSubTab, setTtSubTab] = useState("overview");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  const brand = data.brand;

  const officialPeriod = useMemo(
    () => detectOfficialPeriod(dateRange, data.periods),
    [dateRange, data.periods],
  );

  const renderContent = () => {
    const commonProps = { data, brand, dateRange, officialPeriod };
    switch (activeTab) {
      case "facebook":
        return (
          <FacebookSection
            {...commonProps}
            subTab={fbSubTab}
            onSubTabChange={setFbSubTab}
          />
        );
      case "instagram":
        return (
          <InstagramSection
            {...commonProps}
            subTab={igSubTab}
            onSubTabChange={setIgSubTab}
          />
        );
      case "tiktok":
        return (
          <TikTokSection
            {...commonProps}
            subTab={ttSubTab}
            onSubTabChange={setTtSubTab}
          />
        );
      case "google-ads":
        return <GoogleAdsSection {...commonProps} />;
      case "analytics":
        return <GoogleAnalyticsSection {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: brand.bgColor }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 shadow-sm border-b backdrop-blur-md"
        style={{
          backgroundColor: `${brand.cardBg}F0`,
          borderColor: `${brand.primaryColor}22`,
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 min-w-0">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.accountName}
                  className="h-10 w-auto object-contain"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
                  }}
                >
                  {brand.accountName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <div
                  className="font-bold text-base truncate"
                  style={{ color: brand.textColor }}
                >
                  {brand.accountName}
                </div>
                <div
                  className="text-xs flex items-center gap-1"
                  style={{ color: `${brand.textColor}66` }}
                >
                  <BarChart2 size={11} />
                  Marketing Dashboard
                </div>
              </div>
            </div>

            {/* Desktop Nav Tabs */}
            <div className="hidden lg:flex flex-1 justify-center">
              <TabBar
                tabs={MAIN_TABS}
                activeTab={activeTab}
                onChange={setActiveTab}
                brand={brand}
              />
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <div
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                style={{
                  borderColor: `${brand.primaryColor}33`,
                  backgroundColor: `${brand.primaryColor}08`,
                }}
              >
                <Calendar size={13} style={{ color: brand.primaryColor }} />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((r) => ({ ...r, start: e.target.value }))
                  }
                  className="text-xs bg-transparent outline-none border-none"
                  style={{ color: brand.textColor }}
                />
                <span className="text-xs" style={{ color: `${brand.textColor}66` }}>
                  →
                </span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((r) => ({ ...r, end: e.target.value }))
                  }
                  className="text-xs bg-transparent outline-none border-none"
                  style={{ color: brand.textColor }}
                />
              </div>

              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                style={{
                  backgroundColor: connected ? "#10B98115" : "#F59E0B15",
                }}
              >
                {connected ? (
                  <Wifi size={13} style={{ color: "#10B981" }} />
                ) : (
                  <WifiOff size={13} style={{ color: "#F59E0B" }} />
                )}
                <span
                  className="text-xs font-semibold"
                  style={{ color: connected ? "#10B981" : "#F59E0B" }}
                >
                  {connected ? "Live" : "Cargando…"}
                </span>
              </div>

              <button
                onClick={() => fetchSheetData()}
                className="p-2 rounded-xl transition-all hover:opacity-70"
                style={{
                  backgroundColor: `${brand.primaryColor}15`,
                  color: brand.primaryColor,
                }}
                title="Actualizar datos"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>

              <button
                className="lg:hidden p-2 rounded-xl"
                style={{
                  backgroundColor: `${brand.primaryColor}15`,
                  color: brand.primaryColor,
                }}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? <X size={15} /> : <Menu size={15} />}
              </button>
            </div>
          </div>

          {/* Mobile Date Range */}
          <div
            className="md:hidden mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl border"
            style={{
              borderColor: `${brand.primaryColor}33`,
              backgroundColor: `${brand.primaryColor}08`,
            }}
          >
            <Calendar size={13} style={{ color: brand.primaryColor }} />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((r) => ({ ...r, start: e.target.value }))
              }
              className="text-xs bg-transparent outline-none flex-1"
              style={{ color: brand.textColor }}
            />
            <span className="text-xs" style={{ color: `${brand.textColor}66` }}>
              →
            </span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((r) => ({ ...r, end: e.target.value }))
              }
              className="text-xs bg-transparent outline-none flex-1"
              style={{ color: brand.textColor }}
            />
          </div>

          {showMobileMenu && (
            <div className="lg:hidden mt-3">
              <TabBar
                tabs={MAIN_TABS}
                activeTab={activeTab}
                onChange={(t) => {
                  setActiveTab(t);
                  setShowMobileMenu(false);
                }}
                brand={brand}
                size="sm"
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-5 space-y-5">
        {/* Selector de periodos oficiales */}
        {data.periods.length > 0 && (
          <div
            className="rounded-2xl p-3 border flex items-center gap-3 flex-wrap"
            style={{
              backgroundColor: `${brand.accentColor}15`,
              borderColor: `${brand.accentColor}55`,
            }}
          >
            <PeriodSelector
              periods={data.periods}
              currentRange={dateRange}
              onSelect={setDateRange}
              brand={brand}
            />
            {officialPeriod && (
              <div
                className="flex items-center gap-1 text-xs font-semibold ml-auto px-2.5 py-1 rounded-lg"
                style={{
                  backgroundColor: brand.primaryColor,
                  color: "#FFFFFF",
                }}
              >
                <Sparkles size={11} />
                Periodo oficial: {officialPeriod.name}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div
            className="rounded-2xl p-6 flex items-center justify-center gap-3 border"
            style={{ backgroundColor: brand.cardBg, borderColor: `${brand.primaryColor}15` }}
          >
            <RefreshCw size={18} className="animate-spin" style={{ color: brand.primaryColor }} />
            <span className="text-sm" style={{ color: brand.textColor }}>
              Cargando datos desde Google Sheets… (puede tardar 5-10s por 26 hojas)
            </span>
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl p-4 border text-sm flex items-start justify-between gap-3"
            style={{
              backgroundColor: error.includes("parciales") || error.includes("caché") ? "#FFFBEB" : "#FEE2E2",
              borderColor: error.includes("parciales") || error.includes("caché") ? "#FDE68A" : "#FECACA",
              color: error.includes("parciales") || error.includes("caché") ? "#92400E" : "#991B1B",
            }}
          >
            <span className="flex-1">Error al cargar datos: {error}</span>
            <button
              onClick={() => fetchSheetData()}
              className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: brand.primaryColor, color: "#fff" }}
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && !data.facebookInsights.length && !data.facebookAds.length && !data.googleAds.length && (
          <div
            className="rounded-2xl p-6 border text-center"
            style={{ backgroundColor: brand.cardBg, borderColor: `${brand.primaryColor}15`, color: `${brand.textColor}77` }}
          >
            <div className="text-sm font-medium" style={{ color: brand.textColor }}>No hay datos para el rango {dateRange.start} → {dateRange.end}</div>
            <div className="text-xs mt-1">Prueba ampliar el rango de fechas o selecciona un periodo oficial arriba.</div>
          </div>
        )}

        <ErrorBoundary section="Dashboard">
          {renderContent()}
        </ErrorBoundary>
      </main>

      <footer
        className="mt-12 border-t py-5 px-4"
        style={{ borderColor: `${brand.primaryColor}15` }}
      >
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="text-xs" style={{ color: `${brand.textColor}66` }}>
            {brand.accountName} · Marketing Dashboard
          </div>
          <div className="text-xs" style={{ color: `${brand.textColor}55` }}>
            Powered by Google Sheets · React · Recharts
          </div>
        </div>
      </footer>
    </div>
  );
}
