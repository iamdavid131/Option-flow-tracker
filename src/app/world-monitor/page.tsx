"use client";

import dynamic from "next/dynamic";
import WMBottomRow from "@/components/WMBottomRow";

const WorldMapView = dynamic(() => import("@/components/WorldMapView"), {
  ssr: false,
  loading: () => <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">Loading map…</div>,
});

export default function WorldMonitorPage() {
  return (
    <div className="wm-page min-h-screen">
      <div className="wm-map w-full">
        <WorldMapView />
      </div>
      <WMBottomRow />
    </div>
  );
}
