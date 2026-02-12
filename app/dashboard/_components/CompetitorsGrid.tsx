import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Check, X, ArrowUpRight } from "lucide-react";

interface Competitor {
    id: string;
    name: string;
    url: string;
    last_crawled_at: string | null;
    crawl_frequency: string;
    stats: {
        pricing: boolean;
        services: boolean;
        seo: boolean;
    };
}

interface CompetitorsGridProps {
    competitors: Competitor[];
}

function timeAgo(dateString: string | null) {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function CompetitorsGrid({ competitors }: CompetitorsGridProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Competitors Overview</h2>
                <Link href="/dashboard/competitors" className="text-sm text-primary hover:underline flex items-center transition-colors hover:text-primary/80">
                    View All <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {competitors.map((comp) => (
                    <Link href={`/dashboard/competitors/${comp.id}`} key={comp.id} className="group block h-full">
                        <Card className="glass-subtle border border-border/60 hover:bg-white/5 transition-all duration-300 relative overflow-hidden h-full flex flex-col hover:border-border/80 hover:shadow-sm">
                            <div className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <ArrowUpRight className="h-3 w-3 text-muted-foreground/70" />
                            </div>
                            <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-foreground truncate max-w-[85%]" title={comp.name}>{comp.name}</h3>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate mb-5 opacity-70 group-hover:opacity-100 transition-opacity">
                                        {new URL(comp.url).hostname}
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                        <span>Last analyzed</span>
                                        <span className="font-medium text-foreground">{timeAgo(comp.last_crawled_at)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Status</span>
                                        <Badge variant={comp.crawl_frequency !== 'paused' ? "outline" : "secondary"} className="h-5 px-2 text-[9px] uppercase font-bold tracking-wider border-border/40">
                                            {comp.crawl_frequency || "Active"}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="border-t border-border/40 pt-3 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                                    <div className="flex flex-col items-center gap-1.5 group/stat">
                                        <span className="group-hover/stat:text-foreground transition-colors font-medium">Pricing</span>
                                        {comp.stats.pricing ? <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />}
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 group/stat">
                                        <span className="group-hover/stat:text-foreground transition-colors font-medium">Services</span>
                                        {comp.stats.services ? <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />}
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 group/stat">
                                        <span className="group-hover/stat:text-foreground transition-colors font-medium">SEO</span>
                                        {comp.stats.seo ? <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
