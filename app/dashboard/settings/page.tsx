import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { getNotificationSettings } from "./actions";

async function getWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .is("owner_id", null)
    .limit(1)
    .maybeSingle();
  return workspace?.id ?? null;
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let workspaceId: string | null = null;
  try {
    workspaceId = await getWorkspaceId();
  } catch {
    // non-fatal — settings still renders, just won't pre-fill
  }

  const settings = workspaceId
    ? await getNotificationSettings(workspaceId).catch(() => null)
    : null;

  return (
    <SettingsForm
      userEmail={user?.email ?? ""}
      workspaceId={workspaceId ?? ""}
      initialSettings={settings}
    />
  );
}
