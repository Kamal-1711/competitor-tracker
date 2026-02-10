import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/empty-state";
import { ChangeFeedPagination } from "./change-feed-pagination";

export interface InsightFeedItem {
  id: string;
  competitorName: string;
  competitorUrl: string | null;
  pageType: string;
  insightText: string;
  createdAt: string;
  beforeScreenshotUrl: string | null;
  afterScreenshotUrl: string | null;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPageType(pageType: string): string {
  return pageType
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function InsightFeedList({
  insights,
  page,
  totalPages,
  totalCount,
  pageSize,
  hasPrevPage,
  hasNextPage,
  hasActiveFilters = false,
}: {
  insights: InsightFeedItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  hasActiveFilters?: boolean;
}) {
  if (insights.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          title={hasActiveFilters ? "No strategic updates match your filters" : "No strategic updates detected yet"}
          description={
            hasActiveFilters
              ? "Try different filters or run a fresh competitor check."
              : "Once competitor checks run, strategic updates will appear here."
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

  return (
    <div className="space-y-6">
      <ul className="space-y-5">
        {insights.map((insight) => (
          <li key={insight.id}>
            <Card>
              <CardHeader className="border-b bg-muted/10 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{insight.competitorName}</span>
                    <Badge variant="secondary">{formatPageType(insight.pageType)}</Badge>
                  </div>
                  <time className="text-sm text-muted-foreground" dateTime={insight.createdAt}>
                    {formatTimestamp(insight.createdAt)}
                  </time>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <p className="text-base font-semibold">
                  {insight.competitorName} {insight.insightText.charAt(0).toLowerCase() + insight.insightText.slice(1)}
                </p>
                <Collapsible>
                  <CollapsibleTrigger>View before and after screenshots</CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-md border bg-muted/5 p-2">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Before</p>
                        {insight.beforeScreenshotUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={insight.beforeScreenshotUrl}
                            alt="Before snapshot"
                            className="h-auto max-h-[340px] w-full rounded object-contain object-top"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">No screenshot available.</p>
                        )}
                      </div>
                      <div className="rounded-md border bg-muted/5 p-2">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">After</p>
                        {insight.afterScreenshotUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={insight.afterScreenshotUrl}
                            alt="After snapshot"
                            className="h-auto max-h-[340px] w-full rounded object-contain object-top"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">No screenshot available.</p>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
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
