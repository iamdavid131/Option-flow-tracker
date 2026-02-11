import { NextRequest, NextResponse } from "next/server";

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
  const tickers = tickersParam.split(",").map((t) => t.trim().toUpperCase());

  try {
    /* ── 1. Stock snapshots → spot prices ── */
    const stockSnapshotUrl = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(",")}&apiKey=${API_KEY}`;
    const stockRes = await fetch(stockSnapshotUrl, { next: { revalidate: 5 } });
    const stockData = await stockRes.json();

    const spotPrices: Record<string, number> = {};
    if (stockData.tickers) {
      for (const t of stockData.tickers) {
        spotPrices[t.ticker] = t.fmv ?? t.lastTrade?.p ?? t.day?.c ?? 0;
      }
    }

    /* ── 2. Options snapshots (parallel per ticker) ── */
    const today = new Date();
    const maxExpiry = new Date(today);
    maxExpiry.setDate(maxExpiry.getDate() + 60);
    const todayStr = today.toISOString().slice(0, 10);
    const maxExpiryStr = maxExpiry.toISOString().slice(0, 10);

    const optionSnapshots = await Promise.all(
      tickers.map(async (ticker) => {
        const spot = spotPrices[ticker] ?? 0;
        if (spot === 0) return { ticker, results: [] };

        // ±15% of spot for near-the-money
        const loStrike = Math.floor(spot * 0.85);
        const hiStrike = Math.ceil(spot * 1.15);

        const url =
          `${BASE}/v3/snapshot/options/${ticker}` +
          `?limit=${snapLimit}` +
          `&strike_price.gte=${loStrike}` +
          `&strike_price.lte=${hiStrike}` +
          `&expiration_date.gte=${todayStr}` +
          `&expiration_date.lte=${maxExpiryStr}` +
          `&sort=strike_price` +
          `&apiKey=${API_KEY}`;

        try {
          const res = await fetch(url, { next: { revalidate: 10 } });
          const data = await res.json();
          return { ticker, results: data.results ?? [] };
        } catch {
          return { ticker, results: [] };
        }
      })
    );

    /* ── 3. Normalise into FlowOrder rows ── */
    type FlowRow = {
      time: string;
      ticker: string;
      strike: number;
      contractType: "call" | "put";
      expiry: string;
      reference: number;
      size: number;
      price: number;
      premium: string;
      direction: "BULLISH" | "BEARISH" | "NEUTRAL";
      type: string;
      consolidation: string;
      volume: string;
      oi: string;
      side: string;
      dte: string;
    };

    const rows: FlowRow[] = [];

    for (const { ticker, results } of optionSnapshots) {
      for (const snap of results) {
        const details = snap.details;
        if (!details) continue;

        const oi = snap.open_interest ?? 0;
        // Skip contracts with zero OI – no real activity
        if (oi === 0) continue;

        const dayData = snap.day ?? {};
        const lastPrice = dayData.close ?? snap.fmv ?? 0;
        const underlying = snap.underlying_asset;
        const reference = spotPrices[ticker] ?? underlying?.price ?? 0;

        const isCall = details.contract_type === "call";

        // DTE
        const changePct = dayData.change_percent ?? 0;
        const expDate = new Date(details.expiration_date);
        const dte = Math.max(
          0,
          Math.ceil((expDate.getTime() - today.getTime()) / 86_400_000)
        );

        // Determine side by comparing close vs open within the day.
        // close > open → price went up → bought on ASK
        // close < open → price went down → sold on BID
        const dayOpen = dayData.open ?? lastPrice;
        const dayClose = dayData.close ?? lastPrice;
        const intraChange = dayOpen > 0 ? ((dayClose - dayOpen) / dayOpen) * 100 : 0;
        const side: "ASK" | "BID" | "MID" =
          intraChange > 1 ? "ASK" : intraChange < -1 ? "BID" : "MID";

        // Determine direction from moneyness + contract type:
        //  ITM call  → BULLISH     OTM call  → BULLISH (speculative)
        //  ITM put   → BEARISH     OTM put   → BEARISH (hedge/spec)
        //  ATM either → direction from side
        const isITM = isCall
          ? reference > details.strike_price
          : reference < details.strike_price;
        const moneyness = Math.abs(reference - details.strike_price) / reference;
        const isATM = moneyness < 0.02; // within 2% of spot

        let direction: "BULLISH" | "BEARISH" | "NEUTRAL";
        if (isATM) {
          // ATM options: use side to infer direction
          if (side === "ASK") direction = isCall ? "BULLISH" : "BEARISH";
          else if (side === "BID") direction = isCall ? "BEARISH" : "BULLISH";
          else direction = "NEUTRAL";
        } else if (isITM) {
          // ITM: often hedging or assignment plays
          direction = isCall ? "BULLISH" : "BEARISH";
        } else {
          // OTM: speculative — calls bullish, puts bearish
          direction = isCall ? "BULLISH" : "BEARISH";
        }

        // Volume from snapshot day data
        const dayVolume = dayData.volume ?? 0;

        // Volume/OI ratio — high ratio = aggressive new activity
        const volOiRatio = oi > 0 ? dayVolume / oi : 0;

        // Premium per contract
        const premiumVal = lastPrice * 100;

        // Estimated total premium moved today = price × volume × 100
        const totalPremiumMoved = lastPrice * dayVolume * 100;

        // ── Consolidation (SWEEP / BLOCK / SPLIT) ──
        // SWEEP: aggressive fills — high vol/OI ratio + large premium + hit the ASK
        //   OR very high volume with big premium regardless of side
        // BLOCK: large single-print style — big premium but lower urgency
        // SPLIT: smaller or fragmented orders
        let consolidation: string;
        if (
          dayVolume > 0 &&
          ((volOiRatio >= 0.3 && side === "ASK" && totalPremiumMoved >= 25_000) ||
           (volOiRatio >= 0.5 && totalPremiumMoved >= 50_000) ||
           (dayVolume >= 1000 && totalPremiumMoved >= 100_000))
        ) {
          consolidation = "SWEEP";
        } else if (
          (totalPremiumMoved >= 25_000 && dayVolume >= 100) ||
          (dayVolume >= 500 && oi >= 5000)
        ) {
          consolidation = "BLOCK";
        } else {
          consolidation = "SPLIT";
        }

        // Type heuristic — aggressive (AUTO) vs auction (AUCT)
        const type = side === "ASK" && volOiRatio > 0.2 ? "AUTO" : "AUCT";

        // Use day volume if available, otherwise estimate from OI
        const estimatedSize = dayVolume > 0
          ? dayVolume
          : Math.max(1, Math.round(oi * (Math.abs(changePct) / 100 + 0.01)));

        // Timestamp from last update
        const ts = dayData.last_updated
          ? new Date(dayData.last_updated / 1e6)
          : new Date();
        const timeStr = `${pad(ts.getMonth() + 1)}/${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}`;

        rows.push({
          time: timeStr,
          ticker,
          strike: details.strike_price,
          contractType: details.contract_type,
          expiry: details.expiration_date,
          reference: round2(reference),
          size: Math.min(estimatedSize, 99999),
          price: round2(lastPrice),
          premium: formatDollars(totalPremiumMoved > 0 ? totalPremiumMoved : premiumVal),
          direction,
          type,
          consolidation,
          volume: formatNumber(dayVolume > 0 ? dayVolume : estimatedSize),
          oi: formatNumber(oi),
          side,
          dte: `${dte}d`,
        });
      }
    }

    // Sort by OI descending (most active first)
    rows.sort((a, b) => {
      return parseNumber(b.oi) - parseNumber(a.oi);
    });

    return NextResponse.json({
      orders: rows.slice(0, limit),
      spotPrices,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Flow API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch flow data", orders: [], spotPrices: {} },
      { status: 500 }
    );
  }
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
