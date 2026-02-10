import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.polygon.io";

/**
 * GET /api/chain?ticker=SPY&expiry=2026-02-10
 *
 * Returns an option chain for a single underlying + expiry date.
 * If no expiry given, returns the nearest expiry.
 * Also returns available expiry dates for the ticker.
 */
export async function GET(req: NextRequest) {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "SPY").toUpperCase();
  const expiryParam = req.nextUrl.searchParams.get("expiry"); // YYYY-MM-DD

  try {
    /* ── 1. Get spot price ── */
    const stockUrl = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${ticker}&apiKey=${API_KEY}`;
    const stockRes = await fetch(stockUrl, { next: { revalidate: 5 } });
    const stockData = await stockRes.json();
    const spotPrice =
      stockData.tickers?.[0]?.fmv ??
      stockData.tickers?.[0]?.lastTrade?.p ??
      stockData.tickers?.[0]?.day?.c ??
      0;

    /* ── 2. Find available expiry dates ── */
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Narrow strike range for discovery (±5% of spot) to maximise unique expiry dates per page
    const loStrike = Math.floor(spotPrice * 0.95);
    const hiStrike = Math.ceil(spotPrice * 1.05);

    // Discover ALL available expiry dates – no upper‐date cap
    const discoveryUrl =
      `${BASE}/v3/snapshot/options/${ticker}` +
      `?limit=250` +
      `&strike_price.gte=${loStrike}` +
      `&strike_price.lte=${hiStrike}` +
      `&expiration_date.gte=${todayStr}` +
      `&sort=expiration_date` +
      `&apiKey=${API_KEY}`;

    // Paginate to collect all results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allResults: any[] = [];
    let discUrl: string | null = discoveryUrl;
    while (discUrl) {
      const dRes: Response = await fetch(discUrl, { next: { revalidate: 30 } });
      const dData = await dRes.json();
      allResults = allResults.concat(dData.results ?? []);
      discUrl = dData.next_url
        ? `${dData.next_url}&apiKey=${API_KEY}`
        : null;
    }

    // Extract unique expiry dates
    const expirySet = new Set<string>();
    for (const r of allResults) {
      if (r.details?.expiration_date) {
        expirySet.add(r.details.expiration_date);
      }
    }
    const expiryDates = Array.from(expirySet).sort();

    // Select target expiry
    const targetExpiry = expiryParam && expiryDates.includes(expiryParam)
      ? expiryParam
      : expiryDates[0] ?? todayStr;

    /* ── 3. Fetch full chain for the target expiry (wider ±15% strike range) ── */
    const chainLo = Math.floor(spotPrice * 0.85);
    const chainHi = Math.ceil(spotPrice * 1.15);
    const chainBaseUrl =
      `${BASE}/v3/snapshot/options/${ticker}` +
      `?limit=250` +
      `&strike_price.gte=${chainLo}` +
      `&strike_price.lte=${chainHi}` +
      `&expiration_date=${targetExpiry}` +
      `&sort=strike_price` +
      `&apiKey=${API_KEY}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chainResults: any[] = [];
    let cUrl: string | null = chainBaseUrl;
    while (cUrl) {
      const cRes: Response = await fetch(cUrl, { next: { revalidate: 5 } });
      const cData = await cRes.json();
      chainResults = chainResults.concat(cData.results ?? []);
      cUrl = cData.next_url ? `${cData.next_url}&apiKey=${API_KEY}` : null;
    }

    /* ── 4. Build chain rows ── */
    type ChainRow = {
      strike: number;
      call: OptionLeg | null;
      put: OptionLeg | null;
    };
    type OptionLeg = {
      bid: number;
      ask: number;
      last: number;
      delta: number;
      vol: number;
      oi: number;
      change: number;
      changePct: number;
      iv: number;
    };

    const strikeMap: Record<number, ChainRow> = {};

    for (const r of chainResults) {
      const details = r.details;
      if (!details) continue;
      const strike = details.strike_price;
      const type = details.contract_type; // "call" or "put"
      const day = r.day ?? {};
      const greeks = r.greeks ?? {};

      const lastPrice = day.close ?? r.fmv ?? 0;
      // Approximate bid/ask from last with a spread based on IV
      const iv = r.implied_volatility ?? 0.2;
      const spreadPct = Math.min(0.05, iv * 0.02); // tighter spread for lower IV
      const halfSpread = lastPrice * spreadPct;
      const bid = Math.max(0, +(lastPrice - halfSpread).toFixed(2));
      const ask = +(lastPrice + halfSpread).toFixed(2);

      const leg: OptionLeg = {
        bid,
        ask,
        last: +lastPrice.toFixed(2),
        delta: +(greeks.delta ?? 0).toFixed(2),
        vol: 0, // snapshot doesn't have volume
        oi: r.open_interest ?? 0,
        change: +(day.change ?? 0).toFixed(2),
        changePct: +(day.change_percent ?? 0).toFixed(2),
        iv: +(iv * 100).toFixed(1),
      };

      if (!strikeMap[strike]) {
        strikeMap[strike] = { strike, call: null, put: null };
      }
      strikeMap[strike][type as "call" | "put"] = leg;
    }

    // Sort by strike ascending
    const chain = Object.values(strikeMap).sort((a, b) => a.strike - b.strike);

    // Calculate DTE for each expiry
    const expiryInfo = expiryDates.map((exp) => {
      const d = new Date(exp);
      const dte = Math.max(0, Math.ceil((d.getTime() - today.getTime()) / 86_400_000));
      return { date: exp, dte };
    });

    // Summary stats
    const totalCallOI = chain.reduce((s, r) => s + (r.call?.oi ?? 0), 0);
    const totalPutOI = chain.reduce((s, r) => s + (r.put?.oi ?? 0), 0);
    const totalCallVol = chain.reduce((s, r) => s + (r.call?.vol ?? 0), 0);
    const totalPutVol = chain.reduce((s, r) => s + (r.put?.vol ?? 0), 0);
    const pcRatio = totalCallOI > 0 ? +(totalPutOI / totalCallOI).toFixed(2) : 0;

    return NextResponse.json({
      ticker,
      spotPrice: +spotPrice.toFixed(2),
      selectedExpiry: targetExpiry,
      expiryDates: expiryInfo,
      chain,
      stats: {
        callOI: totalCallOI,
        putOI: totalPutOI,
        callVol: totalCallVol,
        putVol: totalPutVol,
        pcRatio,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chain API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chain data", chain: [], expiryDates: [] },
      { status: 500 }
    );
  }
}
