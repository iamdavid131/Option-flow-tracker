/**
 * 2NA Heatmap Cell Coloring Logic (browser copy)
 * Copied into public/ for the static frontend.
 */

function B(hex) {
  let t = hex.replace("#", "").trim();
  if (t.length !== 6) return "148, 163, 184";
  let r = parseInt(t.slice(0, 2), 16);
  let g = parseInt(t.slice(2, 4), 16);
  let b = parseInt(t.slice(4, 6), 16);
  return [r, g, b].every((v) => Number.isFinite(v))
    ? `${r}, ${g}, ${b}`
    : "148, 163, 184";
}

function getCellColor(e, value, maxAbs, palette = "pro") {
  let raw = Number(value) || 0;
  let intensity = Math.max(0, Math.min(1, Math.abs(raw) / Math.max(1e-9, Number(maxAbs) || 1)));
  let alpha = 0.1 + 0.8 * intensity;
  const TEAL = "57, 204, 204";
  const PURPLE = "124, 58, 237";

  let beginnerRGB = (function steppedColor(val, t) {
    if (t < 0.06) return B("#6b7280");
    let low = t < 0.20;
    let mid = t >= 0.20 && t < 0.45;
    let high = t >= 0.45 && t < 0.72;
    if (val < 0) {
      if (low) return B("#eab308");
      if (mid) return B("#f97316");
      if (high) return B("#ef4444");
      return B("#dc2626");
    } else {
      if (low) return B("#86efac");
      if (mid) return B("#22c55e");
      if (high) return B("#3b82f6");
      return B("#1d4ed8");
    }
  })(raw, intensity);

  let isDim = intensity < (palette === "pro" ? 0.10 : 0.06);
  let negativeChannel = () => (intensity < 0.22 ? "253, 164, 175" : PURPLE);
  let backgroundColor;
  if (palette === "beginner") {
    backgroundColor = `rgba(${beginnerRGB}, ${isDim ? 0.18 : alpha})`;
  } else {
    if (isDim) backgroundColor = "rgba(148, 163, 184, 0.14)";
    else if (raw >= 0) backgroundColor = `rgba(${TEAL}, ${alpha})`;
    else backgroundColor = `rgba(${negativeChannel()}, ${alpha})`;
  }

  let glowAlpha;
  if (palette === "beginner") {
    glowAlpha = raw >= 0 ? 0.18 + 0.22 * intensity : 0.12 + 0.16 * intensity;
  } else {
    glowAlpha = raw >= 0 ? 0.20 : 0.24;
  }

  let backgroundImageParts = [];
  if (isDim) {
    backgroundImageParts.push("radial-gradient(60% 60% at 50% 30%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 70%)");
  } else if (palette === "beginner") {
    backgroundImageParts.push(`radial-gradient(60% 60% at 50% 30%, rgba(${beginnerRGB}, ${glowAlpha}) 0%, rgba(${beginnerRGB}, 0) 70%)`);
  } else if (raw >= 0) {
    backgroundImageParts.push(`radial-gradient(60% 60% at 50% 30%, rgba(${TEAL}, ${glowAlpha}) 0%, rgba(${TEAL}, 0) 70%)`);
  } else {
    backgroundImageParts.push(`radial-gradient(60% 60% at 50% 30%, rgba(${negativeChannel()}, ${glowAlpha}) 0%, rgba(${negativeChannel()}, 0) 70%)`);
  }

  if (isDim && palette === "pro") {
    backgroundImageParts.push("linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 55%)");
  }

  let backgroundImage = backgroundImageParts.filter(Boolean).join(", ") || undefined;

  let isIntense = !isDim && intensity >= 0.72;
  let purpleGlow = palette === "pro" && raw < 0 && !isDim && intensity >= 0.22;

  let glowChannel = palette === "beginner" ? beginnerRGB : raw >= 0 ? TEAL : PURPLE;
  let glowRadius = Math.round(10 + 18 * intensity);
  let shadowAlpha = palette === "beginner" ? 0.14 + 0.22 * intensity : raw >= 0 ? 0.16 + 0.26 * intensity : 0.18 + 0.34 * intensity;

  let boxShadow;
  if (purpleGlow || (raw >= 0 && isIntense)) {
    boxShadow = `0 0 ${glowRadius}px rgba(${glowChannel}, ${shadowAlpha}), 0 0 0 1px rgba(${glowChannel}, ${Math.min(0.38, shadowAlpha)})`;
  }

  return { backgroundColor, backgroundImage, boxShadow };
}

function getFlowDeltaStyle(flowDelta, maxFlowDelta) {
  let x = Number(flowDelta) || 0;
  let p = Math.max(0, Math.min(1, Math.abs(x) / Math.max(1e-9, Number(maxFlowDelta) || 1)));
  if (p < 0.06) {
    return { bg: "rgba(148, 163, 184, 0.10)", border: "rgba(88, 166, 255, 0.18)", textClass: "text-ice-blue-200/70" };
  }
  if (x >= 0) {
    if (p < 0.22) return { bg: "rgba(242, 201, 76, 0.16)", border: "rgba(242, 201, 76, 0.42)", textClass: "text-rose-gold-50" };
    if (p < 0.62) return { bg: "rgba(34, 197, 94, 0.16)", border: "rgba(34, 197, 94, 0.42)", textClass: "text-emerald-100" };
    return { bg: "rgba(59, 130, 246, 0.18)", border: "rgba(59, 130, 246, 0.50)", textClass: "text-ice-blue-50" };
  } else {
    if (p < 0.22) return { bg: "rgba(249, 115, 22, 0.16)", border: "rgba(249, 115, 22, 0.45)", textClass: "text-rose-100" };
    return { bg: "rgba(239, 68, 68, 0.16)", border: "rgba(239, 68, 68, 0.45)", textClass: "text-rose-100" };
  }
}

// Keep console examples in browser devtools too
console.log('Heatmap logic loaded (browser copy)');
