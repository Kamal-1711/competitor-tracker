import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  StrategicDimensions,
  CompetitivePressureResult,
  TrajectoryAnalysis,
  SaturationRisk,
} from "@/lib/intelligence-engine";

type Props = {
  dimensions: StrategicDimensions;
  pressure: CompetitivePressureResult;
  trajectory: TrajectoryAnalysis;
  saturation: SaturationRisk | null;
  flags: string[];
  archetype: string;
};

function toLabel(key: keyof StrategicDimensions): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function level(score: number): "Low" | "Moderate" | "High" {
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  return "Low";
}

export function StrategicPositioningSection({
  dimensions,
  pressure,
  trajectory,
  saturation,
  flags,
  archetype,
}: Props) {
  const dimensionEntries = Object.entries(dimensions) as [
    keyof StrategicDimensions,
    number
  ][];

  const structuralFlags: string[] = [];
  if (flags.includes("breadth_without_focus")) {
    structuralFlags.push("Breadth without clear vertical focus");
  }
  if (saturation?.hasEnterpriseSaturation) {
    structuralFlags.push("Enterprise transformation saturation among peers");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Strategic Positioning Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Dominant Strategic Identity
            </p>
            <p className="text-sm font-medium">{archetype}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Competitive Pressure
            </p>
            <p className="text-sm">
              {pressure.highestPressureDimension
                ? `${toLabel(pressure.highestPressureDimension)} · ${pressure.overallPressureLevel}`
                : "Low versus currently tracked peers"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Trajectory Signal
            </p>
            <p className="text-sm">
              {trajectory.dominantTrendDimension
                ? `${toLabel(trajectory.dominantTrendDimension)} · ${trajectory.accelerationLevel}`
                : "No dominant directional shift detected"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">DNA Profile (6 dimensions)</p>
          <div className="grid gap-3 md:grid-cols-3">
            {dimensionEntries.map(([key, score]) => (
              <div key={key} className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {toLabel(key)}
                </p>
                <p className="mt-1 text-lg font-semibold">{score}</p>
                <p className="text-xs text-muted-foreground">
                  Level: {level(score)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Structural Risk Flags</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {structuralFlags.length > 0 ? (
              structuralFlags.slice(0, 3).map((f) => <li key={f}>• {f}</li>)
            ) : (
              <li>• No immediate structural risks indicated by current signals.</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

