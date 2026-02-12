import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, Clock, Globe } from "lucide-react";

interface MovementSummaryBarProps {
    total7Days: number;
    highImpact: number;
    mediumImpact: number;
    lowImpact: number;
    mostActiveCompetitor: string;
}

export function MovementSummaryBar({
    total7Days,
    highImpact,
    mediumImpact,
    lowImpact,
    mostActiveCompetitor,
}: MovementSummaryBarProps) {
    return (
        <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-muted/50 border-none shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Movements</p>
                            <p className="text-2xl font-bold">{total7Days}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-muted/50 border-none shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Impact Distribution</p>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center">
                                    <span className="text-sm font-bold text-red-500">{highImpact}</span>
                                    <span className="text-[10px] text-muted-foreground">High</span>
                                </div>
                                <div className="w-px h-6 bg-border" />
                                <div className="flex flex-col items-center">
                                    <span className="text-sm font-bold text-yellow-500">{mediumImpact}</span>
                                    <span className="text-[10px] text-muted-foreground">Med</span>
                                </div>
                                <div className="w-px h-6 bg-border" />
                                <div className="flex flex-col items-center">
                                    <span className="text-sm font-bold text-gray-400">{lowImpact}</span>
                                    <span className="text-[10px] text-muted-foreground">Low</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-muted/50 border-none shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Globe className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">Most Active</p>
                            <p className="text-sm font-bold truncate">{mostActiveCompetitor || "N/A"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-muted/50 border-none shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Clock className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last 7 Days</p>
                            <p className="text-sm font-bold">Analysis Active</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
