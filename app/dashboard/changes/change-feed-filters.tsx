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

const PAGE_TYPES = [
  "homepage",
  "pricing",
  "product_or_services",
  "use_cases_or_industries",
  "case_studies_or_customers",
  "cta_elements",
  "navigation",
] as const;

function formatPageTypeLabel(pageType: string): string {
  return pageType
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

interface Competitor {
  id: string;
  name: string | null;
  url: string;
}

export function ChangeFeedFilters({
  competitors,
  currentCompetitorId,
  currentCategory,
  currentFrom,
  currentTo,
}: {
  competitors: Competitor[];
  currentCompetitorId?: string;
  currentCategory?: string;
  currentFrom?: string;
  currentTo?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      router.push(`/dashboard/changes?${next.toString()}`);
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
          value={currentCategory ?? "all"}
          onValueChange={(v) => setFilter("category", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All focus areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All focus areas</SelectItem>
            {PAGE_TYPES.map((pageType) => (
              <SelectItem key={pageType} value={pageType}>
                {formatPageTypeLabel(pageType)}
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
