"use client";

import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { triggerCrawlNow } from "../competitors/actions";

interface CrawlButtonProps {
  competitors: Array<{
    id: string;
    name: string | null;
    url: string;
  }>;
}

export function CrawlButton({ competitors }: CrawlButtonProps) {
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>("");
  const [isCrawling, setIsCrawling] = useState(false);

  const handleCrawl = async () => {
    if (!selectedCompetitorId) {
      alert("Please select a competitor first.");
      return;
    }

    setIsCrawling(true);
    try {
      const result = await triggerCrawlNow(selectedCompetitorId);
      if (result.ok) {
        alert(`Competitor update check started (Job ID: ${result.jobId}).`);
        setSelectedCompetitorId("");
      } else {
        alert(`Unable to start competitor update check: ${result.error}`);
      }
    } catch (error) {
      alert("Unable to start competitor update check.");
      console.error(error);
    } finally {
      setIsCrawling(false);
    }
  };

  if (competitors.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId} disabled={isCrawling}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select competitor" />
        </SelectTrigger>
        <SelectContent>
          {competitors.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name || c.url}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleCrawl} disabled={isCrawling || !selectedCompetitorId}>
        {isCrawling ? "Running check..." : "Check for competitor updates"}
      </Button>
    </div>
  );
}
