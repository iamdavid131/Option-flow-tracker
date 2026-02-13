import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.polygon.io";

// Simple in-memory cache
const cache: { ts: number; data: Record<string, number> } = { ts: 0, data: {} };

// Dynamic tickers added at runtime (e.g., discovered from /api/flow)
export const dynamicTickers = new Set<string>();
export function addDynamicTickers(tickers: string[] | string) {
  if (!tickers) return;
  const list = Array.isArray(tickers) ? tickers : String(tickers).split(",");
  for (const t of list) {
    const up = String(t).trim().toUpperCase();
    if (up) dynamicTickers.add(up);
  }
}

async function readLocalTickers(): Promise<string[]> {
  try {
    const dir = path.join(process.cwd(), "data", "gex-snapshots");
    const files = await fs.promises.readdir(dir);
    const set = new Set<string>();
    for (const f of files) {
      const m = f.match(/^([A-Z0-9.%-]+)_/i);
      if (!m) continue;
      set.add(m[1].toUpperCase());
    }
    // merge dynamic tickers
    for (const t of dynamicTickers) set.add(t);
    return Array.from(set);
  } catch {
    return [];
  }
}

// Return combined tickers used across local snapshots, defaults and dynamic ones
export async function getAllTickers(): Promise<string[]> {
  try {
    const local = await readLocalTickers();
    const defaults = ["NVDA", "AAPL", "TSLA", "SPY", "META", "AMD", "SMCI", "MSFT", "AMZN", "GOOGL"];
    const merged = Array.from(new Set([...local, ...defaults]));
    return merged.slice(0, 400);
  } catch {
    return [];
  }
}

// Fetch spot prices for a list of tickers and update cache
export async function fetchSpotPricesFor(tickers: string[]) {
  const now = Date.now();
  // If cache is fresh (< 1500ms) and covers requested tickers, return cached subset
  if (now - cache.ts < 1500) {
    const subset: Record<string, number> = {};
    for (const t of tickers) if (cache.data[t] != null) subset[t] = cache.data[t];
    return { spotPrices: subset, cached: true, timestamp: new Date(cache.ts).toISOString() };
  }

  if (!API_KEY) return { spotPrices: {}, error: 'Missing API key' };

  try {
    const batchSize = 100;
    const results: Record<string, number> = {};
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize).join(",");
      const url = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${encodeURIComponent(batch)}&apiKey=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const items = (json.tickers ?? []) as any[];
      for (const it of items) {
        const t = (it.ticker ?? "").toUpperCase();
        const snap = it ?? {};
        const day = snap.day ?? {};
        const lastTrade = snap.lastTrade ?? {};
        const fmv = snap.fmv ?? lastTrade.p ?? day.c ?? 0;
        results[t] = Number(fmv || 0);
      }
    }

    cache.ts = Date.now();
    cache.data = { ...cache.data, ...results };

    const subset: Record<string, number> = {};
    for (const t of tickers) if (cache.data[t] != null) subset[t] = cache.data[t];
    return { spotPrices: subset, cached: false, timestamp: new Date(cache.ts).toISOString() };
  } catch (error) {
    console.error('Spot-prices error:', error);
    return { spotPrices: {}, error: 'Failed to fetch spot prices' };
  }
}

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.get("tickers");
  let tickers: string[] = [];

  if (qs && qs.trim().length > 0) {
    tickers = qs.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
  } else {
    // build from local snapshots + default list
    const local = await readLocalTickers();
    const defaults = ["NVDA", "AAPL", "TSLA", "SPY", "META", "AMD", "SMCI", "MSFT", "AMZN", "GOOGL"];
    tickers = Array.from(new Set([...local, ...defaults])).slice(0, 400);
  }

  // If cache is fresh (< 1500ms) and covers requested tickers, return cached subset
  const now = Date.now();
  if (now - cache.ts < 1500) {
    const subset: Record<string, number> = {};
    for (const t of tickers) if (cache.data[t] != null) subset[t] = cache.data[t];
    return NextResponse.json({ spotPrices: subset, cached: true, timestamp: new Date(cache.ts).toISOString() });
  }

  if (!API_KEY) return NextResponse.json({ spotPrices: {}, error: 'Missing API key' }, { status: 500 });

  try {
    // polygon snapshot accepts comma-separated tickers (limit varies); batch in groups of 100
    const batchSize = 100;
    const results: Record<string, number> = {};
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize).join(",");
      const url = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${encodeURIComponent(batch)}&apiKey=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const items = (json.tickers ?? []) as any[];
      for (const it of items) {
        const t = (it.ticker ?? "").toUpperCase();
        const snap = it ?? {};
        const day = snap.day ?? {};
        const lastTrade = snap.lastTrade ?? {};
        const fmv = snap.fmv ?? lastTrade.p ?? day.c ?? 0;
        results[t] = Number(fmv || 0);
      }
    }

    cache.ts = Date.now();
    cache.data = { ...cache.data, ...results };

    const subset: Record<string, number> = {};
    for (const t of tickers) if (cache.data[t] != null) subset[t] = cache.data[t];
    return NextResponse.json({ spotPrices: subset, cached: false, timestamp: new Date(cache.ts).toISOString() });
  } catch (error) {
    console.error('Spot-prices error:', error);
    return NextResponse.json({ spotPrices: {}, error: 'Failed to fetch spot prices' }, { status: 500 });
  }
}
