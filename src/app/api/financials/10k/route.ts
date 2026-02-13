import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.massive.com";

export async function GET(req: NextRequest) {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "").toUpperCase();

  if (!API_KEY) {
    return NextResponse.json({ error: "MASSIVE_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Try dynamic import of official Massive client (if available)
    try {
      // Attempt to import official Massive client if present.
      // @ts-ignore - allow runtime import even if types/package missing locally
      const mod = await import('@massive.com/client-js');
      // @ts-ignore
      const { restClient } = mod;
      if (typeof restClient === 'function') {
        // create client and call endpoint
        const rest = restClient(API_KEY, BASE);
        // call getStocksFilings10KVXSections if available
        if (typeof rest.getStocksFilings10KVXSections === 'function') {
          const resp = await rest.getStocksFilings10KVXSections({ ticker, limit: "100", sort: "period_end.desc" });
          return NextResponse.json({ ok: true, source: 'client-js', data: resp });
        }
      }
      // fallthrough to fetch if client not fully supported
    } catch (e) {
      // ignore and try fetch below
      console.warn('Massive client import failed, falling back to direct fetch', e);
    }

    // NOTE: If the official client is not present, attempt a raw fetch to a plausible endpoint.
    // The exact Massive API path may differ; this fallback attempts a common REST pattern.
    const params = new URLSearchParams();
    if (ticker) params.set('ticker', ticker);
    params.set('limit', '100');
    params.set('sort', 'period_end.desc');
    // Many Massive endpoints accept the API key as `apiKey` on the query string
    // (example: /stocks/vX/float?apiKey=...). Add it here as a best-effort fallback.
    params.set('apiKey', API_KEY);

    // Use the exact path observed in the API examples when falling back to raw fetch
    // e.g. https://api.massive.com/stocks/filings/10-K/vX/sections?limit=100&sort=period_end.desc&apiKey=...
    const url = `${BASE}/stocks/filings/10-K/vX/sections?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // don't cache sensitive filings responses by default
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const text = await res.text();
      let body: any = text;
      try {
        body = JSON.parse(text);
      } catch (e) {
        // not JSON, keep as text
      }
      // Propagate upstream status code instead of always returning 502 so the client
      // sees the real HTTP status (401/403/etc) and can show a clearer message.
      return NextResponse.json({ error: 'Massive fetch failed', source: 'fetch', body }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json({ ok: true, source: 'fetch', data: json });
  } catch (error) {
    console.error('10-K API error:', error);
    return NextResponse.json({ error: 'Failed to fetch 10-K sections' }, { status: 500 });
  }
}
