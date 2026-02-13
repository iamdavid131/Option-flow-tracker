"use client";

import React, { useMemo, useState } from "react";

/* =========================
   MOCK DATA
========================= */

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  category: "Market" | "Earnings" | "Crypto" | "Macro" | "Tech";
  tickers: string[];
};

const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "Mega-cap tech drifts higher as traders rotate into quality",
    summary:
      "A calm session pushes leaders slightly up while smaller names lag. Volatility stays muted and breadth remains mixed.",
    source: "PulseWire",
    publishedAt: "2026-02-12T15:32:00Z",
    category: "Tech",
    tickers: ["AAPL", "MSFT", "NVDA"],
  },
  {
    id: "2",
    title: "Fed speakers emphasize patience; rates seen 'higher for longer'",
    summary:
      "Officials reinforce data-dependence. Rate-cut expectations slide modestly as markets reprice the path of policy.",
    source: "MacroBrief",
    publishedAt: "2026-02-12T14:11:00Z",
    category: "Macro",
    tickers: ["TLT", "DXY"],
  },
  {
    id: "3",
    title: "Energy pops on supply headlines as crude rebounds",
    summary:
      "Oil snaps back after a multi-day pullback. Energy equities outperform; refiners see heavier volume.",
    source: "MarketDesk",
    publishedAt: "2026-02-12T13:06:00Z",
    category: "Market",
    tickers: ["XLE", "CVX", "XOM"],
  },
  {
    id: "4",
    title: "Bitcoin volatility jumps as liquidations sweep through majors",
    summary:
      "A fast move triggers a cascade of forced selling. Derivatives open interest drops while spot demand stabilizes.",
    source: "ChainSignal",
    publishedAt: "2026-02-12T12:24:00Z",
    category: "Crypto",
    tickers: ["BTC", "ETH"],
  },
  {
    id: "5",
    title: "Retail earnings beat expectations, guidance cautious",
    summary:
      "Margins improve, but management flags a choppy demand picture. Investors reward execution while fading rosy forecasts.",
    source: "EarningsNow",
    publishedAt: "2026-02-12T11:45:00Z",
    category: "Earnings",
    tickers: ["WMT", "TGT", "AMZN"],
  },
];

/* =========================
   UTIL
========================= */

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(1, Math.round((now - d) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

/* =========================
   PAGE
========================= */

export default function NewsMock() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return mockNews
      .filter((n) => (category === "All" ? true : n.category === category))
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.summary.toLowerCase().includes(q) ||
          n.tickers.join(" ").toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      );
  }, [query, category]);

  return (
    <div style={styles.wrapper}>
      {/* TOP BAR */}
      <div style={styles.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Pulse</h1>
          <span style={styles.badge}>News</span>
        </div>

        <input
          placeholder="Search tickers, macro, earnings..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.search}
        />

        <span style={styles.badge}>Live (mock)</span>
      </div>

      <div style={styles.grid}>
        {/* LEFT FEED */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={{ fontSize: 14, opacity: 0.7 }}>
              News Feed
            </span>
            <span style={styles.badge}>
              {filtered.length} items
            </span>
          </div>

          {/* FILTERS */}
          <div style={{ padding: 12, display: "flex", gap: 8 }}>
            {["All", "Market", "Earnings", "Crypto", "Macro", "Tech"].map(
              (c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    ...styles.pill,
                    ...(category === c ? styles.pillActive : {}),
                  }}
                >
                  {c}
                </button>
              )
            )}
          </div>

          <div style={{ padding: 12, display: "grid", gap: 12 }}>
            {filtered.map((item) => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={{ opacity: 0.6, fontSize: 12 }}>
                    {item.source} • {timeAgo(item.publishedAt)}
                  </div>
                  <span style={styles.tag}>{item.category}</span>
                </div>

                <h3 style={{ margin: 0, fontSize: 16 }}>
                  {item.title}
                </h3>

                <p style={{ margin: 0, opacity: 0.7, fontSize: 13 }}>
                  {item.summary}
                </p>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {item.tickers.map((t) => (
                    <span key={t} style={styles.ticker}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ display: "grid", gap: 16 }}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={{ fontSize: 14, opacity: 0.7 }}>
                Watchlist
              </span>
            </div>
            <div style={{ padding: 12, display: "grid", gap: 8 }}>
              {["SPY", "QQQ", "IWM", "BTC"].map((s) => (
                <div key={s} style={styles.row}>
                  <strong>{s}</strong>
                  <span style={{ opacity: 0.6, fontSize: 12 }}>
                    Mock
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={{ fontSize: 14, opacity: 0.7 }}>
                Trending
              </span>
            </div>
            <div style={{ padding: 12, display: "grid", gap: 8 }}>
              {["NVDA", "AAPL", "TSLA", "AMD", "META"].map(
                (t) => (
                  <div key={t} style={styles.row}>
                    <strong>{t}</strong>
                    <span style={{ opacity: 0.6, fontSize: 12 }}>
                      Hot
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   STYLES
========================= */

const styles: any = {
  wrapper: {
    minHeight: "100vh",
    padding: 20,
    background:
      "radial-gradient(circle at 20% 0%, #1a1f2f, #0b0d12)",
    color: "white",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
  },
  search: {
    flex: 1,
    margin: "0 20px",
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "white",
  },
  badge: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.1)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 20,
  },
  panel: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  panelHeader: {
    padding: 14,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
  },
  pill: {
    padding: "6px 12px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "white",
    cursor: "pointer",
  },
  pillActive: {
    background: "rgba(255,255,255,0.15)",
  },
  card: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 8,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
  },
  tag: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.1)",
  },
  ticker: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 20,
    background: "rgba(0,0,0,0.4)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    background: "rgba(255,255,255,0.05)",
  },
};
