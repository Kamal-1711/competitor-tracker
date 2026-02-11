import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WhatToWatchSection({ items }: { items: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">What to Watch Next</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

