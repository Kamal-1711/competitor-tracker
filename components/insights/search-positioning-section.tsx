import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SeoIntelligenceResult } from "@/lib/intelligence-engine";

type Props = {
  seo: SeoIntelligenceResult;
};

function scoreLevel(label: number): "Low" | "Moderate" | "High" {
  if (label >= 75) return "High";
  if (label >= 40) return "Moderate";
  return "Low";
}

export function SearchPositioningSection({ seo }: Props) {
  const { snapshot, funnel, content, dimensions, evolution, dominantKeywords, contentGap } = seo;
  const totalFunnel =
    funnel.top_of_funnel + funnel.mid_of_funnel + funnel.bottom_of_funnel;

  const describeStage = (count: number): string => {
    if (totalFunnel === 0) return "Not yet visible";
    const share = count / totalFunnel;
    if (share >= 0.45) return "Strong";
    if (share >= 0.2) return "Moderate";
    return "Limited";
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <CardHeader className="p-0">
          <CardTitle className="text-lg">Search Positioning Intelligence</CardTitle>
        </CardHeader>
        <p className="text-sm text-muted-foreground max-w-3xl">
          {snapshot.executive_summary}
        </p>
      </div>

      <CardContent className="space-y-6 p-0">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Dominant Topic Clusters
            </p>
            <ul className="space-y-1 text-sm">
              {snapshot.dominant_topics.length > 0 ? (
                snapshot.dominant_topics.map((name) => <li key={name}>• {name}</li>)
              ) : (
                <li className="text-muted-foreground">
                  • No clear topic clusters detectable from current content.
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Funnel Coverage
            </p>
            <p className="text-sm">
              Top-of-Funnel: {describeStage(funnel.top_of_funnel)}
            </p>
            <p className="text-sm">
              Mid-Funnel: {describeStage(funnel.mid_of_funnel)}
            </p>
            <p className="text-sm">
              Bottom-of-Funnel: {describeStage(funnel.bottom_of_funnel)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Keyword Footprint
            </p>
            <p className="text-xs text-muted-foreground">Top Keywords</p>
            <ul className="space-y-1 text-sm">
              {dominantKeywords.length > 0 ? (
                dominantKeywords.slice(0, 30).map((k) => <li key={k}>• {k}</li>)
              ) : (
                <li className="text-muted-foreground">
                  • Keyword footprint will populate as SEO-content pages are crawled.
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Content Gap Intelligence
            </p>
            <p className="text-sm">
              Gap Severity: {contentGap.gap_severity}
            </p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Missing Topic Clusters</p>
              <ul className="space-y-1 text-sm">
                {contentGap.cluster_gaps.length > 0 ? (
                  contentGap.cluster_gaps.slice(0, 3).map((cluster) => <li key={cluster}>• {cluster}</li>)
                ) : (
                  <li className="text-muted-foreground">• No major topic cluster gaps detected.</li>
                )}
              </ul>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Dominant Competitor Keywords</p>
              <ul className="space-y-1 text-sm">
                {contentGap.dominant_competitor_keywords.length > 0 ? (
                  contentGap.dominant_competitor_keywords
                    .slice(0, 5)
                    .map((k) => <li key={k}>• {k}</li>)
                ) : (
                  <li className="text-muted-foreground">• Not enough comparison data yet.</li>
                )}
              </ul>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Executive Summary</p>
              <ul className="space-y-1 text-sm">
                {contentGap.executive_summary_lines.slice(0, 5).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Content Investment
            </p>
            <p className="text-sm">
              Blog Pages: {content.total_blog_pages}
            </p>
            <p className="text-sm">
              Avg Depth:{" "}
              {content.avg_word_count > 0
                ? `${content.avg_word_count.toLocaleString()} words`
                : "Not enough signal yet"}
            </p>
            <p className="text-sm">
              Publishing Frequency:{" "}
              {content.publishing_frequency_per_month > 0
                ? `${content.publishing_frequency_per_month}/month`
                : "Low or not yet observable"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              SEO Strategic Profile
            </p>
            <p className="text-sm">
              Topic Concentration: {scoreLevel(dimensions.topic_concentration)}
            </p>
            <p className="text-sm">
              Vertical Focus: {scoreLevel(dimensions.vertical_seo_focus)}
            </p>
            <p className="text-sm">
              Enterprise Orientation: {scoreLevel(dimensions.enterprise_seo_orientation)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              SEO Trajectory
            </p>
            <p className="text-sm font-medium">
              {snapshot.trajectory_signal}
            </p>
            <p className="text-sm text-muted-foreground">
              {evolution.expansion_signal}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              SEO Risk Flags
            </p>
            <ul className="space-y-1 text-sm">
              {snapshot.seo_risk_flags.length > 0 ? (
                snapshot.seo_risk_flags.map((f) => <li key={f}>• {f}</li>)
              ) : (
                <li className="text-muted-foreground">
                  • No immediate SEO risks indicated by current content signals.
                </li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

