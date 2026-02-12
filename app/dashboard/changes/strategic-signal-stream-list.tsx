"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/empty-state";
import { ChangeFeedPagination } from "./change-feed-pagination";

export type ImpactLevel = "Minor" | "Moderate" | "Strategic";

export interface StrategicSignalItem {
  id: string;
  createdAt: string;
  dateLabel: string;
  competitorName: string;
  pageUrl: string;
  pageType: string;
  category: string;
  changeType: string;
  summary: string;
  impactLevel: ImpactLevel | null;
  strategicInterpretation: string | null;
  suggestedMonitoringAction: string | null;
  beforeScreenshotUrl: string | null;
  afterScreenshotUrl: string | null;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatChangeType(changeType: string): string {
  switch (changeType) {
    case "text_change":
      return "Text change";
    case "element_added":
      return "Element added";
    case "element_removed":
      return "Element removed";
    case "cta_text_change":
      return "CTA text change";
    case "nav_change":
      return "Navigation change";
    default:
      return changeType;
  }
}

export function StrategicSignalStreamList({
  items,
  page,
  totalPages,
  totalCount,
  pageSize,
  hasPrevPage,
  hasNextPage,
  hasActiveFilters = false,
}: {
  items: StrategicSignalItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  hasActiveFilters?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          title={
            hasActiveFilters
              ? "No structural changes match your filters"
              : "No structural changes detected yet"
          }
          description={
            hasActiveFilters
              ? "Try different filters or run a new competitor check."
              : "Once structural changes are detected, they will appear here as a strategic signal stream."
          }
        />
        <ChangeFeedPagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
        />
      </div>
    );
  }

  const groups = items.reduce<Record<string, StrategicSignalItem[]>>((acc, item) => {
    const key = item.dateLabel || formatDateLabel(item.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const orderedDates = Object.keys(groups).sort((a, b) => {
    const aDate = new Date(groups[a][0]?.createdAt ?? 0).getTime();
    const bDate = new Date(groups[b][0]?.createdAt ?? 0).getTime();
    return bDate - aDate;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {orderedDates.map((dateKey) => {
          const signals = groups[dateKey];
          return (
            <section key={dateKey} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">{dateKey}</h2>
              <ul className="space-y-4">
                {signals.map((signal) => (
                  <li key={signal.id}>
                    <Card>
                      <CardHeader className="border-b bg-muted/10 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{signal.competitorName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {signal.category}
                            </Badge>
                            {signal.impactLevel && (
                              <Badge variant="outline" className="text-xs">
                                Impact: {signal.impactLevel}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatChangeType(signal.changeType)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 py-4 text-sm text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground">What changed</p>
                          <p className="mt-1">
                            {signal.summary}
                          </p>
                        </div>
                        {signal.strategicInterpretation && (
                          <div>
                            <p className="font-medium text-foreground">Strategic interpretation</p>
                            <p className="mt-1">
                              {signal.strategicInterpretation}
                            </p>
                          </div>
                        )}
                        {signal.suggestedMonitoringAction && (
                          <div>
                            <p className="font-medium text-foreground">Suggested monitoring action</p>
                            <p className="mt-1">
                              {signal.suggestedMonitoringAction}
                            </p>
                          </div>
                        )}
                        {(signal.beforeScreenshotUrl || signal.afterScreenshotUrl) && (
                          <Collapsible>
                            <CollapsibleTrigger>View before and after screenshots</CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="rounded-md border bg-muted/5 p-2">
                                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Before
                                  </p>
                                  {signal.beforeScreenshotUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={signal.beforeScreenshotUrl}
                                      alt="Before snapshot"
                                      className="h-auto max-h-[320px] w-full rounded object-contain object-top"
                                    />
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No screenshot available.</p>
                                  )}
                                </div>
                                <div className="rounded-md border bg-muted/5 p-2">
                                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    After
                                  </p>
                                  {signal.afterScreenshotUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={signal.afterScreenshotUrl}
                                      alt="After snapshot"
                                      className="h-auto max-h-[320px] w-full rounded object-contain object-top"
                                    />
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No screenshot available.</p>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <ChangeFeedPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
      />
    </div>
  );
}

