import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WatchlistItem = {
  area: string;
  rationale: string;
};

type StrategicWatchlistSectionProps = {
  items: WatchlistItem[];
};

export function StrategicWatchlistSection({ items }: StrategicWatchlistSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Strategic Watchlist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>The following areas are under active monitoring due to high strategic impact:</p>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={`${item.area}-${item.rationale}`}>
              • {item.area} - {item.rationale}
            </li>
          ))}
        </ul>
        <p>You will be notified if changes occur in these areas.</p>
      </CardContent>
    </Card>
  );
}
