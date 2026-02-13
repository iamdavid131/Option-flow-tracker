"use client";

import React, { useEffect, useMemo, useState } from "react";

type NewsItem = {
  title: string;
  publisher: string;
  publishedUtc: string;
  url: string;
  imageUrl?: string;
  description?: string;
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(1, Math.round((now - d) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

export default function NewsLive({ ticker }: { ticker: string }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const load = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const news = Array.isArray(json.news) ? json.news : [];
      setItems(news as NewsItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items
      .filter((n) => (category === "All" ? true : (n as any).category === category))
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          (n.description ?? "").toLowerCase().includes(q) ||
          (n.publisher ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.publishedUtc).getTime() - new Date(a.publishedUtc).getTime());
  }, [items, query, category]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">News</h3>
          <div className="text-sm text-[var(--muted)]">{loading ? 'Loading…' : `${items.length} items`}</div>
        </div>
        <div className="flex items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tickers, macro, earnings..." className="rounded-md border px-3 py-1 bg-[var(--panel)]" />
        </div>
      </div>

      {error && <div className="text-[var(--danger)]">{error}</div>}

      <div className="grid gap-3">
        {filtered.map((item, i) => (
          <a key={i} href={item.url} target="_blank" rel="noreferrer" className="group flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4 hover:border-[var(--accent-2)]/30">
            {item.imageUrl && <img src={item.imageUrl} alt="" className="hidden sm:block w-36 h-24 object-cover rounded" />}
            <div className="flex-1">
              <div className="text-xs text-[var(--muted)]">{item.publisher} • {timeAgo(item.publishedUtc)}</div>
              <h4 className="mt-1 text-sm font-semibold">{item.title}</h4>
              <p className="mt-1 text-[13px] text-[var(--muted)]">{item.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
