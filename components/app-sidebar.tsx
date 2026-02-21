"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Activity, CreditCard, Settings, Lightbulb, FileText, Hexagon, X, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./sidebar-context";

const sidebarLinks = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Competitors",
    href: "/dashboard/competitors",
    icon: Users,
  },
  {
    title: "Insights",
    href: "/insights",
    icon: Lightbulb,
  },
  {
    title: "Change Feed",
    href: "/dashboard/changes",
    icon: Activity,
  },
  {
    title: "AI Social Intelligence",
    href: "/dashboard/social-intelligence",
    icon: Brain,
  },
  {
    title: "Pricing",
    href: "/dashboard/pricing",
    icon: CreditCard,
  },
  {
    title: "Blog Intelligence",
    href: "/dashboard/blogs",
    icon: FileText,
  },
  {
    title: "Settings",
    href: "/dashboard/my-test-settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col glass-panel bg-transparent border-r border-border/60 text-card-foreground transition-all duration-300 ease-in-out md:static",
          isOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:pointer-events-none"
        )}
      >
        <div className={cn(
          "flex h-14 items-center justify-between border-b border-border/40 px-6 transition-all duration-300 overflow-hidden",
          !isOpen && "px-0 opacity-0"
        )}>
          <Link href="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-[1.02]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary animate-glow shrink-0">
              <Hexagon className="h-5 w-5 fill-primary/20" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-gradient whitespace-nowrap">
              Insight Compass
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 text-muted-foreground shrink-0"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-x-hidden py-4">
          <nav className="grid gap-1 px-2">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Button
                  key={link.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "justify-start gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-300 overflow-hidden whitespace-nowrap",
                    "hover:bg-white/5 hover:text-foreground",
                    isActive &&
                    "font-medium bg-white/5 text-sky-600 dark:text-sky-400 border border-border/70",
                    !isOpen && "px-0 border-transparent bg-transparent"
                  )}
                  asChild
                >
                  <Link
                    href={link.href}
                    title={link.title}
                    onClick={() => console.log(`[DEBUG-CLICK] Navigating to: ${link.href}`)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className={cn(
                      "transition-opacity duration-200",
                      isOpen ? "opacity-100" : "opacity-0"
                    )}>
                      {link.title}
                    </span>
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
