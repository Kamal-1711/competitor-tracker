"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, User, Hexagon, LogOut, Moon, Sun, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompetitiveRadarStore } from "@/store/competitiveRadarStore";
import { useCompetitiveRadarUi } from "@/components/competitive-radar-ui-context";
import { useSidebar } from "./sidebar-context";

function ThemeToggleButton() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const html = document.documentElement;
    const stored = window.localStorage.getItem("theme");

    if (stored === "dark") {
      html.classList.add("dark");
    } else if (stored === "light") {
      html.classList.remove("dark");
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      html.classList.add("dark");
    }

    setIsDark(html.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const nextIsDark = !html.classList.contains("dark");
    if (nextIsDark) {
      html.classList.add("dark");
      window.localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      window.localStorage.setItem("theme", "light");
    }
    setIsDark(nextIsDark);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground"
      type="button"
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function TopBar() {
  const { alerts } = useCompetitiveRadarStore();
  const { togglePanel } = useCompetitiveRadarUi();
  const { toggle, isOpen } = useSidebar();

  const { badgeCount, badgeColor } = useMemo(() => {
    const unreadHigh = alerts.filter((a) => !a.read && a.severity === "high").length;
    const unreadModerate = alerts.filter((a) => !a.read && a.severity === "moderate").length;
    const unreadTotal = alerts.filter((a) => !a.read).length;

    if (unreadHigh > 0) {
      return { badgeCount: unreadTotal, badgeColor: "bg-red-500" };
    }
    if (unreadModerate > 0) {
      return { badgeCount: unreadTotal, badgeColor: "bg-amber-500" };
    }
    return { badgeCount: 0, badgeColor: "" };
  }, [alerts]);

  return (
    <header className="glass-subtle bg-transparent flex h-14 w-full items-center border-b border-border/60 px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground mr-1"
          onClick={toggle}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>

        <div className="flex items-center gap-2 font-bold md:hidden">
          {!isOpen && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary animate-glow">
                <Hexagon className="h-5 w-5 fill-primary/20" />
              </div>
              <span className="text-lg text-gradient whitespace-nowrap">Insight Compass</span>
            </div>
          )}
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground ml-2">
          <span className="text-foreground">My Workspace</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggleButton />
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            type="button"
            onClick={togglePanel}
          >
            <Bell className="h-5 w-5" />
            <span className="sr-only">Competitive Radar</span>
          </Button>
          {badgeCount > 0 && (
            <span
              className={`absolute -right-0.5 -top-0.5 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full border border-background text-[10px] font-semibold text-background ${badgeColor}`}
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </div>
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
