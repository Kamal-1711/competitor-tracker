import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SignalConfidence = "High" | "Medium" | "Low";

export function StrategicImplicationsSection({
  implications,
}: {
  implications: Array<{ text: string; confidence: SignalConfidence }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Strategic Implications</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {implications.map((item) => (
            <li key={`${item.text}-${item.confidence}`} className="flex items-start gap-3 text-sm">
              <span className="mt-1 text-muted-foreground">•</span>
              <div className="space-y-1">
                <p>{item.text}</p>
                <Badge variant="secondary" className="text-xs">
                  {item.confidence} confidence
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

