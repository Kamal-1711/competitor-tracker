"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CollapsibleProps = React.HTMLAttributes<HTMLDetailsElement> & {
  defaultOpen?: boolean;
};

export function Collapsible({ className, defaultOpen = false, ...props }: CollapsibleProps) {
  return <details className={cn("group", className)} open={defaultOpen} {...props} />;
}

export function CollapsibleTrigger({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <summary
      className={cn(
        "cursor-pointer list-none text-sm font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden",
        className
      )}
      {...props}
    >
      {children}
    </summary>
  );
}

export function CollapsibleContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-3", className)} {...props} />;
}
