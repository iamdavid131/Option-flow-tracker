import { NextRequest, NextResponse } from "next/server";
// register flow-discovered tickers with spot-prices module so streamed/aggregated lists include them
import { addDynamicTickers, getAllTickers } from "../spot-prices/route";

const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.polygon.io";

/**
 * GET /api/flow?tickers=NVDA,AAPL,TSLA,SPY,META,AMD,SMCI,MSFT,AMZN,GOOGL
 *
 * Fetches near-the-money options snapshots for the given underlyings and
 * returns them in a normalised shape the front-end can display directly.
 *
 * Strategy:
 *  1. Get spot prices via stock snapshots.
 *  2. For each ticker, fetch options snapshots filtered to ±15% of spot
 *     and expiring within 60 days – these are the most active contracts.
 *  3. Filter to contracts with open_interest > 0 (real activity).
 *  4. Normalise into FlowOrder rows.
 */
export async function GET(req: NextRequest) {
  const tickersParam =
    req.nextUrl.searchParams.get("tickers") ??
    "NVDA,AAPL,TSLA,SPY,META,AMD,SMCI,MSFT,AMZN,GOOGL";
  const limitParam = req.nextUrl.searchParams.get("limit");
  const snapLimitParam = req.nextUrl.searchParams.get("snapLimit");
  const limit = Math.min(500, Math.max(50, parseInt(limitParam ?? "250", 10)));
  const snapLimit = Math.min(250, Math.max(50, parseInt(snapLimitParam ?? "150", 10)));
  let tickers = tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);

  // support querying all known tickers with `tickers=ALL` or empty param
  if (tickersParam === null || tickersParam.trim().length === 0 || tickersParam.toUpperCase() === "ALL") {
    try {
      const all = await getAllTickers();
      tickers = all.map((t) => String(t).toUpperCase()).filter(Boolean).slice(0, 400);
    } catch {
      // fallback to provided list
    }
  }

  try {
    addDynamicTickers(tickers);
  } catch {
    // ignore
  }

  try {
    const computed = await computeFlowForTickers(tickers, limit, snapLimit);
    return NextResponse.json(
      {
        orders: computed.orders.slice(0, limit).map(({ sortTs, ...row }) => row),
        spotPrices: computed.spotPrices,
        timestamp: computed.timestamp,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Flow API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch flow data", orders: [], spotPrices: {} },
      { status: 500 }
    );
  }
}

// Exported helper: compute flow orders for a list of tickers (used by SSE stream)
export async function computeFlowForTickers(tickers: string[], limit = 300, snapLimit = 150) {
  // Reuse much of the original logic but return already-normalised rows
  const API_KEY_LOCAL = API_KEY;
  const BASE_LOCAL = BASE;

  // 1. stock snapshots
  const stockSnapshotUrl = `${BASE_LOCAL}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(",")}&apiKey=${API_KEY_LOCAL}`;
  const stockRes = await fetch(stockSnapshotUrl, { cache: "no-store" });
  const stockData = await stockRes.json();

  const spotPrices: Record<string, number> = {};
  if (stockData.tickers) {
    for (const t of stockData.tickers) {
      spotPrices[t.ticker] = t.fmv ?? t.lastTrade?.p ?? t.day?.c ?? 0;
    }
  }

  const today = new Date();
  const maxExpiry = new Date(today);
  maxExpiry.setDate(maxExpiry.getDate() + 60);
  const todayStr = today.toISOString().slice(0, 10);
  const maxExpiryStr = maxExpiry.toISOString().slice(0, 10);

  const optionSnapshots = await Promise.all(
    tickers.map(async (ticker) => {
      const spot = spotPrices[ticker] ?? 0;
      if (spot === 0) return { ticker, results: [] };

      const loStrike = Math.floor(spot * 0.85);
      const hiStrike = Math.ceil(spot * 1.15);

      const url =
        `${BASE_LOCAL}/v3/snapshot/options/${ticker}` +
        `?limit=${snapLimit}` +
        `&strike_price.gte=${loStrike}` +
        `&strike_price.lte=${hiStrike}` +
        `&expiration_date.gte=${todayStr}` +
        `&expiration_date.lte=${maxExpiryStr}` +
        `&sort=strike_price` +
        `&apiKey=${API_KEY_LOCAL}`;

      try {
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        return { ticker, results: data.results ?? [] };
      } catch {
        return { ticker, results: [] };
      }
    })
  );

  // normalise into rows (same shape as previous FlowRow -> but we return FlowOrder-like rows)
  const rows: any[] = [];
  const todayNow = new Date();
  for (const { ticker, results } of optionSnapshots) {
    for (const snap of results) {
      const details = snap.details;
      if (!details) continue;
      const oi = snap.open_interest ?? 0;
      if (oi === 0) continue;
      const dayData = snap.day ?? {};
      const lastPrice = dayData.close ?? snap.fmv ?? 0;
      const reference = spotPrices[ticker] ?? snap.underlying_asset?.price ?? 0;
      const isCall = details.contract_type === "call";
      const expDate = new Date(details.expiration_date);
      const dte = Math.max(0, Math.ceil((expDate.getTime() - todayNow.getTime()) / 86_400_000));
      const dayOpen = dayData.open ?? lastPrice;
      const dayClose = dayData.close ?? lastPrice;
      const intraChange = dayOpen > 0 ? ((dayClose - dayOpen) / dayOpen) * 100 : 0;
      const side: "ASK" | "BID" | "MID" = intraChange > 1 ? "ASK" : intraChange < -1 ? "BID" : "MID";
      const vol = dayData.volume ?? 0;
      const premiumVal = lastPrice * 100;
      const totalPremiumMoved = lastPrice * vol * 100;
      const consolidation = (vol > 0 && ((vol >= 100 && totalPremiumMoved >= 25_000) || (vol >= 500 && totalPremiumMoved >= 100_000))) ? "SWEEP" : "SPLIT";

      const rawTs = dayData.last_updated ?? snap.last_trade?.sip_timestamp ?? snap.last_trade?.participant_timestamp ?? snap.last_trade?.trf_timestamp ?? snap.last_quote?.last_updated ?? null;
      const tsMs = normalizePolygonTs(rawTs);
      const ts = tsMs ? new Date(tsMs) : new Date();
      const timeStr = ts.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour12: true });

      rows.push({
        time: timeStr,
        sortTs: ts.getTime(),
        ticker,
        strike: details.strike_price,
        contractType: details.contract_type,
        expiry: details.expiration_date,
        reference: round2(reference),
        size: Math.min(vol > 0 ? vol : Math.max(1, Math.round(oi * 0.01)), 99999),
        price: round2(lastPrice),
        premium: formatDollars(totalPremiumMoved > 0 ? totalPremiumMoved : premiumVal),
        direction: isCall ? "BULLISH" : "BEARISH",
        type: side === "ASK" ? "AUTO" : "AUCT",
        consolidation,
        volume: formatNumber(vol > 0 ? vol : 0),
        oi: formatNumber(oi),
        side,
        dte: `${dte}d`,
      });
    }
  }

  // dedupe + interleave similar to original
  rows.sort((a, b) => b.sortTs - a.sortTs);
  const deduped: any[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const sig = [r.ticker, r.expiry, r.contractType, r.strike, r.side, r.price, r.size, r.time].join("|");
    if (seen.has(sig)) continue;
    seen.add(sig);
    deduped.push(r);
  }

  const byTicker = new Map<string, any[]>();
  const order: string[] = [];
  for (const r of deduped) {
    if (!byTicker.has(r.ticker)) { byTicker.set(r.ticker, []); order.push(r.ticker); }
    byTicker.get(r.ticker)?.push(r);
  }
  const interleaved: any[] = [];
  let rem = true;
  while (rem) {
    rem = false;
    for (const t of order) {
      const q = byTicker.get(t);
      if (q && q.length > 0) { interleaved.push(q.shift()); rem = true; }
    }
  }

  return { orders: interleaved, spotPrices, timestamp: new Date().toISOString() };
}

/* ── helpers ── */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDollars(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function parseNumber(str: string): number {
  const num = parseFloat(str);
  if (str.endsWith("M")) return num * 1_000_000;
  if (str.endsWith("K")) return num * 1_000;
  return num;
}

function normalizePolygonTs(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;

  if (num >= 1e18) return Math.round(num / 1e6); // ns → ms
  if (num >= 1e15) return Math.round(num / 1e3); // µs → ms
  if (num >= 1e12) return Math.round(num); // already ms
  if (num >= 1e9) return Math.round(num * 1000); // seconds → ms
  return null;
}
