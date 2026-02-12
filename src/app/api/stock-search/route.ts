import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.polygon.io";

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();

  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] });
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
