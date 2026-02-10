import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.polygon.io";

/**
 * GET /api/darkpool?tickers=NVDA,AAPL,TSLA,SPY,META,AMD,SMCI,MSFT,AMZN,GOOGL
 *
 * Fetches recent stock trades that occurred on dark-pool /
 * off-exchange venues (FINRA TRF, ADF, ATS) for the given tickers.
 */
export async function GET(req: NextRequest) {
  const tickersParam =
    req.nextUrl.searchParams.get("tickers") ??
    "NVDA,AAPL,TSLA,SPY,META,AMD,SMCI,MSFT,AMZN,GOOGL";
  const tickers = tickersParam.split(",").map((t) => t.trim().toUpperCase());

  try {
    // 1. Stock snapshots for reference prices
    const stockSnapshotUrl = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(",")}&apiKey=${API_KEY}`;
    const stockRes = await fetch(stockSnapshotUrl, { next: { revalidate: 5 } });
    const stockData = await stockRes.json();

    const spotPrices: Record<string, number> = {};
    const dayVolumes: Record<string, number> = {};
    if (stockData.tickers) {
      for (const t of stockData.tickers) {
        spotPrices[t.ticker] = t.fmv ?? t.lastTrade?.p ?? t.day?.c ?? 0;
        dayVolumes[t.ticker] = t.day?.v ?? 0;
      }
    }

    // 2. Fetch recent trades for each ticker (we'll filter for dark pool conditions)
    type DarkPoolRow = {
      time: string;
      ticker: string;
      price: number;
      size: number;
      notional: string;
      venue: string;
      type: "BLOCK" | "PRINT" | "CROSS";
      sentiment: "ABOVE" | "BELOW" | "AT";
    };

    // Dark-pool exchanges by ID (Polygon exchange IDs)
    // TRF exchanges and ATS are off-exchange / dark pool
    const darkPoolExchanges: Record<number, string> = {
      4: "FINRA ADF",
      15: "FINRA TRF",
      18: "FINRA TRF (CH)",
      62: "MIAX Pearl",
      63: "MEMX",
    };

    // Trade conditions indicating dark pool / off-exchange activity
    // Condition 12 = intermarket sweep, 37 = opening trade, etc.
    const darkPoolConditions = new Set([12, 13, 15, 37, 41]);

    const rows: DarkPoolRow[] = [];

    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const url = `${BASE}/v3/trades/${ticker}?limit=50&order=desc&sort=timestamp&apiKey=${API_KEY}`;
          const res = await fetch(url, { next: { revalidate: 10 } });
          const data = await res.json();

          const reference = spotPrices[ticker] ?? 0;

          for (const trade of data.results ?? []) {
            const exchangeId = trade.exchange;
            const conditions: number[] = trade.conditions ?? [];

            // Filter: dark pool if exchange is known DP venue, or has DP conditions,
            // or size is very large (block trades often go through dark pools)
            const isDarkPoolExchange = exchangeId in darkPoolExchanges;
            const hasDarkPoolCondition = conditions.some((c) =>
              darkPoolConditions.has(c)
            );
            const isLargeBlock = trade.size >= 10000;

            if (!isDarkPoolExchange && !hasDarkPoolCondition && !isLargeBlock) {
              continue;
            }

            const price = trade.price;
            const size = trade.size;
            const notionalValue = price * size;

            // Determine venue
            const venue = darkPoolExchanges[exchangeId] ?? `Exchange ${exchangeId}`;

            // Determine type
            const type: "BLOCK" | "PRINT" | "CROSS" =
              size >= 50000 ? "BLOCK" : size >= 10000 ? "CROSS" : "PRINT";

            // Determine sentiment vs NBBO (above/below/at spot)
            const diff = ((price - reference) / reference) * 100;
            const sentiment: "ABOVE" | "BELOW" | "AT" =
              diff > 0.02 ? "ABOVE" : diff < -0.02 ? "BELOW" : "AT";

            // Timestamp
            const ts = new Date(
              trade.sip_timestamp
                ? trade.sip_timestamp / 1e6
                : trade.participant_timestamp / 1e6
            );
            const timeStr = `${String(ts.getMonth() + 1).padStart(2, "0")}/${String(ts.getDate()).padStart(2, "0")} ${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}`;

            rows.push({
              time: timeStr,
              ticker,
              price: Math.round(price * 100) / 100,
              size,
              notional: formatDollars(notionalValue),
              venue,
              type,
              sentiment,
            });
          }
        } catch {
          // Skip ticker on error
        }
      })
    );

    // Sort by size descending (biggest prints first)
    rows.sort((a, b) => b.size - a.size);

    return NextResponse.json({
      trades: rows.slice(0, 100),
      spotPrices,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Dark Pool API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dark pool data", trades: [], spotPrices: {} },
      { status: 500 }
    );
  }
}

function formatDollars(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}
