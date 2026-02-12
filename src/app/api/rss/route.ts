import { NextResponse } from "next/server";

const MAX_ITEMS = 40;

function decodeHtml(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function matchTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, "i");
  const match = block.match(re);
  return match ? decodeHtml(match[1]) : "";
}

function parseRssItems(xml: string) {
  const items = xml.split(/<item[^>]*>/i).slice(1);
  return items
    .map((chunk) => {
      const title = matchTag(chunk, "title");
      const link = matchTag(chunk, "link");
      const pubDate = matchTag(chunk, "pubDate") || matchTag(chunk, "dc:date");
      return { title, link, pubDate };
    })
    .filter((item) => item.title && item.link)
    .slice(0, MAX_ITEMS);
}

function parseAtomItems(xml: string) {
  const entries = xml.split(/<entry[^>]*>/i).slice(1);
  return entries
    .map((chunk) => {
      const title = matchTag(chunk, "title");
      const linkMatch = chunk.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
      const link = linkMatch ? decodeHtml(linkMatch[1]) : matchTag(chunk, "id");
      const pubDate = matchTag(chunk, "updated") || matchTag(chunk, "published");
      return { title, link, pubDate };
    })
    .filter((item) => item.title && item.link)
    .slice(0, MAX_ITEMS);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "option-flow-tracker/1.0" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }

    const xml = await res.text();
    const items = xml.includes("<entry") ? parseAtomItems(xml) : parseRssItems(xml);

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
