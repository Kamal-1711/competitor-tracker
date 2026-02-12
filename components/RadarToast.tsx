"use client";

import { useEffect } from "react";
import { useCompetitiveRadarUi } from "@/components/competitive-radar-ui-context";
import type { CompetitiveRadarAlert } from "@/store/competitiveRadarStore";
import type { RadarToastState } from "@/components/radar-socket-listener";

export function RadarToast({ toastState }: { toastState: RadarToastState }) {
  const { openPanel } = useCompetitiveRadarUi();
  const { alert, setAlert } = toastState;

  useEffect(() => {
    // Auto-hide handled in socket listener via timer, so nothing needed here.
  }, [alert]);

  if (!alert) return null;

  const handleClick = () => {
    openPanel();
    setAlert(null);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="pointer-events-auto w-80 max-w-full cursor-pointer rounded-md border border-border/60 bg-background/95 p-3 text-left shadow-lg transition-transform duration-150 ease-out hover:-translate-y-0.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-foreground">
              Strategic Movement Detected
            </p>
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
              {alert.summary}
            </p>
          </div>
          <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-red-500" />
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Tap to open Competitive Radar and review the underlying change.
        </p>
      </button>
    </div>
  );
}

