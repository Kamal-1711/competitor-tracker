import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { CompetitiveRadarRoot } from "@/components/CompetitiveRadarRoot";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspaceId = await getOrCreateWorkspaceId();

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block p-3">
        <AppSidebar />
      </div>
      <div className="flex flex-1 flex-col">
        <CompetitiveRadarRoot workspaceId={workspaceId}>
          <TopBar />
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
              {children}
            </div>
          </main>
        </CompetitiveRadarRoot>
      </div>
    </div>
  );
}
