"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { useCompetitiveRadarStore } from "@/store/competitiveRadarStore";
import { useCompetitiveRadarUi } from "@/components/competitive-radar-ui-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatRelativeTime(date: Date): string {
  const now = new Date().getTime();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes === 1) return "1 min ago";
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function severityStyles(severity: "low" | "moderate" | "high"): { badge: string; dot: string } {
  switch (severity) {
    case "high":
      return {
        badge: "bg-red-500/10 text-red-500 border-red-500/40",
        dot: "bg-red-500",
      };
    case "moderate":
      return {
        badge: "bg-amber-500/10 text-amber-500 border-amber-500/40",
        dot: "bg-amber-500",
      };
    default:
      return {
        badge: "bg-sky-500/10 text-sky-500 border-sky-500/40",
        dot: "bg-sky-500",
      };
  }
}

function sectionLabel(section: "pricing" | "services" | "seo" | "positioning"): string {
  if (section === "pricing") return "Pricing";
  if (section === "services") return "Services";
  if (section === "seo") return "SEO / Content";
  return "Positioning";
}

function scrollToSection(section: string) {
  const id = `insights-${section}`;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function CompetitiveRadarPanel() {
  const { alerts, markAsRead, clearAlerts } = useCompetitiveRadarStore();
  const { isOpen, closePanel } = useCompetitiveRadarUi();

  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
    [alerts]
  );

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={closePanel}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 w-[380px] border-l border-border/60 bg-background shadow-xl transition-transform duration-200 ease-out"
        aria-label="Competitive Radar"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between border-b border-border/60 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">Competitive Radar</h2>
              <p className="text-xs text-muted-foreground">
                Live strategic signals across your tracked competitors.
              </p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              aria-label="Close radar panel"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
            <span>
              {alerts.length === 0
                ? "No live alerts yet."
                : `${alerts.length} alert${alerts.length === 1 ? "" : "s"} in view.`}
            </span>
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={clearAlerts}
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {sortedAlerts.length === 0 ? (
              <div className="mt-8 rounded-md border border-dashed border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
                As new pricing, services, SEO, or positioning shifts are detected, they will appear
                here as structured signals. Core workflows are never interrupted.
              </div>
            ) : (
              sortedAlerts.map((alert) => {
                const styles = severityStyles(alert.severity);
                const section = sectionLabel(alert.targetSection);

                const handleViewSection = () => {
                  markAsRead(alert.id);
                  // If already on insights page, attempt in-page scroll.
                  try {
                    if (typeof window !== "undefined" && window.location.pathname.startsWith("/insights")) {
                      scrollToSection(alert.targetSection);
                    } else if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.pathname = "/insights";
                      url.searchParams.set("section", alert.targetSection);
                      window.location.href = url.toString();
                    }
                  } catch (error) {
                    console.error("Failed to navigate from radar alert", error);
                  }
                  closePanel();
                };

                const handleMarkAsRead = () => {
                  markAsRead(alert.id);
                };

                return (
                  <article
                    key={alert.id}
                    className="space-y-2 rounded-md border border-border/60 bg-muted/40 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${styles.dot}`}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium text-foreground">
                          {alert.competitorName}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(alert.timestamp)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge
                        variant="outline"
                        className={`border px-2 py-0.5 text-[10px] ${styles.badge}`}
                      >
                        {alert.severity === "high"
                          ? "High"
                          : alert.severity === "moderate"
                          ? "Moderate"
                          : "Low"}{" "}
                        impact
                      </Badge>
                      <Badge variant="outline" className="border px-2 py-0.5 text-[10px]">
                        {section}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {alert.changeType}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="line-clamp-1 text-xs font-semibold text-foreground">
                        {alert.summary}
                      </p>
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">
                        {alert.whyItMatters}
                      </p>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="xs"
                        variant="secondary"
                        className="h-7 flex-1 text-[11px]"
                        type="button"
                        onClick={handleViewSection}
                      >
                        View Section
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        className="h-7 flex-1 text-[11px]"
                        type="button"
                        onClick={handleMarkAsRead}
                      >
                        {alert.read ? "Mark as Unread" : "Mark as Read"}
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

