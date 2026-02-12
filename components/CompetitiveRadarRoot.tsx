"use client";

import React, { type ReactNode } from "react";
import { CompetitiveRadarProvider } from "@/store/competitiveRadarStore";
import { CompetitiveRadarUiProvider } from "@/components/competitive-radar-ui-context";
import { RadarSocketListener, useRadarToastState } from "@/components/radar-socket-listener";
import { CompetitiveRadarPanel } from "@/components/CompetitiveRadarPanel";
import { RadarToast } from "@/components/RadarToast";

export function CompetitiveRadarRoot({
  workspaceId,
  children,
}: {
  workspaceId: string | null;
  children: ReactNode;
}) {
  const toastState = useRadarToastState();

  if (!workspaceId) {
    // No workspace: render children normally without realtime providers.
    return <>{children}</>;
  }

  return (
    <CompetitiveRadarProvider>
      <CompetitiveRadarUiProvider>
        {children}
        <RadarSocketListener workspaceId={workspaceId} toastState={toastState} />
        <CompetitiveRadarPanel />
        <RadarToast toastState={toastState} />
      </CompetitiveRadarUiProvider>
    </CompetitiveRadarProvider>
  );
}


