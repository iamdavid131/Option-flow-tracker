import { NextResponse } from "next/server";
import { computeFlowForTickers } from "../route";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.searchParams.get("tickers");
  let tickers: string[] = [];
  if (qs && qs.trim().length > 0 && qs.toUpperCase() !== "ALL") tickers = qs.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const sentSigs = new Set<string>();

      const push = async () => {
        try {
          const computed = await computeFlowForTickers(tickers.length ? tickers : [], 300, 150);
          const orders = computed.orders ?? [];
          const newOrders = [];
          for (const o of orders) {
            const sig = [o.ticker, o.expiry, o.contractType, o.strike, o.side, o.price, o.size, o.time].join("|");
            if (!sentSigs.has(sig)) {
              sentSigs.add(sig);
              newOrders.push(o);
            }
          }
          if (newOrders.length > 0) {
            const payload = JSON.stringify({ orders: newOrders, timestamp: computed.timestamp });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          } else {
            // send a ping comment to keep the connection alive
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`event: error\ndata: {"error":"stream"}\n\n`));
        }
      };

      // initial push
      await push();

      const id = setInterval(push, 1000);

      try {
        // @ts-ignore
        (req as any).signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(id);
          try { controller.close(); } catch {}
        });
      } catch {}
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
