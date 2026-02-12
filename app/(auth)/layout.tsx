import Link from "next/link";
import { Suspense } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/" className="font-semibold">
            Insight Compass
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <Suspense fallback={<div className="animate-pulse rounded-lg bg-muted h-64 w-96" />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
