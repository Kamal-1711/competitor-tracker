import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CompanyBaselineSectionProps = {
  biographySummary: string;
  coreOfferings: string[];
  offeringStructureSummary: string;
  targetMarketSummary: string;
  valuePropositionSummary: string;
  trustProfileSummary: string;
};

export function CompanyBaselineSection({
  biographySummary,
  coreOfferings,
  offeringStructureSummary,
  targetMarketSummary,
  valuePropositionSummary,
  trustProfileSummary,
}: CompanyBaselineSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Company Baseline Intelligence</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Company Overview</p>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
              {biographySummary || "Baseline will strengthen as more surfaces are crawled."}
            </pre>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Target Market</p>
            <p className="text-sm text-muted-foreground">
              {targetMarketSummary || "Target segment is not yet explicitly signaled."}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Core Offerings</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {coreOfferings.length > 0 ? (
                coreOfferings.slice(0, 6).map((item) => <li key={item}>• {item}</li>)
              ) : (
                <li>• Offering structure will appear as services pages are crawled.</li>
              )}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">{offeringStructureSummary}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Value Proposition</p>
            <p className="text-sm text-muted-foreground">{valuePropositionSummary}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Trust Profile</p>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
              {trustProfileSummary}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

