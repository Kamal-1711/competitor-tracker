import { createClient } from "@/lib/supabase/server";
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

  // Get user email if signed in — but don't redirect if not (the app uses
  // a dummy-auth / shared workspace model that allows unauthenticated access)
  let userEmail = "";
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email ?? "";
  } catch {
    // ignore — just means no Supabase session
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
      userEmail={userEmail}
      workspaceId={workspaceId ?? ""}
      initialSettings={settings}
    />
  );
}
