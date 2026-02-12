import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentActivityProps {
    activities: any[];
    competitorsMap: Map<string, any>;
}

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

export function RecentActivity({ activities, competitorsMap }: RecentActivityProps) {
    if (!activities || activities.length === 0) {
        return (
            <Card className="glass-subtle border border-border/60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Activity className="h-10 w-10 text-muted-foreground/30" />
                    <p>No activity yet. Scan your competitors to see updates.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass-subtle border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
                <CardTitle className="text-md font-semibold">Recent Competitive Activity</CardTitle>
                <Link href="/dashboard/changes" className="text-sm text-primary hover:underline flex items-center">
                    View All <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
            </CardHeader>
            <div className="divide-y divide-border/40">
                {activities.map((movement) => {
                    const comp = competitorsMap.get(movement.competitor_id);
                    const compName = comp?.name ?? comp?.url ?? "Unknown Competitor";

                    const impactColors = {
                        HIGH: "bg-red-500/10 text-red-500 border-red-500/20",
                        MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                        LOW: "bg-gray-500/10 text-gray-400 border-gray-500/20",
                    };

                    return (
                        <div key={movement.id} className="grid grid-cols-12 gap-4 p-4 text-sm items-center hover:bg-muted/5 transition-colors group">
                            <div className="col-span-12 sm:col-span-3 font-medium text-foreground truncate flex items-center gap-2">
                                <span className="truncate" title={compName}>{compName}</span>
                            </div>
                            <div className="col-span-12 sm:col-span-2 flex items-center gap-2">
                                <Badge variant="outline" className={cn(
                                    "text-[10px] font-bold border px-1.5 h-4 uppercase tracking-tighter",
                                    impactColors[movement.impact_level as keyof typeof impactColors] || impactColors.LOW
                                )}>
                                    {movement.impact_level}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground hidden lg:inline">
                                    {movement.movement_category}
                                </span>
                            </div>
                            <div className="col-span-12 sm:col-span-5 text-muted-foreground truncate" title={movement.summary}>
                                {movement.summary || "New movement detected"}
                            </div>
                            <div className="col-span-12 sm:col-span-2 text-right text-xs text-muted-foreground flex items-center justify-end gap-1">
                                <Clock className="h-3 w-3 inline" />
                                {timeAgo(movement.created_at)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
