import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InsightCard({
  competitorName,
  statusLabel,
  observations,
  recentInsight,
  href,
}: {
  competitorName: string;
  statusLabel: string;
  observations: string[];
  recentInsight: string;
  href: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card className="glass-subtle bg-transparent h-full transition-all duration-300 hover:scale-[1.01] hover:border-primary/30 group">
        <CardHeader className="pb-2">
          <CardTitle className="text-base group-hover:text-primary transition-colors">{competitorName}</CardTitle>
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">{statusLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="bg-white/20 dark:bg-black/20 p-3 rounded-lg border border-border/40 backdrop-blur-sm">
            <p className="text-[11px] uppercase font-bold text-foreground/60 leading-none mb-3">Key Observations</p>
            <ul className="space-y-1.5 text-muted-foreground text-[13px]">
              {observations.length > 0 ? (
                observations.map((observation) => (
                  <li key={observation} className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary/60" />
                    {observation}
                  </li>
                ))
              ) : (
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary/60" />
                  Pages are actively monitored
                </li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-[11px] uppercase font-bold text-foreground/60 leading-none mb-2">Recent Insight</p>
            <p className="text-muted-foreground italic text-[13px] leading-relaxed line-clamp-2">“{recentInsight}”</p>
          </div>
          <div className="text-[11px] font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            View Intelligence Analysis <span className="text-lg">→</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
