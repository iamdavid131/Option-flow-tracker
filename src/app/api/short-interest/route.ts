import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker') ?? '';
    const limit = searchParams.get('limit') ?? '100';

    const apiKey = process.env.MASSIVE_API_KEY ?? searchParams.get('apiKey') ?? '';
    if (!ticker) return NextResponse.json({ ok: false, error: 'Missing ticker' }, { status: 400 });

    const url = `https://api.massive.com/stocks/v1/short-interest?ticker=${encodeURIComponent(ticker)}&limit=${encodeURIComponent(limit)}&sort=settlement_date.desc${apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : ''}`;

    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch (e) { data = text; }

    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, body: data }, { status: res.status });
    }

    return NextResponse.json({ ok: true, source: 'massive', data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
