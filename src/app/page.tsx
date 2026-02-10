"use client";

import { useMemo, useState } from "react";
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<"flow" | "darkpool">("flow");
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState("All");

  // Live data hooks
  const {
    orders: liveOrders,
    loading: flowLoading,
    error: flowError,
    lastUpdate: flowLastUpdate,
  } = useFlowData();
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

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Subtle gradient glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(94,225,181,0.08),transparent)]" />

      <div className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Header ── */}
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

        {/* ── Stats Bar ── */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Put/Call Ratio", value: putCallRatio, sub: "Bullish" },
            {
              label: "Puts",
              value: totalPuts.toLocaleString(),
              sub: "$1.79B",
            },
            {
              label: "Calls",
              value: totalCalls.toLocaleString(),
              sub: "$8.99B",
            },
            { label: "Bullish %", value: `${bullPct}%`, sub: "Sentiment" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{stat.sub}</p>
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

        {/* ── Tabs + Filters ── */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {/* Tab toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
            <button
              onClick={() => setActiveTab("flow")}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                activeTab === "flow"
                  ? "bg-[var(--accent)] text-[#0c0f12] shadow-lg shadow-[var(--accent)]/20"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Order Flow
            </button>
            <button
              onClick={() => setActiveTab("darkpool")}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                activeTab === "darkpool"
                  ? "bg-[var(--accent-2)] text-[#0c0f12] shadow-lg shadow-[var(--accent-2)]/20"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Dark Pool
            </button>
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

        {/* ── Error banner ── */}
        {(flowError || dpError) && (
          <div className="mt-4 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-2 text-xs text-[var(--warning)]">
            API issue — showing {isLive ? "partial" : "mock"} data.{" "}
            {flowError && `Flow: ${flowError}. `}
            {dpError && `Dark Pool: ${dpError}. `}
          </div>
        )}

        {/* ── Table ── */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
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
          ) : (
            <DarkPoolTable rows={filteredDarkPool} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ORDER FLOW TABLE
   ================================================================ */
function FlowTable({ rows }: { rows: typeof mockFlowOrders }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            <th className="px-4 py-3 font-medium">Last ↓</th>
            <th className="px-4 py-3 font-medium">Ticker</th>
            <th className="px-4 py-3 font-medium">Side</th>
            <th className="px-4 py-3 font-medium">Contract</th>
            <th className="px-4 py-3 font-medium">DTE</th>
            <th className="px-4 py-3 font-medium">Reference</th>
            <th className="px-4 py-3 font-medium">Size @ Price</th>
            <th className="px-4 py-3 font-medium">Premium</th>
            <th className="px-4 py-3 font-medium">Direction</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Consolidation</th>
            <th className="px-4 py-3 font-medium">Volume</th>
            <th className="px-4 py-3 font-medium">OI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.ticker}-${row.time}-${i}`}
              className="border-b border-[var(--border)] transition-colors hover:bg-white/[0.02]"
            >
              {/* Time */}
              <td className="px-4 py-3 text-[var(--muted)]">{row.time}</td>

              {/* Ticker */}
              <td className="px-4 py-3 font-semibold">{row.ticker}</td>

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
                <span className="ml-1.5 text-[var(--accent-2)]">
                  {row.expiry}
                </span>
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

              {/* Type */}
              <td className="px-4 py-3 text-[var(--muted)]">{row.type}</td>

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
          {rows.length === 0 && (
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
              <td className="px-4 py-3 font-semibold">{row.ticker}</td>
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
