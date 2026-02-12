"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

/* ─── Types ─── */
interface WorldTopology extends Topology {
  objects: { countries: GeometryCollection };
}

interface MarketCenter {
  id: string;
  name: string;
  abbr: string;
  lat: number;
  lon: number;
  type: "exchange" | "central-bank" | "hub";
  region: string;
  hours?: { open: string; close: string; tz: string };
}

type MapView = "global" | "americas" | "europe" | "asia" | "mena" | "oceania";

/* ─── Market Centres Data ─── */
const MARKET_CENTERS: MarketCenter[] = [
  // Americas
  { id: "nyse",  name: "New York Stock Exchange", abbr: "NYSE",  lat: 40.706, lon: -74.009, type: "exchange", region: "Americas", hours: { open: "09:30", close: "16:00", tz: "America/New_York" } },
  { id: "nasdaq",name: "NASDAQ",                  abbr: "NSDQ",  lat: 40.757, lon: -73.990, type: "exchange", region: "Americas", hours: { open: "09:30", close: "16:00", tz: "America/New_York" } },
  { id: "cme",   name: "Chicago Mercantile Exchange", abbr: "CME", lat: 41.882, lon: -87.632, type: "exchange", region: "Americas", hours: { open: "08:30", close: "15:00", tz: "America/Chicago" } },
  { id: "tsx",   name: "Toronto Stock Exchange",   abbr: "TSX",   lat: 43.647, lon: -79.387, type: "exchange", region: "Americas", hours: { open: "09:30", close: "16:00", tz: "America/Toronto" } },
  { id: "bovespa",name: "B3 (Bovespa)",           abbr: "B3",    lat: -23.545, lon: -46.637, type: "exchange", region: "Americas", hours: { open: "10:00", close: "17:00", tz: "America/Sao_Paulo" } },
  { id: "bvm",   name: "Bolsa Mexicana",          abbr: "BMV",   lat: 19.432, lon: -99.133, type: "exchange", region: "Americas", hours: { open: "08:30", close: "15:00", tz: "America/Mexico_City" } },
  { id: "fed",   name: "Federal Reserve",          abbr: "FED",   lat: 38.893, lon: -77.044, type: "central-bank", region: "Americas" },

  // Europe
  { id: "lse",   name: "London Stock Exchange",   abbr: "LSE",   lat: 51.514, lon: -0.089, type: "exchange", region: "Europe", hours: { open: "08:00", close: "16:30", tz: "Europe/London" } },
  { id: "euronext",name: "Euronext Paris",        abbr: "ENX",   lat: 48.870, lon: 2.342, type: "exchange", region: "Europe", hours: { open: "09:00", close: "17:30", tz: "Europe/Paris" } },
  { id: "dax",   name: "Deutsche Börse",          abbr: "XETRA", lat: 50.110, lon: 8.682, type: "exchange", region: "Europe", hours: { open: "09:00", close: "17:30", tz: "Europe/Berlin" } },
  { id: "six",   name: "SIX Swiss Exchange",      abbr: "SIX",   lat: 47.379, lon: 8.539, type: "exchange", region: "Europe", hours: { open: "09:00", close: "17:30", tz: "Europe/Zurich" } },
  { id: "ecb",   name: "European Central Bank",   abbr: "ECB",   lat: 50.109, lon: 8.704, type: "central-bank", region: "Europe" },
  { id: "boe",   name: "Bank of England",         abbr: "BOE",   lat: 51.514, lon: -0.088, type: "central-bank", region: "Europe" },
  { id: "moex",  name: "Moscow Exchange",         abbr: "MOEX",  lat: 55.754, lon: 37.621, type: "exchange", region: "Europe", hours: { open: "10:00", close: "18:50", tz: "Europe/Moscow" } },

  // Asia-Pacific
  { id: "tse",   name: "Tokyo Stock Exchange",    abbr: "TSE",   lat: 35.681, lon: 139.774, type: "exchange", region: "Asia", hours: { open: "09:00", close: "15:00", tz: "Asia/Tokyo" } },
  { id: "sse",   name: "Shanghai Stock Exchange",  abbr: "SSE",   lat: 31.232, lon: 121.469, type: "exchange", region: "Asia", hours: { open: "09:30", close: "15:00", tz: "Asia/Shanghai" } },
  { id: "szse",  name: "Shenzhen Stock Exchange",  abbr: "SZSE",  lat: 22.536, lon: 114.055, type: "exchange", region: "Asia", hours: { open: "09:30", close: "15:00", tz: "Asia/Shanghai" } },
  { id: "hkex",  name: "Hong Kong Exchange",      abbr: "HKEX",  lat: 22.286, lon: 114.158, type: "exchange", region: "Asia", hours: { open: "09:30", close: "16:00", tz: "Asia/Hong_Kong" } },
  { id: "krx",   name: "Korea Exchange",          abbr: "KRX",   lat: 35.179, lon: 129.076, type: "exchange", region: "Asia", hours: { open: "09:00", close: "15:30", tz: "Asia/Seoul" } },
  { id: "bse",   name: "BSE India",               abbr: "BSE",   lat: 18.930, lon: 72.833, type: "exchange", region: "Asia", hours: { open: "09:15", close: "15:30", tz: "Asia/Kolkata" } },
  { id: "sgx",   name: "Singapore Exchange",      abbr: "SGX",   lat: 1.284, lon: 103.851, type: "exchange", region: "Asia", hours: { open: "09:00", close: "17:00", tz: "Asia/Singapore" } },
  { id: "asx",   name: "Australian Securities Exchange", abbr: "ASX", lat: -33.868, lon: 151.209, type: "exchange", region: "Oceania", hours: { open: "10:00", close: "16:00", tz: "Australia/Sydney" } },
  { id: "nzx",   name: "NZX Limited",             abbr: "NZX",   lat: -41.289, lon: 174.775, type: "exchange", region: "Oceania", hours: { open: "10:00", close: "16:45", tz: "Pacific/Auckland" } },
  { id: "boj",   name: "Bank of Japan",           abbr: "BOJ",   lat: 35.688, lon: 139.772, type: "central-bank", region: "Asia" },
  { id: "pboc",  name: "People's Bank of China",  abbr: "PBOC",  lat: 39.907, lon: 116.384, type: "central-bank", region: "Asia" },

  // Middle East / Africa
  { id: "tadawul",name: "Saudi Exchange",          abbr: "TDWL",  lat: 24.710, lon: 46.680, type: "exchange", region: "MENA", hours: { open: "10:00", close: "15:00", tz: "Asia/Riyadh" } },
  { id: "jse",   name: "Johannesburg SE",          abbr: "JSE",   lat: -26.207, lon: 28.044, type: "exchange", region: "MENA", hours: { open: "09:00", close: "17:00", tz: "Africa/Johannesburg" } },
  { id: "dfm",   name: "Dubai Financial Market",   abbr: "DFM",   lat: 25.221, lon: 55.282, type: "exchange", region: "MENA", hours: { open: "10:00", close: "14:00", tz: "Asia/Dubai" } },
  { id: "tase",  name: "Tel Aviv Stock Exchange",  abbr: "TASE",  lat: 32.086, lon: 34.774, type: "exchange", region: "MENA", hours: { open: "09:59", close: "17:14", tz: "Asia/Jerusalem" } },
];

/* ─── View presets ─── */
const VIEW_PRESETS: Record<MapView, { zoom: number; pan: { x: number; y: number } }> = {
  global:   { zoom: 1,   pan: { x: 0, y: 0 } },
  americas: { zoom: 1.8, pan: { x: 180, y: 30 } },
  europe:   { zoom: 2.6, pan: { x: -30, y: 110 } },
  asia:     { zoom: 2,   pan: { x: -320, y: 40 } },
  mena:     { zoom: 3,   pan: { x: -100, y: 50 } },
  oceania:  { zoom: 2.4, pan: { x: -420, y: -100 } },
};

/* ─── Helpers ─── */
const WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

function isMarketOpen(center: MarketCenter, now: Date): boolean {
  if (!center.hours) return false;
  try {
    const timeStr = now.toLocaleTimeString("en-US", { hour12: false, timeZone: center.hours.tz });
    const [h, m] = timeStr.split(":").map(Number);
    const currentMin = h * 60 + m;
    const [oh, om] = center.hours.open.split(":").map(Number);
    const [ch, cm] = center.hours.close.split(":").map(Number);
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    const day = new Date(now.toLocaleString("en-US", { timeZone: center.hours.tz })).getDay();
    if (day === 0 || day === 6) return false;
    return currentMin >= openMin && currentMin <= closeMin;
  } catch {
    return false;
  }
}

/* ─── Component ─── */
export default function WorldMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const overlaysRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<MapView>("global");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; center: MarketCenter } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [loaded, setLoaded] = useState(false);
  const worldDataRef = useRef<WorldTopology | null>(null);
  const featuresRef = useRef<GeoJSON.Feature[]>([]);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, px: 0, py: 0 });

  // Update clock every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Count open markets
  const openCount = useMemo(
    () => MARKET_CENTERS.filter((c) => isMarketOpen(c, now)).length,
    [now]
  );

  // Load TopoJSON
  useEffect(() => {
    fetch(WORLD_ATLAS_URL)
      .then((r) => r.json())
      .then((topo: WorldTopology) => {
        worldDataRef.current = topo;
        const result = topojson.feature(topo, topo.objects.countries);
        featuresRef.current = "features" in result ? result.features : [result];
        setLoaded(true);
      })
      .catch((e) => console.error("Failed to load world atlas:", e));
  }, []);

  // Set view preset
  const changeView = useCallback((v: MapView) => {
    setView(v);
    const preset = VIEW_PRESETS[v];
    setZoom(preset.zoom);
    setPan(preset.pan);
  }, []);

  // Projection
  const getProjection = useCallback(
    (w: number, h: number) => {
      const LAT_NORTH = 72;
      const LAT_SOUTH = -56;
      const LAT_RANGE = LAT_NORTH - LAT_SOUTH;
      const LAT_CENTER = (LAT_NORTH + LAT_SOUTH) / 2;
      const scaleW = w / (2 * Math.PI);
      const scaleH = h / (LAT_RANGE * Math.PI / 180);
      const scale = Math.min(scaleW, scaleH);
      return d3.geoEquirectangular().scale(scale).center([0, LAT_CENTER]).translate([w / 2, h / 2]);
    },
    []
  );

  // Draw map
  useEffect(() => {
    if (!loaded || !svgRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    if (w === 0 || h === 0) return;

    svg.attr("viewBox", `0 0 ${w} ${h}`);

    // Clear
    svg.selectAll("*").remove();

    const baseGroup = svg.append("g").attr("class", "map-base-layer");

    // Ocean background
    baseGroup
      .append("rect")
      .attr("x", -w)
      .attr("y", -h)
      .attr("width", w * 3)
      .attr("height", h * 3)
      .attr("fill", "#080c18");

    // Grid lines
    const gridGroup = baseGroup.append("g").attr("class", "map-grid");
    for (let x = 0; x < w; x += 30) {
      gridGroup.append("line")
        .attr("x1", x).attr("y1", 0).attr("x2", x).attr("y2", h)
        .attr("stroke", "rgba(59, 130, 246, 0.06)").attr("stroke-width", 0.5);
    }
    for (let y = 0; y < h; y += 30) {
      gridGroup.append("line")
        .attr("x1", 0).attr("y1", y).attr("x2", w).attr("y2", y)
        .attr("stroke", "rgba(59, 130, 246, 0.06)").attr("stroke-width", 0.5);
    }

    // Projection
    const projection = getProjection(w, h);
    const path = d3.geoPath().projection(projection);

    // Graticule
    const graticule = d3.geoGraticule();
    baseGroup
      .append("path")
      .datum(graticule())
      .attr("d", path as never)
      .attr("fill", "none")
      .attr("stroke", "rgba(99, 102, 241, 0.08)")
      .attr("stroke-width", 0.4);

    // Countries
    baseGroup
      .selectAll(".country")
      .data(featuresRef.current)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", path as never)
      .attr("fill", "#111827")
      .attr("stroke", "#1e3a5f")
      .attr("stroke-width", 0.6);

    // Dynamic layer for markers
    const dynGroup = svg.append("g").attr("class", "map-dyn-layer");

    // Connection arcs between major exchanges
    const majorPairs: [string, string][] = [
      ["nyse", "lse"], ["lse", "dax"], ["lse", "tse"],
      ["nyse", "tse"], ["hkex", "sse"], ["tse", "hkex"],
      ["nyse", "cme"], ["sgx", "hkex"], ["lse", "ecb"],
    ];
    majorPairs.forEach(([a, b]) => {
      const ca = MARKET_CENTERS.find((c) => c.id === a);
      const cb = MARKET_CENTERS.find((c) => c.id === b);
      if (!ca || !cb) return;
      const pa = projection([ca.lon, ca.lat]);
      const pb = projection([cb.lon, cb.lat]);
      if (!pa || !pb) return;
      const mx = (pa[0] + pb[0]) / 2;
      const my = Math.min(pa[1], pb[1]) - 20;
      dynGroup
        .append("path")
        .attr("d", `M${pa[0]},${pa[1]} Q${mx},${my} ${pb[0]},${pb[1]}`)
        .attr("fill", "none")
        .attr("stroke", "rgba(99, 102, 241, 0.12)")
        .attr("stroke-width", 0.8)
        .attr("stroke-dasharray", "4,4");
    });

    // Market center dots (SVG circles with glow)
    MARKET_CENTERS.forEach((center) => {
      const pos = projection([center.lon, center.lat]);
      if (!pos) return;
      const open = isMarketOpen(center, now);
      const isExchange = center.type === "exchange";
      const r = isExchange ? 4 : 3;
      const color = center.type === "central-bank"
        ? "#f59e0b"
        : open
        ? "#22d3ee"
        : "#6366f1";

      // Glow
      if (open && isExchange) {
        dynGroup
          .append("circle")
          .attr("cx", pos[0])
          .attr("cy", pos[1])
          .attr("r", r + 6)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1)
          .attr("opacity", 0.3)
          .attr("class", "pulse-ring");
      }

      dynGroup
        .append("circle")
        .attr("cx", pos[0])
        .attr("cy", pos[1])
        .attr("r", r)
        .attr("fill", color)
        .attr("opacity", open ? 1 : 0.5)
        .style("filter", open ? `drop-shadow(0 0 4px ${color})` : "none");
    });

    // Transform
    const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;
    baseGroup.attr("transform", transform);
    dynGroup.attr("transform", transform);

    // HTML overlays for labels
    if (overlaysRef.current) {
      overlaysRef.current.innerHTML = "";
      MARKET_CENTERS.forEach((center) => {
        const pos = projection([center.lon, center.lat]);
        if (!pos) return;
        const open = isMarketOpen(center, now);

        const tx = pos[0] * zoom + pan.x;
        const ty = pos[1] * zoom + pan.y;

        // Only show labels when zoomed enough
        if (zoom < 1.3 && center.type !== "exchange") return;
        if (zoom < 1.3) {
          // At low zoom only show major exchanges
          const major = ["nyse", "lse", "tse", "sse", "hkex", "asx", "cme", "bse"];
          if (!major.includes(center.id)) return;
        }

        const label = document.createElement("div");
        label.className = `wm-label ${open ? "wm-open" : "wm-closed"} wm-${center.type}`;
        label.style.left = `${tx}px`;
        label.style.top = `${ty}px`;
        label.innerHTML = `<span class="wm-abbr">${center.abbr}</span>${open ? '<span class="wm-live-dot"></span>' : ""}`;

        label.addEventListener("mouseenter", (e) => {
          setTooltip({ x: e.clientX, y: e.clientY, center });
        });
        label.addEventListener("mouseleave", () => setTooltip(null));

        overlaysRef.current?.appendChild(label);
      });
    }
  }, [loaded, zoom, pan, now, getProjection]);

  // Resize handler
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (svgRef.current && containerRef.current) {
        setLoaded((v) => v); // trigger re-render
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.8, Math.min(6, z + (e.deltaY > 0 ? -0.15 : 0.15))));
  }, []);

  // Drag pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({ x: dragStartRef.current.px + dx, y: dragStartRef.current.py + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div className="wm-container">
      {/* Header bar */}
      <div className="wm-header">
        <div className="wm-header-left">
          <span className="wm-title">GLOBAL MARKETS</span>
          <span className="wm-subtitle">
            {now.toUTCString().replace("GMT", "UTC")}
          </span>
        </div>
        <div className="wm-header-right">
          <span className="wm-stat">
            <span className="wm-stat-value wm-accent">{openCount}</span>
            <span className="wm-stat-label">EXCHANGES OPEN</span>
          </span>
          <span className="wm-stat">
            <span className="wm-stat-value">{MARKET_CENTERS.filter(c => c.type === "exchange").length}</span>
            <span className="wm-stat-label">TOTAL TRACKED</span>
          </span>
        </div>
      </div>

      {/* View selector */}
      <div className="wm-controls">
        <div className="wm-view-pills">
          {(["global", "americas", "europe", "asia", "mena", "oceania"] as MapView[]).map((v) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              className={`wm-pill ${view === v ? "wm-pill-active" : ""}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="wm-zoom-controls">
          <button className="wm-btn" onClick={() => setZoom((z) => Math.min(6, z + 0.3))} title="Zoom In">+</button>
          <button className="wm-btn" onClick={() => setZoom((z) => Math.max(0.8, z - 0.3))} title="Zoom Out">−</button>
          <button className="wm-btn" onClick={() => changeView("global")} title="Reset">⌂</button>
        </div>
      </div>

      {/* Map canvas */}
      <div
        ref={containerRef}
        className="wm-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {!loaded && (
          <div className="wm-loading">
            <div className="wm-spinner" />
            <span>Loading world data…</span>
          </div>
        )}
        <svg ref={svgRef} className="wm-svg" />
        <div ref={overlaysRef} className="wm-overlays" />
      </div>

      {/* Legend */}
      <div className="wm-legend">
        <div className="wm-legend-item">
          <span className="wm-legend-dot wm-dot-open" />
          <span>Exchange (Open)</span>
        </div>
        <div className="wm-legend-item">
          <span className="wm-legend-dot wm-dot-closed" />
          <span>Exchange (Closed)</span>
        </div>
        <div className="wm-legend-item">
          <span className="wm-legend-dot wm-dot-bank" />
          <span>Central Bank</span>
        </div>
        <div className="wm-legend-item">
          <span className="wm-legend-arc" />
          <span>Trade Corridor</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="wm-tooltip"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="wm-tt-header">
            <span className="wm-tt-name">{tooltip.center.name}</span>
            <span className={`wm-tt-badge ${isMarketOpen(tooltip.center, now) ? "wm-tt-open" : "wm-tt-closed-badge"}`}>
              {isMarketOpen(tooltip.center, now) ? "OPEN" : "CLOSED"}
            </span>
          </div>
          <div className="wm-tt-body">
            <div className="wm-tt-row">
              <span className="wm-tt-label">TYPE</span>
              <span className="wm-tt-val">{tooltip.center.type === "central-bank" ? "Central Bank" : "Exchange"}</span>
            </div>
            <div className="wm-tt-row">
              <span className="wm-tt-label">REGION</span>
              <span className="wm-tt-val">{tooltip.center.region}</span>
            </div>
            {tooltip.center.hours && (
              <div className="wm-tt-row">
                <span className="wm-tt-label">HOURS</span>
                <span className="wm-tt-val">{tooltip.center.hours.open} – {tooltip.center.hours.close}</span>
              </div>
            )}
            <div className="wm-tt-row">
              <span className="wm-tt-label">COORDS</span>
              <span className="wm-tt-val">{tooltip.center.lat.toFixed(2)}°, {tooltip.center.lon.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
