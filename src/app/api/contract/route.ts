import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.polygon.io";

function buildOccSymbol(ticker: string, expiry: string, type: string, strike: number) {
  // OCC: O:ROOTYYMMDDC/P######## (strike * 1000, 8 digits)
  const [yyyy, mm, dd] = expiry.split("-");
  const yy = yyyy.slice(2);
  const cp = type.toLowerCase() === "call" ? "C" : "P";
  const strikeInt = Math.round(strike * 1000);
  const strikeStr = String(strikeInt).padStart(8, "0");
  return `O:${ticker}${yy}${mm}${dd}${cp}${strikeStr}`;
}

function getRangeConfig(range: string) {
  const now = new Date();
  let fromDate = new Date(now);
  let multiplier = 5;
  let timespan = "minute";

  switch (range) {
    case "1d":
      multiplier = 5;
      timespan = "minute";
      break;
    case "5d":
      fromDate.setDate(fromDate.getDate() - 7);
      multiplier = 15;
      timespan = "minute";
      break;
    case "1m":
      fromDate.setMonth(fromDate.getMonth() - 1);
      multiplier = 1;
      timespan = "day";
      break;
    case "6m":
      fromDate.setMonth(fromDate.getMonth() - 6);
      multiplier = 1;
      timespan = "day";
      break;
    case "ytd":
      fromDate = new Date(now.getFullYear(), 0, 1);
      multiplier = 1;
      timespan = "day";
      break;
    case "1y":
      fromDate.setFullYear(fromDate.getFullYear() - 1);
      multiplier = 1;
      timespan = "day";
      break;
    case "max":
      fromDate.setFullYear(fromDate.getFullYear() - 5);
      multiplier = 1;
      timespan = "week";
      break;
    default:
      fromDate.setMonth(fromDate.getMonth() - 1);
      multiplier = 1;
      timespan = "day";
  }

  const fromStr = fromDate.toISOString().slice(0, 10);
  const toStr = now.toISOString().slice(0, 10);
  const fromMs = new Date(`${fromStr}T00:00:00Z`).getTime();
  const toMs = new Date(`${toStr}T23:59:59Z`).getTime();
  return { fromStr, toStr, fromMs, toMs, multiplier, timespan };
}

async function fetchPaginated(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results: any[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const res: Response = await fetch(nextUrl, { next: { revalidate: 60 } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    results = results.concat(data.results ?? []);
    nextUrl = data.next_url ? `${data.next_url}&apiKey=${API_KEY}` : null;
  }
  return results;
}

export async function GET(req: NextRequest) {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "SPY").toUpperCase();
  const expiry = req.nextUrl.searchParams.get("expiry") ?? ""; // YYYY-MM-DD
  const type = (req.nextUrl.searchParams.get("type") ?? "call").toLowerCase();
  const strike = parseFloat(req.nextUrl.searchParams.get("strike") ?? "0");
  const range = req.nextUrl.searchParams.get("range") ?? "1m";

  try {
    const { fromStr, toStr, fromMs, toMs, multiplier, timespan } = getRangeConfig(range);

    // Try to locate the exact option snapshot
    const snapUrl =
      `${BASE}/v3/snapshot/options/${ticker}` +
      `?expiration_date=${expiry}` +
      `&strike_price=${strike}` +
      `&contract_type=${type}` +
      `&limit=1` +
      `&apiKey=${API_KEY}`;

    const optionSymbol = buildOccSymbol(ticker, expiry, type, strike);
    const optionAggsUrl =
      `${BASE}/v2/aggs/ticker/${optionSymbol}/range/${multiplier}/${timespan}/${fromStr}/${toStr}` +
      `?adjusted=true&sort=asc&limit=5000&apiKey=${API_KEY}`;

    const stockAggsUrl =
      `${BASE}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fromStr}/${toStr}` +
      `?adjusted=true&sort=asc&limit=5000&apiKey=${API_KEY}`;

    const tradesUrl =
      `${BASE}/v3/trades/${optionSymbol}` +
      `?timestamp.gte=${fromMs * 1_000_000}` +
      `&timestamp.lte=${toMs * 1_000_000}` +
      `&order=asc&limit=5000&apiKey=${API_KEY}`;

    const quotesUrl =
      `${BASE}/v3/quotes/${optionSymbol}` +
      `?timestamp.gte=${fromMs * 1_000_000}` +
      `&timestamp.lte=${toMs * 1_000_000}` +
      `&order=asc&limit=5000&apiKey=${API_KEY}`;

    const [snapRes, optAggsRes, stockAggsRes, trades, quotes] = await Promise.all([
      fetch(snapUrl, { next: { revalidate: 30 } }),
      fetch(optionAggsUrl, { next: { revalidate: 60 } }),
      fetch(stockAggsUrl, { next: { revalidate: 60 } }),
      fetchPaginated(tradesUrl),
      fetchPaginated(quotesUrl),
    ]);

    const snapData = await snapRes.json();
    const optAggs = await optAggsRes.json();
    const stockAggs = await stockAggsRes.json();

    const snap = (snapData.results ?? [])[0] ?? {};
    const details = snap.details ?? {};
    const greeks = snap.greeks ?? {};
    const day = snap.day ?? {};

    const dte = expiry
      ? Math.max(
          0,
          Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000)
        )
      : null;

    let optionSeries = (optAggs.results ?? []).map((r: Record<string, number>) => ({
      t: r.t,
      o: r.o,
      h: r.h,
      l: r.l,
      c: r.c,
      v: r.v,
    }));

    let stockSeries = (stockAggs.results ?? []).map((r: Record<string, number>) => ({
      t: r.t,
      o: r.o,
      h: r.h,
      l: r.l,
      c: r.c,
      v: r.v,
    }));

    // Fallback to daily data if intraday range has no bars
    if (optionSeries.length === 0 || stockSeries.length === 0) {
      const fallbackFrom = new Date();
      fallbackFrom.setDate(fallbackFrom.getDate() - 30);
      const fbFromStr = fallbackFrom.toISOString().slice(0, 10);
      const fbToStr = new Date().toISOString().slice(0, 10);

      const optionAggsFallbackUrl =
        `${BASE}/v2/aggs/ticker/${optionSymbol}/range/1/day/${fbFromStr}/${fbToStr}` +
        `?adjusted=true&sort=asc&limit=5000&apiKey=${API_KEY}`;
      const stockAggsFallbackUrl =
        `${BASE}/v2/aggs/ticker/${ticker}/range/1/day/${fbFromStr}/${fbToStr}` +
        `?adjusted=true&sort=asc&limit=5000&apiKey=${API_KEY}`;

      const [optFallbackRes, stockFallbackRes] = await Promise.all([
        fetch(optionAggsFallbackUrl, { next: { revalidate: 120 } }),
        fetch(stockAggsFallbackUrl, { next: { revalidate: 120 } }),
      ]);
      const optFallback = await optFallbackRes.json();
      const stockFallback = await stockFallbackRes.json();

      if (optionSeries.length === 0) {
        optionSeries = (optFallback.results ?? []).map((r: Record<string, number>) => ({
          t: r.t,
          o: r.o,
          h: r.h,
          l: r.l,
          c: r.c,
          v: r.v,
        }));
      }

      if (stockSeries.length === 0) {
        stockSeries = (stockFallback.results ?? []).map((r: Record<string, number>) => ({
          t: r.t,
          o: r.o,
          h: r.h,
          l: r.l,
          c: r.c,
          v: r.v,
        }));
      }
    }

    // Aggregate trade flow (bid/ask/mid) + net premium
    const bucketMs = timespan === "minute" ? multiplier * 60_000 : timespan === "day" ? 86_400_000 : 604_800_000;
    const quotePoints = (quotes ?? []).map((q: Record<string, number>) => ({
      t: (q.sip_timestamp ?? q.participant_timestamp ?? q.timestamp ?? q.t ?? 0) / 1_000_000,
      bid: q.bid_price ?? q.bp ?? q.bid ?? null,
      ask: q.ask_price ?? q.ap ?? q.ask ?? null,
    })).sort((a, b) => a.t - b.t);

    let qIdx = 0;
    const flowMap = new Map<number, { bidVol: number; askVol: number; midVol: number; netPrem: number }>();
    const recentTrades: { t: number; price: number; size: number; premium: number; side: "BID" | "ASK" | "MID" }[] = [];

    for (const tr of trades ?? []) {
      const tsNs = tr.sip_timestamp ?? tr.participant_timestamp ?? tr.timestamp ?? tr.t ?? 0;
      const tsMs = tsNs / 1_000_000;
      if (!tsMs) continue;

      while (qIdx + 1 < quotePoints.length && quotePoints[qIdx + 1].t <= tsMs) {
        qIdx += 1;
      }

      const q = quotePoints[qIdx] ?? { bid: null, ask: null };
      const bid = typeof q.bid === "number" ? q.bid : null;
      const ask = typeof q.ask === "number" ? q.ask : null;
      const price = tr.price ?? tr.p ?? 0;
      const size = tr.size ?? tr.s ?? 0;
      const premium = price * size * 100;

      let bucket = Math.floor(tsMs / bucketMs) * bucketMs;
      const entry = flowMap.get(bucket) ?? { bidVol: 0, askVol: 0, midVol: 0, netPrem: 0 };

      let side: "BID" | "ASK" | "MID" = "MID";
      if (bid != null && ask != null) {
        const mid = (bid + ask) / 2;
        if (price >= ask - 0.0001) {
          entry.askVol += size;
          entry.netPrem += premium;
          side = "ASK";
        } else if (price <= bid + 0.0001) {
          entry.bidVol += size;
          entry.netPrem -= premium;
          side = "BID";
        } else {
          entry.midVol += size;
        }
      } else {
        entry.midVol += size;
      }

      flowMap.set(bucket, entry);

      // Track recent trades for the UI
      recentTrades.push({ t: tsMs, price, size, premium, side });
      if (recentTrades.length > 250) recentTrades.shift();
    }

    let flowSeries = Array.from(flowMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([t, v]) => ({ t, ...v }));

    // If no trade/quote flow, synthesize from option bars
    if (flowSeries.length === 0 && optionSeries.length > 0) {
      flowSeries = optionSeries.map((p: { t: number; o: number; h: number; l: number; c: number; v: number }) => {
        const isUp = p.c >= p.o;
        const vol = p.v ?? 0;
        const askVol = isUp ? vol * 0.7 : vol * 0.2;
        const bidVol = isUp ? vol * 0.1 : vol * 0.7;
        const midVol = Math.max(0, vol - askVol - bidVol);
        const netPrem = (p.c - p.o) * vol * 100;
        return { t: p.t, askVol, bidVol, midVol, netPrem };
      });
    }

    if (optionSeries.length === 0 && day.close != null) {
      const now = Date.now();
      optionSeries = Array.from({ length: 12 }, (_, i) => {
        const t = now - (11 - i) * 60_000;
        return { t, o: day.close, h: day.close, l: day.close, c: day.close, v: 0 };
      });
    }

    const flowTotals = flowSeries.reduce(
      (acc, p) => {
        acc.bidVol += p.bidVol;
        acc.askVol += p.askVol;
        acc.midVol += p.midVol;
        acc.netPrem += p.netPrem;
        return acc;
      },
      { bidVol: 0, askVol: 0, midVol: 0, netPrem: 0 }
    );

    // Net premium histogram
    const netValues = flowSeries.map((p) => p.netPrem);
    const absMax = Math.max(1, ...netValues.map((n) => Math.abs(n)));
    const bins = 12;
    const min = -absMax;
    const max = absMax;
    const step = (max - min) / bins;
    const histogram = Array.from({ length: bins }, (_, i) => ({
      x0: min + step * i,
      x1: min + step * (i + 1),
      v: 0,
    }));
    for (const val of netValues) {
      const idx = Math.min(bins - 1, Math.max(0, Math.floor((val - min) / step)));
      histogram[idx].v += 1;
    }

    return NextResponse.json({
      ticker,
      expiry,
      type,
      strike,
      dte,
      optionSymbol,
      snapshot: {
        name: details.ticker ?? optionSymbol,
        openInterest: snap.open_interest ?? null,
        volume: day.volume ?? null,
        close: day.close ?? null,
        change: day.change ?? null,
        changePct: day.change_percent ?? null,
        vwap: day.vwap ?? null,
        iv: snap.implied_volatility ?? null,
        delta: greeks.delta ?? null,
        gamma: greeks.gamma ?? null,
        theta: greeks.theta ?? null,
        vega: greeks.vega ?? null,
      },
      optionSeries,
      stockSeries,
      flowSeries,
      flowTotals: {
        ...flowTotals,
        totalVol: flowTotals.bidVol + flowTotals.askVol + flowTotals.midVol,
      },
      netPremiumHistogram: histogram,
      recentTrades: recentTrades.slice(-50).reverse(),
      range,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Contract API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract data" },
      { status: 500 }
    );
  }
}
