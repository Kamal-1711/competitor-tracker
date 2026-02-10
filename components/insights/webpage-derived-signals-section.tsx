import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WebpageDerivedSignalsSectionProps = {
  messaging: string[];
  gtm: string[];
  pricingNarrative: string[];
  capabilityFocus: string[];
};

function SignalGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function WebpageDerivedSignalsSection(props: WebpageDerivedSignalsSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Webpage-Derived Signals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignalGroup title="Messaging Signals" items={props.messaging} />
        <SignalGroup title="GTM Signals" items={props.gtm} />
        <SignalGroup title="Pricing Narrative" items={props.pricingNarrative} />
        <SignalGroup title="Capability Focus" items={props.capabilityFocus} />
      </CardContent>
    </Card>
  );
}

