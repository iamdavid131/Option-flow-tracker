"use client";

import { useEffect, useState } from "react";

type Channel = { id: string; label: string; embed: string; url?: string };

const CHANNELS: Channel[] = [
  { id: "cnbc", label: "CNBC", embed: "https://www.youtube.com/embed/live_stream?channel=UCu9D6-2kUnGAr7QG2f9Y7XA", url: "https://www.cnbc.com" },
  { id: "bloomberg", label: "Bloomberg", embed: "https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ6AmdCLP7Lg", url: "https://www.bloomberg.com" },
  { id: "sky", label: "Sky News", embed: "https://www.youtube.com/embed/live_stream?channel=UCUK0HBIBWgM2c4vsPhG8Q7A", url: "https://news.sky.com" },
];

function KpiTile({ title, ticker }: { title: string; ticker: string }) {
  const [price, setPrice] = useState<string>("—");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}&range=1d`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setPrice((data.currentPrice || data.price || "—").toString());
      } catch (e) {
        // ignore
      }
    }
    load();
    const id = setInterval(load, 15_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [ticker]);

  return (
    <div className="kpi-tile rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 min-w-[120px]">
      <div className="text-xs text-[var(--muted)]">{title}</div>
      <div className="mt-1 text-lg font-semibold">{price}</div>
    </div>
  );
}

export default function WMBottomRow() {
  const [selected, setSelected] = useState<string>(() => typeof window !== "undefined" ? localStorage.getItem("wm:channel") || CHANNELS[0].id : CHANNELS[0].id);

  useEffect(() => {
    localStorage.setItem("wm:channel", selected);
  }, [selected]);

  const chan = CHANNELS.find((c) => c.id === selected) || CHANNELS[0];

  return (
    <div className="wm-bottom mt-4 grid grid-cols-12 gap-4 items-start">
      <div className="col-span-6 sm:col-span-8 lg:col-span-7">
        <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-black h-56 sm:h-80">
          <iframe
            title="live-channel"
            src={chan.embed}
            allow="autoplay; encrypted-media"
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
        <div className="mt-2 flex gap-2">
          {CHANNELS.map((c) => (
            <button key={c.id} className={`rounded-md px-2 py-1 text-sm border ${c.id === selected ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] bg-[var(--panel-2)]"}`} onClick={() => setSelected(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-6 sm:col-span-4 lg:col-span-5 flex flex-col gap-3">
        <div className="flex gap-3">
          <KpiTile title="VIX" ticker="VIX" />
          <KpiTile title="Gold" ticker="GC=F" />
          <KpiTile title="Oil" ticker="CL=F" />
        </div>

        <div className="news-tiles grid grid-cols-2 gap-2">
          <NewsTileSmall feedUrl="https://www.reuters.com/tools/rss" title="Markets" />
          <NewsTileSmall feedUrl="http://feeds.bbci.co.uk/news/world/rss.xml" title="World" />
        </div>
      </div>
    </div>
  );
}

function NewsTileSmall({ feedUrl, title }: { feedUrl: string; title: string }) {
  const [items, setItems] = useState<{ title: string; link: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/rss?url=${encodeURIComponent(feedUrl)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        const its = Array.isArray(json.items) ? json.items.slice(0, 3) : [];
        setItems(its.map((i: any) => ({ title: i.title, link: i.link })));
      } catch {}
    })();
    return () => { mounted = false; };
  }, [feedUrl]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="text-xs text-[var(--muted)] flex flex-col gap-2">
        {items.length === 0 ? <div>Loading…</div> : items.map((it, i) => (
          <a key={i} href={it.link} target="_blank" rel="noreferrer" className="truncate">{it.title}</a>
        ))}
      </div>
    </div>
  );
}
