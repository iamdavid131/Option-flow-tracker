import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.polygon.io";
import fs from "fs";
import path from "path";
// Merge in tickers from mock data so `/api/stock-search?all=1` covers heatmap tickers
import { mockFlowOrders } from "../../../lib/mock-data";

async function readLocalTickers(): Promise<Array<{ ticker: string; name: string; market: string; locale: string; primaryExchange: string }>> {
  try {
    const dir = path.join(process.cwd(), "data", "gex-snapshots");
    const files = await fs.promises.readdir(dir);
    const tickers = new Map<string, string>();
    for (const f of files) {
      const m = f.match(/^([A-Z0-9.%-]+)_/i);
      if (!m) continue;
      const t = m[1].toUpperCase();
      // Try to read the snapshot and extract a name if present
      try {
        const content = await fs.promises.readFile(path.join(dir, f), "utf8");
        if (content) {
          try {
            const parsed = JSON.parse(content);
            // Snapshot format may contain ticker/name at top level or inside data
            const name = (parsed?.name as string) || (parsed?.ticker as string) || (parsed?.stats?.name as string) || "";
            if (name && name.trim().length > 0 && name !== t) {
              tickers.set(t, name);
              continue;
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      } catch {
        // ignore read errors
      }
      // default to ticker if no name found
      if (!tickers.has(t)) tickers.set(t, t);
    }
    // Also include tickers that appear in mockFlowOrders (used in heatmap/flow pages)
    try {
      for (const r of mockFlowOrders) {
        if (r && r.ticker) {
          tickers.set(String(r.ticker).toUpperCase(), r.ticker || String(r.ticker).toUpperCase());
        }
      }
    } catch {
      // ignore
    }

    // Ensure a small default set is available as well
    const DEFAULT_ADD = ["NVDA", "AAPL", "TSLA", "SPY", "META", "AMD", "SMCI", "MSFT", "AMZN", "GOOGL"];
    for (const t of DEFAULT_ADD) tickers.set(t, t);

    return Array.from(tickers.entries()).slice(0, 2000).map(([ticker, name]) => ({ ticker, name, market: "", locale: "", primaryExchange: "" }));
  } catch (err) {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const queryRaw = req.nextUrl.searchParams.get("q");
  const allFlag = req.nextUrl.searchParams.get("all");
  const query = (queryRaw ?? "").trim();

  // If client asks for all tickers, return local tickers (or polygon if available)
  if (allFlag === "1" || query.length < 1) {
    // Prefer polygon when API key present
    if (API_KEY && query.length > 0) {
      // fall through to polygon search below
    } else if (API_KEY && allFlag === "1") {
      // polygon doesn't support listing all tickers easily; fallback to local
      const local = await readLocalTickers();
      return NextResponse.json({ results: local });
    } else {
      const local = await readLocalTickers();
      // If query provided, filter locally
      if (query.length > 0) {
        const q = query.toUpperCase();
        const filtered = local.filter((r) => r.ticker.includes(q) || r.name.toUpperCase().includes(q)).slice(0, 1000);
        return NextResponse.json({ results: filtered });
      }
      return NextResponse.json({ results: local });
    }
  }

  if (!API_KEY) {
    return NextResponse.json({ results: [], error: "Missing API key" }, { status: 500 });
  }

  try {
    const encoded = encodeURIComponent(query);
    const url = `${BASE}/v3/reference/tickers?search=${encoded}&active=true&sort=ticker&order=asc&limit=12&apiKey=${API_KEY}`;
    const response = await fetch(url, { next: { revalidate: 60 } });
    const data = await response.json();

    const results = ((data.results as Array<Record<string, unknown>>) ?? []).map((item) => ({
      ticker: String(item.ticker ?? ""),
      name: String(item.name ?? ""),
      market: String(item.market ?? ""),
      locale: String(item.locale ?? ""),
      primaryExchange: String(item.primary_exchange ?? ""),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Stock search API error:", error);
    return NextResponse.json({ results: [], error: "Failed to search stocks" }, { status: 500 });
  }
}
