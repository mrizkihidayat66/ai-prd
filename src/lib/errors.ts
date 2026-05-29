/**
 * Global error handling utilities.
 * Provides structured error responses and unhandled rejection tracking.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id "${id}" not found` : `${resource} not found`,
      404,
      "NOT_FOUND"
    );
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super("Too many requests. Please try again later.", 429, "RATE_LIMITED");
    this.name = "RateLimitError";
    if (retryAfter) {
      this.message += ` Retry after ${Math.ceil(retryAfter / 1000)}s.`;
    }
  }
}

export class LLMError extends AppError {
  constructor(message: string, public provider?: string) {
    super(message, 502, "LLM_ERROR");
    this.name = "LLMError";
  }
}

/**
 * Convert any error into a structured API response.
 */
export function handleApiError(error: unknown, routeName?: string): NextResponse {
  // Log with route context
  const prefix = routeName ? `[${routeName}]` : "[API]";

  if (error instanceof AppError) {
    console.error(`${prefix} ${error.name}: ${error.message}`);
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.details
          ? { details: error.details }
          : {}),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    console.error(`${prefix} ValidationError:`, error.issues[0]?.message);
    return NextResponse.json(
      {
        error: error.issues[0]?.message || "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.issues,
      },
      { status: 400 }
    );
  }

  // Unknown errors — don't leak internals
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`${prefix} Unhandled error:`, message);

  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
