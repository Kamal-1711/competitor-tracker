import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { CompetitiveRadarRoot } from "@/components/CompetitiveRadarRoot";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";
import { SidebarProvider } from "@/components/sidebar-context";
import { PageTransition } from "@/components/page-transition";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log(`[DashboardLayout] Rendering children for path...`);
  const workspaceId = await getOrCreateWorkspaceId();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
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
    </SidebarProvider>
  );
}
