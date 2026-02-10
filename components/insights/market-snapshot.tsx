import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketSnapshot({
  competitorsTracked,
  activeCompetitors,
  pagesMonitored,
  latestCrawlLabel,
}: {
  competitorsTracked: number;
  activeCompetitors: number;
  pagesMonitored: number;
  latestCrawlLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Market Snapshot (Last 14 days)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div>• Competitors tracked: {competitorsTracked}</div>
        <div>• Active competitors: {activeCompetitors}</div>
        <div>• Pages under monitoring: {pagesMonitored}</div>
        <div>• Latest crawl: {latestCrawlLabel}</div>
      </CardContent>
    </Card>
  );
}
