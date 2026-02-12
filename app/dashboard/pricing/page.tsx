import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "../competitors/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inferPrimaryMonetizationModel } from "@/lib/pricing-intelligence/pricingIntelligence";

type BillingModel = "subscription" | "usage" | "hybrid" | "unknown";
type PricingSnapshotRow = {
  id: string;
  competitor_id: string;
  captured_at: string;
  total_plans: number;
  entry_price: number | null;
  billing_model: BillingModel;
  free_trial: boolean;
  enterprise_present: boolean;
  pricing_structure_json: Record<string, unknown> | null;
  capture_status: "structured" | "visual-only";
};

type PricingPlanRow = {
  plan_name: string;
  price_value: number | null;
  billing_interval: string | null;
  feature_count: number;
  cta_text: string | null;
  highlight_flag: boolean;
};

type PricingChangeRow = {
  id: string;
  snapshot_id: string;
  change_type: string;
  impact_level: "low" | "moderate" | "high";
  description: string;
  created_at: string;
};

function formatBillingModel(value: BillingModel): string {
  if (value === "subscription") return "Subscription";
  if (value === "usage") return "Usage";
  if (value === "hybrid") return "Hybrid";
  return "Unknown";
}

function formatPrice(value: number | null): string {
  if (value == null) return "N/A";
  return `$${value}`;
}

function normalizeInterval(value: string | null): string {
  if (!value) return "N/A";
  if (value === "monthly") return "Monthly";
  if (value === "yearly") return "Yearly";
  if (value === "per-seat") return "Per seat";
  if (value === "usage-based") return "Usage-based";
  return value;
}

function parsePricingStructure(snapshot: PricingSnapshotRow | null): {
  highlightedTier: string | null;
  trustBadgesPresent: boolean;
  socialProofPresent: boolean;
  priceAnchoringDetected: boolean;
} {
  const raw = snapshot?.pricing_structure_json ?? {};
  if (!raw || typeof raw !== "object") {
    return {
      highlightedTier: null,
      trustBadgesPresent: false,
      socialProofPresent: false,
      priceAnchoringDetected: false,
    };
  }
  const data = raw as Record<string, unknown>;
  return {
    highlightedTier:
      typeof data.highlighted_tier === "string" && data.highlighted_tier.trim()
        ? data.highlighted_tier
        : null,
    trustBadgesPresent: Boolean(data.trust_badges_present),
    socialProofPresent: Boolean(data.social_proof_present),
    priceAnchoringDetected: Boolean(data.price_anchoring_detected),
  };
}

function deriveTierSpacing(plans: PricingPlanRow[]): "aggressive" | "balanced" | "compressed" {
  const prices = plans
    .map((plan) => plan.price_value)
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  if (prices.length < 3) return "balanced";
  const gaps = prices.slice(1).map((price, idx) => price - prices[idx]);
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  if (avgGap >= 30) return "aggressive";
  if (avgGap <= 10) return "compressed";
  return "balanced";
}

function deriveFeatureGating(plans: PricingPlanRow[]): "strong" | "moderate" | "weak" {
  if (plans.length < 2) return "weak";
  const featureCounts = plans.map((plan) => plan.feature_count);
  const max = Math.max(...featureCounts);
  const min = Math.min(...featureCounts);
  const spread = max - min;
  if (spread >= 8) return "strong";
  if (spread >= 3) return "moderate";
  return "weak";
}

function deriveEnterpriseBias(snapshot: PricingSnapshotRow): "low" | "moderate" | "heavy" {
  if (!snapshot.enterprise_present) return "low";
  if (snapshot.total_plans >= 3) return "heavy";
  return "moderate";
}

function deriveUpsellPressure(plans: PricingPlanRow[]): "low" | "moderate" | "high" {
  if (plans.length === 0) return "low";
  const highlighted = plans.find((plan) => plan.highlight_flag);
  const highIntentCtas = plans.filter((plan) =>
    /contact sales|talk to sales|book demo|get started/i.test(plan.cta_text ?? "")
  ).length;
  if (highlighted && highIntentCtas >= 2) return "high";
  if (highlighted || highIntentCtas >= 1) return "moderate";
  return "low";
}

function deriveCompetitiveImplications(input: {
  snapshot: PricingSnapshotRow;
  recentChanges: PricingChangeRow[];
  upsellPressure: "low" | "moderate" | "high";
  tierSpacing: "aggressive" | "balanced" | "compressed";
}): string[] {
  const implications: string[] = [];
  const hasPriceIncrease = input.recentChanges.some((change) => change.change_type === "entry_price_change" && /\(\+/.test(change.description));
  const hasEnterpriseMove = input.snapshot.enterprise_present || input.recentChanges.some((change) => change.change_type === "enterprise_tier_addition");

  if (input.snapshot.entry_price != null && input.snapshot.entry_price >= 30) {
    implications.push("Entry pricing positions this competitor in a mid-market or above segment.");
  } else if (input.snapshot.entry_price != null) {
    implications.push("Entry pricing remains self-serve accessible, limiting immediate pricing pressure.");
  }

  if (hasEnterpriseMove) {
    implications.push("Enterprise upsell pressure is active; expect stronger sales-assisted packaging.");
  }

  if (hasPriceIncrease) {
    implications.push("Recent upward price movement suggests willingness to test margin expansion.");
  } else {
    implications.push("No recent price increase signal; a transparent packaging response can still differentiate.");
  }

  if (input.upsellPressure === "high" || input.tierSpacing === "compressed") {
    implications.push("Opportunity exists to differentiate through clearer plan separation and transparent value mapping.");
  } else {
    implications.push("Opportunity exists to compete on transparent usage boundaries and simpler buying paths.");
  }

  return implications.slice(0, 4);
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workspaceId = await getOrCreateWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">You must be signed in to view pricing changes.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();

  const params = await searchParams;
  const selectedCompetitorIdParam =
    typeof params.competitorId === "string" ? params.competitorId : null;

  const { data: competitorsData } = await supabase
    .from("competitors")
    .select("id, name, url")
    .eq("workspace_id", workspaceId);

  const competitors = competitorsData ?? [];

  if (competitors.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pricing Intelligence</h1>
        <EmptyState
          title="No competitors yet"
          description="Add competitors on the Competitors page and run an update check. We’ll show pricing strategy shifts here once sites are checked."
        />
      </div>
    );
  }

  const selectedCompetitor =
    competitors.find((competitor) => competitor.id === selectedCompetitorIdParam) ?? competitors[0];

  const { data: latestSnapshots = [] } = await supabase
    .from("pricing_snapshots")
    .select(
      "id, competitor_id, captured_at, total_plans, entry_price, billing_model, free_trial, enterprise_present, pricing_structure_json, capture_status"
    )
    .eq("competitor_id", selectedCompetitor.id)
    .order("captured_at", { ascending: false })
    .limit(2);

  const latestSnapshot = (latestSnapshots[0] as PricingSnapshotRow | undefined) ?? null;
  const previousSnapshot = (latestSnapshots[1] as PricingSnapshotRow | undefined) ?? null;

  const { data: planRows = [] } = latestSnapshot
    ? await supabase
        .from("pricing_plan_details")
        .select("plan_name, price_value, billing_interval, feature_count, cta_text, highlight_flag")
        .eq("snapshot_id", latestSnapshot.id)
        .order("price_value", { ascending: true })
    : { data: [] as PricingPlanRow[] };
  const plans = (planRows as PricingPlanRow[]) ?? [];

  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSnapshotRows = [] } = await supabase
    .from("pricing_snapshots")
    .select("id, captured_at")
    .eq("competitor_id", selectedCompetitor.id)
    .gte("captured_at", last30Days)
    .order("captured_at", { ascending: false })
    .limit(60);
  const recentSnapshotIds = (recentSnapshotRows ?? []).map((row) => String((row as { id: string }).id));

  const { data: recentChangesRows = [] } = recentSnapshotIds.length
    ? await supabase
        .from("pricing_changes")
        .select("id, snapshot_id, change_type, impact_level, description, created_at")
        .in("snapshot_id", recentSnapshotIds)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] as PricingChangeRow[] };
  const recentChanges = (recentChangesRows as PricingChangeRow[]) ?? [];

  const { data: screenshotRows = [] } = await supabase
    .from("snapshots")
    .select("id, url, screenshot_url, created_at")
    .eq("competitor_id", selectedCompetitor.id)
    .eq("page_type", "pricing")
    .order("created_at", { ascending: false })
    .limit(24);

  if (!latestSnapshot) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Pricing Intelligence</h1>
          <div className="flex flex-wrap gap-2">
            {competitors.map((competitor) => (
              <Button
                key={competitor.id}
                asChild
                size="sm"
                variant={competitor.id === selectedCompetitor.id ? "default" : "outline"}
              >
                <Link href={`/dashboard/pricing?competitorId=${competitor.id}`}>
                  {competitor.name || competitor.url}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <EmptyState
          title="No pricing intelligence captured yet"
          description="Run a competitor update check to collect structured pricing data and visual evidence."
        />
      </div>
    );
  }

  const pricingStructure = parsePricingStructure(latestSnapshot);
  const tierSpacing = deriveTierSpacing(plans);
  const featureGating = deriveFeatureGating(plans);
  const enterpriseBias = deriveEnterpriseBias(latestSnapshot);
  const upsellPressure = deriveUpsellPressure(plans);
  const monetizationModel = inferPrimaryMonetizationModel(latestSnapshot);
  const implications = deriveCompetitiveImplications({
    snapshot: latestSnapshot,
    recentChanges,
    upsellPressure,
    tierSpacing,
  });
  const ctaTypes = Array.from(new Set(plans.map((plan) => (plan.cta_text ?? "N/A").trim()).filter(Boolean)));
  const movingUpmarket =
    recentChanges.some((change) => change.change_type === "enterprise_tier_addition") ||
    (previousSnapshot?.entry_price != null &&
      latestSnapshot.entry_price != null &&
      latestSnapshot.entry_price > previousSnapshot.entry_price);
  const experimenting =
    recentChanges.some((change) => change.change_type === "cta_change") ||
    recentChanges.some((change) => change.change_type === "feature_shift");
  const pricingPressure =
    recentChanges.some((change) => change.change_type === "entry_price_change") ||
    recentChanges.some((change) => change.change_type === "plan_added");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Pricing Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Monetization intelligence report for {selectedCompetitor.name || selectedCompetitor.url}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {competitors.map((competitor) => (
            <Button
              key={competitor.id}
              asChild
              size="sm"
              variant={competitor.id === selectedCompetitor.id ? "default" : "outline"}
            >
              <Link href={`/dashboard/pricing?competitorId=${competitor.id}`}>
                {competitor.name || competitor.url}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Plans</p>
              <p className="text-lg font-semibold">{latestSnapshot.total_plans}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Entry Price</p>
              <p className="text-lg font-semibold">{formatPrice(latestSnapshot.entry_price)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Billing Model</p>
              <p className="text-lg font-semibold">{formatBillingModel(latestSnapshot.billing_model)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Enterprise Tier</p>
              <p className="text-lg font-semibold">{latestSnapshot.enterprise_present ? "Yes" : "No"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Free Trial</p>
              <p className="text-lg font-semibold">{latestSnapshot.free_trial ? "Yes" : "No"}</p>
            </div>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs text-muted-foreground">Primary Monetization Model</p>
            <p className="mt-1 text-sm">{monetizationModel}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={experimenting ? "secondary" : "outline"}>
              {experimenting ? "Experimenting signals detected" : "No active experimentation signal"}
            </Badge>
            <Badge variant={movingUpmarket ? "secondary" : "outline"}>
              {movingUpmarket ? "Upmarket movement observed" : "No upmarket movement signal"}
            </Badge>
            <Badge variant={pricingPressure ? "secondary" : "outline"}>
              {pricingPressure ? "Pricing pressure signal present" : "No pricing pressure signal"}
            </Badge>
            {latestSnapshot.capture_status === "visual-only" && (
              <Badge variant="outline">Structured extraction limited (visual-only capture)</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Pricing Movement (30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {recentChanges.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {recentChanges.map((change) => (
                <li key={change.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span>{change.description}</span>
                    <Badge variant="outline">{change.impact_level}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No structural changes detected in last 30 days.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Packaging & Positioning Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>Tier spacing: {tierSpacing}.</li>
            <li>Feature gating intensity: {featureGating}.</li>
            <li>Enterprise bias: {enterpriseBias}.</li>
            <li>Upsell pressure: {upsellPressure}.</li>
            <li>
              Price anchoring patterns: {pricingStructure.priceAnchoringDetected ? "detected" : "not detected"}.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversion Mechanics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Highlighted Tier</p>
              <p>{pricingStructure.highlightedTier ?? "None detected"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">CTA Types</p>
              <p>{ctaTypes.length > 0 ? ctaTypes.join(", ") : "No CTA detected"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Trial Presence</p>
              <p>{latestSnapshot.free_trial ? "Free trial present" : "No free trial signal"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Trust & Social Proof</p>
              <p>
                Trust badges: {pricingStructure.trustBadgesPresent ? "Yes" : "No"}, Social proof:{" "}
                {pricingStructure.socialProofPresent ? "Yes" : "No"}
              </p>
            </div>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs text-muted-foreground">Conversion Strategy Summary</p>
            <p className="mt-1">
              {pricingStructure.highlightedTier
                ? `${pricingStructure.highlightedTier} is visually emphasized;`
                : "No single plan is visibly emphasized;"}
              {" "}
              {latestSnapshot.enterprise_present
                ? "enterprise motion appears sales-assisted."
                : "conversion flow appears primarily self-serve."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Competitive Implication</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {implications.map((item) => (
              <li key={item} className="rounded-md border p-3">
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Structure Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Collapsible>
            <CollapsibleTrigger>Show plan structure</CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Interval</TableHead>
                      <TableHead>Feature Count</TableHead>
                      <TableHead>CTA</TableHead>
                      <TableHead>Highlight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No structured plans detected in latest capture.
                        </TableCell>
                      </TableRow>
                    ) : (
                      plans.map((plan) => (
                        <TableRow key={`${plan.plan_name}-${plan.price_value ?? "na"}`}>
                          <TableCell>{plan.plan_name}</TableCell>
                          <TableCell>{formatPrice(plan.price_value)}</TableCell>
                          <TableCell>{normalizeInterval(plan.billing_interval)}</TableCell>
                          <TableCell>{plan.feature_count}</TableCell>
                          <TableCell>{plan.cta_text ?? "N/A"}</TableCell>
                          <TableCell>{plan.highlight_flag ? "Yes" : "No"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visual Evidence Archive</CardTitle>
        </CardHeader>
        <CardContent>
          {screenshotRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pricing screenshots captured yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {screenshotRows.map((snapshot) => (
                <div key={(snapshot as { id: string }).id} className="space-y-2 rounded-md border p-3">
                  {(snapshot as { screenshot_url: string | null }).screenshot_url ? (
                    <a
                      href={(snapshot as { screenshot_url: string }).screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={(snapshot as { screenshot_url: string }).screenshot_url}
                        alt="Pricing visual evidence"
                        className="w-full rounded-md border object-cover"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <div className="flex h-36 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                      No screenshot
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date((snapshot as { created_at: string }).created_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
