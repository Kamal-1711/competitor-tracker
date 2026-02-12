"use client";

import { useEffect, useMemo, useState } from "react";
import { initSocket } from "@/lib/socket";
import {
  StrategicSignalStreamList,
  type ImpactLevel,
  type StrategicSignalItem,
} from "./strategic-signal-stream-list";

interface HighImpactChangeEvent {
  competitorId?: string;
  changeSummary?: string[];
  severity?: string;
}

function normalizeImpactLevel(severity?: string): ImpactLevel {
  if (severity?.toLowerCase() === "high") return "Strategic";
  return "Moderate";
}

export function ChangeFeedRealtime({
  workspaceId,
  initialItems,
  page,
  totalPages,
  totalCount,
  pageSize,
  hasPrevPage,
  hasNextPage,
  hasActiveFilters,
}: {
  workspaceId: string;
  initialItems: StrategicSignalItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  hasActiveFilters: boolean;
}) {
  const [items, setItems] = useState<StrategicSignalItem[]>(initialItems);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    let hideBannerTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      const socket = initSocket(workspaceId);
      if (!socket) return;

      const handleHighImpactChange = (event: HighImpactChangeEvent) => {
        try {
          const createdAt = new Date().toISOString();
          const fallbackSummary = "A high-impact competitor movement was detected.";
          const summary = event.changeSummary?.[0] ?? fallbackSummary;

          const nextItem: StrategicSignalItem = {
            id: `realtime-${createdAt}`,
            createdAt,
            dateLabel: new Date(createdAt).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            }),
            competitorName: "Realtime update",
            pageUrl: "",
            pageType: "realtime",
            category: "Navigation / Structure",
            changeType: "high_impact_change",
            summary,
            impactLevel: normalizeImpactLevel(event.severity),
            strategicInterpretation: "Realtime signal captured from the latest crawl run.",
            suggestedMonitoringAction:
              "Open the competitor insights page to review full details from the latest detection.",
            beforeScreenshotUrl: null,
            afterScreenshotUrl: null,
          };

          setItems((prev) => [nextItem, ...prev]);
          setShowBanner(true);

          if (hideBannerTimer) clearTimeout(hideBannerTimer);
          hideBannerTimer = setTimeout(() => {
            setShowBanner(false);
          }, 5000);
        } catch (error) {
          console.error("Failed to handle high_impact_change event", error);
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
        if (hideBannerTimer) clearTimeout(hideBannerTimer);
      };
    } catch (error) {
      console.error("Socket listener failed", error);
      return undefined;
    }
  }, [workspaceId]);

  const totalCountWithRealtime = useMemo(() => {
    if (items.length < initialItems.length) return totalCount;
    return totalCount + (items.length - initialItems.length);
  }, [initialItems.length, items.length, totalCount]);

  return (
    <div className="relative">
      {showBanner && (
        <div className="fixed right-4 top-4 z-50 rounded-md border bg-background px-4 py-2 text-sm shadow-md">
          New Competitive Movement Detected
        </div>
      )}
      <StrategicSignalStreamList
        items={items}
        page={page}
        totalPages={totalPages}
        totalCount={totalCountWithRealtime}
        pageSize={pageSize}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}
