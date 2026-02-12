import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Linkedin, Twitter, Youtube, ArrowRight } from "lucide-react";
import Link from "next/link";
import { type CompetitorSocialImpact } from "@/lib/social-intelligence/mock-generator";

interface CompetitorSocialCardProps {
    name: string;
    competitorId: string;
    impact: CompetitorSocialImpact;
}

export function CompetitorSocialCard({ name, competitorId, impact }: CompetitorSocialCardProps) {
    const isRising = impact.overallMomentum === "Rising";

    return (
        <Card className="group relative overflow-hidden transition-all hover:shadow-lg dark:hover:shadow-primary/5 border-border/50 hover:border-primary/50">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{name}</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            Social Pulse:
                            <span className={isRising ? "text-emerald-500" : "text-amber-500"}>
                                {impact.momentumValue}%
                            </span>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={isRising
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }
                    >
                        {isRising ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {impact.overallMomentum}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2 italic">
                    "{impact.marketSummary}"
                </p>

                <div className="flex items-center gap-3 pt-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-[10px] font-medium">
                        <Linkedin className="h-3 w-3 text-blue-600" />
                        {impact.platformMetrics.linkedin.postVolume} posts/mo
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-[10px] font-medium">
                        <Twitter className="h-3 w-3 text-foreground" />
                        {impact.platformMetrics.twitter.postVolume} posts/mo
                    </div>
                </div>

                <Button asChild variant="ghost" className="w-full mt-2 group/btn">
                    <Link href={`/dashboard/social-intelligence/${competitorId}`}>
                        View Signal Details
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

import { Button } from "@/components/ui/button";
