import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FocusSignalsSectionProps = {
  primaryFocusAreas: string[];
  secondarySignals: string[];
  interpretation: string;
};

export function FocusSignalsSection(props: FocusSignalsSectionProps) {
  const { primaryFocusAreas, secondarySignals, interpretation } = props;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Focus &amp; Intent Signals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="font-medium">Primary Focus Areas</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {primaryFocusAreas.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium">Secondary Signals</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {secondarySignals.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium">What this suggests</p>
          <p className="mt-2 text-muted-foreground">{interpretation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
