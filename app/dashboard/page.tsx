import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "./competitors/actions";
import { DashboardHeader } from "./_components/DashboardHeader";
import { MetricCard } from "./_components/MetricCard";
import { RecentActivity } from "./_components/RecentActivity";
import { CompetitorsGrid } from "./_components/CompetitorsGrid";
import { CriticalAlerts } from "./_components/CriticalAlerts";
import { Users, Activity, Radio, AlertTriangle } from "lucide-react";
import { triggerAllCrawls } from "./actions";

export default async function DashboardPage() {
  const workspaceId = await getOrCreateWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <h2 className="text-xl font-semibold">Sign in required</h2>
      </div>
    );
  }

  const supabase = await createClient();

  // 1. Fetch Competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name");

  const comps = competitors ?? [];
  const compMap = new Map(comps.map((c) => [c.id, c]));

  // 2. Fetch Pages for monitoring stats
  const { data: pages } = await supabase
    .from("pages")
    .select("competitor_id, page_type")
    .in("competitor_id", comps.map(c => c.id));

  const pageList = pages ?? [];
  const activeMonitorsCount = pageList.length;

  // 3. Fetch Strategic Movements (Recent & Critical)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: movements } = await supabase
    .from("strategic_movements")
    .select("id, competitor_id, summary, movement_category, impact_level, created_at")
    .in("competitor_id", comps.map(c => c.id))
    .order("created_at", { ascending: false })
    .limit(10); // Overview only needs recent items

  const allMovements = movements ?? [];
  const movements24h = allMovements.filter(m => m.created_at >= yesterday).length;

  const criticalAlerts = allMovements.filter(m => m.impact_level === 'HIGH');
  const recentActivity = allMovements.slice(0, 5);

  // 4. Construct Competitor Grid Data with Stats
  const competitorsWithStats = comps.map(c => {
    const compPages = pageList.filter(p => p.competitor_id === c.id);
    return {
      ...c,
      stats: {
        pricing: compPages.some(p => p.page_type === 'pricing'),
        services: compPages.some(p => ['product_or_services', 'services', 'use_cases_or_industries'].includes(p.page_type)),
        seo: compPages.some(p => p.page_type === 'homepage'), // Assuming homepage implies generic monitoring/SEO
      }
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="bg-blue-600 text-white p-4 text-center font-bold text-3xl mb-8 rounded-lg shadow-xl">
        DEBUG: I AM THE DASHBOARD OVERVIEW PAGE
      </div>
      <DashboardHeader onScanAll={triggerAllCrawls} />

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Competitors"
          value={comps.length}
          icon={Users}
          accentColor="blue"
        />
        <MetricCard
          title="Movements (24h)"
          value={movements24h}
          icon={Activity}
          accentColor="cyan"
          pulse={movements24h > 0}
        />
        <MetricCard
          title="Active Monitors"
          value={activeMonitorsCount}
          icon={Radio}
          accentColor="green"
        />
        <MetricCard
          title="High Impact Alerts"
          value={criticalAlerts.length}
          icon={AlertTriangle}
          accentColor="red"
          pulse={criticalAlerts.length > 0}
        />
      </div>

      <RecentActivity activities={recentActivity} competitorsMap={compMap} />

      <CompetitorsGrid competitors={competitorsWithStats} />

      <CriticalAlerts alerts={criticalAlerts} competitorsMap={compMap} />
    </div>
  );
}
