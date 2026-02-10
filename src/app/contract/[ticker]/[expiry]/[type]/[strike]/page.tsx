"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const RANGES = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1m" },
  { label: "6M", value: "6m" },
  { label: "YTD", value: "ytd" },
  { label: "1Y", value: "1y" },
];

type SeriesPoint = { t: number; o: number; h: number; l: number; c: number; v: number };
type FlowPoint = { t: number; bidVol: number; askVol: number; midVol: number; netPrem: number };
type NetPremBin = { x0: number; x1: number; v: number };
type TradePrint = { t: number; price: number; size: number; premium: number; side: "BID" | "ASK" | "MID" };

type ContractData = {
  ticker: string;
  expiry: string;
  type: string;
  strike: number;
  dte: number | null;
  optionSymbol: string;
  snapshot: {
    name: string;
    openInterest: number | null;
    volume: number | null;
    close: number | null;
    change: number | null;
    changePct: number | null;
    vwap: number | null;
    iv: number | null;
    delta: number | null;
    gamma: number | null;
    theta: number | null;
    vega: number | null;
  };
  optionSeries: SeriesPoint[];
  stockSeries: SeriesPoint[];
  flowSeries: FlowPoint[];
  flowTotals: { bidVol: number; askVol: number; midVol: number; netPrem: number; totalVol: number };
  netPremiumHistogram: NetPremBin[];
  recentTrades: TradePrint[];
  range: string;
  timestamp: string;
};

export default function ContractPage() {
  const params = useParams();
  const ticker = (params.ticker as string)?.toUpperCase() ?? "SPY";
  const expiry = params.expiry as string;
  const type = (params.type as string) ?? "call";
  const strike = parseFloat(params.strike as string);

  const [range, setRange] = useState("1d");
  const [data, setData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/contract?ticker=${ticker}&expiry=${expiry}&type=${type}&strike=${strike}&range=${range}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [ticker, expiry, type, strike, range]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const fmtBig = (n: number | null) => {
    if (n == null) return "—";
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const fmtPct = (n: number | null) => {
    if (n == null) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--muted)]">
        <svg className="mr-3 h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Loading contract...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <p className="text-lg text-[var(--danger)]">Failed to load contract</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{error}</p>
          <Link
            href={`/stock/${ticker}`}
            className="mt-4 inline-flex rounded-xl bg-[var(--panel)] px-5 py-2 text-sm text-[var(--foreground)] border border-[var(--border)] hover:bg-white/5 transition-all"
          >
            Back to {ticker}
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isCall = data.type.toLowerCase() === "call";

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(94,225,181,0.08),transparent)]" />

      <div className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link
            href={`/stock/${ticker}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to {ticker}
          </Link>
          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  range === r.value
                    ? "bg-[var(--accent-2)] text-[#0c0f12] shadow-lg shadow-[var(--accent-2)]/20"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">Contract Summary</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">
                  {ticker} {data.strike}
                </span>
                <span className={`text-sm font-semibold ${isCall ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                  {data.type}
                </span>
                <span className="text-sm text-[var(--accent-2)]">
                  {data.expiry}
                </span>
                {data.dte != null && (
                  <span className="text-xs text-[var(--muted)]">({data.dte}D)</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {([
                ["Last", data.snapshot.close != null ? `$${data.snapshot.close.toFixed(2)}` : "—"],
                ["Change", fmtPct(data.snapshot.changePct)],
                ["Vol", fmtBig(data.snapshot.volume)],
                ["OI", fmtBig(data.snapshot.openInterest)],
                ["IV", data.snapshot.iv != null ? `${(data.snapshot.iv * 100).toFixed(1)}%` : "—"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flow Breakdown */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {([
            ["Bid Vol", fmtBig(data.flowTotals.bidVol)],
            ["Mid Vol", fmtBig(data.flowTotals.midVol)],
            ["Ask Vol", fmtBig(data.flowTotals.askVol)],
            ["Net Premium", `${data.flowTotals.netPrem >= 0 ? "+" : "-"}$${fmtBig(Math.abs(data.flowTotals.netPrem))}`],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Contract Volume</p>
              <span className="text-xs text-[var(--muted)]">{ticker} {data.strike} {data.type}</span>
            </div>
            <OptionChart series={data.optionSeries} isCall={isCall} />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Net Premium Flow</p>
              <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--accent)]" />Ask</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--muted)]" />Mid</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--danger)]" />Bid</span>
                <span className="flex items-center gap-1"><span className="h-[2px] w-3 rounded-full bg-[var(--accent-2)]" />Net Prem</span>
              </div>
            </div>
            <FlowChart flow={data.flowSeries} />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Underlying Price</p>
              <span className="text-xs text-[var(--muted)]">{ticker}</span>
            </div>
            <UnderlyingChart series={data.stockSeries} />
          </div>
        </div>

        {/* Histogram + Trades */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Net Premium Histogram</p>
              <span className="text-xs text-[var(--muted)]">Distribution</span>
            </div>
            <NetPremiumHistogram bins={data.netPremiumHistogram} />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Recent Prints</p>
              <span className="text-xs text-[var(--muted)]">{ticker} {data.strike} {data.type}</span>
            </div>
            <TradesTable trades={data.recentTrades} />
          </div>
        </div>

        {/* Details */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Greeks</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["Delta", data.snapshot.delta != null ? data.snapshot.delta.toFixed(2) : "—"],
                ["Gamma", data.snapshot.gamma != null ? data.snapshot.gamma.toFixed(2) : "—"],
                ["Theta", data.snapshot.theta != null ? data.snapshot.theta.toFixed(2) : "—"],
                ["Vega", data.snapshot.vega != null ? data.snapshot.vega.toFixed(2) : "—"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Greek Snapshot</p>
              <GreekBars
                delta={data.snapshot.delta ?? 0}
                gamma={data.snapshot.gamma ?? 0}
                theta={data.snapshot.theta ?? 0}
                vega={data.snapshot.vega ?? 0}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 lg:col-span-2">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Contract Notes</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              This view highlights volume spikes, price trend, and key greeks for the selected contract. Use the time range controls to zoom out or focus on intraday flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   CHARTS
   ================================================================ */
function OptionChart({ series, isCall }: { series: SeriesPoint[]; isCall: boolean }) {
  const { pathD, areaD, volumeBars, priceLabels, width, height } = useMemo(() => {
    const W = 800;
    const H = 280;
    const top = 20;
    const bottom = 40;
    const chartH = H - top - bottom;

    if (series.length === 0) {
      return { pathD: "", areaD: "", volumeBars: [], priceLabels: [], width: W, height: H };
    }

    const closes = series.map((d) => d.c);
    const volumes = series.map((d) => d.v);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const maxVol = Math.max(...volumes, 1);
    const range = max - min || 1;

    const points = series.map((d, i) => {
      const x = (i / (series.length - 1)) * W;
      const y = top + chartH - ((d.c - min) / range) * chartH;
      return { x, y };
    });

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaD = pathD + ` L${W},${top + chartH} L0,${top + chartH} Z`;

    const priceLabels = Array.from({ length: 4 }, (_, i) => {
      const price = min + (range * (i / 3));
      const y = top + chartH - ((price - min) / range) * chartH;
      return { y, label: `$${price.toFixed(2)}` };
    });

    const barW = Math.max(1, W / series.length - 0.5);
    const volH = 36;
    const volumeBars = series.map((d, i) => ({
      x: (i / (series.length - 1)) * W - barW / 2,
      h: (d.v / maxVol) * volH,
      w: barW,
    }));

    return { pathD, areaD, volumeBars, priceLabels, width: W, height: H };
  }, [series]);

  if (series.length === 0) {
    return <div className="py-12 text-center text-[var(--muted)]">No contract data available.</div>;
  }

  const color = isCall ? "var(--accent)" : "var(--danger)";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="optionGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {priceLabels.map((pl, i) => (
        <g key={i}>
          <line x1={0} y1={pl.y} x2={width} y2={pl.y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={width - 4} y={pl.y - 4} fill="rgba(154,163,173,0.5)" fontSize={10} textAnchor="end">
            {pl.label}
          </text>
        </g>
      ))}

      {volumeBars.map((vb, i) => (
        <rect
          key={i}
          x={vb.x}
          y={height - 10 - vb.h}
          width={Math.max(vb.w, 0.5)}
          height={vb.h}
          fill={series[i].c >= series[i].o ? "rgba(94,225,181,0.18)" : "rgba(255,107,107,0.18)"}
        />
      ))}

      <path d={areaD} fill="url(#optionGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

function FlowChart({ flow }: { flow: FlowPoint[] }) {
  const { width, height, bars, netLine, grid } = useMemo(() => {
    const W = 800;
    const H = 280;
    const top = 20;
    const bottom = 36;
    const chartH = H - top - bottom;

    if (flow.length === 0) {
      return { width: W, height: H, bars: [], netLine: "", grid: [] as { y: number; label: string }[] };
    }

    const maxVol = Math.max(...flow.map((f) => f.bidVol + f.askVol + f.midVol), 1);
    const netSeries = flow.map((f) => f.netPrem);
    let netMin = Math.min(...netSeries, 0);
    let netMax = Math.max(...netSeries, 0);
    if (netMin === netMax) {
      netMin -= 1;
      netMax += 1;
    }

    const netPoints = flow.map((f, i) => {
      const x = (i / Math.max(flow.length - 1, 1)) * W;
      const y = top + chartH - ((f.netPrem - netMin) / (netMax - netMin)) * chartH;
      return { x, y };
    });
    const netLine = netPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    const barW = Math.max(1, W / Math.max(flow.length, 1) - 0.5);
    const bars = flow.map((f, i) => {
      const x = (i / Math.max(flow.length - 1, 1)) * W - barW / 2;
      const total = f.bidVol + f.askVol + f.midVol;
      const hTotal = (total / maxVol) * 38;
      const askH = (f.askVol / Math.max(total, 1)) * hTotal;
      const midH = (f.midVol / Math.max(total, 1)) * hTotal;
      const bidH = (f.bidVol / Math.max(total, 1)) * hTotal;
      return { x, w: barW, askH, midH, bidH, hTotal };
    });

    const grid = Array.from({ length: 4 }, (_, i) => {
      const y = top + (chartH * i) / 3;
      const label = "";
      return { y, label };
    });

    return { width: W, height: H, bars, netLine, grid };
  }, [flow]);

  if (flow.length === 0) {
    return <div className="py-12 text-center text-[var(--muted)]">No flow data available.</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      {grid.map((g, i) => (
        <line key={i} x1={0} y1={g.y} x2={width} y2={g.y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}

      {/* Stacked volume bars */}
      {bars.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={height - 10 - b.askH} width={Math.max(b.w, 0.5)} height={b.askH} fill="rgba(94,225,181,0.35)" />
          <rect x={b.x} y={height - 10 - b.askH - b.midH} width={Math.max(b.w, 0.5)} height={b.midH} fill="rgba(154,163,173,0.35)" />
          <rect x={b.x} y={height - 10 - b.askH - b.midH - b.bidH} width={Math.max(b.w, 0.5)} height={b.bidH} fill="rgba(255,107,107,0.35)" />
        </g>
      ))}

      {/* Net premium line */}
      {netLine && <path d={netLine} fill="none" stroke="var(--accent)" strokeWidth={1.6} />}
    </svg>
  );
}

function UnderlyingChart({ series }: { series: SeriesPoint[] }) {
  const { pathD, areaD, priceLabels, width, height } = useMemo(() => {
    const W = 800;
    const H = 280;
    const top = 20;
    const bottom = 40;
    const chartH = H - top - bottom;

    if (series.length === 0) {
      return { pathD: "", areaD: "", priceLabels: [], width: W, height: H };
    }

    const closes = series.map((d) => d.c);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;

    const points = series.map((d, i) => {
      const x = (i / (series.length - 1)) * W;
      const y = top + chartH - ((d.c - min) / range) * chartH;
      return { x, y };
    });

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaD = pathD + ` L${W},${top + chartH} L0,${top + chartH} Z`;

    const priceLabels = Array.from({ length: 4 }, (_, i) => {
      const price = min + (range * (i / 3));
      const y = top + chartH - ((price - min) / range) * chartH;
      return { y, label: `$${price.toFixed(2)}` };
    });

    return { pathD, areaD, priceLabels, width: W, height: H };
  }, [series]);

  if (series.length === 0) {
    return <div className="py-12 text-center text-[var(--muted)]">No underlying data available.</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="underGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-2)" stopOpacity={0.25} />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {priceLabels.map((pl, i) => (
        <g key={i}>
          <line x1={0} y1={pl.y} x2={width} y2={pl.y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={width - 4} y={pl.y - 4} fill="rgba(154,163,173,0.5)" fontSize={10} textAnchor="end">
            {pl.label}
          </text>
        </g>
      ))}

      <path d={areaD} fill="url(#underGrad)" />
      <path d={pathD} fill="none" stroke="var(--accent-2)" strokeWidth={1.5} />
    </svg>
  );
}

function NetPremiumHistogram({ bins }: { bins: NetPremBin[] }) {
  const { width, height, bars, maxV } = useMemo(() => {
    const W = 800;
    const H = 220;
    if (bins.length === 0) {
      return { width: W, height: H, bars: [], maxV: 1 };
    }
    const maxV = Math.max(...bins.map((b) => b.v), 1);
    const barW = W / bins.length;
    const bars = bins.map((b, i) => {
      const h = (b.v / maxV) * (H - 30);
      const isPos = b.x1 > 0;
      return { x: i * barW + 2, w: Math.max(2, barW - 4), h, isPos };
    });
    return { width: W, height: H, bars, maxV };
  }, [bins]);

  if (bins.length === 0) {
    return <div className="py-12 text-center text-[var(--muted)]">No histogram data available.</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <line x1={0} y1={height - 20} x2={width} y2={height - 20} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={height - 20 - b.h}
          width={b.w}
          height={b.h}
          fill={b.isPos ? "rgba(94,225,181,0.35)" : "rgba(255,107,107,0.35)"}
        />
      ))}
    </svg>
  );
}

function TradesTable({ trades }: { trades: TradePrint[] }) {
  if (!trades || trades.length === 0) {
    return <div className="py-12 text-center text-[var(--muted)]">No trades available.</div>;
  }

  const fmtTime = (ms: number) => {
    const d = new Date(ms);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const fmtPrem = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e6) return `${n < 0 ? "-" : ""}$${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${n < 0 ? "-" : ""}$${(abs / 1e3).toFixed(1)}K`;
    return `${n < 0 ? "-" : ""}$${abs.toFixed(0)}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            <th className="px-3 py-2 text-left font-medium">Time</th>
            <th className="px-3 py-2 text-right font-medium">Price</th>
            <th className="px-3 py-2 text-right font-medium">Size</th>
            <th className="px-3 py-2 text-right font-medium">Premium</th>
            <th className="px-3 py-2 text-right font-medium">Side</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            <tr key={`${t.t}-${i}`} className="border-b border-[var(--border)] hover:bg-white/[0.02]">
              <td className="px-3 py-2 text-[var(--muted)]">{fmtTime(t.t)}</td>
              <td className="px-3 py-2 text-right tabular-nums">${t.price.toFixed(2)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{t.size}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtPrem(t.premium)}</td>
              <td className="px-3 py-2 text-right">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    t.side === "ASK"
                      ? "bg-emerald-500/15 text-[var(--accent)]"
                      : t.side === "BID"
                      ? "bg-red-500/15 text-[var(--danger)]"
                      : "bg-gray-500/15 text-[var(--muted)]"
                  }`}
                >
                  {t.side}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GreekBars({ delta, gamma, theta, vega }: { delta: number; gamma: number; theta: number; vega: number }) {
  const items = [
    { label: "Delta", value: delta, color: "var(--accent-2)" },
    { label: "Gamma", value: gamma, color: "var(--accent)" },
    { label: "Theta", value: theta, color: "var(--danger)" },
    { label: "Vega", value: vega, color: "var(--warning)" },
  ];
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.value)), 0.01);

  return (
    <div className="mt-2 grid grid-cols-4 gap-2">
      {items.map((i) => {
        const pct = Math.min(1, Math.abs(i.value) / maxAbs);
        return (
          <div key={i.label} className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
              <span>{i.label}</span>
              <span className="text-[var(--foreground)]">{i.value.toFixed(2)}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${(pct * 100).toFixed(0)}%`, background: i.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
