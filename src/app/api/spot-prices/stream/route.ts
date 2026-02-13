import { NextResponse } from "next/server";
import { fetchSpotPricesFor } from "../route";

// SSE stream that pushes aggregated spot prices to connected clients
export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.searchParams.get("tickers");
  let tickers: string[] = [];
  if (qs && qs.trim().length > 0) tickers = qs.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const ping = () => {
        if (closed) return;
        controller.enqueue(encoder.encode(': ping\n\n'));
      };

      const pushPrices = async () => {
        try {
          const actualTickers = tickers.length > 0 ? tickers : [];
          const res = await fetchSpotPricesFor(actualTickers.length ? actualTickers : []);
          const payload = JSON.stringify({ spotPrices: res.spotPrices ?? {}, timestamp: res.timestamp ?? new Date().toISOString(), cached: !!res.cached });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (e) {
          controller.enqueue(encoder.encode(`event: error\ndata: {"error":"stream error"}\n\n`));
        }
      };

      // initial push
      await pushPrices();

      // push every 1s
      const id = setInterval(pushPrices, 1000);
      const pingId = setInterval(ping, 15_000);

      // when request aborts, clear intervals
      try {
        // `req` is available in outer scope; use its signal to detect client disconnect
        // @ts-ignore - Request.signal exists in runtime
        (req as any).signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(id);
          clearInterval(pingId);
          try {
            controller.close();
          } catch {}
        });
      } catch (e) {
        // ignore
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
