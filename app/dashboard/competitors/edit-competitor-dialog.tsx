"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCompetitor } from "./actions";
import type { CompetitorRow } from "./competitors-table";
import type { CrawlFrequency } from "@/lib/types/competitor";

export function EditCompetitorDialog({
  competitor,
  open,
  onOpenChange,
}: {
  competitor: CompetitorRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [crawlFrequency, setCrawlFrequency] = useState<CrawlFrequency>("weekly");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (competitor) {
      setName(competitor.name ?? "");
      setUrl(competitor.url ?? "");
      setCrawlFrequency(competitor.crawl_frequency);
      setError(null);
    }
  }, [competitor]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!competitor) return;
    setError(null);
    setPending(true);
    const result = await updateCompetitor(competitor.id, {
      name: name.trim() || null,
      url: url.trim() || undefined,
      crawl_frequency: crawlFrequency,
    });
    setPending(false);
    if (result.ok) {
      onOpenChange(false);
    } else {
      setError(result.error);
    }
  }

  if (!competitor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit competitor</DialogTitle>
          <DialogDescription>
            Update name, URL, or check frequency.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. example.com"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-url">Website URL</Label>
            <Input
              id="edit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-frequency">Check frequency</Label>
            <Select
              value={crawlFrequency}
              onValueChange={(v) => setCrawlFrequency(v as CrawlFrequency)}
              disabled={pending}
            >
              <SelectTrigger id="edit-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
