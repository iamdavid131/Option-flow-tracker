import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.massive.com";

export async function GET(req: NextRequest) {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "").toUpperCase();

  if (!API_KEY) {
    return NextResponse.json({ error: "MASSIVE_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Try official client first (optional)
    try {
      // @ts-ignore
      const mod = await import('@massive.com/client-js');
      // @ts-ignore
      const { restClient } = mod;
      if (typeof restClient === 'function') {
        const rest = restClient(API_KEY, BASE);
        if (typeof rest.getStocksFinancialsV1Ratios === 'function') {
          const resp = await rest.getStocksFinancialsV1Ratios({ ticker, limit: "100", sort: "ticker.asc" });
          return NextResponse.json({ ok: true, source: 'client-js', data: resp });
        }
      }
    } catch (e) {
      console.warn('Massive client import failed for ratios, falling back to fetch', e);
    }

    // Fallback: call plausible REST endpoint using v1 path and apiKey query param
    const params = new URLSearchParams();
    if (ticker) params.set('ticker', ticker);
    params.set('limit', '100');
    params.set('sort', 'ticker.asc');
    params.set('apiKey', API_KEY);

    const url = `${BASE}/stocks/financials/v1/ratios?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const text = await res.text();
      let body: any = text;
      try { body = JSON.parse(text); } catch (e) { /* keep as text */ }
      return NextResponse.json({ error: 'Massive fetch failed', source: 'fetch', body }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json({ ok: true, source: 'fetch', data: json });
  } catch (error) {
    console.error('Ratios API error:', error);
    return NextResponse.json({ error: 'Failed to fetch ratios' }, { status: 500 });
  }
}
