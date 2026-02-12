import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const API_KEY =
  process.env.MASSIVE_API_KEY ??
  process.env.POLYGON_API_KEY ??
  process.env.POLYGON_KEY ??
  process.env.NEXT_PUBLIC_POLYGON_API_KEY ??
  "";
const BASE = "https://api.polygon.io";
const SNAPSHOTS_DIR = path.join(process.cwd(), "data", "gex-snapshots");

function normalizeSnapshotPayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshotData: any,
  ticker: string,
  metricKey: "gex" | "vex" | "charm",
  time?: string
) {
  if (!snapshotData || typeof snapshotData !== "object") return null;

  return {
    ...snapshotData,
    ticker: (snapshotData.ticker ?? ticker).toUpperCase(),
    metric: metricKey,
    timestamp: snapshotData.timestamp ?? time ?? new Date().toISOString(),
  };
}

async function getLatestLocalSnapshot(
  ticker: string,
  metricKey: "gex" | "vex" | "charm"
) {
  try {
    const files = await fs.readdir(SNAPSHOTS_DIR);
    const metricPrefix = `${ticker}_${metricKey}_`;
    const legacyPrefix = `${ticker}_`;

    const candidates = files
      .filter((file) => {
        if (!file.endsWith(".json")) return false;
        if (file.startsWith(metricPrefix)) return true;
        return metricKey === "gex" && file.startsWith(legacyPrefix);
      })
      .sort()
      .reverse();

    for (const file of candidates) {
      try {
        const raw = await fs.readFile(path.join(SNAPSHOTS_DIR, file), "utf-8");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = JSON.parse(raw) as any;

        if (Array.isArray(parsed) && parsed.length > 0) {
          const latest = parsed[parsed.length - 1];
          const normalized = normalizeSnapshotPayload(latest?.data, ticker, metricKey, latest?.time);
          if (normalized) return normalized;
          continue;
        }

        const normalized = normalizeSnapshotPayload(parsed, ticker, metricKey);
        if (normalized) return normalized;
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchSpotPrice(ticker: string): Promise<number> {
  const snapshotUrl = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${ticker}&apiKey=${API_KEY}`;
  try {
    const stockRes = await fetch(snapshotUrl, { next: { revalidate: 5 } });
    const stockData = await stockRes.json();
    const snapSpot: number =
      stockData.tickers?.[0]?.fmv ??
      stockData.tickers?.[0]?.lastTrade?.p ??
      stockData.tickers?.[0]?.day?.c ??
      0;
    if (snapSpot > 0) return snapSpot;
  } catch {
    // try next source
  }

  const lastTradeUrl = `${BASE}/v2/last/trade/${ticker}?apiKey=${API_KEY}`;
  try {
    const tradeRes = await fetch(lastTradeUrl, { next: { revalidate: 5 } });
    const tradeData = await tradeRes.json();
    const tradePrice: number = tradeData.results?.p ?? 0;
    if (tradePrice > 0) return tradePrice;
  } catch {
    // try next source
  }

  const prevCloseUrl = `${BASE}/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${API_KEY}`;
  try {
    const prevRes = await fetch(prevCloseUrl, { next: { revalidate: 30 } });
    const prevData = await prevRes.json();
    const prevClose: number = prevData.results?.[0]?.c ?? 0;
    if (prevClose > 0) return prevClose;
  } catch {
    // no fallback left
  }

  return 0;
}

/**
 * GET /api/gex?ticker=SPY
 *
 * Computes Gamma Exposure (GEX) per strike × expiry date.
 * GEX = gamma × OI × 100 × spotPrice²  / 1e6  (scaled to display units)
 *
 * Returns:
 *  - spotPrice, ticker
 *  - expiryDates: string[]
 *  - strikes: number[]
 *  - grid: Record<strike, Record<expiry, gexValue>>
 *  - stats: { netGEX, totalGEX, flipPrice, topPosWall, topNegWall, atmStrike }
 */
export async function GET(req: NextRequest) {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "SPY").toUpperCase();
  const metric = (req.nextUrl.searchParams.get("metric") ?? "gex").toLowerCase();
  const metricKey: "gex" | "vex" | "charm" = metric === "vex" || metric === "charm" ? metric : "gex";
  const RISK_FREE_RATE = 0.05; // annualized, used for Charm

  if (!API_KEY) {
    const fallback = await getLatestLocalSnapshot(ticker, metricKey);
    if (fallback) {
      return NextResponse.json({ ...fallback, source: "snapshot" as const });
    }
    return NextResponse.json(
      {
        error:
          "Live options API key not found. Set MASSIVE_API_KEY (or POLYGON_API_KEY) to enable real-time data; no local snapshot was found for this ticker.",
      },
      { status: 400 }
    );
  }

  try {
    /* ── 1. Get spot price ── */
    const spotPrice = await fetchSpotPrice(ticker);

    if (spotPrice === 0) {
      const fallback = await getLatestLocalSnapshot(ticker, metricKey);
      if (fallback) {
        return NextResponse.json({ ...fallback, source: "snapshot" as const });
      }
      return NextResponse.json({ error: "Could not determine spot price" }, { status: 400 });
    }

    /* ── 2. Fetch options snapshots across a range of expiries ── */
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const maxExpiry = new Date(today);
    maxExpiry.setDate(maxExpiry.getDate() + 180);
    const maxExpiryStr = maxExpiry.toISOString().slice(0, 10);

    // Fetch ALL available strikes – no strike filter
    const baseUrl =
      `${BASE}/v3/snapshot/options/${ticker}` +
      `?limit=250` +
      `&expiration_date.gte=${todayStr}` +
      `&expiration_date.lte=${maxExpiryStr}` +
      `&sort=expiration_date` +
      `&apiKey=${API_KEY}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allResults: any[] = [];
    let nextUrl: string | null = baseUrl;
    while (nextUrl) {
      const res: Response = await fetch(nextUrl, { next: { revalidate: 10 } });
      const data = await res.json();
      allResults = allResults.concat(data.results ?? []);
      nextUrl = data.next_url ? `${data.next_url}&apiKey=${API_KEY}` : null;
      // Safety cap to avoid excessive pagination
      if (allResults.length > 15000) break;
    }

    /* ── 3. Compute GEX per strike × expiry ── */
    // GEX_contract = gamma * OI * 100 * spot²
    // For puts, GEX is typically negative (dealer short gamma on puts)
    // We scale by 1e6 for readability

    type GexCell = {
      gex: number;
      callGamma: number;
      putGamma: number;
      callOI: number;
      putOI: number;
      callDelta: number;
      putDelta: number;
      callIV: number;
      putIV: number;
      callVolume: number;
      putVolume: number;
    };

    const grid: Record<number, Record<string, GexCell>> = {};
    const expirySet = new Set<string>();
    const strikeSet = new Set<number>();

    for (const r of allResults) {
      const details = r.details;
      if (!details) continue;
      const strike: number = details.strike_price;
      const expiry: string = details.expiration_date;
      const contractType: string = details.contract_type; // "call" | "put"
      const gamma: number = r.greeks?.gamma ?? 0;
      const vega: number = r.greeks?.vega ?? 0;
      const delta: number = r.greeks?.delta ?? 0;
      const iv: number = r.implied_volatility ?? 0;
      const oi: number = r.open_interest ?? 0;

      const expiryDate = new Date(`${expiry}T16:00:00Z`);
      const daysToExp = Math.max(1, Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000));
      const timeToExp = daysToExp / 365;
      const sqrtT = Math.sqrt(timeToExp);
      const d1 = iv > 0
        ? (Math.log(spotPrice / strike) + (RISK_FREE_RATE + 0.5 * iv * iv) * timeToExp) / (iv * sqrtT)
        : 0;
      const d2 = d1 - iv * sqrtT;
      const pdfD1 = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
      const charm = (iv > 0 && timeToExp > 0)
        ? (contractType === "call"
          ? -pdfD1 * (RISK_FREE_RATE / (iv * sqrtT) - d2 / (2 * timeToExp))
          : pdfD1 * (RISK_FREE_RATE / (iv * sqrtT) - d2 / (2 * timeToExp)))
        : 0;
      const greekValue = metricKey === "vex" ? vega : metricKey === "charm" ? charm : gamma;

      if (greekValue === 0 || oi === 0) continue;

      expirySet.add(expiry);
      strikeSet.add(strike);

      if (!grid[strike]) grid[strike] = {};
      if (!grid[strike][expiry]) {
        grid[strike][expiry] = { gex: 0, callGamma: 0, putGamma: 0, callOI: 0, putOI: 0, callDelta: 0, putDelta: 0, callIV: 0, putIV: 0, callVolume: 0, putVolume: 0 };
      }

      const cell = grid[strike][expiry];
      const volume: number = r.day?.volume ?? 0;
      // Dealer exposure: calls positive, puts negative
      const contractGex = greekValue * oi * 100 * spotPrice * spotPrice;
      if (contractType === "call") {
        cell.gex += contractGex;
        cell.callGamma += gamma;
        cell.callOI += oi;
        cell.callDelta = delta;
        cell.callIV = iv;
        cell.callVolume += volume;
      } else {
        cell.gex -= contractGex; // puts flip sign for dealer
        cell.putGamma += gamma;
        cell.putOI += oi;
        cell.putDelta = delta;
        cell.putIV = iv;
        cell.putVolume += volume;
      }
    }

    const expiryDates = Array.from(expirySet).sort();
    const strikes = Array.from(strikeSet).sort((a, b) => b - a); // high to low

    // Flatten grid to serialisable format: Record<string, Record<string, number>>
    const flatGrid: Record<string, Record<string, number>> = {};
    for (const strike of strikes) {
      const key = String(strike);
      flatGrid[key] = {};
      for (const exp of expiryDates) {
        flatGrid[key][exp] = Math.round(grid[strike]?.[exp]?.gex ?? 0);
      }
    }

    // Build cell details grid for popup info
    const cellDetails: Record<string, Record<string, {
      callOI: number; putOI: number;
      callGamma: number; putGamma: number;
      callDelta: number; putDelta: number;
      callIV: number; putIV: number;
      callVolume: number; putVolume: number;
    }>> = {};
    for (const strike of strikes) {
      const key = String(strike);
      cellDetails[key] = {};
      for (const exp of expiryDates) {
        const cell = grid[strike]?.[exp];
        if (cell) {
          cellDetails[key][exp] = {
            callOI: cell.callOI,
            putOI: cell.putOI,
            callGamma: +cell.callGamma.toFixed(6),
            putGamma: +cell.putGamma.toFixed(6),
            callDelta: +cell.callDelta.toFixed(4),
            putDelta: +cell.putDelta.toFixed(4),
            callIV: +(cell.callIV * 100).toFixed(1),
            putIV: +(cell.putIV * 100).toFixed(1),
            callVolume: cell.callVolume,
            putVolume: cell.putVolume,
          };
        }
      }
    }

    /* ── 4. Compute summary stats ── */
    // Net GEX per strike
    const strikeNetGex: Record<number, number> = {};
    let totalGex = 0;
    for (const strike of strikes) {
      let net = 0;
      for (const exp of expiryDates) {
        net += grid[strike]?.[exp]?.gex ?? 0;
      }
      strikeNetGex[strike] = net;
      totalGex += net;
    }

    // Top positive wall & negative wall
    let topPos = { strike: 0, gex: 0 };
    let topNeg = { strike: 0, gex: 0 };
    for (const strike of strikes) {
      const g = strikeNetGex[strike];
      if (g > topPos.gex) topPos = { strike, gex: g };
      if (g < topNeg.gex) topNeg = { strike, gex: g };
    }

    // Flip price: where cumulative GEX from top crosses zero
    let cumGex = 0;
    let flipPrice = spotPrice;
    for (const strike of [...strikes].sort((a, b) => b - a)) {
      cumGex += strikeNetGex[strike];
      if (cumGex <= 0) {
        flipPrice = strike;
        break;
      }
    }

    // ATM strike: closest to spot
    const atmStrike = strikes.reduce((best, s) =>
      Math.abs(s - spotPrice) < Math.abs(best - spotPrice) ? s : best, strikes[0] ?? 0);

    // Total OI
    let totalCallOI = 0;
    let totalPutOI = 0;
    for (const r of allResults) {
      const ct = r.details?.contract_type;
      const oi = r.open_interest ?? 0;
      if (ct === "call") totalCallOI += oi;
      else totalPutOI += oi;
    }

    // Net OI
    const netOI = totalCallOI - totalPutOI;
    const callPutOIRatio = totalPutOI > 0 ? +(totalCallOI / totalPutOI).toFixed(2) : 0;

    // Format helper
    const fmt = (n: number) => {
      const abs = Math.abs(n);
      if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
      if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
      if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
      return String(Math.round(n));
    };

    return NextResponse.json({
      ticker,
      spotPrice: +spotPrice.toFixed(2),
      expiryDates, // Return all expiry dates
      strikes,
      metric: metricKey,
      source: "live" as const,
      grid: flatGrid,
      cellDetails,
      stats: {
        netGEX: fmt(totalGex),
        netGEXRaw: Math.round(totalGex),
        flipPrice: +flipPrice.toFixed(2),
        topPosWall: { strike: topPos.strike, gex: fmt(topPos.gex) },
        topNegWall: { strike: topNeg.strike, gex: fmt(Math.abs(topNeg.gex)) },
        atmStrike,
        totalOI: fmt(totalCallOI + totalPutOI),
        callPutOIRatio,
        netOI: fmt(netOI),
        totalCallOI: fmt(totalCallOI),
        totalPutOI: fmt(totalPutOI),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GEX API error:", error);

    const fallback = await getLatestLocalSnapshot(ticker, metricKey);
    if (fallback) {
      return NextResponse.json({ ...fallback, source: "snapshot" as const });
    }

    return NextResponse.json(
      { error: "Failed to compute GEX data" },
      { status: 500 }
    );
  }
}
