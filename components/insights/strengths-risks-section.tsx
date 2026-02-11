import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ConfidenceLevel = "High" | "Medium" | "Low";

export function StrengthsRisksSection({
  strengths,
  risks,
  confidence,
}: {
  strengths: string[];
  risks: string[];
  confidence: ConfidenceLevel;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <CardTitle className="text-lg">Strengths & Risks</CardTitle>
        <Badge variant="outline" className="text-xs">
          Overall confidence: {confidence}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Top strengths</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {strengths.length > 0 ? (
              strengths.map((text) => <li key={text}>• {text}</li>)
            ) : (
              <li>• Strength signals will appear as more surfaces are crawled.</li>
            )}
          </ul>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Key risks</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {risks.length > 0 ? (
              risks.map((text) => <li key={text}>• {text}</li>)
            ) : (
              <li>• Risk signals will appear as more surfaces are crawled.</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

