import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PmInterpretationSectionProps = {
  bullets: string[];
};

export function PmInterpretationSection({ bullets }: PmInterpretationSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">PM Interpretation</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {bullets.slice(0, 3).map((bullet) => (
            <li key={bullet}>• {bullet}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
