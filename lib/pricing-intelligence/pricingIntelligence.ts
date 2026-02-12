import crypto from "node:crypto";
import * as cheerio from "cheerio";
import type { SupabaseClient } from "@supabase/supabase-js";

type BillingModel = "subscription" | "usage" | "hybrid" | "unknown";
type CaptureStatus = "structured" | "visual-only";
type PricingChangeType =
  | "plan_added"
  | "plan_removed"
  | "entry_price_change"
  | "feature_shift"
  | "cta_change"
  | "enterprise_tier_addition"
  | "free_trial_change";
type PricingImpactLevel = "low" | "moderate" | "high";

export interface ExtractedPricingPlan {
  planName: string;
  priceValue: number | null;
  billingInterval: string | null;
  featureCount: number;
  ctaText: string | null;
  highlightFlag: boolean;
}

export interface ExtractedPricingSnapshot {
  totalPlans: number;
  entryPrice: number | null;
  billingModel: BillingModel;
  freeTrial: boolean;
  enterprisePresent: boolean;
  pricingStructureJson: Record<string, unknown>;
  pricingSummaryHash: string;
  captureStatus: CaptureStatus;
  plans: ExtractedPricingPlan[];
}

type PreviousPricingSnapshot = {
  id: string;
  total_plans: number;
  entry_price: number | null;
  billing_model: BillingModel;
  free_trial: boolean;
  enterprise_present: boolean;
  pricing_structure_json: Record<string, unknown> | null;
  pricing_summary_hash: string;
};

const PRICE_REGEX = /(?:\$|usd|eur|gbp|cad|aud|inr)\s*([0-9]+(?:[.,][0-9]{1,2})?)/i;
const CTA_REGEX = /(start|buy|get|choose|contact sales|talk to sales|book demo|try|trial|subscribe)/i;

function parsePriceValue(text: string): number | null {
  const match = text.match(PRICE_REGEX);
  if (!match?.[1]) return null;
  const normalized = match[1].replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseBillingInterval(text: string): string | null {
  const lower = text.toLowerCase();
  if (/(per\s*month|\/\s*mo|monthly)/i.test(lower)) return "monthly";
  if (/(per\s*year|\/\s*yr|annually|yearly)/i.test(lower)) return "yearly";
  if (/(per\s*user|per\s*seat|\/\s*seat)/i.test(lower)) return "per-seat";
  if (/(usage|per\s*credit|per\s*request|api call)/i.test(lower)) return "usage-based";
  return null;
}

function deriveBillingModel(pageText: string, plans: ExtractedPricingPlan[]): BillingModel {
  const lower = pageText.toLowerCase();
  const hasSubscription =
    /(monthly|annually|yearly|\/\s*mo|\/\s*yr|subscription|per month|per year)/i.test(lower) ||
    plans.some((p) => p.billingInterval === "monthly" || p.billingInterval === "yearly");
  const hasUsage =
    /(usage|per\s*credit|per\s*request|pay as you go|metered|api call)/i.test(lower) ||
    plans.some((p) => p.billingInterval === "usage-based");

  if (hasSubscription && hasUsage) return "hybrid";
  if (hasSubscription) return "subscription";
  if (hasUsage) return "usage";
  return "unknown";
}

function normalizePlanName(name: string | null | undefined): string {
  return (name ?? "").replace(/\s+/g, " ").trim();
}

function extractPlanFromContainer(el: any, $: cheerio.CheerioAPI): ExtractedPricingPlan | null {
  const container = $(el);
  const text = container.text().replace(/\s+/g, " ").trim();
  if (!text) return null;

  const hasPricingSignal = PRICE_REGEX.test(text) || CTA_REGEX.test(text);
  if (!hasPricingSignal) return null;

  const planNameRaw =
    container.find("h1, h2, h3, h4, h5, strong, [data-plan-name]").first().text().trim() ||
    container.attr("data-plan-name") ||
    "";
  const planName = normalizePlanName(planNameRaw);
  if (!planName) return null;

  const priceValue = parsePriceValue(text);
  const billingInterval = parseBillingInterval(text);
  const featureCount = container.find("li").length;
  const ctaText =
    container
      .find("button, a")
      .toArray()
      .map((node) => $(node).text().trim())
      .find((value) => CTA_REGEX.test(value)) ?? null;
  const classText = `${container.attr("class") ?? ""} ${container.attr("id") ?? ""}`.toLowerCase();
  const highlightFlag = /(popular|recommended|best|featured|highlight)/i.test(classText) || /most popular/i.test(text);

  return {
    planName,
    priceValue,
    billingInterval,
    featureCount,
    ctaText,
    highlightFlag,
  };
}

function dedupePlans(plans: ExtractedPricingPlan[]): ExtractedPricingPlan[] {
  const map = new Map<string, ExtractedPricingPlan>();
  for (const plan of plans) {
    const key = `${plan.planName.toLowerCase()}::${plan.priceValue ?? "na"}::${plan.ctaText ?? "na"}`;
    if (!map.has(key)) {
      map.set(key, plan);
    }
  }
  return Array.from(map.values());
}

export function extractPricingSnapshotFromHtml(html: string, pageUrl: string): ExtractedPricingSnapshot {
  const $ = cheerio.load(html);
  const pageText = $("body").text().replace(/\s+/g, " ").trim();
  const candidates: ExtractedPricingPlan[] = [];
  const selectors = [
    '[class*="pricing"] [class*="plan"]',
    '[class*="pricing"] [class*="tier"]',
    '[class*="pricing"] [class*="card"]',
    '[class*="plan"]',
    '[class*="tier"]',
    "[data-plan]",
  ];

  for (const selector of selectors) {
    $(selector)
      .toArray()
      .forEach((el) => {
        const parsed = extractPlanFromContainer(el, $);
        if (parsed) candidates.push(parsed);
      });
  }

  const plans = dedupePlans(candidates)
    .sort((a, b) => {
      if (a.priceValue == null && b.priceValue == null) return 0;
      if (a.priceValue == null) return 1;
      if (b.priceValue == null) return -1;
      return a.priceValue - b.priceValue;
    })
    .slice(0, 12);

  const totalPlans = plans.length;
  const entryPrice = plans.map((p) => p.priceValue).find((price) => price != null) ?? null;
  const freeTrial = /free trial|start free|try for free|14-day trial|30-day trial/i.test(pageText);
  const enterprisePresent = /enterprise|contact sales|talk to sales|custom pricing/i.test(pageText);
  const billingModel = deriveBillingModel(pageText, plans);
  const highlightedTier = plans.find((plan) => plan.highlightFlag)?.planName ?? null;
  const trustBadgesPresent = /(gdpr|soc 2|iso 27001|trusted by|security|compliance)/i.test(pageText);
  const socialProofPresent = /(customers|companies|teams|reviews|testimonials|g2|capterra)/i.test(pageText);
  const priceAnchoringDetected = /save|discount|was \$|strikethrough|% off|billed annually/i.test(pageText);

  const pricingStructureJson: Record<string, unknown> = {
    page_url: pageUrl,
    plans,
    highlighted_tier: highlightedTier,
    trust_badges_present: trustBadgesPresent,
    social_proof_present: socialProofPresent,
    price_anchoring_detected: priceAnchoringDetected,
  };

  const summaryPayload = {
    totalPlans,
    entryPrice,
    billingModel,
    freeTrial,
    enterprisePresent,
    plans: plans.map((plan) => ({
      name: plan.planName,
      price: plan.priceValue,
      interval: plan.billingInterval,
      features: plan.featureCount,
      cta: plan.ctaText,
      highlight: plan.highlightFlag,
    })),
  };
  const pricingSummaryHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(summaryPayload))
    .digest("hex");

  return {
    totalPlans,
    entryPrice,
    billingModel,
    freeTrial,
    enterprisePresent,
    pricingStructureJson,
    pricingSummaryHash,
    captureStatus: plans.length > 0 ? "structured" : "visual-only",
    plans,
  };
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function deriveImpactLevel(changeType: PricingChangeType, absolutePercentDelta?: number): PricingImpactLevel {
  if (changeType === "enterprise_tier_addition") return "high";
  if (changeType === "plan_added" || changeType === "plan_removed") return "moderate";
  if (changeType === "entry_price_change") {
    if ((absolutePercentDelta ?? 0) >= 15) return "high";
    if ((absolutePercentDelta ?? 0) >= 5) return "moderate";
    return "low";
  }
  if (changeType === "feature_shift" || changeType === "cta_change") return "moderate";
  return "low";
}

function parsePlansFromJson(value: unknown): ExtractedPricingPlan[] {
  if (!value || typeof value !== "object") return [];
  const maybePlans = (value as { plans?: unknown }).plans;
  if (!Array.isArray(maybePlans)) return [];
  return maybePlans
    .map((plan) => {
      if (!plan || typeof plan !== "object") return null;
      const row = plan as Record<string, unknown>;
      const planName = normalizePlanName(typeof row.planName === "string" ? row.planName : (row.name as string));
      if (!planName) return null;
      return {
        planName,
        priceValue: typeof row.priceValue === "number" ? row.priceValue : typeof row.price === "number" ? row.price : null,
        billingInterval: typeof row.billingInterval === "string" ? row.billingInterval : typeof row.interval === "string" ? row.interval : null,
        featureCount: typeof row.featureCount === "number" ? row.featureCount : typeof row.features === "number" ? row.features : 0,
        ctaText: typeof row.ctaText === "string" ? row.ctaText : typeof row.cta === "string" ? row.cta : null,
        highlightFlag: Boolean(row.highlightFlag ?? row.highlight),
      } satisfies ExtractedPricingPlan;
    })
    .filter((plan): plan is ExtractedPricingPlan => Boolean(plan));
}

function diffPricingSnapshots(
  previous: PreviousPricingSnapshot | null,
  current: ExtractedPricingSnapshot
): Array<{ change_type: PricingChangeType; impact_level: PricingImpactLevel; description: string }> {
  if (!previous) return [];
  if (previous.pricing_summary_hash === current.pricingSummaryHash) return [];

  const changes: Array<{ change_type: PricingChangeType; impact_level: PricingImpactLevel; description: string }> = [];

  if (previous.total_plans !== current.totalPlans) {
    const changeType: PricingChangeType = current.totalPlans > previous.total_plans ? "plan_added" : "plan_removed";
    changes.push({
      change_type: changeType,
      impact_level: deriveImpactLevel(changeType),
      description:
        changeType === "plan_added"
          ? `Added ${current.totalPlans - previous.total_plans} plan(s) to pricing lineup.`
          : `Removed ${previous.total_plans - current.totalPlans} plan(s) from pricing lineup.`,
    });
  }

  if (previous.entry_price != null && current.entryPrice != null && previous.entry_price !== current.entryPrice) {
    const pct = percentChange(current.entryPrice, previous.entry_price);
    const absoluteDelta = Math.abs(pct);
    changes.push({
      change_type: "entry_price_change",
      impact_level: deriveImpactLevel("entry_price_change", absoluteDelta),
      description: `Entry price moved from $${previous.entry_price} to $${current.entryPrice} (${pct > 0 ? "+" : ""}${round(
        pct
      )}%).`,
    });
  }

  if (!previous.enterprise_present && current.enterprisePresent) {
    changes.push({
      change_type: "enterprise_tier_addition",
      impact_level: deriveImpactLevel("enterprise_tier_addition"),
      description: "Enterprise-tier monetization signal introduced.",
    });
  }

  if (previous.free_trial !== current.freeTrial) {
    changes.push({
      change_type: "free_trial_change",
      impact_level: deriveImpactLevel("free_trial_change"),
      description: current.freeTrial ? "Free trial introduced." : "Free trial removed.",
    });
  }

  const previousPlans = parsePlansFromJson(previous.pricing_structure_json);
  const previousByName = new Map(previousPlans.map((plan) => [plan.planName.toLowerCase(), plan]));
  for (const plan of current.plans) {
    const oldPlan = previousByName.get(plan.planName.toLowerCase());
    if (!oldPlan) continue;
    if (oldPlan.featureCount !== plan.featureCount) {
      changes.push({
        change_type: "feature_shift",
        impact_level: deriveImpactLevel("feature_shift"),
        description: `Feature count changed for ${plan.planName} (${oldPlan.featureCount} -> ${plan.featureCount}).`,
      });
    }
    if ((oldPlan.ctaText ?? "") !== (plan.ctaText ?? "")) {
      changes.push({
        change_type: "cta_change",
        impact_level: deriveImpactLevel("cta_change"),
        description: `CTA changed for ${plan.planName} (${oldPlan.ctaText ?? "none"} -> ${plan.ctaText ?? "none"}).`,
      });
    }
  }

  const unique = new Map<string, { change_type: PricingChangeType; impact_level: PricingImpactLevel; description: string }>();
  for (const change of changes) {
    const key = `${change.change_type}::${change.description}`;
    if (!unique.has(key)) unique.set(key, change);
  }
  return Array.from(unique.values());
}

export async function persistPricingIntelligence(params: {
  supabase: SupabaseClient;
  competitorId: string;
  capturedAt: string;
  html: string;
  pageUrl: string;
}): Promise<void> {
  const extracted = extractPricingSnapshotFromHtml(params.html, params.pageUrl);

  const { data: previousSnapshot } = await params.supabase
    .from("pricing_snapshots")
    .select(
      "id, total_plans, entry_price, billing_model, free_trial, enterprise_present, pricing_structure_json, pricing_summary_hash"
    )
    .eq("competitor_id", params.competitorId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: insertedSnapshot, error: snapshotError } = await params.supabase
    .from("pricing_snapshots")
    .insert({
      competitor_id: params.competitorId,
      captured_at: params.capturedAt,
      total_plans: extracted.totalPlans,
      entry_price: extracted.entryPrice,
      billing_model: extracted.billingModel,
      free_trial: extracted.freeTrial,
      enterprise_present: extracted.enterprisePresent,
      pricing_structure_json: extracted.pricingStructureJson,
      pricing_summary_hash: extracted.pricingSummaryHash,
      capture_status: extracted.captureStatus,
    })
    .select("id")
    .single();

  if (snapshotError || !insertedSnapshot?.id) {
    return;
  }

  if (extracted.plans.length > 0) {
    const planRows = extracted.plans.map((plan) => ({
      snapshot_id: insertedSnapshot.id,
      plan_name: plan.planName,
      price_value: plan.priceValue,
      billing_interval: plan.billingInterval,
      feature_count: plan.featureCount,
      cta_text: plan.ctaText,
      highlight_flag: plan.highlightFlag,
    }));
    await params.supabase.from("pricing_plan_details").insert(planRows);
  }

  const pricingChanges = diffPricingSnapshots((previousSnapshot as PreviousPricingSnapshot | null) ?? null, extracted);
  if (pricingChanges.length > 0) {
    await params.supabase.from("pricing_changes").upsert(
      pricingChanges.map((change) => ({
        snapshot_id: insertedSnapshot.id,
        change_type: change.change_type,
        impact_level: change.impact_level,
        description: change.description,
      })),
      { onConflict: "snapshot_id,change_type,description" }
    );
  }
}

export function inferPrimaryMonetizationModel(snapshot: {
  enterprise_present: boolean;
  entry_price: number | null;
  total_plans: number;
  free_trial: boolean;
  billing_model: BillingModel;
}): string {
  const moderateEntryPrice = snapshot.entry_price != null && snapshot.entry_price >= 30;
  const lowEntryPrice = snapshot.entry_price != null && snapshot.entry_price <= 25;
  const hasMultipleTiers = snapshot.total_plans >= 3;

  if (snapshot.enterprise_present && moderateEntryPrice && hasMultipleTiers) {
    return "Enterprise upsell-focused tiered subscription";
  }

  if (snapshot.free_trial && lowEntryPrice) {
    return "Self-serve growth model";
  }

  if (snapshot.total_plans <= 1 && snapshot.enterprise_present) {
    return "High-touch enterprise sales model";
  }

  if (snapshot.billing_model === "usage") {
    return "Usage-based monetization model";
  }

  if (snapshot.billing_model === "hybrid") {
    return "Hybrid subscription and usage monetization";
  }

  return "Tiered subscription model with balanced packaging";
}

