import { Bell, User, Hexagon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
  return (
    <header className="flex h-14 w-full items-center border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2 font-bold md:hidden">
        <Hexagon className="h-6 w-6" />
        <span className="text-lg">Competitor Tracker</span>
      </div>
      <div className="hidden md:flex items-center gap-2 font-semibold text-muted-foreground">
        <span>My Workspace</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <User className="h-5 w-5" />
          <span className="sr-only">Profile</span>
        </Button>
        <form action="/api/auth/logout" method="POST">
           <Button variant="ghost" size="icon" type="submit" className="text-muted-foreground" title="Sign out">
             <LogOut className="h-5 w-5" />
             <span className="sr-only">Sign out</span>
           </Button>
        </form>
      </div>
    </header>
  );
}
