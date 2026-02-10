import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CompetitiveStateSectionProps = {
  competitorName: string;
  status: "Stable" | "Moderate" | "Active";
  trackingConfidence: "High" | "Medium";
  competitivePosture: "Maintaining Position" | "Experimenting" | "Expanding";
  summary: string[];
};

export function CompetitiveStateSection(props: CompetitiveStateSectionProps) {
  const { competitorName, status, trackingConfidence, competitivePosture, summary } = props;

  return (
    <Card>
      <CardHeader className="space-y-3 pb-2">
        <CardTitle className="text-lg">Competitive State - {competitorName}</CardTitle>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">Status: {status}</Badge>
          <Badge variant="outline">Tracking Confidence: {trackingConfidence}</Badge>
          <Badge variant="outline">Competitive Posture: {competitivePosture}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {summary.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </CardContent>
    </Card>
  );
}
