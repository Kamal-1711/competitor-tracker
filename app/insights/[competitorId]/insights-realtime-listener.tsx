"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initSocket } from "@/lib/socket";

export function InsightsRealtimeListener({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();

  useEffect(() => {
    try {
      const socket = initSocket(workspaceId);
      if (!socket) return;

      const handleCrawlCompleted = (data: unknown) => {
        console.log("Crawl finished", data);
        router.refresh();
      };

      const handleHighImpactChange = (data: unknown) => {
        console.log("High impact change detected", data);
        router.refresh();
      };

      socket.on("crawl_completed", handleCrawlCompleted);
      socket.on("high_impact_change", handleHighImpactChange);

      return () => {
        try {
          socket.off("crawl_completed", handleCrawlCompleted);
          socket.off("high_impact_change", handleHighImpactChange);
          socket.disconnect();
        } catch (error) {
          console.error("Socket cleanup failed", error);
        }
      };
    } catch (error) {
      console.error("Socket listener failed", error);
      return undefined;
    }
  }, [router, workspaceId]);

  return null;
}
