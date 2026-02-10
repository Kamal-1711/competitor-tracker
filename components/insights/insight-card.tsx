import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InsightCard({
  competitorName,
  statusLabel,
  observations,
  recentInsight,
  href,
}: {
  competitorName: string;
  statusLabel: string;
  observations: string[];
  recentInsight: string;
  href: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{competitorName}</CardTitle>
          <p className="text-sm text-muted-foreground">Status: {statusLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Key Observations:</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {observations.length > 0 ? (
                observations.map((observation) => (
                  <li key={observation}>• {observation}</li>
                ))
              ) : (
                <li>• Pages are actively monitored</li>
              )}
            </ul>
          </div>
          <div>
            <p className="font-medium">Recent Insight:</p>
            <p className="mt-2 text-muted-foreground">“{recentInsight}”</p>
          </div>
          <div className="text-sm font-medium text-primary">View Details →</div>
        </CardContent>
      </Card>
    </Link>
  );
}
