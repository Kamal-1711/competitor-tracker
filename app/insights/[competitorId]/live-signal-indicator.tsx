"use client";

import { useMemo } from "react";
import { useCompetitiveRadarStore } from "@/store/competitiveRadarStore";
import { useCompetitiveRadarUi } from "@/components/competitive-radar-ui-context";

export function InsightsLiveSignalIndicator({ competitorId }: { competitorId: string }) {
  const { alerts } = useCompetitiveRadarStore();
  const { openPanel } = useCompetitiveRadarUi();

  const hasUnreadForCompetitor = useMemo(
    () => alerts.some((alert) => !alert.read && alert.competitorId === competitorId),
    [alerts, competitorId]
  );

  if (!hasUnreadForCompetitor) return null;

  return (
    <button
      type="button"
      onClick={openPanel}
      className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/5 px-2 py-0.5 text-[11px] font-medium text-red-500 shadow-sm hover:bg-red-500/10"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
      <span>Live Strategic Movement</span>
    </button>
  );
}

