import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SignalConfidence = "High" | "Medium" | "Low";
type KeySignalItem = { label: string; value: string; confidence: SignalConfidence };

export function KeySignalsSection({
  signals,
}: {
  signals: {
    positioning: KeySignalItem;
    gtmMotion: KeySignalItem;
    pricingPosture: KeySignalItem;
  };
}) {
  const items = [signals.positioning, signals.gtmMotion, signals.pricingPosture];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Key Signals at a Glance</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{item.value}</p>
              <Badge variant="outline" className="text-xs">
                Confidence: {item.confidence}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

