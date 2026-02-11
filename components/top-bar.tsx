"use client";

import { useEffect, useState } from "react";
import { Bell, User, Hexagon, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <header className="glass-subtle flex h-14 w-full items-center border-b border-border/60 px-4 lg:px-6">
      <div className="flex items-center gap-2 font-bold md:hidden">
        <Hexagon className="h-6 w-6" />
        <span className="text-lg">Competitor Tracker</span>
      </div>
      <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="text-muted-foreground/70">Workspace</span>
        <span className="text-foreground">My Workspace</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggleButton />
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
