import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    accentColor: "blue" | "cyan" | "green" | "red";
    pulse?: boolean;
}

export function MetricCard({ title, value, icon: Icon, accentColor, pulse }: MetricCardProps) {
    const accentStyles = {
        blue: "text-blue-500 bg-blue-500/10",
        cyan: "text-cyan-400 bg-cyan-400/10",
        green: "text-emerald-500 bg-emerald-500/10",
        red: "text-rose-500 bg-rose-500/10",
    };

    const cardAccents = {
        blue: "hover:border-blue-500/30",
        cyan: "hover:border-cyan-400/30",
        green: "hover:border-emerald-500/30",
        red: "hover:border-rose-500/30",
    };

    return (
        <Card className={cn(
            "glass-subtle bg-transparent transition-all duration-300 border-border/40 hover:shadow-xl group overflow-hidden relative",
            cardAccents[accentColor],
            pulse && "animate-glow border-rose-500/40"
        )}>
            {/* Subtle background glow */}
            <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity", {
                "bg-blue-500": accentColor === "blue",
                "bg-cyan-500": accentColor === "cyan",
                "bg-emerald-500": accentColor === "green",
                "bg-rose-500": accentColor === "red",
            })} />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground/80 group-hover:text-foreground transition-colors">
                    {title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", accentStyles[accentColor])}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="text-3xl font-black tracking-tight">{value}</div>
            </CardContent>
        </Card>
    );
}
