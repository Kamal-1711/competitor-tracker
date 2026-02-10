/**
 * Standardized error handling for crawl jobs
 * Maps different error types to user-friendly messages
 */

export class CrawlError extends Error {
  constructor(
    public code: string,
    message: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = "CrawlError";
  }
}

export enum CrawlErrorCode {
  INVALID_URL = "INVALID_URL",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  SCREENSHOT_FAILED = "SCREENSHOT_FAILED",
  HTML_PARSE_ERROR = "HTML_PARSE_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  UNKNOWN = "UNKNOWN",
}

/**
 * Convert any error to a structured CrawlError
 */
export function toCrawlError(error: unknown): CrawlError {
  if (error instanceof CrawlError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message;

    // Network errors are retryable
    if (message.includes("ENOTFOUND") || message.includes("ECONNREFUSED")) {
      return new CrawlError(CrawlErrorCode.NETWORK_ERROR, `Network error: ${message}`, true);
    }

    // Timeout errors are retryable
    if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
      return new CrawlError(CrawlErrorCode.TIMEOUT, "Crawl timed out. Please retry.", true);
    }

    // Screenshot errors
    if (message.includes("screenshot")) {
      return new CrawlError(
        CrawlErrorCode.SCREENSHOT_FAILED,
        `Failed to capture screenshot: ${message}`,
        true
      );
    }

    // Storage errors
    if (message.includes("storage") || message.includes("S3") || message.includes("bucket")) {
      return new CrawlError(
        CrawlErrorCode.STORAGE_ERROR,
        `Storage error: ${message}`,
        true
      );
    }

    // Database errors
    if (message.includes("database") || message.includes("PGSQL")) {
      return new CrawlError(
        CrawlErrorCode.DATABASE_ERROR,
        `Database error: ${message}`,
        false
      );
    }

    return new CrawlError(CrawlErrorCode.UNKNOWN, message, false);
  }

  return new CrawlError(
    CrawlErrorCode.UNKNOWN,
    String(error),
    false
  );
}

/**
 * Get user-friendly error message for UI display
 */
export function getErrorMessage(error: unknown): string {
  const crawlError = toCrawlError(error);

  const messages: Record<string, string> = {
    [CrawlErrorCode.INVALID_URL]: "Invalid competitor URL",
    [CrawlErrorCode.NETWORK_ERROR]: "Network connection failed. Please try again.",
    [CrawlErrorCode.TIMEOUT]: "Crawl took too long. Please try again.",
    [CrawlErrorCode.SCREENSHOT_FAILED]: "Failed to capture screenshot",
    [CrawlErrorCode.HTML_PARSE_ERROR]: "Failed to parse page content",
    [CrawlErrorCode.STORAGE_ERROR]: "Failed to store snapshot",
    [CrawlErrorCode.DATABASE_ERROR]: "Database error occurred",
    [CrawlErrorCode.UNKNOWN]: "An unexpected error occurred",
  };

  return messages[crawlError.code] || crawlError.message;
}
