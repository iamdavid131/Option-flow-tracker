"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

type GexGrid = {
  strikes: number[];
  expiryDates: string[];
  grid: Record<string, Record<string, number>>;
};

export default function Tesseract3D({ data, frames, mode: propMode, decimation: propDecimation, playSpeed: propPlaySpeed }: { data: GexGrid | null; frames?: GexGrid[]; mode?: "surface" | "points" | "wire"; decimation?: number; playSpeed?: number }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [rotSpeed, setRotSpeed] = useState<number>(1);
  const [paused, setPaused] = useState<boolean>(false);
  const [resolution, setResolution] = useState<number>(20);
  const [mode, setMode] = useState<"surface" | "points" | "wire">("surface");
  const [currentFrame, setCurrentFrame] = useState<number>(0);

  // frames playback
  useEffect(() => {
    if (!frames || frames.length === 0) return;
    const speed = Math.max(0.01, propPlaySpeed ?? 1);
    const baseMs = 1500;
    const id = setInterval(() => {
      setCurrentFrame((i) => (i + 1) % frames.length);
    }, Math.max(50, Math.floor(baseMs / speed)));
    return () => clearInterval(id);
  }, [frames, propPlaySpeed]);

  // sync incoming props
  useEffect(() => {
    if (propMode) setMode(propMode as any);
    if (typeof propDecimation === "number") setResolution(Math.max(10, Math.min(40, Math.floor(propDecimation) * 5)));
    if (typeof propPlaySpeed === "number") setRotSpeed(propPlaySpeed);
  }, [propMode, propDecimation, propPlaySpeed]);

  // compute the grid to render: prefer `frames[currentFrame]` when frames exist
  const renderData = frames && frames.length > 0 ? frames[currentFrame] : data;

  // memoized geometry arrays to avoid reallocation each frame
  const meshPayload = useMemo(() => {
    if (!renderData) return null;
    const strikes = renderData.strikes ?? [];
    const expiries = renderData.expiryDates ?? [];
    const grid = renderData.grid ?? {};
    const nx = Math.max(1, strikes.length);
    const ny = Math.max(1, expiries.length);
    const positions: number[] = [];
    const colors: number[] = [];
    const zValues: number[] = [];
    for (let j = 0; j < ny; j++) {
      const exp = expiries[j];
      for (let i = 0; i < nx; i++) {
        const s = strikes[i];
        const v = (grid?.[exp]?.[String(s)] ?? grid?.[exp]?.[s] ?? 0) as number;
        zValues.push(v || 0);
      }
    }
    const zMin = Math.min(...(zValues.length ? zValues : [0]));
    const zMax = Math.max(...(zValues.length ? zValues : [1]));
    const zRange = Math.max(1e-6, zMax - zMin);
    // center color mapping around zero for parity with heatmap: use symmetric range
    const absMax = Math.max(Math.abs(zMin), Math.abs(zMax));

    const minX = Math.min(...(strikes.length ? strikes : [0]));
    const maxX = Math.max(...(strikes.length ? strikes : [1]));
    const xRange = Math.max(1, maxX - minX);

    let vp = 0;
    for (let j = 0; j < ny; j++) {
      const y = ((j / Math.max(1, ny - 1)) - 0.5) * ny * 1.2;
      for (let i = 0; i < nx; i++) {
        const xRaw = strikes[i] ?? i;
        const x = ((xRaw - minX) / xRange - 0.5) * nx * 1.2;
        const exp = expiries[j];
        const s = strikes[i];
        const zRaw = (grid?.[exp]?.[String(s)] ?? grid?.[exp]?.[s] ?? 0) as number;
        const z = ((zRaw - zMin) / zRange - 0.5) * 40;
        positions.push(x, y, z);

        // colormap: negative -> magenta/purple, positive -> cyan/teal; zero-centered using symmetric absMax
        const denom = Math.max(1e-6, absMax);
        // t ranges -1..1 where 0 is zero GEX
        let t = 0;
        if (denom > 0) t = Math.max(-1, Math.min(1, zRaw / denom));
        let r = 0.2, g = 0.2, b = 0.2;
        if (t >= 0) {
          // interpolate from neutral gray -> cyan/teal (r,g,b)
          const nt = t; // 0..1
          r = 0.2 * (1 - nt) + 0.0 * nt;
          g = 0.2 * (1 - nt) + 0.85 * nt;
          b = 0.2 * (1 - nt) + 0.85 * nt;
        } else {
          // negative: interpolate neutral gray -> magenta/purple
          const nt = -t; // 0..1
          r = 0.2 * (1 - nt) + 0.9 * nt;
          g = 0.2 * (1 - nt) + 0.05 * nt;
          b = 0.2 * (1 - nt) + 0.9 * nt;
        }
        colors.push(r, g, b);
        vp++;
      }
    }
    return { positions: new Float32Array(positions), colors: new Float32Array(colors), nx: strikes.length, ny: expiries.length, zMin, zMax };
  }, [renderData]);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const width = el.clientWidth;
    const height = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050506);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(0, -60, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const amb = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(50, 50, 80);
    scene.add(dir);

    // geometry
    let surfaceMesh: THREE.Mesh | null = null;
    let wireMesh: THREE.Mesh | null = null;
    let points: THREE.Points | null = null;

    function build() {
      if (!meshPayload) return;
      const { positions, colors, nx, ny } = meshPayload;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      // surface indices for a grid
      const indices: number[] = [];
      for (let j = 0; j < ny - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
          const a = j * nx + i;
          const b = j * nx + (i + 1);
          const c = (j + 1) * nx + i;
          const d = (j + 1) * nx + (i + 1);
          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.5 });
      surfaceMesh = new THREE.Mesh(geometry, mat);
      surfaceMesh.renderOrder = 1;
      scene.add(surfaceMesh);

      // wireframe overlay
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, opacity: 0.12, transparent: true });
      wireMesh = new THREE.Mesh(geometry.clone(), wireMat);
      scene.add(wireMesh);

      // points fallback
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
      pg.setAttribute("color", new THREE.BufferAttribute(colors.slice(), 3));
      const pm = new THREE.PointsMaterial({ size: Math.max(0.6, 1.6 - Math.max(nx, ny) / 40), vertexColors: true });
      points = new THREE.Points(pg, pm);
      scene.add(points);
    }

    build();

    // overlays: colorbar
    const colorbar = document.createElement("div");
    colorbar.style.cssText = "position:absolute;right:12px;top:60px;width:18px;height:180px;border-radius:6px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)";
    const grad = document.createElement("div");
    // magenta -> gray (center) -> cyan
    grad.style.cssText = "width:100%;height:100%;background:linear-gradient(to top, rgba(220,60,255,1) 0%, rgba(80,80,80,1) 50%, rgba(30,200,220,1) 100%)";
    colorbar.appendChild(grad);
    const cbLabels = document.createElement("div");
    cbLabels.style.cssText = "position:absolute;right:36px;top:60px;color:#9aa0a6;font-size:11px;line-height:1.4;text-align:right";
    if (meshPayload) {
      const absMax = Math.max(Math.abs(meshPayload.zMin ?? 0), Math.abs(meshPayload.zMax ?? 0));
      cbLabels.innerHTML = `${(-absMax).toFixed(0)}<br><span style='opacity:0.6'>0</span><br>${absMax.toFixed(0)}`;
    }
    el.style.position = "relative";
    el.appendChild(colorbar);
    el.appendChild(cbLabels);

    // tooltip
    const tooltip = document.createElement("div");
    tooltip.style.cssText = "position:absolute;pointer-events:none;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,0.7);color:#fff;font-size:12px;display:none;";
    el.appendChild(tooltip);

    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMove(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      const target = mode === "points" && points ? points : surfaceMesh;
      if (!target) return;
      const intersects = ray.intersectObject(target as any, true);
      if (intersects.length > 0) {
        const p = intersects[0].point;
        tooltip.style.left = `${e.clientX - rect.left + 12}px`;
        tooltip.style.top = `${e.clientY - rect.top + 12}px`;
        tooltip.textContent = `x:${p.x.toFixed(1)} y:${p.y.toFixed(1)} z:${p.z.toFixed(1)}`;
        tooltip.style.display = "block";
      } else {
        tooltip.style.display = "none";
      }
    }
    renderer.domElement.addEventListener("mousemove", onMove);

    // camera presets overlay (small DOM controls inside component container)
    const presets = document.createElement("div");
    presets.style.cssText = "position:absolute;left:12px;top:60px;display:flex;flex-direction:column;gap:6px;";
    const mk = (t: string) => { const b = document.createElement("button"); b.textContent = t; b.style.cssText = "background:rgba(0,0,0,0.45);color:#cfe8ef;border:1px solid rgba(255,255,255,0.04);padding:6px;border-radius:6px;font-size:12px"; return b; };
    const topB = mk("Top"); const frontB = mk("Front"); const isoB = mk("Iso"); const resetB = mk("Reset");
    presets.appendChild(topB); presets.appendChild(frontB); presets.appendChild(isoB); presets.appendChild(resetB);
    el.appendChild(presets);
    topB.onclick = () => { camera.position.set(0, 0, 180); camera.lookAt(0,0,0); };
    frontB.onclick = () => { camera.position.set(0, -200, 10); camera.lookAt(0,0,0); };
    isoB.onclick = () => { camera.position.set(120, -80, 100); camera.lookAt(0,0,0); };
    resetB.onclick = () => { camera.position.set(0, -60, 120); camera.lookAt(0,0,0); };

    camera.lookAt(new THREE.Vector3(0, 0, 0));

    let raf = 0;
    function loop() {
      if (!paused) {
        surfaceMesh && (surfaceMesh.rotation.z += 0.02 * rotSpeed);
        points && (points.rotation.z += 0.02 * rotSpeed);
      }
      // mode visibility
      if (surfaceMesh && points) {
        surfaceMesh.visible = mode === "surface";
        points.visible = mode === "points";
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    loop();

    function onResize() {
      const w = el.clientWidth; const h = el.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousemove", onMove as any);
      try { if (surfaceMesh) { (surfaceMesh.geometry as any).dispose(); (surfaceMesh.material as any).dispose(); scene.remove(surfaceMesh); } } catch (e) {}
      try { if (points) { (points.geometry as any).dispose(); (points.material as any).dispose(); scene.remove(points); } } catch (e) {}
      try { renderer.dispose(); } catch (e) {}
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      if (el.contains(colorbar)) el.removeChild(colorbar);
      if (el.contains(cbLabels)) el.removeChild(cbLabels);
      if (el.contains(tooltip)) el.removeChild(tooltip);
      if (el.contains(presets)) el.removeChild(presets);
    };
  }, [meshPayload, rotSpeed, paused, mode]);

  // simple UI: controls overlay rendered as absolute-positioned elements
  return (
    <div className="w-full h-full relative" ref={mountRef}>
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 20 }}>
        <div style={{ background: "rgba(0,0,0,0.75)", padding: 12, borderRadius: 8, border: "1px solid #00ffff" }}>
          <div style={{ color: "#00ffff", fontWeight: 700, marginBottom: 8 }}>GEX Tesseract</div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ color: "#aaa", fontSize: 12 }}>Rotation Speed: <strong style={{ color: "#fff" }}>{rotSpeed.toFixed(1)}x</strong></label>
            <input type="range" min={0} max={3} step={0.1} value={rotSpeed} onChange={(e) => setRotSpeed(Number(e.target.value))} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ color: "#aaa", fontSize: 12 }}>Resolution: <strong style={{ color: "#fff" }}>{resolution}</strong></label>
            <input type="range" min={10} max={40} step={5} value={resolution} onChange={(e) => setResolution(Number(e.target.value))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
            <button onClick={() => { setCurrentFrame(0); }}>Reset</button>
            <button onClick={() => setMode((m) => (m === "surface" ? "points" : "surface"))}>Toggle Mode</button>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", right: 12, top: 12, zIndex: 20 }}>
        <div style={{ background: "rgba(0,0,0,0.75)", padding: 10, borderRadius: 8, border: "1px solid #00ffff", color: "#9aa0a6" }}>
          <div style={{ marginBottom: 6 }}><strong style={{ color: "#00ffff" }}>Spot:</strong> <span id="spot-price">—</span></div>
          <div style={{ marginBottom: 6 }}><strong style={{ color: "#00ffff" }}>Total GEX:</strong> <span id="total-gex">—</span></div>
          <div><strong style={{ color: "#00ffff" }}>Max Pos:</strong> <span id="max-pos">—</span></div>
        </div>
      </div>
    </div>
  );
}
