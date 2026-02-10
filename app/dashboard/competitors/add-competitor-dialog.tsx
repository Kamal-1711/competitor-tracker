"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import type { CrawlFrequency } from "@/lib/types/competitor";

type AddCompetitorResult = { ok: true } | { ok: false; error: string };
type AddCompetitorFn = (formData: FormData) => Promise<AddCompetitorResult>;

export function AddCompetitorDialog({ addCompetitor }: { addCompetitor: AddCompetitorFn }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [crawlFrequency, setCrawlFrequency] = useState<CrawlFrequency>("weekly");

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(false);
      setCrawlFrequency("weekly");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("crawl_frequency", crawlFrequency);
    const result = await addCompetitor(formData);
    setPending(false);
    if (result.ok) {
      setSuccess(true);
      form.reset();
      const t = setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 1500);
      return () => clearTimeout(t);
    }
    setError(result.error);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add competitor</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add competitor</DialogTitle>
          <DialogDescription>
            Enter the competitor website URL. Name is auto-generated from the domain. No checks are started yet.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Competitor added successfully.</p>
            <p className="text-xs text-muted-foreground">Closing…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-url">Website URL</Label>
              <Input
                id="add-url"
                name="url"
                type="url"
                placeholder="https://example.com"
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-frequency">Check frequency</Label>
              <Select
                value={crawlFrequency}
                onValueChange={(v) => setCrawlFrequency(v as CrawlFrequency)}
                disabled={pending}
              >
                <SelectTrigger id="add-frequency">
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Adding…" : "Add competitor"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
