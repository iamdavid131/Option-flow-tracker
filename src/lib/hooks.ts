"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FlowOrder, DarkPoolTrade } from "./types";

const DEFAULT_TICKERS = "NVDA,AAPL,TSLA,SPY,META,AMD,SMCI,MSFT,AMZN,GOOGL";
const POLL_INTERVAL = 8_000; // 8 seconds
const FLOW_POLL_INTERVAL = 1_000; // 1 second during active tape view
const FLOW_MAX_ROWS = 300;

function getFlowKey(order: FlowOrder) {
  return [
    order.ticker,
    order.expiry,
    order.contractType,
    order.strike,
    order.side,
    order.price,
    order.size,
    order.time,
  ].join("|");
}

function mergeFlowRows(incoming: FlowOrder[], existing: FlowOrder[]) {
  const merged = [...incoming, ...existing];
  const seen = new Set<string>();
  const result: FlowOrder[] = [];

  for (const row of merged) {
    const key = getFlowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
    if (result.length >= FLOW_MAX_ROWS) break;
  }

  return result;
}

/* ──────────────────────────────────
   useFlowData  –  live option flow
   ────────────────────────────────── */
export function useFlowData(tickers?: string) {
  const [orders, setOrders] = useState<FlowOrder[]>([]);
  const [spotPrices, setSpotPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);

  const fetchFlow = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const tickerParam = (tickers && tickers.trim()) ? tickers.trim() : DEFAULT_TICKERS;
      const res = await fetch(`/api/flow?tickers=${encodeURIComponent(tickerParam)}&limit=300&snapLimit=250&_=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        const nextRows = data.orders as FlowOrder[];
        setOrders((prev) => mergeFlowRows(nextRows, prev));
      }
      setSpotPrices(data.spotPrices ?? {});
      setLastUpdate(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [tickers]);

  useEffect(() => {
    fetchFlow();
    intervalRef.current = setInterval(fetchFlow, FLOW_POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchFlow]);

  return { orders, spotPrices, loading, error, lastUpdate, refetch: fetchFlow };
}

/* ──────────────────────────────────
   useDarkPoolData  –  dark pool
   ────────────────────────────────── */
export function useDarkPoolData() {
  const [trades, setTrades] = useState<DarkPoolTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDP = useCallback(async () => {
    try {
      const res = await fetch(`/api/darkpool?tickers=${DEFAULT_TICKERS}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.trades && data.trades.length > 0) {
        setTrades(data.trades);
        setLastUpdate(
          new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDP();
    intervalRef.current = setInterval(fetchDP, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchDP]);

  return { trades, loading, error, lastUpdate, refetch: fetchDP };
}
