import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ChangeFeedPagination } from "./change-feed-pagination";
import type { ChangeFeedItem } from "./page";
import { ExternalLink } from "lucide-react";

function pickCompetitor(change: ChangeFeedItem): { name: string | null; url: string } | null {
  const c = change.competitors;
  if (!c) return null;
  return Array.isArray(c) ? c[0] ?? null : c;
}

function pickScreenshotUrl(
  snapshot: ChangeFeedItem["before_snapshot"] | ChangeFeedItem["after_snapshot"]
): string | null {
  if (!snapshot) return null;
  const s = Array.isArray(snapshot) ? snapshot[0] : snapshot;
  return s?.screenshot_url ?? null;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ChangeFeedList({
  changes,
  page,
  totalPages,
  totalCount,
  pageSize,
  hasPrevPage,
  hasNextPage,
  hasActiveFilters = false,
}: {
  changes: ChangeFeedItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  hasActiveFilters?: boolean;
}) {
  if (changes.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          title={hasActiveFilters ? "No changes match your filters" : "No changes detected yet"}
          description={
            hasActiveFilters
              ? "Try different filters or run a new crawl to see updates."
              : "Once you run crawls, we’ll show changes here. Add competitors and run a crawl to get started."
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
      <ul className="space-y-6">
        {changes.map((change) => {
          const competitor = pickCompetitor(change);
          const competitorName = competitor?.name ?? competitor?.url ?? "Unknown";
          const beforeUrl = pickScreenshotUrl(change.before_snapshot);
          const afterUrl = pickScreenshotUrl(change.after_snapshot);

          return (
            <li key={change.id}>
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/10 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {competitorName}
                    </span>
                    {change.category && (
                      <>
                        <span className="text-muted-foreground/40">|</span>
                        <Badge variant="secondary" className="font-normal bg-transparent p-0 text-muted-foreground hover:bg-transparent">
                          {change.category}
                        </Badge>
                      </>
                    )}
                    <span className="text-muted-foreground/40">|</span>
                    <a
                      href={change.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-foreground hover:underline truncate max-w-[300px]"
                      title={change.page_url}
                    >
                       <span className="truncate">{change.page_url}</span>
                       <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                    <span className="text-muted-foreground/40">|</span>
                    <time
                      dateTime={change.created_at}
                      title={change.created_at}
                    >
                      {formatTimestamp(change.created_at)}
                    </time>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 divide-x">
                    {/* Before Screenshot */}
                    <div className="relative group min-h-[200px] bg-muted/5">
                      {beforeUrl ? (
                        <a
                          href={beforeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-full w-full"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={beforeUrl}
                            alt="Before snapshot"
                            className="h-auto w-full object-contain object-top max-h-[500px]"
                          />
                          <div className="absolute top-2 left-2 pointer-events-none">
                            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs font-normal opacity-70 group-hover:opacity-100 transition-opacity">
                              Before
                            </Badge>
                          </div>
                        </a>
                      ) : (
                        <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                          No screenshot
                        </div>
                      )}
                    </div>

                    {/* After Screenshot */}
                    <div className="relative group min-h-[200px] bg-muted/5">
                      {afterUrl ? (
                        <a
                          href={afterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-full w-full"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={afterUrl}
                            alt="After snapshot"
                            className="h-auto w-full object-contain object-top max-h-[500px]"
                          />
                          <div className="absolute top-2 left-2 pointer-events-none">
                            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs font-normal opacity-70 group-hover:opacity-100 transition-opacity">
                              After
                            </Badge>
                          </div>
                        </a>
                      ) : (
                        <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                          No screenshot
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
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
