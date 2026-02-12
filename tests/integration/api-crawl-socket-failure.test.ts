/**
 * Integration test: Verify crawl API still returns expected JSON if socket server is down.
 * This ensures socket failures don't break core crawl functionality.
 *
 * Note: These tests verify that socket failures are handled gracefully.
 * For full end-to-end testing, run against a real API server.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/crawl/route";
import { NextRequest } from "next/server";

// Mock the socket server module to simulate failures
vi.mock("@/lib/realtime/socketServer", async () => {
  const actual = await vi.importActual("@/lib/realtime/socketServer");
  return {
    ...actual,
    initializeSocketServer: vi.fn(),
  };
});

// Mock crawlCompetitor to return a successful result without actually crawling
vi.mock("@/crawler/crawlCompetitor", async () => {
  const actual = await vi.importActual("@/crawler/crawlCompetitor");
  return {
    ...actual,
    crawlCompetitor: vi.fn().mockResolvedValue({
      ok: true,
      competitorId: "test-competitor-id",
      competitorUrl: "https://example.com",
      crawlJobId: "test-job-id",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      status: "completed" as const,
      pages: [],
      errors: [],
    }),
  };
});

describe("API crawl route - socket server failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return expected JSON response when socket server initialization fails", async () => {
    const { initializeSocketServer } = await import("@/lib/realtime/socketServer");
    
    // Simulate socket server initialization failure
    vi.mocked(initializeSocketServer).mockImplementation(() => {
      throw new Error("Socket server port already in use");
    });

    const requestBody = {
      jobId: "test-job-id",
      competitorId: "test-competitor-id",
      competitorUrl: "https://example.com",
    };

    const request = new NextRequest("http://localhost:3000/api/crawl", {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const json = await response.json();

    // Verify response structure matches expected format
    expect(response.status).toBe(200);
    expect(json).toHaveProperty("ok", true);
    expect(json).toHaveProperty("status", "completed");
    expect(json).toHaveProperty("competitorId", "test-competitor-id");
    expect(json).toHaveProperty("crawlJobId", "test-job-id");
    expect(json).toHaveProperty("pages", 0);
    expect(json).toHaveProperty("errors");
    expect(Array.isArray(json.errors)).toBe(true);
  });

  test("should return expected JSON response when socket server returns null", async () => {
    const { initializeSocketServer } = await import("@/lib/realtime/socketServer");
    
    // Simulate socket server returning null (initialization failed gracefully)
    vi.mocked(initializeSocketServer).mockReturnValue(null);

    const requestBody = {
      jobId: "test-job-id",
      competitorId: "test-competitor-id",
      competitorUrl: "https://example.com",
    };

    const request = new NextRequest("http://localhost:3000/api/crawl", {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const json = await response.json();

    // Verify response structure matches expected format
    expect(response.status).toBe(200);
    expect(json).toHaveProperty("ok", true);
    expect(json).toHaveProperty("status", "completed");
    expect(json).toHaveProperty("competitorId", "test-competitor-id");
    expect(json).toHaveProperty("crawlJobId", "test-job-id");
  });

  test("should handle socket initialization error without crashing", async () => {
    const { initializeSocketServer } = await import("@/lib/realtime/socketServer");
    
    // Simulate socket server throwing an error
    vi.mocked(initializeSocketServer).mockImplementation(() => {
      const error = new Error("Network error");
      console.error("[api/crawl] Socket server init failed", error);
      return null;
    });

    const requestBody = {
      jobId: "test-job-id",
      competitorId: "test-competitor-id",
      competitorUrl: "https://example.com",
    };

    const request = new NextRequest("http://localhost:3000/api/crawl", {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Should not throw
    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
  });
});
