"use client";

import { useEffect, useMemo, useState } from "react";

type MarketRow = {
  symbol: string;
  name: string;
  price: string;
  change: string;
  positive: boolean;
};

type TradeRow = {
  pair: string;
  type: "LONG" | "SHORT";
  market: "Forex" | "Crypto" | "Stocks";
  entryExit: string;
  pnl: string;
  pnlPct: string;
  pnlRaw: number;
  positive: boolean;
  dateKey: string;
};

type StockSearchResult = {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primaryExchange: string;
};

type StockChartBar = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

const marketRows: MarketRow[] = [
  { symbol: "BTC", name: "Bitcoin", price: "$89,283", change: "-0.25%", positive: false },
  { symbol: "ETH", name: "Ethereum", price: "$2,957.84", change: "+0.39%", positive: true },
  { symbol: "USDT", name: "Tether", price: "$1", change: "-0.03%", positive: false },
  { symbol: "BNB", name: "BNB", price: "$887.62", change: "-0.32%", positive: false },
  { symbol: "XRP", name: "XRP", price: "$1.92", change: "-0.18%", positive: false },
];

const pathPoints = [
  [0, 74],
  [14, 72],
  [22, 68],
  [30, 58],
  [41, 52],
  [51, 50],
  [60, 62],
  [68, 79],
  [75, 77],
  [84, 72],
  [92, 60],
  [100, 44],
];

const journalTopTabs = [
  "Dashboard",
  "Trades",
  "Journal",
  "Calendar",
  "Reports",
  "Calculator",
  "Portfolio",
  "Analytics",
  "Discipline",
] as const;

function TopTabIcon({ tab }: { tab: typeof journalTopTabs[number] }) {
  if (tab === "Dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="tj-tab-icon">
        <rect x="3" y="3" width="7" height="7" rx="1.2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" />
        <rect x="14" y="14" width="7" height="7" rx="1.2" />
      </svg>
    );
  }

  if (tab === "Trades") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="tj-tab-icon">
        <path d="M3 17l5-5 4 4 8-8" />
        <path d="M17 8h3v3" />
      </svg>
    );
  }

  if (tab === "Journal") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="tj-tab-icon">
        <path d="M5 4h10a2 2 0 012 2v14H7a2 2 0 01-2-2V4z" />
        <path d="M7 4v14" />
      </svg>
    );
  }

  if (tab === "Calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="tj-tab-icon">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }

  if (tab === "Reports") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="tj-tab-icon">
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M15 3v3h3M9 13h6M9 17h4M9 9h6" />
      </svg>
    );
  }

  if (tab === "Calculator") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="tj-tab-icon">
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M9 8h6M9 12h2M13 12h2M9 16h2M13 16h2" />
      </svg>
    );
  }

  if (tab === "Portfolio") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="tj-tab-icon">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18" />
      </svg>
    );
  }

  if (tab === "Analytics") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="tj-tab-icon">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="tj-tab-icon">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function TradingJournalDashboard() {
  const [activeTopTab, setActiveTopTab] = useState<(typeof journalTopTabs)[number]>("Dashboard");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [stockChartTicker, setStockChartTicker] = useState("SPY");
  const [stockChartBars, setStockChartBars] = useState<StockChartBar[]>([]);
  const [stockChartLoading, setStockChartLoading] = useState(false);
  const [stockChartError, setStockChartError] = useState<string | null>(null);
  const [userTrades, setUserTrades] = useState<TradeRow[]>([]);
  const [tradesHydrated, setTradesHydrated] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeDraft, setTradeDraft] = useState({
    pair: "",
    type: "LONG" as "LONG" | "SHORT",
    market: "Forex" as "Forex" | "Crypto" | "Stocks",
    entry: "",
    exit: "",
    size: "",
  });

  const [tradeDateKey, setTradeDateKey] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const fallbackChartPath = useMemo(() => {
    return pathPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${point[1]}`)
      .join(" ");
  }, []);

  const chartCandles = useMemo(() => {
    if (stockChartBars.length < 2) return [] as Array<{
      x: number;
      highY: number;
      lowY: number;
      bodyY: number;
      bodyHeight: number;
      bodyWidth: number;
      bullish: boolean;
    }>;

    const maxCandles = 48;
    const source = stockChartBars.length <= maxCandles
      ? stockChartBars
      : Array.from({ length: maxCandles }, (_, index) => {
          const srcIndex = Math.floor((index / (maxCandles - 1)) * (stockChartBars.length - 1));
          return stockChartBars[srcIndex]!;
        });

    const high = Math.max(...source.map((bar) => bar.h));
    const low = Math.min(...source.map((bar) => bar.l));
    const span = high - low || 1;

    const yScale = (price: number) => 10 + ((high - price) / span) * 72;
    const slotWidth = 100 / source.length;
    const bodyWidth = Math.max(0.9, slotWidth * 0.58);

    return source.map((bar, index) => {
      const x = index * slotWidth + slotWidth / 2;
      const openY = yScale(bar.o);
      const closeY = yScale(bar.c);
      const highY = yScale(bar.h);
      const lowY = yScale(bar.l);
      const bodyY = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(openY - closeY), 0.65);

      return {
        x,
        highY,
        lowY,
        bodyY,
        bodyHeight,
        bodyWidth,
        bullish: bar.c >= bar.o,
      };
    });
  }, [stockChartBars]);

  const chartPath = useMemo(() => {
    if (stockChartBars.length < 2) return fallbackChartPath;

    const closes = stockChartBars.map((bar) => bar.c);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;

    return closes
      .map((price, index) => {
        const x = (index / (closes.length - 1)) * 100;
        const normalized = (price - min) / span;
        const y = 86 - normalized * 56;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [stockChartBars, fallbackChartPath]);

  const chartLabels = useMemo(() => {
    if (stockChartBars.length < 2) {
      return ["Jan 5", "Jan 6", "Jan 12", "Jan 14", "Jan 16", "Jan 18", "Jan 21", "Jan 24"];
    }

    const slots = 8;
    const lastIndex = stockChartBars.length - 1;

    return Array.from({ length: slots }, (_, index) => {
      const barIndex = Math.round((index / (slots - 1)) * lastIndex);
      const bar = stockChartBars[barIndex];
      if (!bar?.t) return "";

      return new Date(bar.t).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    });
  }, [stockChartBars]);

  const monthLabel = useMemo(
    () => calendarMonth.toLocaleString("en-US", { month: "short", year: "numeric" }),
    [calendarMonth]
  );

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();

    const cells: Array<Date | null> = [];
    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [calendarMonth]);

  const monthTotalTrades = userTrades.length;
  const monthWinningDays = userTrades.filter((trade) => trade.positive).length;
  const monthLosingDays = monthTotalTrades - monthWinningDays;
  const monthWinRate = monthTotalTrades > 0 ? Math.round((monthWinningDays / monthTotalTrades) * 100) : 0;

  const goPrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 1) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const response = await fetch(`/api/stock-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setSearchResults(Array.isArray(data.results) ? data.results : []);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setSearchResults([]);
        setSearchError("Unable to search stocks right now");
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();

    const loadStockChart = async () => {
      setStockChartLoading(true);
      setStockChartError(null);
      try {
        const response = await fetch(`/api/stock?ticker=${encodeURIComponent(stockChartTicker)}&range=1m`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const bars = ((data.chartData as Array<{ t: number; o: number; h: number; l: number; c: number }>) ?? [])
          .filter(
            (bar) =>
              typeof bar?.t === "number" &&
              typeof bar?.o === "number" &&
              typeof bar?.h === "number" &&
              typeof bar?.l === "number" &&
              typeof bar?.c === "number"
          );
        setStockChartBars(bars);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setStockChartBars([]);
        setStockChartError("Unable to load stock chart");
      } finally {
        setStockChartLoading(false);
      }
    };

    loadStockChart();
    return () => controller.abort();
  }, [stockChartTicker]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("tj-user-trades");
      if (!raw) {
        setTradesHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as TradeRow[];
      if (!Array.isArray(parsed)) {
        setTradesHydrated(true);
        return;
      }

      const restored = parsed.filter(
        (trade) =>
          typeof trade?.pair === "string" &&
          (trade?.type === "LONG" || trade?.type === "SHORT") &&
          (trade?.market === "Forex" || trade?.market === "Crypto" || trade?.market === "Stocks") &&
          typeof trade?.entryExit === "string" &&
          typeof trade?.pnl === "string" &&
          typeof trade?.pnlPct === "string" &&
          typeof trade?.pnlRaw === "number" &&
          typeof trade?.positive === "boolean" &&
          typeof trade?.dateKey === "string"
      );

      setUserTrades(restored);
    } catch {
      setUserTrades([]);
    } finally {
      setTradesHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!tradesHydrated) return;
    window.localStorage.setItem("tj-user-trades", JSON.stringify(userTrades));
  }, [userTrades, tradesHydrated]);

  const resetTradeDraft = () => {
    setTradeDraft({
      pair: "",
      type: "LONG",
      market: "Forex",
      entry: "",
      exit: "",
      size: "",
    });
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      setTradeDateKey(`${y}-${m}-${d}`);
    }
  };

  const handleTradeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tradeDraft.pair.trim()) return;

    const entry = Number(tradeDraft.entry);
    const exit = Number(tradeDraft.exit);
    const size = Number(tradeDraft.size);

    if (!Number.isFinite(entry) || !Number.isFinite(exit) || !Number.isFinite(size) || entry <= 0 || size <= 0) {
      return;
    }

    const direction = tradeDraft.type === "LONG" ? 1 : -1;
    const pnlRaw = (exit - entry) * size * direction;
    const basis = entry * size;
    const pnlPct = basis > 0 ? (pnlRaw / basis) * 100 : 0;
    const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    const signedPnl = `${pnlRaw >= 0 ? "+" : "-"}${currency.format(Math.abs(pnlRaw))}`;
    const signedPct = `${pnlPct >= 0 ? "+" : "-"}${Math.abs(pnlPct).toFixed(2)}%`;

    const trade: TradeRow = {
      pair: tradeDraft.pair.trim().toUpperCase(),
      type: tradeDraft.type,
      market: tradeDraft.market,
      entryExit: `${entry.toFixed(4)} → ${exit.toFixed(4)}`,
      pnl: signedPnl,
      pnlPct: signedPct,
      pnlRaw,
      positive: pnlRaw >= 0,
      dateKey: tradeDateKey,
    };

    setUserTrades((prev) => [trade, ...prev]);
    setShowTradeForm(false);
    resetTradeDraft();
  };

  const dailyStats = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number }>();
    userTrades.forEach((trade) => {
      const current = map.get(trade.dateKey) ?? { pnl: 0, trades: 0 };
      current.pnl += trade.pnlRaw;
      current.trades += 1;
      map.set(trade.dateKey, current);
    });
    return map;
  }, [userTrades]);

  const monthTotals = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const inMonthTrades = userTrades.filter((trade) => {
      const date = new Date(`${trade.dateKey}T00:00:00`);
      return date >= monthStart && date <= monthEnd;
    });

    const netPnl = inMonthTrades.reduce((sum, trade) => sum + trade.pnlRaw, 0);
    const byDay = new Map<string, number>();
    inMonthTrades.forEach((trade) => {
      byDay.set(trade.dateKey, (byDay.get(trade.dateKey) ?? 0) + trade.pnlRaw);
    });
    const winningDays = Array.from(byDay.values()).filter((value) => value > 0).length;
    const losingDays = Array.from(byDay.values()).filter((value) => value < 0).length;
    const totalDays = byDay.size;
    const winRate = totalDays > 0 ? Math.round((winningDays / totalDays) * 100) : 0;

    return {
      netPnl,
      totalTrades: inMonthTrades.length,
      winningDays,
      losingDays,
      totalDays,
      winRate,
    };
  }, [userTrades, calendarMonth]);

  const weeklyPnl = useMemo(() => {
    const anchor = selectedDate ?? new Date();
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - anchor.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const weekTrades = userTrades.filter((trade) => {
      const date = new Date(`${trade.dateKey}T00:00:00`);
      return date >= start && date <= end;
    });

    const pnl = weekTrades.reduce((sum, trade) => sum + trade.pnlRaw, 0);
    return {
      start,
      end,
      pnl,
      trades: weekTrades.length,
    };
  }, [selectedDate, userTrades]);

  const handleSelectStock = (stock: StockSearchResult) => {
    setSearchQuery(`${stock.ticker} — ${stock.name}`);
    setSearchResults([]);
    setSearchOpen(false);
    setStockChartTicker(stock.ticker);
    setShowTradeForm(true);
    setTradeDraft((prev) => ({ ...prev, pair: stock.ticker }));
  };

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Math.abs(value));
    return `${value >= 0 ? "+" : "-"}${formatted}`;
  };

  return (
    <div className="tj-wrap">
      <div className="tj-topbar">
        <div className="tj-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="tj-search-icon">
            <path d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
          </svg>
          <input
            className="tj-search"
            placeholder="Search trades, symbols..."
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(true);
            }}
          />

          {searchOpen && (searchQuery.trim().length > 0 || searchLoading || searchError) && (
            <div className="tj-search-results" role="listbox" aria-label="Stock search results">
              {searchLoading && <div className="tj-search-meta">Searching stocks…</div>}

              {!searchLoading && searchError && (
                <div className="tj-search-meta tj-search-error">{searchError}</div>
              )}

              {!searchLoading && !searchError && searchResults.length === 0 && (
                <div className="tj-search-meta">No stocks found</div>
              )}

              {!searchLoading && !searchError && searchResults.map((stock) => (
                <button
                  key={`${stock.ticker}-${stock.primaryExchange}`}
                  type="button"
                  className="tj-search-result-item"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelectStock(stock)}
                >
                  <div className="tj-search-result-main">
                    <span className="tj-search-result-ticker">{stock.ticker}</span>
                    <span className="tj-search-result-name">{stock.name}</span>
                  </div>
                  <span className="tj-search-result-meta">{stock.primaryExchange || stock.market || stock.locale}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="tj-tabs-top" role="tablist" aria-label="Trading journal sections">
          {journalTopTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tj-top-tab ${activeTopTab === tab ? "tj-top-tab-active" : ""}`}
              onClick={() => setActiveTopTab(tab)}
            >
              <TopTabIcon tab={tab} />
              <span>{tab}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTopTab === "Calendar" ? (
        <div className="tj-cal-shell">
          <div className="tj-cal-header-row">
            <div>
              <h2 className="tj-title">Trading Calendar</h2>
              <p className="tj-sub">Track your daily performance and identify patterns</p>
            </div>
            <button type="button" className="tj-cal-today" onClick={goToToday}>Today</button>
          </div>

          <div className="tj-cal-grid-wrap">
            <section className="tj-cal-board">
              <div className="tj-cal-month-row">
                <div className="tj-cal-month-nav">
                  <button type="button" className="tj-cal-month-btn" onClick={goPrevMonth} aria-label="Previous month">‹</button>
                  <strong>{monthLabel}</strong>
                  <button type="button" className="tj-cal-month-btn" onClick={goNextMonth} aria-label="Next month">›</button>
                </div>
                <div className="tj-cal-month-pnl">
                  <span>
                    P&amp;L: <strong className={monthTotals.netPnl >= 0 ? "tj-up" : "tj-down"}>{formatCurrency(monthTotals.netPnl)}</strong>
                  </span>
                  <span>{monthTotals.totalDays} {monthTotals.totalDays === 1 ? "day" : "days"}</span>
                </div>
              </div>

              <div className="tj-cal-weekdays">
                {[
                  "Sun",
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                ].map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div className="tj-cal-cells">
                {calendarCells.map((cell, index) => {
                  if (!cell) {
                    return <div key={`blank-${index}`} className="tj-cal-cell tj-cal-cell-empty" />;
                  }

                  const today = new Date();
                  const isSelected = selectedDate ? isSameDay(cell, selectedDate) : false;
                  const isToday = isSameDay(cell, today);
                  const y = cell.getFullYear();
                  const m = String(cell.getMonth() + 1).padStart(2, "0");
                  const d = String(cell.getDate()).padStart(2, "0");
                  const dateKey = `${y}-${m}-${d}`;
                  const stat = dailyStats.get(dateKey);
                  const pnlValue = stat?.pnl ?? 0;
                  const tradesCount = stat?.trades ?? 0;
                  const toneClass = tradesCount === 0 ? "" : pnlValue > 0 ? "tj-cal-cell-green" : pnlValue < 0 ? "tj-cal-cell-red" : "tj-cal-cell-neutral";

                  return (
                    <button
                      key={`${cell.getFullYear()}-${cell.getMonth()}-${cell.getDate()}`}
                      type="button"
                      className={`tj-cal-cell ${isSelected ? "tj-cal-cell-selected" : ""} ${isToday ? "tj-cal-cell-today" : ""} ${toneClass}`}
                      onClick={() => {
                        setSelectedDate(cell);
                        setTradeDateKey(dateKey);
                      }}
                    >
                      <span className="tj-cal-day">{cell.getDate()}</span>
                      {tradesCount > 0 && (
                        <span className={`tj-cal-pnl ${pnlValue >= 0 ? "tj-up" : "tj-down"}`}>{formatCurrency(pnlValue)}</span>
                      )}
                      {tradesCount > 0 && <span className="tj-cal-trades">{tradesCount} trade{tradesCount > 1 ? "s" : ""}</span>}
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="tj-cal-side">
              <section className="tj-panel tj-cal-summary">
                <h3>Monthly Summary</h3>
                <div className="tj-cal-stats">
                  <div><span>Net P&amp;L</span><strong className={monthTotals.netPnl >= 0 ? "tj-up" : "tj-down"}>{formatCurrency(monthTotals.netPnl)}</strong></div>
                  <div><span>Total Trades</span><strong>{monthTotals.totalTrades}</strong></div>
                  <div><span>Winning Days</span><strong className="tj-up">{monthTotals.winningDays}</strong></div>
                  <div><span>Losing Days</span><strong className="tj-down">{monthTotals.losingDays}</strong></div>
                  <div><span>Win Rate</span><strong>{monthTotals.winRate}%</strong></div>
                </div>
              </section>

              <section className="tj-panel tj-cal-weekly">
                <h3>Weekly P&amp;L</h3>
                <div className="tj-cal-stats">
                  <div>
                    <span>{weeklyPnl.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {weeklyPnl.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    <strong className={weeklyPnl.pnl >= 0 ? "tj-up" : "tj-down"}>{formatCurrency(weeklyPnl.pnl)}</strong>
                  </div>
                  <div>
                    <span>Trades</span>
                    <strong>{weeklyPnl.trades}</strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      ) : (
        <>
      <div className="tj-headline">
        <h2 className="tj-title">Dashboard</h2>
        <p className="tj-sub">Welcome back! Here's your trading overview.</p>
      </div>

      <div className="tj-stats-grid">
        <article className="tj-stat-card">
          <p className="tj-stat-label">Total Balance</p>
          <p className="tj-stat-value">$47,194.00</p>
          <p className="tj-stat-delta tj-up">↗ +17.93% vs cost</p>
        </article>
        <article className="tj-stat-card">
          <p className="tj-stat-label">Crypto P&amp;L</p>
          <p className="tj-stat-value tj-accent">$992.82</p>
          <p className="tj-stat-delta tj-up">↗ +1.04% vs cost</p>
        </article>
        <article className="tj-stat-card">
          <p className="tj-stat-label">Forex P&amp;L</p>
          <p className="tj-stat-value tj-accent">$1,774.38</p>
          <p className="tj-stat-delta tj-up">↗ +2.61% vs cost</p>
        </article>
        <article className="tj-stat-card">
          <p className="tj-stat-label">Stocks P&amp;L</p>
          <p className="tj-stat-value tj-accent">$0.00</p>
          <p className="tj-stat-delta tj-up">↗ +0.00% vs cost</p>
        </article>
      </div>

      <div className="tj-grid-top">
        <section className="tj-panel tj-chart-panel">
          <div className="tj-panel-head">
            <h3>Stock Chart</h3>
            <div className="tj-pill-group">
              <button className="tj-pill tj-pill-active" type="button">{stockChartTicker}</button>
              <button className="tj-pill" type="button">1M</button>
            </div>
          </div>

          <div className="tj-chart-wrap">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="tj-chart-svg" role="img" aria-label="Stock price chart">
              <defs>
                <linearGradient id="tjFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(52, 211, 153, 0.25)" />
                  <stop offset="100%" stopColor="rgba(52, 211, 153, 0.03)" />
                </linearGradient>
              </defs>

              {[22, 40, 58, 76].map((y) => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} className="tj-chart-grid" />
              ))}

              {chartCandles.length > 0 ? (
                chartCandles.map((candle, index) => (
                  <g key={index}>
                    <line
                      x1={candle.x}
                      y1={candle.highY}
                      x2={candle.x}
                      y2={candle.lowY}
                      className={`tj-candle-wick ${candle.bullish ? "tj-candle-up" : "tj-candle-down"}`}
                    />
                    <rect
                      x={candle.x - candle.bodyWidth / 2}
                      y={candle.bodyY}
                      width={candle.bodyWidth}
                      height={candle.bodyHeight}
                      rx="0.22"
                      className={`tj-candle-body ${candle.bullish ? "tj-candle-up" : "tj-candle-down"}`}
                    />
                  </g>
                ))
              ) : (
                <>
                  <path d={`${chartPath} L100 100 L0 100 Z`} fill="url(#tjFill)" />
                  <path d={chartPath} className="tj-chart-line" />
                </>
              )}
            </svg>
            <div className="tj-chart-meta">
              {stockChartLoading && <span>Loading {stockChartTicker}…</span>}
              {!stockChartLoading && stockChartError && <span className="tj-down">{stockChartError}</span>}
              {!stockChartLoading && !stockChartError && stockChartBars.length < 2 && <span>No chart data</span>}
            </div>
            <div className="tj-chart-xlabels">
              {chartLabels.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="tj-panel tj-market-panel">
          <div className="tj-panel-head">
            <h3>Live Market Prices</h3>
            <span className="tj-panel-muted">Updated 23:20:42</span>
          </div>

          <div className="tj-market-list">
            {marketRows.map((row) => (
              <article key={row.symbol} className="tj-market-row">
                <div className={`tj-coin tj-coin-${row.symbol.toLowerCase()}`}>{row.symbol.slice(0, 1)}</div>
                <div className="tj-market-main">
                  <p className="tj-market-symbol">{row.symbol}</p>
                  <p className="tj-market-name">{row.name}</p>
                </div>
                <div className="tj-market-price-block">
                  <p className="tj-market-price">{row.price}</p>
                  <p className={row.positive ? "tj-up" : "tj-down"}>{row.change}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="tj-grid-bottom">
        <section className="tj-panel">
          <div className="tj-panel-head">
            <h3>Recent Trades</h3>
            <button type="button" className="tj-link-btn">View All</button>
          </div>

          {userTrades.length === 0 ? (
            <div className="tj-empty-state">
              <p>No trades yet.</p>
              <button type="button" className="tj-empty-btn" onClick={() => setShowTradeForm(true)}>
                Add your first trade
              </button>
            </div>
          ) : (
            <div className="tj-trades-list">
              {userTrades.map((trade, index) => (
                <article key={`${trade.pair}-${index}`} className="tj-trade-row">
                  <div className={`tj-trade-dir ${trade.positive ? "tj-trade-up" : "tj-trade-down"}`}>{trade.positive ? "↗" : "↘"}</div>
                  <div className="tj-trade-main">
                    <div className="tj-trade-topline">
                      <p className="tj-trade-pair">{trade.pair}</p>
                      <span className="tj-badge">{trade.type}</span>
                      <span className="tj-market-tag">{trade.market}</span>
                    </div>
                    <p className="tj-trade-sub">{trade.entryExit}</p>
                  </div>
                  <div className="tj-trade-pnl">
                    <p className={trade.positive ? "tj-up" : "tj-down"}>{trade.pnl}</p>
                    <p className={trade.positive ? "tj-up" : "tj-down"}>{trade.pnlPct}</p>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="tj-add-trade-row">
            <button type="button" className="tj-add-trade-btn" onClick={() => setShowTradeForm((prev) => !prev)}>
              {showTradeForm ? "Close" : "Add your trade"}
            </button>
          </div>

          {showTradeForm && (
            <form className="tj-trade-form" onSubmit={handleTradeSubmit}>
              <div className="tj-trade-form-grid">
                <label className="tj-form-label">
                  Trade Date
                  <input
                    className="tj-input"
                    type="date"
                    value={tradeDateKey}
                    onChange={(event) => setTradeDateKey(event.target.value)}
                  />
                </label>

                <label className="tj-form-label">
                  Pair / Symbol
                  <input
                    className="tj-input"
                    placeholder="e.g. EUR/USD"
                    value={tradeDraft.pair}
                    onChange={(event) => setTradeDraft((prev) => ({ ...prev, pair: event.target.value }))}
                  />
                </label>

                <label className="tj-form-label">
                  Market
                  <select
                    className="tj-select"
                    value={tradeDraft.market}
                    onChange={(event) => setTradeDraft((prev) => ({ ...prev, market: event.target.value as "Forex" | "Crypto" | "Stocks" }))}
                  >
                    <option>Forex</option>
                    <option>Crypto</option>
                    <option>Stocks</option>
                  </select>
                </label>

                <label className="tj-form-label">
                  Direction
                  <select
                    className="tj-select"
                    value={tradeDraft.type}
                    onChange={(event) => setTradeDraft((prev) => ({ ...prev, type: event.target.value as "LONG" | "SHORT" }))}
                  >
                    <option>LONG</option>
                    <option>SHORT</option>
                  </select>
                </label>

                <label className="tj-form-label">
                  Entry
                  <input
                    className="tj-input"
                    type="number"
                    step="0.0001"
                    placeholder="1.2300"
                    value={tradeDraft.entry}
                    onChange={(event) => setTradeDraft((prev) => ({ ...prev, entry: event.target.value }))}
                  />
                </label>

                <label className="tj-form-label">
                  Exit
                  <input
                    className="tj-input"
                    type="number"
                    step="0.0001"
                    placeholder="1.2450"
                    value={tradeDraft.exit}
                    onChange={(event) => setTradeDraft((prev) => ({ ...prev, exit: event.target.value }))}
                  />
                </label>

                <label className="tj-form-label">
                  Size
                  <input
                    className="tj-input"
                    type="number"
                    step="1"
                    placeholder="10000"
                    value={tradeDraft.size}
                    onChange={(event) => setTradeDraft((prev) => ({ ...prev, size: event.target.value }))}
                  />
                </label>
              </div>

              <div className="tj-trade-form-actions">
                <button type="button" className="tj-empty-btn" onClick={() => { resetTradeDraft(); setShowTradeForm(false); }}>
                  Cancel
                </button>
                <button type="submit" className="tj-primary">Save Trade</button>
              </div>
            </form>
          )}
        </section>

        <section className="tj-panel tj-calc-panel">
          <div className="tj-panel-head">
            <h3>Profit Calculator</h3>
            <button type="button" className="tj-refresh">⟳</button>
          </div>

          <div className="tj-form">
            <label className="tj-form-label" htmlFor="assetType">Asset Type</label>
            <select id="assetType" className="tj-select" defaultValue="Forex">
              <option>Forex</option>
              <option>Crypto</option>
              <option>Stocks</option>
            </select>

            <label className="tj-form-label" htmlFor="entry">Entry Price</label>
            <input id="entry" className="tj-input" defaultValue="1.2300" />

            <label className="tj-form-label" htmlFor="exit">Exit Price</label>
            <input id="exit" className="tj-input" defaultValue="1.2500" />

            <label className="tj-form-label" htmlFor="size">Position Size</label>
            <input id="size" className="tj-input" defaultValue="10000" />

            <button type="button" className="tj-primary">Calculate</button>
          </div>
        </section>
      </div>
        </>
      )}
    </div>
  );
}
