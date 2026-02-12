import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { CompetitiveRadarRoot } from "@/components/CompetitiveRadarRoot";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";

export default async function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspaceId = await getOrCreateWorkspaceId();

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <div className="flex flex-1 flex-col">
        <CompetitiveRadarRoot workspaceId={workspaceId}>
          <TopBar />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </CompetitiveRadarRoot>
      </div>
    </div>
  );
}
