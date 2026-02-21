import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";
import { getNotificationSettings } from "./actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaceId = (await getOrCreateWorkspaceId()) ?? "";
  const settings = workspaceId ? await getNotificationSettings(workspaceId) : null;

  return (
    <SettingsForm
      userEmail={user.email ?? ""}
      workspaceId={workspaceId}
      initialSettings={settings}
    />
  );
}

