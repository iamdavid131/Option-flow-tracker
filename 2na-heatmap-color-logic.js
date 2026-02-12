/**
 * ============================================================
 * 2NA Heatmap Cell Coloring Logic
 * Extracted from: https://www.2na.app/_next/static/chunks/77d8dc80a11bf5a0.js
 * ============================================================
 *
 * This is the EXACT logic 2NA uses to color each heatmap cell
 * based on its GEX/VEX/OI value relative to the max absolute
 * value across the visible grid.
 *
 * TWO PALETTES exist: "pro" (default) and "beginner".
 */

// ─── Helper: hex → "r, g, b" string ────────────────────────
function B(hex) {
  let t = hex.replace("#", "").trim();
  if (t.length !== 6) return "148, 163, 184"; // fallback slate
  let r = parseInt(t.slice(0, 2), 16);
  let g = parseInt(t.slice(2, 4), 16);
  let b = parseInt(t.slice(4, 6), 16);
  return [r, g, b].every((v) => Number.isFinite(v))
    ? `${r}, ${g}, ${b}`
    : "148, 163, 184";
}

// ─── Main cell-color function ───────────────────────────────
// Parameters:
//   e       – unused (mode string, passed as 0 from call site)
//   value   – the cell's numeric value (GEX / VEX / OI-net)
//   maxAbs  – the max absolute value across all visible cells
//   palette – "pro" (default) or "beginner"
//
// Returns: { backgroundColor, backgroundImage, boxShadow }
//
function getCellColor(e, value, maxAbs, palette = "pro") {
  // ── 1. Normalize intensity ──────────────────────────────
  let raw = Number(value) || 0;
  let intensity = Math.max(0, Math.min(1, Math.abs(raw) / Math.max(1e-9, Number(maxAbs) || 1)));
  //    intensity ∈ [0, 1]  — 0 = no exposure, 1 = max exposure

  // ── 2. Alpha for the solid fill ─────────────────────────
  let alpha = 0.1 + 0.8 * intensity;
  //    alpha ∈ [0.10, 0.90]

  // ── 3. Color channels ───────────────────────────────────
  const TEAL   = "57, 204, 204";   // positive / support
  const PURPLE = "124, 58, 237";   // negative / resistance

  // ── 4. Beginner-mode stepped color (hex → rgb string) ───
  //    Maps (sign, intensity) → a Tailwind-like color step
  let beginnerRGB = (function steppedColor(val, t) {
    if (t < 0.06) return B("#6b7280");   // gray-500  → neutral

    let low  = t < 0.20;
    let mid  = t >= 0.20 && t < 0.45;
    let high = t >= 0.45 && t < 0.72;
    // else ultra = t >= 0.72

    if (val < 0) {
      // Negative (bearish) → warm ramp
      if (low)  return B("#eab308");   // yellow-500
      if (mid)  return B("#f97316");   // orange-500
      if (high) return B("#ef4444");   // red-500
      return B("#dc2626");             // red-600
    } else {
      // Positive (bullish) → cool ramp
      if (low)  return B("#86efac");   // green-300
      if (mid)  return B("#22c55e");   // green-500
      if (high) return B("#3b82f6");   // blue-500
      return B("#1d4ed8");             // blue-700
    }
  })(raw, intensity);

  // ── 5. Is the cell "dim" (near-zero)? ───────────────────
  let isDim = intensity < (palette === "pro" ? 0.10 : 0.06);

  // ── 6. Negative-side sub-color for pro mode ─────────────
  //    < 0.22 intensity → light pink, else → purple
  let negativeChannel = () =>
    intensity < 0.22 ? "253, 164, 175" : PURPLE;
  //    "253, 164, 175" = rose-300 (Tailwind)

  // ── 7. Background color ─────────────────────────────────
  let backgroundColor;
  if (palette === "beginner") {
    backgroundColor = `rgba(${beginnerRGB}, ${isDim ? 0.18 : alpha})`;
  } else {
    // Pro palette
    if (isDim) {
      backgroundColor = "rgba(148, 163, 184, 0.14)"; // slate-400 dim
    } else if (raw >= 0) {
      backgroundColor = `rgba(${TEAL}, ${alpha})`;    // teal
    } else {
      backgroundColor = `rgba(${negativeChannel()}, ${alpha})`; // pink or purple
    }
  }

  // ── 8. Radial-gradient overlay (inner glow) ─────────────
  let glowAlpha;
  if (palette === "beginner") {
    glowAlpha = raw >= 0
      ? 0.18 + 0.22 * intensity
      : 0.12 + 0.16 * intensity;
  } else {
    glowAlpha = raw >= 0 ? 0.20 : 0.24;
  }

  let backgroundImageParts = [];
  if (isDim) {
    backgroundImageParts.push(
      "radial-gradient(60% 60% at 50% 30%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 70%)"
    );
  } else if (palette === "beginner") {
    backgroundImageParts.push(
      `radial-gradient(60% 60% at 50% 30%, rgba(${beginnerRGB}, ${glowAlpha}) 0%, rgba(${beginnerRGB}, 0) 70%)`
    );
  } else if (raw >= 0) {
    backgroundImageParts.push(
      `radial-gradient(60% 60% at 50% 30%, rgba(${TEAL}, ${glowAlpha}) 0%, rgba(${TEAL}, 0) 70%)`
    );
  } else {
    backgroundImageParts.push(
      `radial-gradient(60% 60% at 50% 30%, rgba(${negativeChannel()}, ${glowAlpha}) 0%, rgba(${negativeChannel()}, 0) 70%)`
    );
  }

  // Extra diagonal shimmer for dim pro cells
  if (isDim && palette === "pro") {
    backgroundImageParts.push(
      "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 55%)"
    );
  }

  let backgroundImage = backgroundImageParts.filter(Boolean).join(", ") || undefined;

  // ── 9. Box-shadow (outer glow for intense cells) ────────
  let isIntense = !isDim && intensity >= 0.72;
  let purpleGlow = palette === "pro" && raw < 0 && !isDim && intensity >= 0.22;

  let glowChannel = palette === "beginner"
    ? beginnerRGB
    : raw >= 0
      ? TEAL
      : PURPLE;

  let glowRadius = Math.round(10 + 18 * intensity);

  let shadowAlpha = palette === "beginner"
    ? 0.14 + 0.22 * intensity
    : raw >= 0
      ? 0.16 + 0.26 * intensity
      : 0.18 + 0.34 * intensity;

  let boxShadow;
  if (purpleGlow || (raw >= 0 && isIntense)) {
    boxShadow = `0 0 ${glowRadius}px rgba(${glowChannel}, ${shadowAlpha}), 0 0 0 1px rgba(${glowChannel}, ${Math.min(0.38, shadowAlpha)})`;
  }

  return { backgroundColor, backgroundImage, boxShadow };
}

// ─── Flow-Δ column badge color logic ────────────────────────
// Used for the "Flow Δ" summary column per strike row.
// Parameters: flowDelta (net), maxFlowDelta (max abs across rows)
function getFlowDeltaStyle(flowDelta, maxFlowDelta) {
  let x = Number(flowDelta) || 0;
  let p = Math.max(0, Math.min(1, Math.abs(x) / Math.max(1e-9, Number(maxFlowDelta) || 1)));

  if (p < 0.06) {
    return {
      bg:        "rgba(148, 163, 184, 0.10)",
      border:    "rgba(88, 166, 255, 0.18)",
      textClass: "text-ice-blue-200/70",
    };
  }
  if (x >= 0) {
    if (p < 0.22) return { bg: "rgba(242, 201, 76, 0.16)", border: "rgba(242, 201, 76, 0.42)",  textClass: "text-rose-gold-50" };
    if (p < 0.62) return { bg: "rgba(34, 197, 94, 0.16)",  border: "rgba(34, 197, 94, 0.42)",   textClass: "text-emerald-100" };
    return               { bg: "rgba(59, 130, 246, 0.18)", border: "rgba(59, 130, 246, 0.50)",  textClass: "text-ice-blue-50" };
  } else {
    if (p < 0.22) return { bg: "rgba(249, 115, 22, 0.16)", border: "rgba(249, 115, 22, 0.45)",  textClass: "text-rose-100" };
    return               { bg: "rgba(239, 68, 68, 0.16)",  border: "rgba(239, 68, 68, 0.45)",   textClass: "text-rose-100" };
  }
}

// ─── Legend / visual summary ────────────────────────────────
//
// PRO palette:
//   Teal   rgba(57, 204, 204, α)      → positive exposure (support/pinning)
//   Pink   rgba(253, 164, 175, α)      → mild negative exposure (intensity < 0.22)
//   Purple rgba(124, 58, 237, α)       → strong negative exposure (intensity ≥ 0.22)
//          + outer glow shadow
//   Gray   rgba(148, 163, 184, 0.14)   → neutral / near-zero
//
// BEGINNER palette:
//   Positive ramp:  green-300 → green-500 → blue-500 → blue-700
//   Negative ramp:  yellow-500 → orange-500 → red-500 → red-600
//   Neutral:        gray-500 (#6b7280)
//
// Intensity thresholds (beginner stepped colors):
//   < 0.06  →  neutral gray
//   < 0.20  →  low    (green-300 / yellow-500)
//   < 0.45  →  mid    (green-500 / orange-500)
//   < 0.72  →  high   (blue-500 / red-500)
//   ≥ 0.72  →  ultra  (blue-700 / red-600) + 🐂/🐻 emoji in cell


// ─── Example usage ──────────────────────────────────────────
if (typeof module !== "undefined") {
  module.exports = { getCellColor, getFlowDeltaStyle, B };
}

// Quick demonstration:
console.log("--- PRO palette examples ---");
console.log("Strong positive:", getCellColor(0,  5000, 10000, "pro"));
console.log("Strong negative:", getCellColor(0, -5000, 10000, "pro"));
console.log("Mild negative:",   getCellColor(0, -1500, 10000, "pro"));
console.log("Near zero:",       getCellColor(0,    50, 10000, "pro"));
console.log("Max positive:",    getCellColor(0, 10000, 10000, "pro"));

console.log("\n--- BEGINNER palette examples ---");
console.log("Strong positive:", getCellColor(0,  5000, 10000, "beginner"));
console.log("Strong negative:", getCellColor(0, -5000, 10000, "beginner"));
console.log("Near zero:",       getCellColor(0,    50, 10000, "beginner"));
