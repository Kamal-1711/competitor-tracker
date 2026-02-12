"use client";

import { useEffect, useState } from "react";
import { initSocket } from "@/lib/socket";
import {
  type CompetitiveRadarAlert,
  type CompetitiveRadarSeverity,
  type CompetitiveRadarTargetSection,
  useCompetitiveRadarStore,
} from "@/store/competitiveRadarStore";
import { useCompetitiveRadarUi } from "@/components/competitive-radar-ui-context";

interface HighImpactChangePayload {
  competitorId?: string;
  competitorName?: string;
  changeType?: string;
  severity?: string;
  summary?: string;
  whyItMatters?: string;
  targetSection?: string;
  changeSummary?: string[];
}

function normalizeSeverity(raw?: string): CompetitiveRadarSeverity {
  const value = (raw ?? "").toLowerCase();
  if (value === "high") return "high";
  if (value === "moderate" || value === "medium") return "moderate";
  return "low";
}

function inferTargetSection(
  changeType?: string,
  targetSection?: string
): CompetitiveRadarTargetSection {
  const lowerSection = (targetSection ?? "").toLowerCase();
  if (lowerSection === "pricing") return "pricing";
  if (lowerSection === "services") return "services";
  if (lowerSection === "seo") return "seo";
  if (lowerSection === "positioning") return "positioning";

  const lowerChange = (changeType ?? "").toLowerCase();
  if (lowerChange.includes("pricing")) return "pricing";
  if (lowerChange.includes("service")) return "services";
  if (lowerChange.includes("seo") || lowerChange.includes("search")) return "seo";
  return "positioning";
}

function deriveWhyItMatters(changeType?: string, targetSection?: string): string {
  const section = inferTargetSection(changeType, targetSection);
  if (section === "pricing") {
    return "Pricing movement may signal monetization experimentation.";
  }
  if (section === "services") {
    return "Service expansion may indicate capability growth.";
  }
  if (section === "seo") {
    return "SEO shifts can affect discoverability and pipeline volume.";
  }
  return "Positioning changes can influence how buyers interpret the offer.";
}

export interface RadarToastState {
  alert: CompetitiveRadarAlert | null;
  setAlert: (alert: CompetitiveRadarAlert | null) => void;
}

export function useRadarToastState(): RadarToastState {
  const [alert, setAlert] = useState<CompetitiveRadarAlert | null>(null);
  return { alert, setAlert };
}

export function RadarSocketListener({
  workspaceId,
  toastState,
}: {
  workspaceId: string;
  toastState: RadarToastState;
}) {
  const { addAlert } = useCompetitiveRadarStore();
  const { openPanel } = useCompetitiveRadarUi();

  useEffect(() => {
    if (!workspaceId) return undefined;

    let hideToastTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      const socket = initSocket(workspaceId);
      if (!socket) return undefined;

      const handleHighImpactChange = (payload: HighImpactChangePayload) => {
        try {
          const severity = normalizeSeverity(payload.severity);
          const targetSection = inferTargetSection(payload.changeType, payload.targetSection);
          const summary =
            payload.summary ??
            payload.changeSummary?.[0] ??
            "High impact competitive change detected.";

          const alert: CompetitiveRadarAlert = {
            id: crypto.randomUUID(),
            competitorId: payload.competitorId ?? "unknown-competitor",
            competitorName: payload.competitorName ?? "Unknown competitor",
            changeType: payload.changeType ?? "structural_change",
            severity,
            summary,
            whyItMatters: payload.whyItMatters ?? deriveWhyItMatters(payload.changeType, payload.targetSection),
            timestamp: new Date(),
            targetSection,
            read: false,
          };

          addAlert(alert);

          if (severity === "high") {
            toastState.setAlert(alert);
            if (hideToastTimer) clearTimeout(hideToastTimer);
            hideToastTimer = setTimeout(() => {
              toastState.setAlert(null);
            }, 6000);
            // Auto-open panel only for high severity
            openPanel();
          }
        } catch (error) {
          console.error("Failed to handle high_impact_change payload", error);
        }
      };

      socket.on("high_impact_change", handleHighImpactChange);

      return () => {
        try {
          socket.off("high_impact_change", handleHighImpactChange);
          socket.disconnect();
        } catch (error) {
          console.error("Socket cleanup failed", error);
        }
        if (hideToastTimer) clearTimeout(hideToastTimer);
      };
    } catch (error) {
      console.error("Radar socket listener failed", error);
      return undefined;
    }
  }, [addAlert, openPanel, toastState, workspaceId]);

  return null;
}

