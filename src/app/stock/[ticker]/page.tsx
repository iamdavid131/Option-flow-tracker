"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  const [statement, setStatement] = useState<"income" | "balance" | "cashflow">("income");

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

      {/* Title */}
      <h2 className="mb-1 text-xl font-bold">
        {ticker}{" "}
        {statement === "income" ? "Income Statement" : statement === "balance" ? "Balance Sheet" : "Cash Flow Statement"}
      </h2>
      <p className="mb-4 text-xs text-[var(--muted)]">Financials in USD. {timeframe === "annual" ? "Annual" : "Quarterly"} data.</p>

      {/* Table */}
      {periods.length === 0 ? (
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
   NEWS TAB
   ================================================================ */
function NewsTab({ news }: { news: NewsItem[] }) {
  if (news.length === 0) {
    return (
      <div className="py-12 text-center text-[var(--muted)]">
        No news available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <h3 className="mb-4 text-lg font-semibold">News</h3>
      <div className="space-y-4">
        {news.map((article, i) => (
          <NewsCard key={i} article={article} />
        ))}
      </div>
    </div>
  );
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
