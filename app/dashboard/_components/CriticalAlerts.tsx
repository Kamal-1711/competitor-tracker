import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Alert {
    id: string;
    competitor_id: string;
    summary: string;
    created_at: string;
}

interface CriticalAlertsProps {
    alerts: Alert[];
    competitorsMap: Map<string, any>;
}

export function CriticalAlerts({ alerts, competitorsMap }: CriticalAlertsProps) {
    if (!alerts || alerts.length === 0) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Critical Alerts</h2>
                <Card className="glass-subtle border border-border/60">
                    <CardContent className="py-6 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500/50" />
                        No critical movements detected.
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                Critical Alerts
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-red-500">
                    {alerts.length}
                </span>
            </h2>
            <Card className="glass-subtle border border-red-500/20 bg-red-500/5">
                <div className="divide-y divide-red-500/10">
                    {alerts.map((alert) => {
                        const comp = competitorsMap.get(alert.competitor_id);
                        const compName = comp?.name || "Unknown";
                        return (
                            <div key={alert.id} className="flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-foreground text-sm">{compName}</div>
                                        <div className="text-sm text-muted-foreground/90">{alert.summary}</div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" asChild className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                                    <Link href={`/dashboard/changes?id=${alert.id}`}>
                                        View <ArrowRight className="ml-1 h-3 w-3" />
                                    </Link>
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
