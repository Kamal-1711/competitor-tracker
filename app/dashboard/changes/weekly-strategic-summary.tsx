import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type MovementSignal = "Stable" | "Moderate" | "Active";

export function WeeklyStrategicSummary({
  totalChanges,
  categoryCounts,
  movementSignal,
}: {
  totalChanges: number;
  categoryCounts: Record<string, number>;
  movementSignal: MovementSignal;
}) {
  const distinctCategories = Object.keys(categoryCounts).filter((key) => categoryCounts[key] > 0);
  const topCategory =
    distinctCategories.length > 0
      ? distinctCategories.reduce((best, current) =>
          categoryCounts[current] > categoryCounts[best] ? current : best
        )
      : null;

  const categoryPhrase =
    distinctCategories.length === 0
      ? "no clearly dominant focus area yet"
      : topCategory
      ? `most movement in ${topCategory.toLowerCase()}`
      : "a balanced spread across focus areas";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Weekly Strategic Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>
          {totalChanges === 0
            ? "No structural changes have been detected in the last week."
            : `${totalChanges} structural change${totalChanges === 1 ? "" : "s"} detected this week, with ${categoryPhrase}.`}
        </p>
        <p>
          Overall movement signal: {movementSignal}.
        </p>
        {distinctCategories.length > 0 && (
          <p>
            Focus areas include{" "}
            {distinctCategories
              .slice(0, 3)
              .map((c) => c.toLowerCase())
              .join(", ")}
            {distinctCategories.length > 3 ? ", and others." : "."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

