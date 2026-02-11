"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { mockFlowOrders, mockDarkPoolTrades } from "@/lib/mock-data";
import { useFlowData, useDarkPoolData } from "@/lib/hooks";

const FILTER_CHIPS = [
  "All",
  "Sweeps",
  "Blocks",
  "Calls",
  "Puts",
  "Bullish",
  "Bearish",
  ">$100K",
];

/* ── Sidebar nav items ── */
const NAV_ITEMS = [
  {
    id: "flow" as const,
    label: "Options Flow",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5L12 7.5l3 1.5L18 7.5l-3-1.5" />
      </svg>
    ),
  },
  {
    id: "heatmap" as const,
    label: "Heatmap",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: "darkpool" as const,
    label: "Dark Pool",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    id: "tools" as const,
    label: "Tools",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1 5.1a2.121 2.121 0 11-3-3l5.1-5.1m0 0L3.34 6.99a2.121 2.121 0 113-3l5.08 5.08m0 3.1l6.18-6.18a2.121 2.121 0 113 3L14.52 12.1m0 0l5.08 5.08a2.121 2.121 0 11-3 3l-5.1-5.1" />
      </svg>
    ),
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"flow" | "heatmap" | "darkpool" | "tools">("flow");
  const [dpSubTab, setDpSubTab] = useState<"darkpool" | "chain">("darkpool");
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState("All");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  const flowTickerQuery = activeTab === "flow" ? search.trim().toUpperCase() : "";

  const applyTheme = (nextTheme: "dark" | "light") => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", nextTheme === "light");
      document.body.classList.toggle("light", nextTheme === "light");
    }
  };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefersLight = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: light)").matches
      : false;
    const nextTheme = saved === "light" || (!saved && prefersLight) ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", next);
    }
  };

  // Live data hooks
  const {
    orders: liveOrders,
    loading: flowLoading,
    error: flowError,
    lastUpdate: flowLastUpdate,
  } = useFlowData(flowTickerQuery);
  const {
    trades: liveTrades,
    loading: dpLoading,
    error: dpError,
    lastUpdate: dpLastUpdate,
  } = useDarkPoolData();

  // Use live data when available, fallback to mock
  const flowSource = liveOrders.length > 0 ? liveOrders : mockFlowOrders;
  const dpSource = liveTrades.length > 0 ? liveTrades : mockDarkPoolTrades;
  const isLive = liveOrders.length > 0 || liveTrades.length > 0;

  /* ---------- Order Flow filtering ---------- */
  const filteredFlows = useMemo(() => {
    let rows = flowSource;
    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter((r) => r.ticker.toLowerCase().includes(term));
    }
    if (activeChip === "Sweeps")
      rows = rows.filter((r) => r.consolidation === "SWEEP");
    if (activeChip === "Blocks")
      rows = rows.filter((r) => r.consolidation === "BLOCK");
    if (activeChip === "Calls")
      rows = rows.filter((r) => r.contractType === "call");
    if (activeChip === "Puts")
      rows = rows.filter((r) => r.contractType === "put");
    if (activeChip === "Bullish")
      rows = rows.filter((r) => r.direction === "BULLISH");
    if (activeChip === "Bearish")
      rows = rows.filter((r) => r.direction === "BEARISH");
    if (activeChip === ">$100K") {
      rows = rows.filter((r) => {
        const num = parseFloat(r.premium.replace(/[$K,M]/g, ""));
        const multiplier = r.premium.includes("M") ? 1_000_000 : 1_000;
        return num * multiplier > 100_000;
      });
    }
    return rows;
  }, [search, activeChip, flowSource]);

  /* ---------- Dark Pool filtering ---------- */
  const filteredDarkPool = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return dpSource;
    return dpSource.filter((r) =>
      r.ticker.toLowerCase().includes(term)
    );
  }, [search, dpSource]);

  /* ---------- Stats ---------- */
  const totalCalls = flowSource.filter(
    (r) => r.contractType === "call"
  ).length;
  const totalPuts = flowSource.filter(
    (r) => r.contractType === "put"
  ).length;
  const putCallRatio =
    totalCalls > 0 ? (totalPuts / totalCalls).toFixed(2) : "0";
  const bullPct = flowSource.length > 0 ? Math.round(
    (flowSource.filter((r) => r.direction === "BULLISH").length /
      flowSource.length) *
      100
  ) : 50;

  const parseCompact = (value: string) => {
    const v = value.replace(/[$,]/g, "");
    const num = parseFloat(v.replace(/[KM]/g, ""));
    const mult = v.includes("M") ? 1_000_000 : v.includes("K") ? 1_000 : 1;
    return isNaN(num) ? 0 : num * mult;
  };

  const getSigScore = (row: (typeof mockFlowOrders)[number]) => {
    const premium = parseCompact(row.premium);
    const oi = parseCompact(row.oi);
    const vol = parseCompact(row.volume);
    const dte = parseInt(row.dte, 10) || 0;

    const premiumScore = Math.log10(1 + premium) / 6;
    const oiScore = Math.log10(1 + oi) / 6;
    const volScore = Math.log10(1 + vol) / 5;
    const dteScore = 1 - Math.min(dte / 90, 1);

    const dirBoost = row.direction === "BULLISH" ? 0.08 : row.direction === "BEARISH" ? 0.06 : 0.02;
    const sideBoost = row.side === "ASK" ? 0.06 : row.side === "BID" ? 0.04 : 0.02;
    const consBoost = row.consolidation === "SWEEP" ? 0.08 : row.consolidation === "BLOCK" ? 0.05 : 0.02;

    const base =
      premiumScore * 0.3 +
      oiScore * 0.2 +
      volScore * 0.2 +
      dteScore * 0.2 +
      dirBoost +
      sideBoost +
      consBoost;

    return Math.min(1, Math.max(0, base));
  };

  const unusualAlerts = useMemo(() => {
    const scored = flowSource.map((row) => ({ row, score: getSigScore(row) }));
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [flowSource]);

  const toggleWatch = (key: string) => {
    setWatchlist((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const floatingControls = (
    <div className="fixed right-[396px] top-6 z-40 flex items-center gap-2">
      <AlertsToggleButton isOpen={alertsOpen} onToggle={() => setAlertsOpen((v) => !v)} />
      <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
    </div>
  );

  return (
    <div className="relative flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {mounted ? createPortal(floatingControls, document.body) : null}
      {alertsOpen && (
        <UnusualAlertsBanner
          items={unusualAlerts}
          onClose={() => setAlertsOpen(false)}
          watchlist={watchlist}
          onToggleWatch={toggleWatch}
        />
      )}
      {/* Subtle gradient glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(94,225,181,0.08),transparent)]" />

      {/* ── Sidebar ── */}
      <aside className="sticky top-0 z-30 flex h-screen w-[60px] flex-col items-center border-r border-[var(--border)] bg-[var(--panel)] py-5 gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                isActive
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
              }`}
            >
              {item.icon}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
              )}
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-[var(--panel-2)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)] opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </button>
          );
        })}
      </aside>

      {/* ── Main content ── */}
      <div className={`relative flex-1 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 ${activeTab === "heatmap" ? "py-2" : "py-6"}`}>
        {/* ── Header ── */}
        {activeTab !== "heatmap" && (
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--panel)] text-sm font-bold text-[var(--accent)] ring-1 ring-[var(--border)]">
              OF
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
                Options Flow
              </p>
              <p className="text-base font-semibold leading-tight">
                Flow Terminal
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a Ticker"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-2.5 pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
            />
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z"
              />
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)] sm:inline-block">
              Feb 10, 2026
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs">
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-[var(--accent)]' : 'bg-[var(--warning)]'} animate-pulse`} />
              <span className="text-[var(--muted)]">{isLive ? 'Live' : flowLoading ? 'Loading...' : 'Mock'}</span>
            </span>
            {(flowLastUpdate || dpLastUpdate) && (
              <span className="hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[10px] text-[var(--muted)] sm:inline-block">
                Updated {activeTab === 'flow' ? flowLastUpdate : dpLastUpdate}
              </span>
            )}
          </div>
        </header>
        )}

        {/* ── Stats Bar + Sentiment Bar ── */}
        {activeTab !== "heatmap" && (
        <>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(() => {
            const total = totalCalls + totalPuts || 1;
            const putPct = Math.round((totalPuts / total) * 100);
            const callPct = Math.round((totalCalls / total) * 100);
            const pcRatioNum = parseFloat(putCallRatio);
            const pcGauge = Math.min(100, Math.max(0, (pcRatioNum / 3) * 100));

            return [
              { label: "Put/Call Ratio", value: putCallRatio, sub: "Bullish", gauge: pcGauge, color: "var(--accent-2)" },
              {
                label: "Puts",
                value: totalPuts.toLocaleString(),
                sub: "$1.79B",
                gauge: putPct,
                color: "var(--danger)",
              },
              {
                label: "Calls",
                value: totalCalls.toLocaleString(),
                sub: "$8.99B",
                gauge: callPct,
                color: "var(--accent)",
              },
              { label: "Bullish %", value: `${bullPct}%`, sub: "Sentiment", gauge: bullPct, color: "var(--accent)" },
            ];
          })().map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4"
            >
              <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{stat.sub}</p>
                </div>
                <div className="flex h-full items-center justify-center">
                  <Gauge value={stat.gauge} color={stat.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Sentiment Bar ── */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3">
          <span className="text-xs text-[var(--muted)]">Sentiment</span>
          <div className="relative flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${bullPct}%` }}
            />
            <div
              className="absolute right-0 top-0 h-full rounded-full bg-[var(--danger)]"
              style={{ width: `${100 - bullPct}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              Bullish
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
              Bearish
            </span>
          </div>
        </div>
        </>
        )}

        {/* ── Filters ── */}
        {activeTab !== "heatmap" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {/* Page title + dark pool sub-tabs */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {activeTab === "flow" ? "Order Flow" : activeTab === "heatmap" ? "Heatmap" : activeTab === "tools" ? "Tools" : dpSubTab === "darkpool" ? "Dark Pool" : "Option Chain"}
            </h2>
            {activeTab === "darkpool" && (
              <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
                <button
                  onClick={() => setDpSubTab("darkpool")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                    dpSubTab === "darkpool"
                      ? "bg-[var(--accent)] text-[#0c0f12] shadow-lg shadow-[var(--accent)]/20"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Dark Pool
                </button>
                <button
                  onClick={() => setDpSubTab("chain")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                    dpSubTab === "chain"
                      ? "bg-[var(--accent-2)] text-[#0c0f12] shadow-lg shadow-[var(--accent-2)]/20"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Option Chain
                </button>
              </div>
            )}
          </div>

          {/* Filter chips – only show on flow tab */}
          {activeTab === "flow" && (
            <div className="flex flex-wrap gap-2">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveChip(chip)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    activeChip === chip
                      ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {/* ── Error banner ── */}
        {(flowError || dpError) && (
          <div className="mt-4 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-2 text-xs text-[var(--warning)]">
            API issue — showing {isLive ? "partial" : "mock"} data.{" "}
            {flowError && `Flow: ${flowError}. `}
            {dpError && `Dark Pool: ${dpError}. `}
          </div>
        )}

        {/* ── Content ── */}
        <div className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] ${activeTab === "heatmap" ? "mt-0" : "mt-4"}`}>
          {(activeTab === "flow" && flowLoading) ||
          (activeTab === "darkpool" && dpLoading) ? (
            <div className="flex items-center justify-center py-20 text-[var(--muted)]">
              <svg
                className="mr-3 h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Fetching live data...
            </div>
          ) : activeTab === "flow" ? (
            <FlowTable rows={filteredFlows} />
          ) : activeTab === "heatmap" ? (
            <GexHeatmapView />
          ) : activeTab === "tools" ? (
            <HeatmapView flows={flowSource} />
          ) : dpSubTab === "chain" ? (
            <OptionChainView />
          ) : (
            <DarkPoolTable rows={filteredDarkPool} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   GEX HEATMAP VIEW  (Gamma / Vex Heatmap)
   ================================================================ */
type GexGrid = Record<string, Record<string, number>>;
type CellDetail = {
  callOI: number;
  putOI: number;
  callGamma: number;
  putGamma: number;
  callDelta: number;
  putDelta: number;
  callIV: number;
  putIV: number;
  callVolume: number;
  putVolume: number;
};
type GexStats = {
  netGEX: string;
  netGEXRaw: number;
  flipPrice: number;
  topPosWall: { strike: number; gex: string };
  topNegWall: { strike: number; gex: string };
  atmStrike: number;
  totalOI: string;
  callPutOIRatio: number;
  netOI: string;
  totalCallOI: string;
  totalPutOI: string;
};
type GexData = {
  metric?: "gex" | "vex" | "charm";
  ticker: string;
  spotPrice: number;
  expiryDates: string[];
  strikes: number[];
  grid: GexGrid;
  cellDetails?: Record<string, Record<string, CellDetail>>;
  stats: GexStats;
  timestamp: string;
};

function GexHeatmapView() {
  const [ticker, setTicker] = useState("SPY");
  const [tickerInput, setTickerInput] = useState("SPY");
  const [data, setData] = useState<GexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiryCount, setExpiryCount] = useState(5);
  const [fullColor, setFullColor] = useState(false);
  const [metric, setMetric] = useState<"gex" | "vex" | "charm">("gex");
  const [grokOpen, setGrokOpen] = useState(false);
  const [grokMessages, setGrokMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [grokInput, setGrokInput] = useState("");
  const [grokLoading, setGrokLoading] = useState(false);
  const [grokError, setGrokError] = useState<string | null>(null);
  const [popupCell, setPopupCell] = useState<{ strike: number; expiry: string; x: number; y: number } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const atmRowRef = useRef<HTMLTableRowElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // ── Replay state ──
  const [snapshots, setSnapshots] = useState<{ time: Date; data: GexData }[]>([]);
  const [replayActive, setReplayActive] = useState(false);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [snapshotsLoaded, setSnapshotsLoaded] = useState(false);
  const snapshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Save snapshot to server
  const saveSnapshot = useCallback(async (t: string, gexData: GexData) => {
    try {
      await fetch("/api/gex/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t, metric, snapshot: gexData }),
      });
    } catch {
      // silently fail – not critical
    }
  }, [metric]);

  // Load persisted snapshots from server
  const loadSnapshots = useCallback(async (t: string, date?: string) => {
    try {
      const url = date
        ? `/api/gex/snapshots?ticker=${t}&metric=${metric}&date=${date}`
        : `/api/gex/snapshots?ticker=${t}&metric=${metric}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.snapshots && json.snapshots.length > 0) {
        const loaded = json.snapshots.map((s: { time: string; data: GexData }) => ({
          time: new Date(s.time),
          data: s.data,
        }));
        setSnapshots(loaded);
        setSnapshotsLoaded(true);
        return loaded.length;
      }
    } catch {
      // silently fail
    }
    setSnapshotsLoaded(true);
    return 0;
  }, []);

  const fetchGex = useCallback(async (t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gex?ticker=${t}&metric=${metric}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const gexData = json as GexData;
      setData(gexData);
      // Save to server
      saveSnapshot(t, gexData);
      // Also cache in memory
      setSnapshots((prev) => {
        const now = new Date();
        if (prev.length > 0 && now.getTime() - prev[prev.length - 1].time.getTime() < 30000) {
          return prev;
        }
        return [...prev, { time: now, data: gexData }];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [metric, saveSnapshot]);

  useEffect(() => { fetchGex(ticker); }, [ticker, metric, fetchGex]);

  // Load persisted snapshots on mount and ticker change
  useEffect(() => {
    loadSnapshots(ticker);
  }, [ticker, metric, loadSnapshots]);

  useEffect(() => {
    setSnapshots([]);
    setReplayActive(false);
    setReplayPlaying(false);
    setReplayIndex(0);
    setSnapshotsLoaded(false);
  }, [ticker, metric]);

  // Auto-fetch snapshots every 5 min during market hours, 60s otherwise
  useEffect(() => {
    const getInterval = () => {
      const now = new Date();
      const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const h = et.getHours();
      const m = et.getMinutes();
      const mins = h * 60 + m;
      const isMarketHours = mins >= 570 && mins <= 960; // 9:30 AM - 4:00 PM ET
      return isMarketHours ? 300000 : 60000; // 5 min during market, 1 min off
    };

    const interval = getInterval();
    snapshotIntervalRef.current = setInterval(() => {
      if (!replayActive) fetchGex(ticker);
    }, interval);
    return () => {
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
    };
  }, [ticker, fetchGex, replayActive]);

  // Replay playback timer
  useEffect(() => {
    if (replayPlaying && snapshots.length > 1) {
      playIntervalRef.current = setInterval(() => {
        setReplayIndex((prev) => {
          if (prev >= snapshots.length - 1) {
            setReplayPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [replayPlaying, snapshots.length]);

  // Toggle replay mode
  const toggleReplay = async () => {
    if (replayActive) {
      setReplayActive(false);
      setReplayPlaying(false);
      // Restore to latest live data
      if (snapshots.length > 0) setData(snapshots[snapshots.length - 1].data);
    } else {
      // Load persisted snapshots if not already loaded
      let snaps = snapshots;
      if (snapshots.length < 2) {
        const count = await loadSnapshots(ticker);
        if (count && count >= 2) {
          // snapshots state will update, but we need to wait a tick
          return; // will re-render, user clicks again
        }
      }
      if (snaps.length < 2) return;
      setReplayActive(true);
      setReplayIndex(0);
      setData(snaps[0].data);
    }
  };

  // When replay index changes, update displayed data
  useEffect(() => {
    if (replayActive && snapshots[replayIndex]) {
      setData(snapshots[replayIndex].data);
    }
  }, [replayIndex, replayActive, snapshots]);

  const fmtReplayTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  // Auto-scroll to ATM strike when data loads
  useEffect(() => {
    if (data && atmRowRef.current && tableContainerRef.current) {
      const container = tableContainerRef.current;
      const row = atmRowRef.current;
      // Scroll so ATM row is roughly centered vertically
      const rowTop = row.offsetTop;
      const containerHeight = container.clientHeight;
      const scrollTarget = rowTop - containerHeight / 2 + row.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, scrollTarget), behavior: "smooth" });
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tickerInput.trim().toUpperCase();
    if (t && t !== ticker) setTicker(t);
  };

  const sendGrok = async () => {
    const text = grokInput.trim();
    if (!text || grokLoading) return;
    setGrokLoading(true);
    setGrokError(null);

    const nextMessages = [...grokMessages, { role: "user", content: text }];
    setGrokMessages(nextMessages);
    setGrokInput("");

    try {
      const res = await fetch("/api/grok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-12) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.text) {
        throw new Error(data?.error ?? "No response from Grok");
      }
      setGrokMessages((prev) => [...prev, { role: "assistant", content: String(data.text) }]);
    } catch (err) {
      setGrokError(err instanceof Error ? err.message : "Failed to reach Grok");
    } finally {
      setGrokLoading(false);
    }
  };

  /* ── Cell click popup ── */
  const handleCellClick = (strike: number, expiry: string, e: React.MouseEvent<HTMLTableCellElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupCell({ strike, expiry, x: rect.left + rect.width / 2, y: rect.top });
  };

  // Close popup on outside click
  useEffect(() => {
    if (!popupCell) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".gex-popup")) setPopupCell(null);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [popupCell]);

  /* ── Colour helpers ── */
  const getCellColor = (val: number, absMax: number) => {
    if (absMax === 0 || val === 0) return "rgba(255,255,255,0.03)";
    const raw = Math.abs(val) / absMax;
    // In normal mode, skip small values. In full-color mode, color everything.
    if (!fullColor && raw < 0.10) return "rgba(255,255,255,0.03)";
    // Log scale for the remaining range
    const norm = Math.min(Math.log1p(raw * 20) / Math.log1p(20), 1);
    if (val > 0) {
      // Positive gamma: dark teal → vivid bright cyan (#00FFFF)
      const r = 0;
      const g = Math.round(80 + norm * 175);   // 80 → 255
      const b = Math.round(90 + norm * 165);   // 90 → 255
      const alpha = 0.25 + norm * 0.70;        // 0.25 → 0.95
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    } else {
      // Negative gamma: dark purple → bright magenta
      const r = Math.round(80 + norm * 175);   // 80 → 255
      const g = Math.round(10 + norm * 15);    // 10 → 25
      const b = Math.round(100 + norm * 155);  // 100 → 255
      const alpha = 0.25 + norm * 0.70;        // 0.25 → 0.95
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    }
  };

  const getCellGlow = (val: number, absMax: number) => {
    if (absMax === 0 || val === 0) return "none";
    const raw = Math.abs(val) / absMax;
    const norm = Math.min(Math.log1p(raw * 20) / Math.log1p(20), 1);
    if (norm < 0.5) return "none";
    const glowStrength = Math.round((norm - 0.5) / 0.5 * 20) + 4;
    if (val > 0) {
      return `inset 0 0 ${glowStrength}px rgba(0, 255, 255, ${(norm * 0.55).toFixed(2)})`;
    } else {
      return `inset 0 0 ${glowStrength}px rgba(220, 40, 255, ${(norm * 0.55).toFixed(2)})`;
    }
  };

  const getTextColor = (val: number, absMax: number) => {
    if (absMax === 0) return "var(--muted)";
    const norm = Math.min(Math.abs(val) / absMax, 1);
    if (norm > 0.5) return "#fff";
    return "var(--foreground)";
  };

  /* ── Format number compactly ── */
  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K` === "-0K" ? "0" : `${(n / 1e3).toFixed(0)}K`;
    return n.toLocaleString();
  };

  const fmtExpiry = (d: string) => {
    const dt = new Date(d + "T12:00:00");
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--muted)]">
        <svg className="mr-3 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Loading {metric.toUpperCase()} heatmap…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-6 py-12 text-center text-[var(--danger)]">
        Failed to load {metric.toUpperCase()} data{error ? `: ${error}` : ""}
      </div>
    );
  }

  const { strikes, expiryDates: allExpiryDates, grid, stats, spotPrice } = data;
  const metricLabel = metric === "gex" ? "GEX" : metric === "vex" ? "VEX" : "Charm";
  const maxExpiries = allExpiryDates.length;
  const visibleCount = Math.min(expiryCount, maxExpiries);
  const expiryDates = allExpiryDates.slice(0, visibleCount);

  const allValues = strikes.flatMap((s) => expiryDates.map((e) => grid[String(s)]?.[e] ?? 0));
  const absMax = Math.max(...allValues.map(Math.abs), 1);

  return (
    <div className="p-5">
      {/* ── Ticker search bar ── */}
      <div className="mb-5 flex flex-wrap items-center gap-4 relative">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            placeholder="Ticker"
            className="w-24 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
          />
          <button
            type="submit"
            className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-[#0c0f12] hover:brightness-110 transition-all"
          >
            Load
          </button>
        </form>
        <span className="text-sm font-semibold">{data.ticker}</span>
        <span className="text-sm text-[var(--muted)]">${spotPrice.toFixed(2)}</span>

        {/* ── Replay toggle ── */}
        <button
          onClick={toggleReplay}
          disabled={snapshots.length < 2 && !replayActive}
          title={snapshots.length < 2 ? `Collecting snapshots… (${snapshots.length}/2)` : replayActive ? "Back to live" : "Replay intraday"}
          className={`ml-2 relative flex items-center justify-center rounded-lg border h-8 w-8 transition-all ${
            replayActive
              ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-400"
              : snapshots.length < 2
                ? "border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] opacity-50 cursor-not-allowed"
                : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--foreground)] hover:bg-[var(--panel)] hover:border-cyan-500/30"
          }`}
        >
          {replayActive ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
            </span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          )}
          {!replayActive && snapshots.length >= 2 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[8px] font-bold text-[#0c0f12]">{snapshots.length}</span>
          )}
        </button>

        {/* ── Full color toggle ── */}
        <button
          onClick={() => setFullColor((v) => !v)}
          title={fullColor ? "Show threshold colors" : "Show all cells colored"}
          className={`flex items-center justify-center rounded-lg border h-8 w-8 transition-all ${
            fullColor
              ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-400"
              : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--foreground)] hover:bg-[var(--panel)] hover:border-cyan-500/30"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={fullColor ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <rect x="7" y="7" width="4" height="4" rx="0.5" />
            <rect x="13" y="7" width="4" height="4" rx="0.5" />
            <rect x="7" y="13" width="4" height="4" rx="0.5" />
            <rect x="13" y="13" width="4" height="4" rx="0.5" />
          </svg>
        </button>

        {/* ── GEX Profile toggle ── */}
        <button
          onClick={() => setShowProfile((v) => !v)}
          title={showProfile ? "Hide GEX profile" : "Show GEX profile chart"}
          className={`flex items-center justify-center rounded-lg border h-8 w-8 transition-all ${
            showProfile
              ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-400"
              : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--foreground)] hover:bg-[var(--panel)] hover:border-cyan-500/30"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </button>

        {/* ── Metric buttons ── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1">
          <button
            onClick={() => setMetric("gex")}
            title="GEX (Gamma)"
            className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-all ${
              metric === "gex"
                ? "bg-cyan-500/20 text-cyan-300"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            GEX
          </button>
          <button
            onClick={() => setMetric("vex")}
            title="VEX (Vega)"
            className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-all ${
              metric === "vex"
                ? "bg-cyan-500/20 text-cyan-300"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            VEX
          </button>
          <button
            onClick={() => setMetric("charm")}
            title="Charm (Black-Scholes, r=5%)"
            className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-all ${
              metric === "charm"
                ? "bg-cyan-500/20 text-cyan-300"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Charm
          </button>
        </div>

        <span className="ml-auto text-[10px] text-[var(--muted)]">
          {replayActive && snapshots[replayIndex]
            ? fmtReplayTime(snapshots[replayIndex].time)
            : new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* ── Replay timeline ── */}
      {replayActive && snapshots.length > 1 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5">
          <button
            onClick={() => {
              if (replayPlaying) {
                setReplayPlaying(false);
              } else {
                if (replayIndex >= snapshots.length - 1) setReplayIndex(0);
                setReplayPlaying(true);
              }
            }}
            className="flex items-center justify-center h-7 w-7 rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all"
          >
            {replayPlaying ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" rx="0.5" /><rect x="6" y="1" width="3" height="8" rx="0.5" /></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="2,1 9,5 2,9" /></svg>
            )}
          </button>
          <span className="text-[10px] text-[var(--muted)] whitespace-nowrap w-16">
            {fmtReplayTime(snapshots[0].time)}
          </span>
          <input
            type="range"
            min={0}
            max={snapshots.length - 1}
            value={replayIndex}
            onChange={(e) => { setReplayPlaying(false); setReplayIndex(Number(e.target.value)); }}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(6, 182, 212) 0%, rgb(6, 182, 212) ${(replayIndex / Math.max(snapshots.length - 1, 1)) * 100}%, rgba(148, 163, 184, 0.25) ${(replayIndex / Math.max(snapshots.length - 1, 1)) * 100}%, rgba(148, 163, 184, 0.25) 100%)`,
            }}
          />
          <span className="text-[10px] text-[var(--muted)] whitespace-nowrap w-16 text-right">
            {fmtReplayTime(snapshots[snapshots.length - 1].time)}
          </span>
          <span className="text-[11px] font-semibold text-cyan-400 ml-1">
            {replayIndex + 1}/{snapshots.length}
          </span>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="mb-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: `Net ${metricLabel}`, value: stats.netGEX, color: (stats.netGEXRaw >= 0 ? "text-cyan-400" : "text-purple-400") },
            { label: "Flip Price", value: `$${stats.flipPrice}`, color: "text-[var(--warning)]" },
            { label: "Top + Wall", value: `$${stats.topPosWall.strike} (${stats.topPosWall.gex})`, color: "text-cyan-400" },
            { label: "Top − Wall", value: `$${stats.topNegWall.strike} (${stats.topNegWall.gex})`, color: "text-purple-400" },
            { label: "Call OI", value: stats.totalCallOI, color: "text-cyan-400" },
            { label: "Put OI", value: stats.totalPutOI, color: "text-purple-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">{s.label}</p>
              <p className={`mt-0.5 text-sm font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend + Expiration slider ── */}
      <div className="mb-4 flex items-center gap-6 text-[11px] text-[var(--muted)]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-8 rounded" style={{ background: "rgba(0, 255, 255, 0.9)", boxShadow: "inset 0 0 10px rgba(0, 255, 255, 0.5)" }} />
          Strong +{metricLabel}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-8 rounded" style={{ background: "rgba(0, 200, 220, 0.3)" }} />
          +{metricLabel}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-8 rounded" style={{ background: "rgba(200, 50, 220, 0.3)" }} />
          −{metricLabel}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-8 rounded" style={{ background: "rgba(220, 60, 255, 0.9)", boxShadow: "inset 0 0 10px rgba(220, 60, 255, 0.5)" }} />
          Strong −{metricLabel}
        </div>
        <span className="mx-1 h-4 w-px bg-[var(--border)]" />
        <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Exps</span>
        <span className="text-[11px] font-semibold text-cyan-400 w-5 text-right">{visibleCount}</span>
        <input
          type="range"
          min={1}
          max={maxExpiries}
          value={visibleCount}
          onChange={(e) => setExpiryCount(Number(e.target.value))}
          className="w-48 h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgb(6, 182, 212) 0%, rgb(6, 182, 212) ${((visibleCount - 1) / Math.max(maxExpiries - 1, 1)) * 100}%, rgba(148, 163, 184, 0.25) ${((visibleCount - 1) / Math.max(maxExpiries - 1, 1)) * 100}%, rgba(148, 163, 184, 0.25) 100%)`,
          }}
        />
        <span className="text-[10px] text-[var(--muted)]">{maxExpiries} max</span>
      </div>

      {/* ── Heatmap grid + Profile column ── */}
      {(() => {
        // Compute per-strike net GEX for profile chart
        const strikeNetGex: Record<number, number> = {};
        let profileMax = 1;
        for (const s of strikes) {
          let net = 0;
          for (const exp of expiryDates) {
            net += grid[String(s)]?.[exp] ?? 0;
          }
          strikeNetGex[s] = net;
          profileMax = Math.max(profileMax, Math.abs(net));
        }
        const PROFILE_BAR_W = 200; // max bar width in px

        return (
          <div
            ref={tableContainerRef}
            className="overflow-x-auto overflow-y-auto rounded-xl border border-[var(--border)]"
            style={{ maxHeight: "75vh" }}
          >
            <table className="w-full text-[11px]" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead className="sticky top-0 z-20">
                <tr className="bg-[var(--panel-2)]" style={{ boxShadow: "0 1px 0 var(--border)" }}>
                  <th className="sticky left-0 z-30 bg-[var(--panel-2)] px-3 py-2 text-center text-[10px] uppercase tracking-[0.15em] font-semibold text-cyan-400 border-r border-[var(--border)]">
                    Strike
                  </th>
                  {expiryDates.map((exp) => (
                    <th key={exp} className="bg-[var(--panel-2)] px-3 py-2 text-center text-[10px] uppercase tracking-[0.1em] font-semibold text-cyan-300 whitespace-nowrap border-l border-[var(--border)]/30">
                      {fmtExpiry(exp)}
                    </th>
                  ))}
                  {showProfile && (
                    <th className="bg-[var(--panel-2)] px-3 py-2 text-center text-[10px] uppercase tracking-[0.15em] font-semibold text-cyan-400 border-l border-[var(--border)]" style={{ minWidth: PROFILE_BAR_W * 2 + 20 }}>
                      <span className="text-purple-400">− {metricLabel}</span>
                      <span className="mx-3 text-[var(--muted)]">│</span>
                      <span className="text-cyan-400">+ {metricLabel}</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {strikes.map((strike) => {
                  const isATM = strike === stats.atmStrike;
                  const netGex = strikeNetGex[strike] ?? 0;
                  const barRatio = Math.abs(netGex) / profileMax;
                  const barWidth = barRatio * PROFILE_BAR_W;
                  return (
                    <tr
                      key={strike}
                      ref={isATM ? atmRowRef : undefined}
                      className={`border-b border-[var(--border)] transition-colors hover:brightness-110 ${
                        isATM ? "ring-1 ring-inset ring-[var(--warning)]/40" : ""
                      }`}
                    >
                      <td
                        className={`sticky left-0 z-10 border-r border-[var(--border)] px-3 py-2 text-center font-bold tabular-nums ${
                          isATM
                            ? "bg-[var(--warning)]/10 text-[var(--warning)]"
                            : "bg-[var(--panel)] text-[var(--foreground)]"
                        }`}
                      >
                        {isATM && <span className="mr-1 text-[var(--warning)]">▸</span>}
                        {strike}
                      </td>
                      {expiryDates.map((exp) => {
                        const val = grid[String(strike)]?.[exp] ?? 0;
                        const bg = getCellColor(val, absMax);
                        const fg = getTextColor(val, absMax);
                        const glow = getCellGlow(val, absMax);
                        return (
                          <td
                            key={exp}
                            className="px-3 py-2 text-center tabular-nums font-medium whitespace-nowrap border-l border-[var(--border)]/20 cursor-pointer hover:ring-1 hover:ring-inset hover:ring-cyan-400/50"
                            style={{ background: bg, color: fg, boxShadow: glow }}
                            title={`Strike ${strike} · ${exp} · ${metricLabel}: ${val.toLocaleString()}`}
                            onClick={(e) => handleCellClick(strike, exp, e)}
                          >
                            {val !== 0 ? fmt(val) : ""}
                          </td>
                        );
                      })}
                      {showProfile && (
                        <td className="border-l border-[var(--border)] px-0 py-0" style={{ minWidth: PROFILE_BAR_W * 2 + 20 }}>
                          <div className="flex" style={{ height: 22, width: "100%" }}>
                            {/* Left half (negative bars) — label inside bar or right-aligned overlay */}
                            <div className="relative" style={{ width: "50%", overflow: "hidden" }}>
                              {barWidth > 1 && netGex < 0 && (
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: 1,
                                    width: barWidth,
                                    height: 20,
                                    borderRadius: 3,
                                    background: "rgba(200, 50, 220, 0.8)",
                                  }}
                                />
                              )}
                              {netGex < 0 && Math.abs(netGex) > profileMax * 0.01 && (
                                <span
                                  className="text-[9px] font-medium whitespace-nowrap"
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    right: barWidth > 50 ? 4 : barWidth + 4,
                                    color: barWidth > 50 ? "#fff" : "rgb(200, 120, 240)",
                                    zIndex: 1,
                                  }}
                                >
                                  {fmt(netGex)}
                                </span>
                              )}
                            </div>
                            {/* Center divider */}
                            <div style={{ width: 1, background: "var(--border)", opacity: 0.5, flexShrink: 0 }} />
                            {/* Right half (positive bars) — label inside bar or left-aligned overlay */}
                            <div className="relative" style={{ width: "50%", overflow: "hidden" }}>
                              {barWidth > 1 && netGex > 0 && (
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 1,
                                    width: barWidth,
                                    height: 20,
                                    borderRadius: 3,
                                    background: "rgba(0, 220, 240, 0.8)",
                                  }}
                                />
                              )}
                              {netGex > 0 && Math.abs(netGex) > profileMax * 0.01 && (
                                <span
                                  className="text-[9px] font-medium whitespace-nowrap"
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    left: barWidth > 50 ? 4 : barWidth + 4,
                                    color: barWidth > 50 ? "#fff" : "rgb(100, 220, 240)",
                                    zIndex: 1,
                                  }}
                                >
                                  {fmt(netGex)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {strikes.length === 0 && (
                  <tr>
                    <td colSpan={expiryDates.length + 1 + (showProfile ? 1 : 0)} className="px-4 py-12 text-center text-[var(--muted)]">
                      No GEX data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* ── Grok button + panel ── */}
      <button
        onClick={() => setGrokOpen((v) => !v)}
        title="Grok"
        className={`fixed bottom-5 left-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
          grokOpen
            ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
            : "border-[var(--border)] bg-[var(--panel-2)] text-[var(--foreground)] hover:bg-[var(--panel)]"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="7" />
          <path d="M6 18c3-2 9-8 12-12" />
          <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {grokOpen && (
        <div className="fixed bottom-20 left-5 z-40 w-[22rem] rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="text-sm font-semibold">Grok</div>
            <button
              onClick={() => setGrokOpen(false)}
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close Grok"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto px-4 py-3 text-[11px]">
            {grokMessages.length === 0 ? (
              <p className="text-[var(--muted)]">Type here for heatmap related and stock questions (contracts, greeks, strikes, etc)</p>
            ) : (
              <div className="space-y-2">
                {grokMessages.map((m, idx) => (
                  <div
                    key={`${m.role}-${idx}`}
                    className={`rounded-lg px-3 py-2 ${m.role === "user"
                      ? "bg-cyan-500/10 text-[var(--foreground)]"
                      : "bg-[var(--panel-2)] text-[var(--foreground)]"}
                    `}
                  >
                    {m.content}
                  </div>
                ))}
                {grokLoading && (
                  <div className="text-[var(--muted)]">Thinking…</div>
                )}
              </div>
            )}
            {grokError && (
              <div className="mt-2 text-[10px] text-[var(--danger)]">{grokError}</div>
            )}
          </div>
          <div className="border-t border-[var(--border)] px-4 py-3">
            <textarea
              rows={2}
              value={grokInput}
              onChange={(e) => setGrokInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendGrok();
                }
              }}
              placeholder="Type here for heatmap related and stock questions (contracts, greeks, strikes, etc)"
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-[var(--muted)]">Press Enter to send</span>
              <button
                onClick={sendGrok}
                disabled={grokLoading || !grokInput.trim()}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  grokLoading || !grokInput.trim()
                    ? "bg-[var(--panel-2)] text-[var(--muted)] cursor-not-allowed"
                    : "bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
                }`}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cell Detail Popup ── */}
      {popupCell && (() => {
        const { strike, expiry, x, y } = popupCell;
        const val = grid[String(strike)]?.[expiry] ?? 0;
        const detail = data.cellDetails?.[String(strike)]?.[expiry];
        // Position popup — keep it within viewport
        const popW = 280;
        const popH = 260;
        const left = Math.min(x - popW / 2, window.innerWidth - popW - 12);
        const top = y - popH - 8 > 0 ? y - popH - 8 : y + 36;
        return (
          <div
            className="gex-popup fixed z-50 rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl shadow-black/40"
            style={{
              left: Math.max(8, left),
              top,
              width: popW,
            }}
          >
            {/* Header */}
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--foreground)]">${strike}</span>
                <span className="text-[10px] text-[var(--muted)]">{fmtExpiry(expiry)}</span>
              </div>
              <button
                onClick={() => setPopupCell(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* GEX value */}
            <div className="px-4 py-2 border-b border-[var(--border)]/50">
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Net {metricLabel}</p>
              <p className={`text-lg font-bold ${val > 0 ? "text-cyan-400" : val < 0 ? "text-purple-400" : "text-[var(--muted)]"}`}>
                {val !== 0 ? fmt(val) : "—"}
              </p>
            </div>
            {/* Detail grid */}
            {detail ? (
              <div className="grid grid-cols-3 gap-px bg-[var(--border)]/20 text-[10px]">
                <div className="bg-[var(--panel)] px-3 py-2" />
                <div className="bg-[var(--panel)] px-3 py-2 text-center font-semibold text-cyan-400">Calls</div>
                <div className="bg-[var(--panel)] px-3 py-2 text-center font-semibold text-purple-400">Puts</div>

                <div className="bg-[var(--panel)] px-3 py-1.5 text-[var(--muted)]">OI</div>
                <div className="bg-[var(--panel)] px-3 py-1.5 text-center tabular-nums text-[var(--foreground)]">{detail.callOI.toLocaleString()}</div>
                <div className="bg-[var(--panel)] px-3 py-1.5 text-center tabular-nums text-[var(--foreground)]">{detail.putOI.toLocaleString()}</div>

                <div className="bg-[var(--panel)] px-3 py-1.5 text-[var(--muted)]">Gamma</div>
                <div className="bg-[var(--panel)] px-3 py-1.5 text-center tabular-nums text-[var(--foreground)]">{detail.callGamma.toFixed(4)}</div>
                <div className="bg-[var(--panel)] px-3 py-1.5 text-center tabular-nums text-[var(--foreground)]">{detail.putGamma.toFixed(4)}</div>

                <div className="bg-[var(--panel)] px-3 py-1.5 text-[var(--muted)]">Delta</div>
                <div className="bg-[var(--panel)] px-3 py-1.5 text-center tabular-nums text-[var(--foreground)]">{detail.callDelta.toFixed(3)}</div>
                <div className="bg-[var(--panel)] px-3 py-1.5 text-center tabular-nums text-[var(--foreground)]">{detail.putDelta.toFixed(3)}</div>

                <div className="bg-[var(--panel)] px-3 py-1.5 text-[var(--muted)]">IV</div>
                <div className="bg-[var(--panel)] px-3 py-1.5 text-center tabular-nums text-[var(--foreground)]">{detail.callIV.toFixed(1)}%</div>
                <div className="bg-[var(--panel)] px-3 py-1.5 text-center tabular-nums text-[var(--foreground)]">{detail.putIV.toFixed(1)}%</div>

                <div className="bg-[var(--panel)] px-3 py-1.5 text-[var(--muted)]">Volume</div>
                <div className="bg-[var(--panel)] px-3 py-1.5 text-center tabular-nums text-[var(--foreground)]">{detail.callVolume.toLocaleString()}</div>
                <div className="bg-[var(--panel)] px-3 py-1.5 text-center tabular-nums text-[var(--foreground)]">{detail.putVolume.toLocaleString()}</div>
              </div>
            ) : (
              <div className="px-4 py-4 text-center text-[10px] text-[var(--muted)]">
                Detail data not available
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ================================================================
   MARKET HEATMAP VIEW
   ================================================================ */
function HeatmapView({ flows }: { flows: typeof mockFlowOrders }) {
  // Group by ticker → show a grid of OI × direction heat cells
  const grouped = useMemo(() => {
    const map: Record<string, { calls: number; puts: number; bullish: number; bearish: number; totalOI: number }> = {};
    for (const row of flows) {
      if (!map[row.ticker]) map[row.ticker] = { calls: 0, puts: 0, bullish: 0, bearish: 0, totalOI: 0 };
      const g = map[row.ticker];
      const oiNum = parseFloat(row.oi.replace(/[KM]/g, "")) * (row.oi.includes("M") ? 1_000_000 : row.oi.includes("K") ? 1_000 : 1);
      g.totalOI += oiNum;
      if (row.contractType === "call") g.calls++; else g.puts++;
      if (row.direction === "BULLISH") g.bullish++; else if (row.direction === "BEARISH") g.bearish++;
    }
    return Object.entries(map).sort((a, b) => b[1].totalOI - a[1].totalOI);
  }, [flows]);

  const maxOI = Math.max(...grouped.map(([, v]) => v.totalOI), 1);

  return (
    <div className="p-6">
      <p className="mb-4 text-xs text-[var(--muted)] uppercase tracking-[0.2em]">Open Interest Heatmap by Ticker</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {grouped.map(([ticker, data]) => {
          const intensity = data.totalOI / maxOI;
          const bullRatio = (data.bullish + data.bearish) > 0 ? data.bullish / (data.bullish + data.bearish) : 0.5;
          // Green if bullish, red if bearish, blended
          const bg = bullRatio >= 0.5
            ? `rgba(94, 225, 181, ${(intensity * 0.35 + 0.05).toFixed(2)})`
            : `rgba(255, 107, 107, ${(intensity * 0.35 + 0.05).toFixed(2)})`;
          const formatOI = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

          return (
            <div
              key={ticker}
              className="relative overflow-hidden rounded-xl border border-[var(--border)] p-4 transition-transform hover:scale-[1.02]"
              style={{ background: bg }}
            >
              <Link
                href={`/stock/${ticker}`}
                className="text-lg font-bold text-[var(--accent-2)] hover:underline transition-all"
              >
                {ticker}
              </Link>
              <p className="mt-1 text-2xl font-semibold">{formatOI(data.totalOI)}</p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mt-0.5">Open Interest</p>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  {data.calls}C
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
                  {data.puts}P
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${(bullRatio * 100).toFixed(0)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
                <span>{data.bullish} Bullish</span>
                <span>{data.bearish} Bearish</span>
              </div>
            </div>
          );
        })}
      </div>
      {grouped.length === 0 && (
        <p className="py-12 text-center text-[var(--muted)]">No data available for heatmap.</p>
      )}
    </div>
  );
}

/* ================================================================
   ORDER FLOW TABLE
   ================================================================ */
function FlowTable({ rows }: { rows: typeof mockFlowOrders }) {
  type FlowRow = (typeof mockFlowOrders)[number];
  type SortKey =
    | "time"
    | "ticker"
    | "side"
    | "contract"
    | "dte"
    | "reference"
    | "size"
    | "premium"
    | "direction"
    | "sig"
    | "consolidation"
    | "volume"
    | "oi";

  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const columns: { key: SortKey; label: string }[] = [
    { key: "time", label: "Last \u2193" },
    { key: "ticker", label: "Ticker" },
    { key: "side", label: "Side" },
    { key: "contract", label: "Contract" },
    { key: "dte", label: "DTE" },
    { key: "reference", label: "Reference" },
    { key: "size", label: "Size @ Price" },
    { key: "premium", label: "Premium" },
    { key: "direction", label: "Direction" },
    { key: "sig", label: "Sig Score" },
    { key: "consolidation", label: "Consolidation" },
    { key: "volume", label: "Volume" },
    { key: "oi", label: "OI" },
  ];

  const parseCompact = (value: string) => {
    const v = value.replace(/[$,]/g, "");
    const num = parseFloat(v.replace(/[KM]/g, ""));
    const mult = v.includes("M") ? 1_000_000 : v.includes("K") ? 1_000 : 1;
    return isNaN(num) ? 0 : num * mult;
  };

  const parseTime = (value: string) => {
    const [md, hm] = value.split(" ");
    if (!md || !hm) return 0;
    const [m, d] = md.split("/").map((n) => parseInt(n, 10));
    const [hh, mm] = hm.split(":").map((n) => parseInt(n, 10));
    const year = new Date().getFullYear();
    return new Date(year, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0).getTime();
  };

  const getSigScore = (row: FlowRow) => {
    const premium = parseCompact(row.premium);
    const oi = parseCompact(row.oi);
    const vol = parseCompact(row.volume);
    const dte = parseInt(row.dte, 10) || 0;

    const premiumScore = Math.log10(1 + premium) / 6; // ~0-1 for large notional
    const oiScore = Math.log10(1 + oi) / 6;
    const volScore = Math.log10(1 + vol) / 5;
    const dteScore = 1 - Math.min(dte / 90, 1); // nearer expiry gets higher

    const dirBoost = row.direction === "BULLISH" ? 0.08 : row.direction === "BEARISH" ? 0.06 : 0.02;
    const sideBoost = row.side === "ASK" ? 0.06 : row.side === "BID" ? 0.04 : 0.02;
    const consBoost = row.consolidation === "SWEEP" ? 0.08 : row.consolidation === "BLOCK" ? 0.05 : 0.02;

    const base =
      premiumScore * 0.3 +
      oiScore * 0.2 +
      volScore * 0.2 +
      dteScore * 0.2 +
      dirBoost +
      sideBoost +
      consBoost;

    return Math.min(1, Math.max(0, base));
  };

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const list = [...rows];
    list.sort((a, b) => {
      switch (sortKey) {
        case "time":
          return (parseTime(a.time) - parseTime(b.time)) * dir;
        case "ticker":
          return a.ticker.localeCompare(b.ticker) * dir;
        case "side":
          return a.side.localeCompare(b.side) * dir;
        case "contract":
          return (a.strike - b.strike) * dir;
        case "dte":
          return (parseInt(a.dte, 10) - parseInt(b.dte, 10)) * dir;
        case "reference":
          return (a.reference - b.reference) * dir;
        case "size":
          return (a.size - b.size) * dir;
        case "premium":
          return (parseCompact(a.premium) - parseCompact(b.premium)) * dir;
        case "direction":
          return a.direction.localeCompare(b.direction) * dir;
        case "sig":
          return (getSigScore(a) - getSigScore(b)) * dir;
        case "consolidation":
          return a.consolidation.localeCompare(b.consolidation) * dir;
        case "volume":
          return (parseCompact(a.volume) - parseCompact(b.volume)) * dir;
        case "oi":
          return (parseCompact(a.oi) - parseCompact(b.oi)) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [rows, sortDir, sortKey]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 font-medium cursor-pointer select-none"
                onClick={() => {
                  if (sortKey === col.key) {
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  } else {
                    setSortKey(col.key);
                    setSortDir(col.key === "time" ? "desc" : "asc");
                  }
                }}
                title={`Sort by ${col.label}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr
              key={`${row.ticker}-${row.time}-${i}`}
              className="border-b border-[var(--border)] transition-colors hover:bg-white/[0.02]"
            >
              {/* Time */}
              <td className="px-4 py-3 text-[var(--muted)]">{row.time}</td>

              {/* Ticker */}
              <td className="px-4 py-3 font-semibold">
                <Link
                  href={`/stock/${row.ticker}`}
                  className="text-[var(--accent-2)] hover:underline hover:brightness-125 transition-all"
                >
                  {row.ticker}
                </Link>
              </td>

              {/* Side */}
              <td className="px-4 py-3">
                <span
                  className={`font-semibold ${
                    row.side === "BID"
                      ? "text-[var(--accent)]"
                      : row.side === "ASK"
                      ? "text-[var(--danger)]"
                      : "text-[var(--accent-2)]"
                  }`}
                >
                  {row.side}
                </span>
              </td>

              {/* Contract: strike + type + expiry */}
              <td className="px-4 py-3">
                <span className="font-medium">{row.strike}</span>
                <span
                  className={`ml-1.5 ${
                    row.contractType === "call"
                      ? "text-[var(--accent)]"
                      : "text-[var(--danger)]"
                  }`}
                >
                  {row.contractType}
                </span>
                <Link
                  href={`/contract/${row.ticker}/${row.expiry}/${row.contractType}/${row.strike}`}
                  className="ml-1.5 text-[var(--accent-2)] hover:underline hover:brightness-110 transition-all"
                >
                  {row.expiry}
                </Link>
              </td>

              {/* DTE */}
              <td className="px-4 py-3 text-[var(--muted)]">{row.dte}</td>

              {/* Reference */}
              <td className="px-4 py-3 text-[var(--muted)]">
                ${row.reference.toFixed(2)}
              </td>

              {/* Size @ Price */}
              <td className="px-4 py-3">
                <span className="font-medium text-[var(--accent)]">
                  {row.size}
                </span>
                <span className="text-[var(--muted)]">
                  {" "}@ ${row.price.toFixed(2)}
                </span>
                <span className="ml-1 text-[var(--muted)]">
                  {row.side === "ASK" ? "A" : row.side === "BID" ? "B" : "M"}
                </span>
              </td>

              {/* Premium */}
              <td className="px-4 py-3 font-medium text-[var(--accent)]">
                {row.premium}
              </td>

              {/* Direction */}
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    row.direction === "BULLISH"
                      ? "bg-emerald-500/15 text-[var(--accent)]"
                      : row.direction === "BEARISH"
                      ? "bg-red-500/15 text-[var(--danger)]"
                      : "bg-gray-500/15 text-[var(--muted)]"
                  }`}
                >
                  {row.direction}
                </span>
              </td>

              {/* Sig Score */}
              <td className="px-4 py-3">
                {(() => {
                  const score = getSigScore(row);
                  const pct = Math.round(score * 100);
                  const color = pct >= 75 ? "var(--accent)" : pct >= 55 ? "var(--accent-2)" : pct >= 35 ? "var(--warning)" : "var(--danger)";
                  return (
                    <div className="min-w-[110px]">
                      <div className="text-[11px] text-[var(--muted)]">
                        {score.toFixed(2)}
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </td>

              {/* Consolidation */}
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    row.consolidation === "SWEEP"
                      ? "bg-blue-500/15 text-[var(--accent-2)]"
                      : row.consolidation === "BLOCK"
                      ? "bg-amber-500/15 text-[var(--warning)]"
                      : "bg-gray-500/15 text-[var(--muted)]"
                  }`}
                >
                  {row.consolidation}
                </span>
              </td>

              {/* Volume */}
              <td className="px-4 py-3 text-[var(--muted)]">{row.volume}</td>

              {/* OI */}
              <td className="px-4 py-3 text-[var(--muted)]">{row.oi}</td>
            </tr>
          ))}
          {sortedRows.length === 0 && (
            <tr>
              <td
                colSpan={13}
                className="px-4 py-12 text-center text-[var(--muted)]"
              >
                No orders match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================
   DARK POOL TABLE
   ================================================================ */
function DarkPoolTable({ rows }: { rows: typeof mockDarkPoolTrades }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Ticker</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Notional</th>
            <th className="px-4 py-3 font-medium">Venue</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">vs NBBO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.ticker}-${row.time}-${i}`}
              className="border-b border-[var(--border)] transition-colors hover:bg-white/[0.02]"
            >
              <td className="px-4 py-3 text-[var(--muted)]">{row.time}</td>
              <td className="px-4 py-3 font-semibold">
                <Link
                  href={`/stock/${row.ticker}`}
                  className="text-[var(--accent-2)] hover:underline hover:brightness-125 transition-all"
                >
                  {row.ticker}
                </Link>
              </td>
              <td className="px-4 py-3 text-[var(--muted)]">
                ${row.price.toFixed(2)}
              </td>
              <td className="px-4 py-3 font-medium">
                {row.size.toLocaleString()}
              </td>
              <td className="px-4 py-3 font-medium text-[var(--accent)]">
                {row.notional}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-2 py-0.5 text-[11px] text-[var(--accent-2)]">
                  {row.venue}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    row.type === "BLOCK"
                      ? "bg-amber-500/15 text-[var(--warning)]"
                      : row.type === "CROSS"
                      ? "bg-blue-500/15 text-[var(--accent-2)]"
                      : "bg-gray-500/15 text-[var(--muted)]"
                  }`}
                >
                  {row.type}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    row.sentiment === "ABOVE"
                      ? "bg-emerald-500/15 text-[var(--accent)]"
                      : row.sentiment === "BELOW"
                      ? "bg-red-500/15 text-[var(--danger)]"
                      : "bg-gray-500/15 text-[var(--muted)]"
                  }`}
                >
                  {row.sentiment}
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-12 text-center text-[var(--muted)]"
              >
                No dark pool trades match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Gauge({ value, color }: { value: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = 20;
  const stroke = 5;
  const size = 56;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (circumference * clamped) / 100;
  const gap = circumference - dash;

  return (
    <div className="flex h-14 w-14 items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="opacity-90">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
    </div>
  );
}

function UnusualAlertsBanner({
  items,
  onClose,
  watchlist,
  onToggleWatch,
}: {
  items: { row: (typeof mockFlowOrders)[number]; score: number }[];
  onClose: () => void;
  watchlist: string[];
  onToggleWatch: (key: string) => void;
}) {
  return (
    <aside
      className="fixed right-6 top-6 z-40 w-[320px] max-h-[70vh] rounded-2xl border border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">Alerts</p>
          <p className="text-sm font-semibold">Unusual Order Flow</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-7 w-7 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
            title="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-4 text-xs text-[var(--muted)]">
            No unusual flow right now.
          </div>
        ) : (
          items.map(({ row, score }) => {
            const key = `${row.ticker}-${row.expiry}-${row.strike}-${row.contractType}`;
            const isFav = watchlist.includes(key);
            const scorePct = Math.round(score * 100);
            const scoreColor = scorePct >= 75 ? "var(--accent)" : scorePct >= 55 ? "var(--accent-2)" : scorePct >= 35 ? "var(--warning)" : "var(--danger)";
            return (
              <div
                key={key}
                className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--foreground)]">Urgent Repeater</p>
                    <p className="text-[10px] text-[var(--muted)]">SigScore {score.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={`h-7 w-7 rounded-full border border-[var(--border)] ${
                        isFav ? "bg-[var(--accent-2)]/20 text-[var(--accent-2)]" : "bg-[var(--panel)] text-[var(--muted)]"
                      }`}
                      title="Add to watchlist"
                      onClick={() => onToggleWatch(key)}
                    >
                      ★
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-xs">
                    <span className="text-[var(--accent-2)]">{row.ticker}</span> {row.strike}{" "}
                    <span className={row.contractType === "call" ? "text-[var(--accent)]" : "text-[var(--danger)]"}>
                      {row.contractType}
                    </span>
                    , Exp: {row.expiry}
                  </div>
                  <span className="text-xs font-semibold text-[var(--accent)]">{row.premium}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${scorePct}%`, background: scoreColor }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function ThemeToggleButton({
  theme,
  onToggle,
}: {
  theme: "dark" | "light";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)]/95 text-[var(--muted)] shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur hover:text-[var(--foreground)]"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a7 7 0 00-4 12.9V19a1 1 0 001 1h6a1 1 0 001-1v-3.1A7 7 0 0012 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 22h6" />
        </svg>
      )}
    </button>
  );
}

function AlertsToggleButton({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)]/95 text-[var(--muted)] shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur hover:text-[var(--foreground)]"
      title={isOpen ? "Hide alerts" : "Show alerts"}
      aria-label={isOpen ? "Hide alerts" : "Show alerts"}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9a6 6 0 10-12 0v.05c0 .22.006.44.018.66.094 2.12-.862 4.16-2.572 5.622a23.846 23.846 0 005.454 1.31m6.957 0a23.848 23.848 0 01-6.957 0m6.957 0a3 3 0 11-6.957 0" />
      </svg>
    </button>
  );
}


/* ================================================================
   OPTION CHAIN VIEW
   ================================================================ */
type OptionLeg = {
  bid: number;
  ask: number;
  last: number;
  delta: number;
  vol: number;
  oi: number;
  change: number;
  changePct: number;
  iv: number;
};
type ChainRow = {
  strike: number;
  call: OptionLeg | null;
  put: OptionLeg | null;
};
type ExpiryInfo = { date: string; dte: number };
type ChainStats = { callOI: number; putOI: number; callVol: number; putVol: number; pcRatio: number };

function OptionChainView() {
  const [ticker, setTicker] = useState("SPY");
  const [tickerInput, setTickerInput] = useState("SPY");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [expiryDates, setExpiryDates] = useState<ExpiryInfo[]>([]);
  const [chain, setChain] = useState<ChainRow[]>([]);
  const [spotPrice, setSpotPrice] = useState(0);
  const [stats, setStats] = useState<ChainStats>({ callOI: 0, putOI: 0, callVol: 0, putVol: 0, pcRatio: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChain = useCallback(async (t: string, exp?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = exp ? `&expiry=${exp}` : "";
      const res = await fetch(`/api/chain?ticker=${t}${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setChain(data.chain ?? []);
      setExpiryDates(data.expiryDates ?? []);
      setSelectedExpiry(data.selectedExpiry ?? "");
      setSpotPrice(data.spotPrice ?? 0);
      setStats(data.stats ?? { callOI: 0, putOI: 0, callVol: 0, putVol: 0, pcRatio: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChain(ticker);
  }, [ticker, fetchChain]);

  const handleExpiryClick = (exp: string) => {
    setSelectedExpiry(exp);
    fetchChain(ticker, exp);
  };

  const handleTickerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tickerInput.trim().toUpperCase();
    if (t && t !== ticker) {
      setTicker(t);
      setSelectedExpiry("");
    }
  };

  const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` : String(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--muted)]">
        <svg className="mr-3 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Loading option chain...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-12 text-center text-[var(--danger)]">
        Failed to load option chain: {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Ticker search */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <form onSubmit={handleTickerSubmit} className="flex items-center gap-2">
          <input
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            placeholder="Ticker"
            className="w-24 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-2)]/40"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent-2)] px-3 py-1.5 text-xs font-semibold text-[#0c0f12] hover:brightness-110 transition-all"
          >
            Load
          </button>
        </form>
        <span className="text-sm font-semibold">{ticker}</span>
        <span className="text-sm text-[var(--muted)]">${spotPrice.toFixed(2)}</span>
      </div>

      {/* Expiry date tabs */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1">
        {expiryDates.map((exp) => {
          const isActive = exp.date === selectedExpiry;
          const d = new Date(exp.date + "T12:00:00");
          const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <button
              key={exp.date}
              onClick={() => handleExpiryClick(exp.date)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-[var(--accent-2)] text-[#0c0f12] shadow-lg shadow-[var(--accent-2)]/20"
                  : "border border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label} <span className={`ml-1 ${isActive ? "text-[#0c0f12]/60" : "text-[var(--muted)]"}`}>{exp.dte}d</span>
            </button>
          );
        })}
      </div>

      {/* Chain header labels */}
      <div className="mb-1 flex items-center text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
        <div className="flex-1 text-center text-[var(--accent)]">
          CALLS <span className="text-[var(--muted)]">(click: select &bull; double-click: stats)</span>
        </div>
        <div className="w-[100px]" />
        <div className="flex-1 text-center text-[var(--danger)]">
          PUTS <span className="text-[var(--muted)]">(click: select &bull; double-click: stats)</span>
        </div>
      </div>

      {/* Chain table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
              {/* Call side */}
              <th className="px-3 py-2 text-right font-medium text-[var(--accent)]/70">BID</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--accent)]/70">ASK</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--accent)]/70">LAST</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--accent)]/70">&Delta;</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--accent)]/70">VOL</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--accent)]/70">OI</th>
              {/* Strike */}
              <th className="px-4 py-2 text-center font-bold text-[var(--foreground)]">STRIKE</th>
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)]/95 text-[var(--muted)] shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur hover:text-[var(--foreground)]"
              {/* Put side */}
              <th className="px-3 py-2 text-right font-medium text-[var(--danger)]/70">BID</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--danger)]/70">ASK</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--danger)]/70">LAST</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--danger)]/70">&Delta;</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--danger)]/70">VOL</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--danger)]/70">OI</th>
            </tr>
          </thead>
          <tbody>
            {chain.map((row) => {
              const isITMCall = spotPrice > row.strike;
              const isITMPut = spotPrice < row.strike;
              const isATM = Math.abs(spotPrice - row.strike) / spotPrice < 0.005;
              return (
                <tr
                  key={row.strike}
                  className={`border-b border-[var(--border)] transition-colors hover:bg-white/[0.02] ${
                    isATM ? "bg-[var(--accent-2)]/5 border-l-2 border-r-2 border-l-[var(--accent-2)] border-r-[var(--accent-2)]" : ""
                  }`}
                >
                  {/* Call BID */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${isITMCall ? "bg-[var(--accent)]/[0.04]" : ""} ${row.call ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                    {row.call ? row.call.bid.toFixed(2) : "-"}
                  </td>
                  {/* Call ASK */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${isITMCall ? "bg-[var(--accent)]/[0.04]" : ""} ${row.call ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                    {row.call ? row.call.ask.toFixed(2) : "-"}
                  </td>
                  {/* Call LAST */}
                  <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${isITMCall ? "bg-[var(--accent)]/[0.04]" : ""}`}>
                    {row.call ? row.call.last.toFixed(2) : "-"}
                  </td>
                  {/* Call Delta */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${isITMCall ? "bg-[var(--accent)]/[0.04]" : ""} text-[var(--muted)]`}>
                    {row.call ? row.call.delta.toFixed(2) : "-"}
                  </td>
                  {/* Call Vol */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${isITMCall ? "bg-[var(--accent)]/[0.04]" : ""} ${row.call && row.call.vol > 0 ? "text-[var(--accent-2)]" : "text-[var(--muted)]"}`}>
                    {row.call ? (row.call.vol > 0 ? row.call.vol : "-") : "-"}
                  </td>
                  {/* Call OI */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${isITMCall ? "bg-[var(--accent)]/[0.04]" : ""} text-[var(--foreground)]`}>
                    {row.call ? (row.call.oi > 0 ? fmtNum(row.call.oi) : "-") : "-"}
                  </td>

                  {/* STRIKE */}
                  <td className={`px-4 py-2.5 text-center font-bold ${isATM ? "text-[var(--accent-2)]" : "text-[var(--foreground)]"}`}>
                    ${row.strike.toFixed(2)}
                  </td>

                  {/* Put BID */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${isITMPut ? "bg-[var(--danger)]/[0.04]" : ""} ${row.put ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
                    {row.put ? row.put.bid.toFixed(2) : "-"}
                  </td>
                  {/* Put ASK */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${isITMPut ? "bg-[var(--danger)]/[0.04]" : ""} ${row.put ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
                    {row.put ? row.put.ask.toFixed(2) : "-"}
                  </td>
                  {/* Put LAST */}
                  <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${isITMPut ? "bg-[var(--danger)]/[0.04]" : ""}`}>
                    {row.put ? row.put.last.toFixed(2) : "-"}
                  </td>
                  {/* Put Delta */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${isITMPut ? "bg-[var(--danger)]/[0.04]" : ""} text-[var(--muted)]`}>
                    {row.put ? row.put.delta.toFixed(2) : "-"}
                  </td>
                  {/* Put Vol */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${isITMPut ? "bg-[var(--danger)]/[0.04]" : ""} ${row.put && row.put.vol > 0 ? "text-[var(--accent-2)]" : "text-[var(--muted)]"}`}>
                    {row.put ? (row.put.vol > 0 ? row.put.vol : "-") : "-"}
                  </td>
                  {/* Put OI */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${isITMPut ? "bg-[var(--danger)]/[0.04]" : ""} text-[var(--foreground)]`}>
                    {row.put ? (row.put.oi > 0 ? fmtNum(row.put.oi) : "-") : "-"}
                  </td>
                </tr>
              );
            })}
            {chain.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-12 text-center text-[var(--muted)]">
                  No option chain data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
