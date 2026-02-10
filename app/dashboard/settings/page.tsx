import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Alerts</CardTitle>
          <CardDescription>Manage your email notification preferences.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-alerts">Enable email alerts</Label>
              <p className="text-sm text-muted-foreground">Receive notifications about competitor changes.</p>
            </div>
            <Switch id="email-alerts" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Manage your workspace settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input id="workspace-name" defaultValue="My Workspace" />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/50 rounded-b-lg">
             <div className="flex items-center justify-between w-full">
                <div className="space-y-1">
                    <h4 className="text-sm font-medium text-destructive">Delete Workspace</h4>
                     <p className="text-sm text-muted-foreground">
                        Permanently delete your workspace and all data.
                    </p>
                </div>
                 <Button variant="destructive">Delete Workspace</Button>
             </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled readOnly />
            </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/50 rounded-b-lg">
            <form action="/api/auth/logout" method="POST">
                <Button variant="outline" type="submit">Sign Out</Button>
            </form>
        </CardFooter>
      </Card>
    </div>
  );
}
