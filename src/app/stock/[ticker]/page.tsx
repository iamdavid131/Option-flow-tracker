"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import NewsLive from '../../../components/NewsLive';

/* ================================================================
   TYPES
   ================================================================ */
type ChartBar = { t: number; o: number; h: number; l: number; c: number; v: number };
type NewsItem = {
  title: string;
  publisher: string;
  publishedUtc: string;
  url: string;
  imageUrl: string;
  description: string;
};
type StockData = {
  ticker: string;
  name: string;
  description: string;
  industry: string;
  sector: string;
  homepageUrl: string;
  totalEmployees: number | null;
  listDate: string | null;
  primaryExchange: string;
  marketCap: number | null;
  sharesOutstanding: number | null;
  address: { address1: string; city: string; state: string; postal_code: string } | null;
  phoneNumber: string | null;
  currentPrice: number;
  change: number;
  changePct: number;
  afterHours: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  prevClose: number;
  prevHigh: number;
  prevLow: number;
  bid: number;
  bidSize: number;
  ask: number;
  askSize: number;
  chartData: ChartBar[];
  chartRange: string;
  news: NewsItem[];
  timestamp: string;
};

type FinancialPeriod = {
  fiscalYear: number;
  fiscalPeriod: string;
  startDate: string;
  endDate: string;
  filingDate: string;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  eps: number | null;
  epsBasic: number | null;
  ebitda: number | null;
  researchDev: number | null;
  sga: number | null;
  incomeTax: number | null;
  incomeBeforeTax: number | null;
  totalAssets: number | null;
  currentAssets: number | null;
  noncurrentAssets: number | null;
  totalLiabilities: number | null;
  currentLiabilities: number | null;
  noncurrentLiabilities: number | null;
  totalEquity: number | null;
  inventory: number | null;
  accountsPayable: number | null;
  longTermDebt: number | null;
  fixedAssets: number | null;
  intangibleAssets: number | null;
  operatingCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;
  netCashFlow: number | null;
};

/* ── Constants ── */
const RANGES = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1m" },
  { label: "6M", value: "6m" },
  { label: "YTD", value: "ytd" },
  { label: "1Y", value: "1y" },
  { label: "Max", value: "max" },
];

const EXCHANGE_MAP: Record<string, string> = {
  XNAS: "NASDAQ",
  XNYS: "NYSE",
  XASE: "AMEX",
  BATS: "CBOE BZX",
  ARCX: "NYSE ARCA",
  XCHI: "CHX",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "statistics", label: "Key Stats" },
  { id: "short-interest", label: "Short Interest" },
  { id: "news", label: "News" },
  { id: "profile", label: "Profile" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function StockProfilePage() {
  const params = useParams();
  const router = useRouter();
  const ticker = (params.ticker as string)?.toUpperCase() ?? "SPY";

  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState("1m");
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const fetchData = useCallback(
    async (range: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stock?ticker=${ticker}&range=${range}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        setLoading(false);
      }
    },
    [ticker]
  );

  useEffect(() => {
    fetchData(chartRange);
  }, [ticker, fetchData, chartRange]);

  /* ── Helpers ── */
  const fmtBig = (n: number | null) => {
    if (n == null) return "—";
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const fmtVol = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n.toLocaleString();
  };

  /* ── Loading / Error ── */
  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--muted)]">
        <svg className="mr-3 h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Loading {ticker} profile...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <p className="text-lg text-[var(--danger)]">Failed to load {ticker}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-xl bg-[var(--panel)] px-5 py-2 text-sm text-[var(--foreground)] border border-[var(--border)] hover:bg-white/5 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const exchangeName = EXCHANGE_MAP[data.primaryExchange] ?? data.primaryExchange;
  const isPositive = data.change >= 0;
  const ahChange = data.afterHours > 0 ? data.afterHours - data.currentPrice : 0;
  const ahChangePct = data.currentPrice > 0 ? (ahChange / data.currentPrice) * 100 : 0;

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(94,225,181,0.08),transparent)]" />

      <div className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Back button ── */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Dashboard
        </Link>

        {/* ── Company Header ── */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold">{data.name} ({data.ticker})</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {exchangeName} · Real-Time Price · USD
          </p>

          <div className="mt-4 flex flex-wrap items-baseline gap-6">
            <div>
              <span className="text-5xl font-bold tabular-nums">
                ${data.currentPrice.toFixed(2)}
              </span>
              <span className={`ml-3 text-xl font-semibold ${isPositive ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                {isPositive ? "+" : ""}
                {data.change.toFixed(2)} ({isPositive ? "+" : ""}
                {data.changePct.toFixed(2)}%)
              </span>
            </div>
            {data.afterHours > 0 && Math.abs(ahChange) > 0.001 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="tabular-nums text-lg font-semibold text-[var(--muted)]">
                  ${data.afterHours.toFixed(2)}
                </span>
                <span className={`text-sm ${ahChange >= 0 ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                  {ahChange >= 0 ? "+" : ""}
                  {ahChangePct.toFixed(2)}%
                </span>
                <span className="text-xs text-[var(--muted)]">After-hours</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="mb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[var(--accent)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "overview" && (
          <OverviewTab
            data={data}
            chartRange={chartRange}
            onRangeChange={setChartRange}
            isPositive={isPositive}
            fmtBig={fmtBig}
            fmtVol={fmtVol}
            exchangeName={exchangeName}
          />
        )}
        {activeTab === "financials" && (
          <FinancialsTab ticker={ticker} fmtBig={fmtBig} />
        )}
        {activeTab === "statistics" && (
          <StatisticsTab data={data} fmtBig={fmtBig} fmtVol={fmtVol} />
        )}
        {activeTab === "short-interest" && (
          <ShortInterestTab ticker={ticker} fmtBig={fmtBig} />
        )}
        {activeTab === "news" && <NewsTab news={data.news} />}
        {activeTab === "profile" && (
          <ProfileTab data={data} fmtBig={fmtBig} exchangeName={exchangeName} />
        )}

        <div className="h-12" />
      </div>
    </div>
  );
}

/* ================================================================
   OVERVIEW TAB
   ================================================================ */
function OverviewTab({
  data,
  chartRange,
  onRangeChange,
  isPositive,
  fmtBig,
  fmtVol,
  exchangeName,
}: {
  data: StockData;
  chartRange: string;
  onRangeChange: (r: string) => void;
  isPositive: boolean;
  fmtBig: (n: number | null) => string;
  fmtVol: (n: number) => string;
  exchangeName: string;
}) {
  const [aboutExpanded, setAboutExpanded] = useState(false);

  return (
    <>
      {/* Stats + Chart row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Key Stats */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Key Statistics
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">
              {([
                ["Bid", `$${data.bid.toFixed(2)}`],
                ["Ask", `$${data.ask.toFixed(2)}`],
                ["Market Cap", fmtBig(data.marketCap)],
                ["Volume", fmtVol(data.volume)],
                ["Open", `$${data.open.toFixed(2)}`],
                ["Prev Close", `$${data.prevClose.toFixed(2)}`],
                ["Day High", `$${data.high.toFixed(2)}`],
                ["Day Low", `$${data.low.toFixed(2)}`],
                ["VWAP", `$${data.vwap.toFixed(2)}`],
                ["Day Range", `$${data.low.toFixed(2)} – $${data.high.toFixed(2)}`],
              ] as [string, string][]).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-[var(--border)] py-3"
                >
                  <span className="text-sm text-[var(--muted)]">{label}</span>
                  <span className="text-sm font-medium tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => onRangeChange(r.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      chartRange === r.value
                        ? "bg-[var(--accent-2)] text-[#0c0f12] shadow-lg shadow-[var(--accent-2)]/20"
                        : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {data.chartData.length > 0 && <ChartPriceLabel data={data} />}
            </div>
            <PriceChart data={data.chartData} isPositive={isPositive} />
          </div>
        </div>
      </div>

      {/* About + Company Details */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h3 className="mb-3 text-lg font-semibold">About {data.ticker}</h3>
            {data.description ? (
              <div>
                <p className={`text-sm leading-relaxed text-[var(--muted)] ${!aboutExpanded ? "line-clamp-4" : ""}`}>
                  {data.description}
                </p>
                {data.description.length > 250 && (
                  <button
                    onClick={() => setAboutExpanded(!aboutExpanded)}
                    className="mt-2 text-sm font-medium text-[var(--accent-2)] hover:underline"
                  >
                    {aboutExpanded ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No description available.</p>
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Company Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Industry", data.industry || "—"],
                ["Exchange", exchangeName],
                ["IPO Date", data.listDate ? new Date(data.listDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"],
                ["Employees", data.totalEmployees ? data.totalEmployees.toLocaleString() : "—"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">{label}</p>
                  <p className="mt-0.5 text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
            {data.homepageUrl && (
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Website</p>
                <a href={data.homepageUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 text-sm font-medium text-[var(--accent-2)] hover:underline">
                  {data.homepageUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent News preview */}
      {data.news.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h3 className="mb-4 text-lg font-semibold">Latest News</h3>
          <div className="space-y-3">
            {data.news.slice(0, 3).map((article, i) => (
              <NewsCard key={i} article={article} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================
   FINANCIALS TAB
   ================================================================ */
function FinancialsTab({
  ticker,
  fmtBig,
}: {
  ticker: string;
  fmtBig: (n: number | null) => string;
}) {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"annual" | "quarterly">("annual");
  const [statement, setStatement] = useState<"income" | "balance" | "cashflow" | "ratios" | "tenk">("income");

  const fetchFinancials = useCallback(
    async (tf: "annual" | "quarterly") => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/financials?ticker=${ticker}&timeframe=${tf}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setPeriods(json.periods ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        setLoading(false);
      }
    },
    [ticker]
  );

  useEffect(() => {
    fetchFinancials(timeframe);
  }, [timeframe, fetchFinancials]);

  // 10-K fetch state
  const [tenkLoading, setTenkLoading] = useState(false);
  const [tenkError, setTenkError] = useState<string | null>(null);
  const [tenkData, setTenkData] = useState<any | null>(null);

  // Ratios state
  const [ratiosLoading, setRatiosLoading] = useState(false);
  const [ratiosError, setRatiosError] = useState<string | null>(null);
  const [ratiosData, setRatiosData] = useState<any | null>(null);

  const fetch10K = useCallback(async () => {
    setTenkLoading(true);
    setTenkError(null);
    setTenkData(null);
    try {
      const res = await fetch(`/api/financials/10k?ticker=${ticker}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTenkData(json);
    } catch (err) {
      setTenkError(err instanceof Error ? err.message : String(err));
    } finally {
      setTenkLoading(false);
    }
  }, [ticker]);

  const fetchRatios = useCallback(async () => {
    setRatiosLoading(true);
    setRatiosError(null);
    setRatiosData(null);
    try {
      const res = await fetch(`/api/financials/ratios?ticker=${ticker}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRatiosData(json);
    } catch (err) {
      setRatiosError(err instanceof Error ? err.message : String(err));
    } finally {
      setRatiosLoading(false);
    }
  }, [ticker]);

  // Clear 10-K state when switching away from the 10-K view
  useEffect(() => {
    if (statement !== 'tenk') {
      setTenkData(null);
      setTenkError(null);
      setTenkLoading(false);
    }
  }, [statement]);

  const fmtFin = (n: number | null) => {
    if (n == null) return "—";
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
    if (abs < 100) return `${n.toFixed(2)}`;
    return n.toLocaleString();
  };

  // Build rows based on active statement
  type RowDef = { label: string; key: keyof FinancialPeriod; highlight?: boolean };
  const incomeRows: RowDef[] = [
    { label: "Revenue", key: "revenue", highlight: true },
    { label: "Cost of Revenue", key: "costOfRevenue" },
    { label: "Gross Profit", key: "grossProfit", highlight: true },
    { label: "R&D Expenses", key: "researchDev" },
    { label: "SG&A Expenses", key: "sga" },
    { label: "Operating Expenses", key: "operatingExpenses" },
    { label: "Operating Income", key: "operatingIncome", highlight: true },
    { label: "Income Before Tax", key: "incomeBeforeTax" },
    { label: "Income Tax", key: "incomeTax" },
    { label: "Net Income", key: "netIncome", highlight: true },
    { label: "EPS (Diluted)", key: "eps", highlight: true },
    { label: "EPS (Basic)", key: "epsBasic" },
  ];

  const balanceRows: RowDef[] = [
    { label: "Total Assets", key: "totalAssets", highlight: true },
    { label: "Current Assets", key: "currentAssets" },
    { label: "Non-current Assets", key: "noncurrentAssets" },
    { label: "Inventory", key: "inventory" },
    { label: "Fixed Assets", key: "fixedAssets" },
    { label: "Intangible Assets", key: "intangibleAssets" },
    { label: "Total Liabilities", key: "totalLiabilities", highlight: true },
    { label: "Current Liabilities", key: "currentLiabilities" },
    { label: "Non-current Liabilities", key: "noncurrentLiabilities" },
    { label: "Accounts Payable", key: "accountsPayable" },
    { label: "Long-term Debt", key: "longTermDebt" },
    { label: "Total Equity", key: "totalEquity", highlight: true },
  ];

  const cashflowRows: RowDef[] = [
    { label: "Operating Cash Flow", key: "operatingCashFlow", highlight: true },
    { label: "Investing Cash Flow", key: "investingCashFlow" },
    { label: "Financing Cash Flow", key: "financingCashFlow" },
    { label: "Net Cash Flow", key: "netCashFlow", highlight: true },
  ];

  const rows =
    statement === "income" ? incomeRows : statement === "balance" ? balanceRows : cashflowRows;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--muted)]">
        <svg className="mr-3 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Loading financials...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-[var(--danger)]">
        Failed to load financials: {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      {/* Header row: statement tabs + timeframe toggle */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Statement type tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
          {([
            { id: "income" as const, label: "Income" },
            { id: "balance" as const, label: "Balance Sheet" },
            { id: "cashflow" as const, label: "Cash Flow" },
          ]).map((s) => (
            <button
              key={s.id}
              onClick={() => setStatement(s.id)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                statement === s.id
                  ? "bg-[var(--accent)] text-[#0c0f12] shadow-lg shadow-[var(--accent)]/20"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {s.label}
            </button>
          ))}

          {/* Ratios button between Cash Flow and 10-K */}
          <button
            type="button"
            onClick={() => { setStatement('ratios'); setRatiosLoading(true); fetchRatios(); }}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
              statement === 'ratios'
                ? "bg-[var(--accent)] text-[#0c0f12] shadow-lg shadow-[var(--accent)]/20"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Ratios
          </button>
          {/* 10-K button placed immediately after statement tabs */}
          <button
            type="button"
            onClick={() => { setStatement('tenk'); setTenkLoading(true); fetch10K(); }}
            id="btn-10k-inline"
            data-testid="btn-10k-inline"
            className="ml-2 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            title="Fetch 10-K filings"
          >
            10-K
          </button>
        </div>

        {/* Annual / Quarterly toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1">
          {([
            { id: "annual" as const, label: "Annual" },
            { id: "quarterly" as const, label: "Quarterly" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                timeframe === t.id
                  ? "bg-[var(--accent-2)] text-[#0c0f12] shadow-lg shadow-[var(--accent-2)]/20"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title: show Financials Ratios when viewing ratios; hide main title for 10-K */}
      {statement === 'ratios' ? (
        <>
          <h2 className="mb-1 text-2xl font-bold">Financials Ratios</h2>
          <p className="mb-4 text-xs text-[var(--muted)]">Ratios for {ticker}.</p>
        </>
      ) : statement !== 'tenk' && (
        <>
          <h2 className="mb-1 text-xl font-bold">
            {ticker} {" "}
            {statement === "income" ? "Income Statement" : statement === "balance" ? "Balance Sheet" : "Cash Flow Statement"}
          </h2>
          <p className="mb-4 text-xs text-[var(--muted)]">Financials in USD. {timeframe === "annual" ? "Annual" : "Quarterly"} data.</p>
        </>
      )}

      {/* Visual indicator for 10-K view: large heading + subtitle */}
      {statement === 'tenk' && (
        <div className="mb-4">
          <h2 className="mb-1 text-2xl font-bold">{ticker} 10-K Sections</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">Browse filings and extracted 10‑K sections for {ticker}.</p>
        </div>
      )}

      {/* 10-K results panel (renders when available) */}
      {statement === 'tenk' && (
      <div id="tenk-panel" className="mt-3">
        {tenkLoading && (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Fetching 10-K sections...
          </div>
        )}
        {tenkError && (
          <div className="rounded-md border border-[var(--danger)] bg-[var(--panel)] p-3 text-sm text-[var(--danger)]">
            Failed to fetch 10-K: {tenkError}
          </div>
        )}
        {tenkData && (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-md font-semibold">10-K Sections</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted)]">Source: {tenkData.source ?? 'N/A'}</span>
                <button
                  onClick={() => { setTenkData(null); setTenkError(null); }}
                  className="rounded-lg px-3 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Show pagination / next URL when available from Massive */}
            {(() => {
              const payload = tenkData.data ?? tenkData;
              const next = payload?.next_url ?? payload?.nextUrl ?? payload?.next;
              if (!next) return null;
              return (
                <div className="mb-3 text-sm">
                  <a href={next} target="_blank" rel="noreferrer" className="text-[var(--accent-2)] hover:underline">More 10-K sections</a>
                </div>
              );
            })()}

            {/* Heuristic: extract array of sections/filings from returned payload */}
            {(() => {
              const payload = tenkData.data ?? tenkData;
              let items: any[] = [];
              if (Array.isArray(payload)) items = payload;
              else if (Array.isArray(payload.results)) items = payload.results;
              else if (Array.isArray(payload.items)) items = payload.items;
              else if (Array.isArray(payload.sections)) items = payload.sections;
              else if (payload.filings && Array.isArray(payload.filings)) items = payload.filings;
              else if (payload.data && Array.isArray(payload.data)) items = payload.data;

              if (!items || items.length === 0) {
                return <div className="text-sm text-[var(--muted)]">No 10-K sections found for this ticker.</div>;
              }

              // Render table using Financials table styles
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                        <th className="sticky left-0 z-10 bg-[var(--panel-2)] px-4 py-3 text-left font-medium min-w-[180px]">Filing / Period</th>
                        <th className="px-4 py-3 text-left font-medium min-w-[220px]">Section</th>
                        <th className="px-4 py-3 text-left font-medium">Snippet</th>
                        <th className="px-4 py-3 text-left font-medium">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.slice(0, 30).map((it: any, i: number) => {
                        const filingDate = it.filing_date ?? it.filingDate ?? it.date ?? null;
                        const periodEnd = it.period_end ?? it.periodEnd ?? it.period ?? null;
                        const titleRaw = it.section_title ?? it.title ?? it.name ?? it.section ?? 'Section';
                        // normalize titles like "risk_factors" -> "Risk Factors"
                        const title = String(titleRaw).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                        const snippet = (it.section_text ?? it.text ?? it.snippet ?? it.summary) || '';
                        const link = it.filing_url ?? it.document_link ?? it.url ?? it.link ?? it.accession_url ?? it.pdf_url ?? null;
                        return (
                          <tr key={i} className={`border-b border-[var(--border)] transition-colors hover:bg-white/[0.02]`}>
                            <td className={`sticky left-0 z-10 bg-[var(--panel)] px-4 py-3 text-sm ${snippet ? 'font-medium' : 'text-[var(--muted)]'}`}>
                              <div className="whitespace-nowrap">{filingDate ? new Date(filingDate).toLocaleDateString() : '—'}</div>
                              <div className="text-xs text-[var(--muted)]">{periodEnd ? `Period: ${new Date(periodEnd).toLocaleDateString()}` : ''}</div>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">{title}</td>
                            <td className="px-4 py-3 text-sm text-[var(--muted)] max-w-[60ch] truncate">{snippet || '—'}</td>
                            <td className="px-4 py-3 text-sm">
                              {link ? (
                                <a href={link} target="_blank" rel="noreferrer" className="text-[var(--accent-2)] hover:underline">View</a>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      )}
      {statement === 'ratios' && (
        <div id="ratios-panel" className="mt-3">
          {ratiosLoading && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Fetching Ratios...
            </div>
          )}
          {ratiosError && (
            <div className="rounded-md border border-[var(--danger)] bg-[var(--panel)] p-3 text-sm text-[var(--danger)]">
              Failed to fetch ratios: {ratiosError}
            </div>
          )}
          {ratiosData && (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-md font-semibold">Ratios</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted)]">Source: {ratiosData.source ?? 'N/A'}</span>
                  <button
                    onClick={() => { setRatiosData(null); setRatiosError(null); setStatement('income'); }}
                    className="rounded-lg px-3 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Close
                  </button>
                </div>
              </div>

              {(() => {
                const payload = ratiosData.data ?? ratiosData;
                let items: any[] = [];
                if (Array.isArray(payload)) items = payload;
                else if (Array.isArray(payload.results)) items = payload.results;
                else if (Array.isArray(payload.items)) items = payload.items;
                else if (payload.data && Array.isArray(payload.data)) items = payload.data;

                if (!items || items.length === 0) {
                  return <div className="text-sm text-[var(--muted)]">No ratios found for this ticker.</div>;
                }

                // If the API returns a single object with many metric keys (company-level),
                // render a simple two-column Metric / Value table matching your sample.
                if (items.length === 1 && typeof items[0] === 'object') {
                  const obj = items[0];
                  const keys = Object.keys(obj).filter((k) => k !== 'ticker');
                  const formatValue = (v: any) => {
                    if (v == null) return '—';
                    if (typeof v === 'number') {
                      const abs = Math.abs(v);
                      if (abs >= 1e9) return fmtBig(v);
                      if (abs >= 1e6) return fmtBig(v);
                      if (Math.abs(v) >= 1000) return fmtBig(v);
                      if (Math.abs(v) < 1 && Math.abs(v) > 0) return v.toString();
                      if (Number.isInteger(v)) return v.toLocaleString();
                      return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
                    }
                    return String(v);
                  };

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px]">
                        <tbody>
                          {keys.map((k) => (
                            <tr key={k} className="border-b border-[var(--border)]">
                              <td className="px-4 py-3 text-sm text-[var(--muted)] font-medium" style={{width: '40%'}}>
                                {k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                              </td>
                              <td className="px-4 py-3 text-sm tabular-nums">{formatValue(obj[k])}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                // Fallback: treat as an array of ratio items (period, name, value)
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                          <th className="px-4 py-3 text-left font-medium">Period</th>
                          <th className="px-4 py-3 text-left font-medium">Ratio</th>
                          <th className="px-4 py-3 text-right font-medium">Value</th>
                          <th className="px-4 py-3 text-left font-medium">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.slice(0, 100).map((it: any, i: number) => {
                          const period = it.period_end ?? it.periodEnd ?? it.period ?? it.date ?? null;
                          const name = it.ratio ?? it.name ?? it.ratio_name ?? it.metric ?? 'Ratio';
                          const value = it.value ?? it.ratio_value ?? it.metricValue ?? it.val ?? null;
                          const link = it.url ?? it.link ?? it.filing_url ?? null;
                          return (
                            <tr key={i} className={`border-b border-[var(--border)] transition-colors hover:bg-white/[0.02]`}>
                              <td className="px-4 py-3 text-sm">{period ? new Date(period).toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-3 text-sm font-medium">{String(name)}</td>
                              <td className="px-4 py-3 text-sm text-right tabular-nums">{value != null ? String(value) : '—'}</td>
                              <td className="px-4 py-3 text-sm">{link ? <a href={link} target="_blank" rel="noreferrer" className="text-[var(--accent-2)] hover:underline">View</a> : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Table: hide when viewing 10-K or Ratios (ratios has its own view) */}
      {statement !== 'tenk' && statement !== 'ratios' && (
        periods.length === 0 ? (
          <p className="py-8 text-center text-[var(--muted)]">
            No financial data available for {ticker}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  <th className="sticky left-0 z-10 bg-[var(--panel-2)] px-4 py-3 text-left font-medium min-w-[200px]">
                    {timeframe === "annual" ? "FISCAL YEAR" : "QUARTER"}
                  </th>
                  {periods.map((p) => (
                    <th key={`${p.fiscalPeriod}-${p.fiscalYear}`} className="px-4 py-3 text-right font-medium min-w-[120px]">
                      {p.fiscalPeriod === "FY" ? `FY ${p.fiscalYear}` : `${p.fiscalPeriod} FY${p.fiscalYear}`}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-[var(--border)] text-[10px] text-[var(--muted)]">
                  <th className="sticky left-0 z-10 bg-[var(--panel)] px-4 py-2 text-left font-normal">
                    PERIOD ENDING
                  </th>
                  {periods.map((p) => (
                    <th key={`end-${p.fiscalPeriod}-${p.fiscalYear}`} className="px-4 py-2 text-right font-normal">
                      {new Date(p.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className={`border-b border-[var(--border)] transition-colors hover:bg-white/[0.02] ${
                      row.highlight ? "bg-white/[0.01]" : ""
                    }`}
                  >
                    <td className={`sticky left-0 z-10 bg-[var(--panel)] px-4 py-3 ${row.highlight ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                      {row.label}
                    </td>
                    {periods.map((p) => {
                      const val = p[row.key] as number | null;
                      const isNeg = val != null && val < 0;
                      return (
                        <td
                          key={`${row.key}-${p.fiscalPeriod}-${p.fiscalYear}`}
                          className={`px-4 py-3 text-right tabular-nums ${
                            row.highlight ? "font-semibold" : ""
                          } ${isNeg ? "text-[var(--danger)]" : ""}`}
                        >
                          {fmtFin(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

/* ================================================================
   STATISTICS TAB
   ================================================================ */
function StatisticsTab({
  data,
  fmtBig,
  fmtVol,
}: {
  data: StockData;
  fmtBig: (n: number | null) => string;
  fmtVol: (n: number) => string;
}) {
  const epsEst = data.marketCap && data.sharesOutstanding
    ? (data.marketCap / data.sharesOutstanding / 20).toFixed(2)
    : null;

  const sections: { title: string; items: [string, string][] }[] = [
    {
      title: "Valuation",
      items: [
        ["Market Cap", fmtBig(data.marketCap)],
        ["Shares Outstanding", fmtBig(data.sharesOutstanding)],
        ["Price / Share", `$${data.currentPrice.toFixed(2)}`],
      ],
    },
    {
      title: "Trading Data",
      items: [
        ["Open", `$${data.open.toFixed(2)}`],
        ["Previous Close", `$${data.prevClose.toFixed(2)}`],
        ["Day High", `$${data.high.toFixed(2)}`],
        ["Day Low", `$${data.low.toFixed(2)}`],
        ["VWAP", `$${data.vwap.toFixed(2)}`],
        ["Volume", fmtVol(data.volume)],
      ],
    },
    {
      title: "Price Action",
      items: [
        ["Day Range", `$${data.low.toFixed(2)} — $${data.high.toFixed(2)}`],
        ["Change ($)", `${data.change >= 0 ? "+" : ""}$${data.change.toFixed(2)}`],
        ["Change (%)", `${data.changePct >= 0 ? "+" : ""}${data.changePct.toFixed(2)}%`],
        ["Bid", `$${data.bid.toFixed(2)}`],
        ["Ask", `$${data.ask.toFixed(2)}`],
        ["Bid-Ask Spread", `$${Math.abs(data.ask - data.bid).toFixed(2)}`],
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {sections.map((section) => (
        <div
          key={section.title}
          className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5"
        >
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            {section.title}
          </h3>
          <div className="space-y-0">
            {section.items.map(([label, value]) => {
              const isChange = label.startsWith("Change");
              const isPositiveVal = value.startsWith("+");
              return (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-[var(--border)] py-3 last:border-0"
                >
                  <span className="text-sm text-[var(--muted)]">{label}</span>
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      isChange
                        ? isPositiveVal
                          ? "text-[var(--accent)]"
                          : "text-[var(--danger)]"
                        : ""
                    }`}
                  >
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   SHORT INTEREST TAB
   ================================================================ */
function ShortInterestTab({ ticker, fmtBig }: { ticker: string; fmtBig: (n: number | null) => string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [shortVolLoading, setShortVolLoading] = useState(false);
  const [shortVolItems, setShortVolItems] = useState<any[]>([]);

  const fetchShort = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/short-interest?ticker=${encodeURIComponent(ticker)}&limit=100`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const json = await res.json();
      const payload = json.data ?? json.results ?? json;
      let arr: any[] = [];
      if (Array.isArray(payload)) arr = payload;
      else if (Array.isArray(payload.results)) arr = payload.results;
      setItems(arr);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  const fetchShortVolume = useCallback(async () => {
    setShortVolLoading(true);
    try {
      const res = await fetch(`/api/short-volume?ticker=${encodeURIComponent(ticker)}&limit=100`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const json = await res.json();
      const payload = json.data ?? json.results ?? json;
      let arr: any[] = [];
      if (Array.isArray(payload)) arr = payload;
      else if (Array.isArray(payload.results)) arr = payload.results;
      setShortVolItems(arr);
    } catch (err) {
      // non-fatal: store empty and allow UI to show — log to console
      console.warn('short-volume fetch failed', err);
      setShortVolItems([]);
    } finally {
      setShortVolLoading(false);
    }
  }, [ticker]);

  useEffect(() => { fetchShort(); fetchShortVolume(); }, [fetchShort, fetchShortVolume]);

  // helper to normalize various incoming date formats to YYYY-MM-DD
  const normalizeDateKey = (v: any): string | null => {
    if (v === null || v === undefined) return null;
    try {
      if (typeof v === 'number') {
        const d = new Date(v);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
      const s = String(v).trim();
      // try Date constructor (handles ISO and common formats like MM/DD/YYYY)
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      // try YYYYMMDD
      const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}`).toISOString().slice(0, 10);
    } catch (e) {
      // fallthrough
    }
    return null;
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-[var(--muted)]">Loading short interest...</div>;
  if (error) return <div className="py-8 text-center text-[var(--danger)]">Failed to load short interest: {error}</div>;

  // compute top boxes using most recent two entries
  const latest = items && items.length > 0 ? items[0] : null;
  const prior = items && items.length > 1 ? items[1] : null;
  const currentShort = latest ? latest.short_interest ?? latest.shortInterest ?? null : null;
  const priorShort = prior ? prior.short_interest ?? prior.shortInterest ?? null : null;
  const daysToCover = latest ? latest.days_to_cover ?? latest.daysToCover ?? null : null;
  const avgVol = latest ? latest.avg_daily_volume ?? latest.avgDailyVolume ?? latest.avg_daily_volume ?? null : null;

  // find the best matching short-volume record for the latest short-interest date
  const latestDateKey = normalizeDateKey(latest?.settlement_date ?? latest?.settlementDate ?? latest?.date ?? latest?.effective_date ?? latest?.effectiveDate);
  const latestShortVolMatch = latestDateKey
    ? shortVolItems.find((s) => normalizeDateKey(s.settlement_date ?? s.settlementDate ?? s.date ?? s.effective_date ?? s.effectiveDate) === latestDateKey)
    : undefined;

  const pctChange = (currentShort != null && priorShort != null && priorShort !== 0)
    ? ((currentShort - priorShort) / Math.abs(priorShort)) * 100
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
        <h3 className="mb-4 text-lg font-semibold">Short Interest</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-5">
            <div className="text-xs text-[var(--muted)]">Short Interest</div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{currentShort != null ? fmtBig(currentShort) : '—'}</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-5">
            <div className="text-xs text-[var(--muted)]">Short Prior Period</div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{priorShort != null ? fmtBig(priorShort) : '—'}</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-5">
            <div className="text-xs text-[var(--muted)]">% Change MoM</div>
            <div className={`mt-2 text-2xl font-bold tabular-nums ${pctChange != null ? (pctChange >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]') : ''}`}>{pctChange != null ? `${pctChange.toFixed(2)}%` : '—'}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-5">
            <div className="text-xs text-[var(--muted)]">Short Volume</div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{
              (() => {
                const topVal = latestShortVolMatch
                  ? (latestShortVolMatch.short_volume ?? latestShortVolMatch.shortVolume ?? null)
                  : (shortVolItems && shortVolItems.length > 0 ? (shortVolItems[0].short_volume ?? shortVolItems[0].shortVolume ?? null) : null);
                return topVal != null ? fmtBig(topVal) : '—';
              })()
            }</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-5">
            <div className="text-xs text-[var(--muted)]">Avg Daily Volume</div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{avgVol != null ? fmtBig(avgVol) : '—'}</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-5">
            <div className="text-xs text-[var(--muted)]">Days To Cover</div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{daysToCover != null ? String(daysToCover) : '—'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-md font-semibold">History</h3>
          <div className="text-sm text-[var(--muted)]">Showing {items.length} records</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--panel-2)] text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Short Interest</th>
                <th className="px-4 py-3 text-right font-medium">Short Volume</th>
                <th className="px-4 py-3 text-right font-medium">Avg Daily Volume</th>
                <th className="px-4 py-3 text-right font-medium">Days To Cover</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, i: number) => (
                <tr key={i} className="border-b border-[var(--border)] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-sm">{it.settlement_date ? new Date(it.settlement_date).toLocaleDateString() : it.settlement_date ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">{it.short_interest != null ? fmtBig(it.short_interest) : (it.shortInterest != null ? fmtBig(it.shortInterest) : '—')}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">{
                    (() => {
                      const inlineVal = it.short_volume ?? it.shortVolume;
                      if (inlineVal != null) return fmtBig(inlineVal);
                      const itKey = normalizeDateKey(it.settlement_date ?? it.settlementDate ?? it.date ?? it.effective_date ?? it.effectiveDate);
                      if (!itKey) return '—';
                      const match = shortVolItems.find((s) => normalizeDateKey(s.settlement_date ?? s.settlementDate ?? s.date ?? s.effective_date ?? s.effectiveDate) === itKey);
                      return match ? fmtBig(match.short_volume ?? match.shortVolume) : '—';
                    })()
                  }</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">{(it.avg_daily_volume ?? it.avgDailyVolume) != null ? fmtBig(it.avg_daily_volume ?? it.avgDailyVolume) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-right">{it.days_to_cover != null ? String(it.days_to_cover) : (it.daysToCover != null ? String(it.daysToCover) : '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   NEWS TAB
   ================================================================ */
function NewsTab({ news }: { news: NewsItem[] }) {
  // Render live news component which polls the API
  const params = useParams();
  const rawTicker = params?.ticker;
  const ticker = (Array.isArray(rawTicker) ? rawTicker[0] ?? '' : rawTicker ?? '').toUpperCase();
  return <NewsLive ticker={ticker} />;
}

/* ================================================================
   PROFILE TAB
   ================================================================ */
function ProfileTab({
  data,
  fmtBig,
  exchangeName,
}: {
  data: StockData;
  fmtBig: (n: number | null) => string;
  exchangeName: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* About */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h3 className="mb-3 text-lg font-semibold">About {data.name}</h3>
          {data.description ? (
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {data.description}
            </p>
          ) : (
            <p className="text-sm text-[var(--muted)]">No description available.</p>
          )}
        </div>
      </div>

      {/* Company Info */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Company Information
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {([
              ["Industry", data.industry || "—"],
              ["Exchange", exchangeName],
              ["Ticker", data.ticker],
              ["Market Cap", fmtBig(data.marketCap)],
              ["IPO Date", data.listDate ? new Date(data.listDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"],
              ["Employees", data.totalEmployees ? data.totalEmployees.toLocaleString() : "—"],
              ["Shares Out", fmtBig(data.sharesOutstanding)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">{label}</p>
                <p className="mt-0.5 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-5">
            {data.homepageUrl && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Website</p>
                <a
                  href={data.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 text-sm font-medium text-[var(--accent-2)] hover:underline"
                >
                  {data.homepageUrl}
                </a>
              </div>
            )}
            {data.phoneNumber && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Phone</p>
                <p className="mt-0.5 text-sm font-medium">{data.phoneNumber}</p>
              </div>
            )}
            {data.address && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Address</p>
                <p className="mt-0.5 text-sm font-medium">
                  {data.address.address1}, {data.address.city}, {data.address.state} {data.address.postal_code}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SHARED: NEWS CARD
   ================================================================ */
function NewsCard({ article }: { article: NewsItem }) {
  const timeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks}w ago`;
  };

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4 transition-all hover:border-[var(--accent-2)]/30 hover:bg-white/[0.02]"
    >
      {article.imageUrl && (
        <div className="hidden sm:block flex-shrink-0 w-[140px] h-[90px] overflow-hidden rounded-lg bg-[var(--panel)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>{article.publisher}</span>
          <span>·</span>
          <span>{timeAgo(article.publishedUtc)}</span>
        </div>
        <h4 className="mt-1 text-sm font-semibold leading-snug group-hover:text-[var(--accent-2)] transition-colors line-clamp-2">
          {article.title}
        </h4>
        {article.description && (
          <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
            {article.description}
          </p>
        )}
      </div>
    </a>
  );
}

/* ================================================================
   CHART PRICE LABEL
   ================================================================ */
function ChartPriceLabel({ data }: { data: StockData }) {
  if (data.chartData.length < 2) return null;
  const first = data.chartData[0].c;
  const last = data.chartData[data.chartData.length - 1].c;
  const change = last - first;
  const changePct = first > 0 ? (change / first) * 100 : 0;
  const isPos = change >= 0;

  return (
    <span className={`text-sm font-semibold ${isPos ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
      {isPos ? "+" : ""}
      {changePct.toFixed(2)}%
    </span>
  );
}

/* ================================================================
   SVG PRICE CHART
   ================================================================ */
function PriceChart({ data, isPositive }: { data: ChartBar[]; isPositive: boolean }) {
  const { pathD, areaD, priceLabels, width, height, volumeBars } =
    useMemo(() => {
      const W = 800;
      const H = 300;
      const PADDING_TOP = 20;
      const PADDING_BOTTOM = 40;
      const chartH = H - PADDING_TOP - PADDING_BOTTOM;

      if (data.length === 0) {
        return {
          pathD: "",
          areaD: "",
          priceLabels: [] as { y: number; label: string }[],
          width: W,
          height: H,
          volumeBars: [] as { x: number; h: number; w: number }[],
        };
      }

      const closes = data.map((d) => d.c);
      const volumes = data.map((d) => d.v);
      const min = Math.min(...closes);
      const max = Math.max(...closes);
      const maxVol = Math.max(...volumes, 1);
      const range = max - min || 1;

      const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = PADDING_TOP + chartH - ((d.c - min) / range) * chartH;
        return { x, y };
      });

      const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const areaD = pathD + ` L${W},${PADDING_TOP + chartH} L0,${PADDING_TOP + chartH} Z`;

      const labelCount = 4;
      const priceLabels = Array.from({ length: labelCount }, (_, i) => {
        const price = min + (range * (i / (labelCount - 1)));
        const y = PADDING_TOP + chartH - ((price - min) / range) * chartH;
        return { y, label: `$${price.toFixed(2)}` };
      });

      const barW = Math.max(1, W / data.length - 0.5);
      const volH = 30;
      const volumeBars = data.map((d, i) => ({
        x: (i / (data.length - 1)) * W - barW / 2,
        h: (d.v / maxVol) * volH,
        w: barW,
      }));

      return { pathD, areaD, priceLabels, width: W, height: H, volumeBars };
    }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--muted)]">
        No chart data available.
      </div>
    );
  }

  const color = isPositive ? "var(--accent)" : "var(--danger)";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {priceLabels.map((pl, i) => (
        <g key={i}>
          <line x1={0} y1={pl.y} x2={width} y2={pl.y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={width - 4} y={pl.y - 4} fill="rgba(154,163,173,0.5)" fontSize={10} textAnchor="end" fontFamily="var(--font-jetbrains-mono), monospace">
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
          fill={data[i].c >= data[i].o ? "rgba(94,225,181,0.15)" : "rgba(255,107,107,0.15)"}
        />
      ))}

      <path d={areaD} fill="url(#chartGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} />

      {data.length > 0 &&
        (() => {
          const closes = data.map((d) => d.c);
          const min = Math.min(...closes);
          const max = Math.max(...closes);
          const range = max - min || 1;
          const lastY = 20 + 240 - ((data[data.length - 1].c - min) / range) * 240;
          return (
            <line x1={0} y1={lastY} x2={width} y2={lastY} stroke={color} strokeWidth={0.75} strokeDasharray="4,3" opacity={0.6} />
          );
        })()}
    </svg>
  );
}
