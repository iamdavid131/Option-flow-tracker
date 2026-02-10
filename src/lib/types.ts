export interface FlowOrder {
  time: string;
  ticker: string;
  strike: number;
  contractType: "call" | "put";
  expiry: string;
  reference: number;
  size: number;
  price: number;
  premium: string;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  type: "AUTO" | "AUCT" | "MANUAL";
  consolidation: "SWEEP" | "BLOCK" | "SPLIT";
  volume: string;
  oi: string;
  side: "BID" | "ASK" | "MID";
  dte: string;
}

export interface DarkPoolTrade {
  time: string;
  ticker: string;
  price: number;
  size: number;
  notional: string;
  venue: string;
  type: "BLOCK" | "PRINT" | "CROSS";
  sentiment: "ABOVE" | "BELOW" | "AT";
}
