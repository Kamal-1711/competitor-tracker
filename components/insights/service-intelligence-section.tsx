import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type ServiceOverview = {
  totalServices: number;
  primaryFocus: string;
  industries: string[];
};

export function ServiceIntelligenceSection({
  overview,
  derivedSignals,
  strategicConsiderations,
  evidenceHeadings,
}: {
  overview: ServiceOverview;
  derivedSignals: string[];
  strategicConsiderations: string[];
  evidenceHeadings: string[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Service Intelligence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Services</p>
            <p className="mt-1 text-lg font-semibold">{overview.totalServices}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Primary Focus</p>
            <p className="mt-1 text-lg font-semibold">{overview.primaryFocus}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Industries</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {overview.industries.length > 0 ? (
                overview.industries.map((industry) => (
                  <Badge key={industry} variant="secondary" className="text-xs">
                    {industry}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No clear vertical emphasis yet</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Derived Signals</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {derivedSignals.map((signal) => (
              <li key={signal}>• {signal}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Strategic Considerations</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {strategicConsiderations.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <Collapsible>
          <CollapsibleTrigger className="text-sm font-medium underline-offset-4 hover:underline">
            Evidence: Service Page Structure
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <ul className="space-y-1 text-sm text-muted-foreground">
              {evidenceHeadings.length > 0 ? (
                evidenceHeadings.slice(0, 8).map((heading) => <li key={heading}>• {heading}</li>)
              ) : (
                <li>• Service section evidence will appear after services pages are crawled.</li>
              )}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

