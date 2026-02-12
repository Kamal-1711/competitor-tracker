import { NextRequest, NextResponse } from "next/server";
import { crawlCompetitor } from "@/crawler/crawlCompetitor";
import { initializeSocketServer } from "@/lib/realtime/socketServer";

export const maxDuration = 300; // 5 minutes max for crawl
export const dynamic = "force-dynamic";

interface CrawlRequestBody {
  jobId: string;
  competitorId: string;
  competitorUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    try {
      initializeSocketServer();
    } catch (error) {
      console.error("[api/crawl] Socket server init failed", error);
    }

    const body: CrawlRequestBody = await request.json();

    if (!body.jobId || !body.competitorId || !body.competitorUrl) {
      return NextResponse.json(
        { error: "jobId, competitorId, and competitorUrl are required" },
        { status: 400 }
      );
    }

    console.log(
      `[api/crawl] Starting crawl for competitor ${body.competitorId} (${body.competitorUrl}), job ${body.jobId}`
    );

    const result = await crawlCompetitor({
      competitorId: body.competitorId,
      competitorUrl: body.competitorUrl,
      existingCrawlJobId: body.jobId,
      headless: true,
    });

    console.log(
      `[api/crawl] Crawl finished: status=${result.status}, pages=${result.pages.length}, errors=${result.errors.length}`
    );

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      pages: result.pages.length,
      errors: result.errors,
      competitorId: result.competitorId,
      crawlJobId: result.crawlJobId,
    });
  } catch (error) {
    console.error("[api/crawl] Unhandled error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
