import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const SNAPSHOTS_DIR = path.join(process.cwd(), "data", "gex-snapshots");

/**
 * GET /api/gex/snapshots?ticker=SPY&date=2026-02-11
 * Returns all saved snapshots for that ticker + date.
 *
 * POST /api/gex/snapshots
 * Body: { ticker, date, snapshot }
 * Saves a timestamped snapshot to disk.
 */

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // already exists
  }
}

function getFilePath(ticker: string, metric: string, date: string) {
  return path.join(SNAPSHOTS_DIR, `${ticker}_${metric}_${date}.json`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Snapshot = { time: string; data: any };

async function readSnapshots(ticker: string, metric: string, date: string): Promise<Snapshot[]> {
  const filePath = getFilePath(ticker, metric, date);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Snapshot[];
  } catch {
    return [];
  }
}

async function writeSnapshots(ticker: string, metric: string, date: string, snapshots: Snapshot[]) {
  await ensureDir(SNAPSHOTS_DIR);
  const filePath = getFilePath(ticker, metric, date);
  await fs.writeFile(filePath, JSON.stringify(snapshots), "utf-8");
}

export async function GET(req: NextRequest) {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "SPY").toUpperCase();
  const metric = (req.nextUrl.searchParams.get("metric") ?? "gex").toLowerCase();
  const metricKey = metric === "vex" || metric === "charm" ? metric : "gex";
  // Default to today's date in ET
  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  const snapshots = await readSnapshots(ticker, metricKey, date);

  // Also return list of available dates for this ticker
  let availableDates: string[] = [];
  try {
    await ensureDir(SNAPSHOTS_DIR);
    const files = await fs.readdir(SNAPSHOTS_DIR);
    availableDates = files
      .filter((f) => f.startsWith(`${ticker}_${metricKey}_`) && f.endsWith(".json"))
      .map((f) => f.replace(`${ticker}_${metricKey}_`, "").replace(".json", ""))
      .sort()
      .reverse();
  } catch {
    // dir doesn't exist yet
  }

  return NextResponse.json({
    ticker,
    metric: metricKey,
    date,
    snapshots,
    availableDates,
    count: snapshots.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ticker = (body.ticker ?? "SPY").toUpperCase();
    const metric = (body.metric ?? "gex").toLowerCase();
    const metricKey = metric === "vex" || metric === "charm" ? metric : "gex";
    const now = new Date();
    const date = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const timeStr = now.toISOString();

    if (!body.snapshot) {
      return NextResponse.json({ error: "Missing snapshot data" }, { status: 400 });
    }

    const existing = await readSnapshots(ticker, metricKey, date);

    // Dedupe: skip if last snapshot was less than 2 minutes ago
    if (existing.length > 0) {
      const lastTime = new Date(existing[existing.length - 1].time).getTime();
      if (now.getTime() - lastTime < 120000) {
        return NextResponse.json({ message: "Too soon, skipped", count: existing.length });
      }
    }

    existing.push({ time: timeStr, data: body.snapshot });
    await writeSnapshots(ticker, metricKey, date, existing);

    return NextResponse.json({ message: "Saved", count: existing.length, time: timeStr, metric: metricKey });
  } catch (err) {
    console.error("Snapshot save error:", err);
    return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
  }
}
