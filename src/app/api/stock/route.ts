import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.polygon.io";

/**
 * GET /api/stock?ticker=NVDA&range=1m
 *
 * Returns comprehensive stock profile data:
 * - Company details (name, description, industry, sector, etc.)
 * - Snapshot (price, volume, change, etc.)
 * - Historical aggregates for chart
 * - News
 */
export async function GET(req: NextRequest) {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "NVDA").toUpperCase();
  const range = req.nextUrl.searchParams.get("range") ?? "1m"; // 1d, 5d, 1m, 6m, ytd, 1y, max

  try {
    /* ── 1. Fetch ticker details, snapshot, and news in parallel ── */
    const [detailsRes, snapshotRes, newsRes] = await Promise.all([
      fetch(`${BASE}/v3/reference/tickers/${ticker}?apiKey=${API_KEY}`, {
        next: { revalidate: 3600 },
      }),
      fetch(
        `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${ticker}&apiKey=${API_KEY}`,
        { next: { revalidate: 10 } }
      ),
      fetch(
        `${BASE}/v2/reference/news?ticker=${ticker}&limit=8&apiKey=${API_KEY}`,
        { next: { revalidate: 300 } }
      ),
    ]);

    const detailsData = await detailsRes.json();
    const snapshotData = await snapshotRes.json();
    const newsData = await newsRes.json();

    const details = detailsData.results ?? {};
    const snap = snapshotData.tickers?.[0] ?? {};
    const news = (newsData.results ?? []).map(
      (n: Record<string, unknown>) => ({
        title: n.title ?? "",
        publisher: (n.publisher as Record<string, unknown>)?.name ?? "",
        publishedUtc: n.published_utc ?? "",
        url: n.article_url ?? "",
        imageUrl: n.image_url ?? "",
        description: n.description ?? "",
      })
    );

    /* ── 2. Determine chart date range and multiplier ── */
    const now = new Date();
    let fromDate: string;
    let multiplier = 1;
    let timespan = "day";

    switch (range) {
      case "1d": {
        // Intraday – 5-min bars for today
        fromDate = now.toISOString().slice(0, 10);
        multiplier = 5;
        timespan = "minute";
        break;
      }
      case "5d": {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        fromDate = d.toISOString().slice(0, 10);
        multiplier = 15;
        timespan = "minute";
        break;
      }
      case "1m": {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        fromDate = d.toISOString().slice(0, 10);
        break;
      }
      case "6m": {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 6);
        fromDate = d.toISOString().slice(0, 10);
        break;
      }
      case "ytd": {
        fromDate = `${now.getFullYear()}-01-01`;
        break;
      }
      case "1y": {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - 1);
        fromDate = d.toISOString().slice(0, 10);
        break;
      }
      case "max": {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - 5);
        fromDate = d.toISOString().slice(0, 10);
        multiplier = 1;
        timespan = "week";
        break;
      }
      default: {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        fromDate = d.toISOString().slice(0, 10);
      }
    }

    const toDate = now.toISOString().slice(0, 10);
    const aggsUrl =
      `${BASE}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fromDate}/${toDate}` +
      `?adjusted=true&sort=asc&limit=5000&apiKey=${API_KEY}`;
    const aggsRes = await fetch(aggsUrl, { next: { revalidate: 60 } });
    const aggsData = await aggsRes.json();

    const chartData = ((aggsData.results as Array<Record<string, number>>) ?? []).map(
      (bar) => ({
        t: bar.t, // timestamp ms
        o: bar.o,
        h: bar.h,
        l: bar.l,
        c: bar.c,
        v: bar.v,
      })
    );

    /* ── 3. Build response ── */
    const day = snap.day ?? {};
    const prevDay = snap.prevDay ?? {};
    const lastQuote = snap.lastQuote ?? {};
    const lastTrade = snap.lastTrade ?? {};
    const fmv = snap.fmv ?? lastTrade.p ?? day.c ?? 0;

    const currentPrice = +(day.c ?? fmv ?? 0);
    const prevClose = +(prevDay.c ?? 0);
    const change = +(snap.todaysChange ?? currentPrice - prevClose);
    const changePct = +(snap.todaysChangePerc ?? (prevClose > 0 ? ((change / prevClose) * 100) : 0));

    return NextResponse.json({
      ticker,
      // Company info
      name: details.name ?? ticker,
      description: details.description ?? "",
      industry: details.sic_description ?? "",
      sector: "", // Polygon free tier doesn't have sector separately
      homepageUrl: details.homepage_url ?? "",
      totalEmployees: details.total_employees ?? null,
      listDate: details.list_date ?? null,
      primaryExchange: details.primary_exchange ?? "",
      marketCap: details.market_cap ?? null,
      sharesOutstanding: details.share_class_shares_outstanding ?? null,
      address: details.address ?? null,
      phoneNumber: details.phone_number ?? null,
      // Price info
      currentPrice,
      change: +change.toFixed(2),
      changePct: +changePct.toFixed(2),
      afterHours: +(snap.fmv ?? 0),
      // Trading data
      open: +(day.o ?? 0),
      high: +(day.h ?? 0),
      low: +(day.l ?? 0),
      close: +(day.c ?? 0),
      volume: +(day.v ?? 0),
      vwap: +(day.vw ?? 0),
      prevClose: +prevClose,
      prevHigh: +(prevDay.h ?? 0),
      prevLow: +(prevDay.l ?? 0),
      // Quote
      bid: +(lastQuote.p ?? 0),
      bidSize: +(lastQuote.s ?? 0),
      ask: +(lastQuote.P ?? 0),
      askSize: +(lastQuote.S ?? 0),
      // Chart
      chartData,
      chartRange: range,
      // News
      news,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Stock API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}
