"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const FOCUS_OPTIONS = [
  { value: "messaging", label: "Messaging" },
  { value: "pricing", label: "Pricing" },
  { value: "services", label: "Services" },
  { value: "seo", label: "SEO" },
  { value: "structural", label: "Structural" },
] as const;

interface Competitor {
  id: string;
  name: string | null;
  url: string;
}

export function ChangeFeedFilters({
  competitors,
  currentCompetitorId,
  currentFocus,
  currentFrom,
  currentTo,
}: {
  competitors: Competitor[];
  currentCompetitorId?: string;
  currentFocus?: string;
  currentFrom?: string;
  currentTo?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setFilter = useCallback(
    (key: string, value: string | undefined | null) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      if (value && value !== "all") {
        current.set(key, value);
      } else {
        current.delete(key);
      }

      current.delete("page");
      const search = current.toString();
      const query = search ? `?${search}` : "";

      router.push(`/dashboard/changes${query}`);
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push("/dashboard/changes");
  }, [router]);

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="space-y-2">
        <Label className="text-xs">Competitor</Label>
        <Select
          value={currentCompetitorId ?? "all"}
          onValueChange={(v) => setFilter("competitor", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All competitors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All competitors</SelectItem>
            {competitors.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name || c.url}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Focus area</Label>
        <Select
          value={currentFocus ?? "all"}
          onValueChange={(v) => setFilter("focus", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All focus areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All focus areas</SelectItem>
            {FOCUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">From date</Label>
        <Input
          type="date"
          className="w-[160px]"
          value={currentFrom ?? ""}
          onChange={(e) => setFilter("from", e.target.value || undefined)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">To date</Label>
        <Input
          type="date"
          className="w-[160px]"
          value={currentTo ?? ""}
          onChange={(e) => setFilter("to", e.target.value || undefined)}
        />
      </div>
      <Button variant="outline" size="sm" onClick={clearFilters}>
        Clear filters
      </Button>
    </div>
  );
}
