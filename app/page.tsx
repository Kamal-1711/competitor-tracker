import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-extrabold tracking-tight text-gradient">Insight Compass</h1>
      <p className="text-center text-muted-foreground max-w-lg text-lg leading-relaxed">
        Navigate your competitive landscape with AI-driven precision. Monitor strategic shifts, pricing evolution, and market movements in real-time.
      </p>
      <div className="flex gap-4">
        <Link
          href="/dashboard/competitors"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Competitors
        </Link>
        <Link
          href="/dashboard/changes"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Competitive Intelligence
        </Link>
      </div>
    </main>
  );
}
