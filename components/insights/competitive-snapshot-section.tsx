import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompetitiveSnapshot } from "@/lib/intelligence-engine";

type Props = {
  snapshot: CompetitiveSnapshot;
};

export function CompetitiveSnapshotSection({ snapshot }: Props) {
  const { identity_label, summary, strengths, vulnerabilities, competitive_risk_level, risk_explanation, trajectory_signal, trajectory_explanation } =
    snapshot;

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Competitive Snapshot
        </p>
        <h2 className="text-xl font-semibold tracking-tight">{identity_label}</h2>
        <p className="text-sm text-muted-foreground max-w-3xl">{summary}</p>
      </div>

      <hr className="border-border/60" />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Strength Concentration
          </p>
          <ul className="space-y-1 text-sm">
            {strengths.length > 0 ? (
              strengths.slice(0, 3).map((s) => <li key={s}>• {s}</li>)
            ) : (
              <li className="text-muted-foreground">
                • No dominant strengths surfaced yet from current signals.
              </li>
            )}
          </ul>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Structural Vulnerabilities
          </p>
          <ul className="space-y-1 text-sm">
            {vulnerabilities.length > 0 ? (
              vulnerabilities.slice(0, 3).map((v) => <li key={v}>• {v}</li>)
            ) : (
              <li className="text-muted-foreground">
                • No clear vulnerabilities indicated by current dimension scores.
              </li>
            )}
          </ul>
        </div>
      </div>

      <hr className="border-border/60" />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Competitive Risk Level
          </p>
          <p className="text-sm font-medium">{competitive_risk_level}</p>
          <p className="text-sm text-muted-foreground">{risk_explanation}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Trajectory Signal
          </p>
          <p className="text-sm font-medium">{trajectory_signal}</p>
          <p className="text-sm text-muted-foreground">{trajectory_explanation}</p>
        </div>
      </div>
    </Card>
  );
}

