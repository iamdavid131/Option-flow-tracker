"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FlowOrder, DarkPoolTrade } from "./types";

const DEFAULT_TICKERS = "NVDA,AAPL,TSLA,SPY,META,AMD,SMCI,MSFT,AMZN,GOOGL";
const POLL_INTERVAL = 8_000; // 8 seconds

/* ──────────────────────────────────
   useFlowData  –  live option flow
   ────────────────────────────────── */
export function useFlowData() {
  const [orders, setOrders] = useState<FlowOrder[]>([]);
  const [spotPrices, setSpotPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFlow = useCallback(async () => {
    try {
      const res = await fetch(`/api/flow?tickers=${DEFAULT_TICKERS}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.orders && data.orders.length > 0) {
        setOrders(data.orders);
        setSpotPrices(data.spotPrices ?? {});
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
    fetchFlow();
    intervalRef.current = setInterval(fetchFlow, POLL_INTERVAL);
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
