"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ChangeFeedPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  hasPrevPage,
  hasNextPage,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(nextPage));
    router.push(`/dashboard/changes?${next.toString()}`);
  }

  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-4 border-t pt-4"
      aria-label="Change feed pagination"
    >
      <p className="text-sm text-muted-foreground">
        {totalCount === 0 ? (
          "No results"
        ) : (
          <>
            Showing <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> of{" "}
            <span className="font-medium">{totalCount}</span>
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page - 1)}
          disabled={!hasPrevPage}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page + 1)}
          disabled={!hasNextPage}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
