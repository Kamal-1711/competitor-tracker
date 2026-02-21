import { NextRequest, NextResponse } from "next/server";
import { runServerlessCrawl } from "@/lib/serverless-crawl";

export const maxDuration = 300; // 5 minutes max for crawl
export const dynamic = "force-dynamic";

interface CrawlRequestBody {
  jobId: string;
  competitorId: string;
  competitorUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CrawlRequestBody = (await request.json().catch(() => ({}))) as CrawlRequestBody;

    if (!body.jobId || !body.competitorId || !body.competitorUrl) {
      return NextResponse.json(
        { error: "jobId, competitorId, and competitorUrl are required" },
        { status: 400 }
      );
    }

    const result = await runServerlessCrawl({
      jobId: body.jobId,
      competitorId: body.competitorId,
      competitorUrl: body.competitorUrl,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    console.error("[api/crawl] Unhandled error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
