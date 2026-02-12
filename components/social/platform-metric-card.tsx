import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MessageSquare, ThumbsUp, Activity } from "lucide-react";
import { type PlatformMetrics } from "@/lib/social-intelligence/mock-generator";
import { cn } from "@/lib/utils";

interface PlatformMetricCardProps {
    platform: string;
    icon: React.ReactNode;
    metrics: PlatformMetrics;
    colorClass: string;
}

export function PlatformMetricCard({ platform, icon, metrics, colorClass }: PlatformMetricCardProps) {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg bg-opacity-10", colorClass.replace("text-", "bg-"))}>
                            {icon}
                        </div>
                        <CardTitle className="text-sm font-medium">{platform}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                        {metrics.sentiment} Sentiment
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 py-3">
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Volume</p>
                    <div className="flex items-center gap-1 font-semibold text-xs">
                        {metrics.postVolume}
                        <Activity className="h-3 w-3 text-emerald-500" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Rate</p>
                    <div className="flex items-center gap-1 font-semibold text-xs">
                        {metrics.engagementRate}
                        <ThumbsUp className="h-3 w-3 text-blue-500" />
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Theme</p>
                    <p className="font-semibold text-[10px] truncate">{metrics.topTheme}</p>
                </div>
            </CardContent>
            <div className="px-6 py-2 bg-muted/30 border-t border-border/50">
                <div className="flex items-center gap-2 text-[10px] font-medium">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="text-muted-foreground">Momentum: </span>
                    <span className="text-emerald-600 dark:text-emerald-400">Rising</span>
                </div>
            </div>
        </Card>
    );
}
