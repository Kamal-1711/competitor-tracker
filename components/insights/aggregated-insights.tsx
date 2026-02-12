import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AggregatedInsights({
  mostActiveCompetitor,
  mostActiveCount,
  mostChangedArea,
  mostChangedAreaCount,
  marketActivityLevel,
  totalInsights14d,
}: {
  mostActiveCompetitor: string;
  mostActiveCount: number;
  mostChangedArea: string;
  mostChangedAreaCount: number;
  marketActivityLevel: "Stable" | "Moderate" | "Active";
  totalInsights14d: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="glass-subtle bg-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Most Active Competitor (14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base font-semibold">{mostActiveCompetitor}</p>
          <p className="text-xs text-muted-foreground">
            {mostActiveCount} insight{mostActiveCount === 1 ? "" : "s"} detected
          </p>
        </CardContent>
      </Card>

      <Card className="glass-subtle bg-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Most Changed Area</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base font-semibold">{mostChangedArea}</p>
          <p className="text-xs text-muted-foreground">
            {mostChangedAreaCount} insight{mostChangedAreaCount === 1 ? "" : "s"} in last 14 days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Market Activity Level</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base font-semibold">{marketActivityLevel}</p>
          <p className="text-xs text-muted-foreground">
            {totalInsights14d} total insight{totalInsights14d === 1 ? "" : "s"} in last 14 days
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
