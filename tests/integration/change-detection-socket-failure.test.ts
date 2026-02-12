/**
 * Integration test: Verify persisted changes still succeed when socket emit throws.
 * This ensures socket failures don't break change detection persistence.
 *
 * Note: These tests verify that socket failures are handled gracefully.
 * For full end-to-end testing, run against a real database.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { compareSnapshots } from "@/lib/change-detection/compareSnapshots";

// Mock socket events to simulate failures
vi.mock("@/lib/realtime/socketEvents", async () => {
  const actual = await vi.importActual("@/lib/realtime/socketEvents");
  return {
    ...actual,
    emitHighImpactChange: vi.fn(),
  };
});

// Mock persistChanges to return success
vi.mock("@/lib/change-detection/persistChanges", async () => {
  const actual = await vi.importActual("@/lib/change-detection/persistChanges");
  return {
    ...actual,
    persistChanges: vi.fn().mockResolvedValue({
      changeIds: ["change-1", "change-2"],
    }),
  };
});

// Mock detectChanges to return some changes
vi.mock("@/lib/change-detection/detectChanges", async () => {
  return {
    detectChanges: vi.fn().mockReturnValue([
      {
        changeType: "text_change",
        summary: "Text content changed",
        category: "Positioning & Messaging",
      },
      {
        changeType: "element_added",
        summary: "New element added",
        category: "Product / Services",
      },
    ]),
  };
});

// Mock detectPmSignalChanges
vi.mock("@/lib/change-detection/detectPmSignalChanges", async () => {
  return {
    detectPmSignalChanges: vi.fn().mockReturnValue([]),
  };
});

// Mock generateInsights and persistInsights
vi.mock("@/lib/insights/generateInsights", async () => {
  return {
    generateInsights: vi.fn().mockReturnValue([]),
  };
});

vi.mock("@/lib/insights/persistInsights", async () => {
  return {
    persistInsights: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Change detection - socket emit failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should persist changes successfully when socket emit throws", async () => {
    const { emitHighImpactChange } = await import("@/lib/realtime/socketEvents");
    const { persistChanges } = await import("@/lib/change-detection/persistChanges");
    
    // Simulate socket emit throwing an error
    vi.mocked(emitHighImpactChange).mockRejectedValue(
      new Error("Socket connection failed")
    );

    const input = {
      competitorId: "test-competitor-id",
      pageId: "test-page-id",
      pageUrl: "https://example.com/page",
      pageType: "homepage" as const,
      beforeSnapshotId: "before-snapshot-id",
      beforeHtml: "<html><body>Old content</body></html>",
      afterSnapshotId: "after-snapshot-id",
      afterHtml: "<html><body>New content</body></html>",
      persist: true,
    };

    const result = await compareSnapshots(input);

    // Verify changes were persisted despite socket failure
    expect(persistChanges).toHaveBeenCalledWith({
      competitorId: input.competitorId,
      pageId: input.pageId,
      beforeSnapshotId: input.beforeSnapshotId,
      afterSnapshotId: input.afterSnapshotId,
      pageUrl: input.pageUrl,
      pageType: input.pageType,
      changes: expect.any(Array),
    });

    // Verify result includes persisted change IDs
    expect(result.persistedChangeIds).toEqual(["change-1", "change-2"]);
    expect(result.diffs).toHaveLength(2);

    // Verify socket emit was attempted (but failed)
    expect(emitHighImpactChange).toHaveBeenCalled();
  });

  test("should persist changes successfully when socket emit returns null (no socket server)", async () => {
    const { emitHighImpactChange } = await import("@/lib/realtime/socketEvents");
    
    // Simulate socket server not available (getSocketServer returns null)
    vi.mocked(emitHighImpactChange).mockResolvedValue(undefined);

    const input = {
      competitorId: "test-competitor-id",
      pageId: "test-page-id",
      pageUrl: "https://example.com/page",
      pageType: "homepage" as const,
      beforeSnapshotId: "before-snapshot-id",
      beforeHtml: "<html><body>Old content</body></html>",
      afterSnapshotId: "after-snapshot-id",
      afterHtml: "<html><body>New content</body></html>",
      persist: true,
    };

    const result = await compareSnapshots(input);

    // Verify changes were persisted
    expect(result.persistedChangeIds).toEqual(["change-1", "change-2"]);
    expect(result.diffs).toHaveLength(2);
  });

  test("should not throw when socket emit fails after successful persistence", async () => {
    const { emitHighImpactChange } = await import("@/lib/realtime/socketEvents");
    
    // Simulate socket emit throwing after persistChanges succeeds
    vi.mocked(emitHighImpactChange).mockRejectedValue(
      new Error("Socket emit failed")
    );

    const input = {
      competitorId: "test-competitor-id",
      pageId: "test-page-id",
      pageUrl: "https://example.com/page",
      pageType: "homepage" as const,
      beforeSnapshotId: "before-snapshot-id",
      beforeHtml: "<html><body>Old content</body></html>",
      afterSnapshotId: "after-snapshot-id",
      afterHtml: "<html><body>New content</body></html>",
      persist: true,
    };

    // Should not throw
    const result = await compareSnapshots(input);

    // Verify result is valid
    expect(result).toBeDefined();
    expect(result.persistedChangeIds).toEqual(["change-1", "change-2"]);
  });

  test("should handle empty changes array without calling socket emit", async () => {
    const { emitHighImpactChange } = await import("@/lib/realtime/socketEvents");
    const { detectChanges } = await import("@/lib/change-detection/detectChanges");
    
    // Mock detectChanges to return empty array
    vi.mocked(detectChanges).mockReturnValue([]);

    const input = {
      competitorId: "test-competitor-id",
      pageId: "test-page-id",
      pageUrl: "https://example.com/page",
      pageType: "homepage" as const,
      beforeSnapshotId: "before-snapshot-id",
      beforeHtml: "<html><body>Same content</body></html>",
      afterSnapshotId: "after-snapshot-id",
      afterHtml: "<html><body>Same content</body></html>",
      persist: true,
    };

    const result = await compareSnapshots(input);

    // Verify no changes detected
    expect(result.diffs).toHaveLength(0);
    expect(result.persistedChangeIds).toHaveLength(0);

    // Socket emit should not be called when there are no changes
    expect(emitHighImpactChange).not.toHaveBeenCalled();
  });
});
