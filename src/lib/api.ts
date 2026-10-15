import { NextResponse } from "next/server";

/** Standard success envelope: { ok: true, data } */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

/** Standard error envelope: { ok: false, error: { message, details? } } */
export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: { message, details } }, { status });
}

export const unauthorized = (message = "Authentication required") => fail(message, 401);
export const forbidden = (message = "You do not have permission") => fail(message, 403);
export const notFound = (message = "Not found") => fail(message, 404);

/** Throw inside route handlers; caught by withErrorHandling. */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Wrap a route handler to convert thrown ApiError / ZodError / unknown into fail() responses. */
export function withErrorHandling<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<NextResponse>
) {
  return async (...args: TArgs): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) return fail(err.message, err.status, err.details);
      // ZodError (avoid importing zod here to keep it light)
      if (err && typeof err === "object" && "issues" in err) {
        return fail("Validation failed", 422, (err as { issues: unknown }).issues);
      }
      console.error("[api]", err);
      return fail("Internal server error", 500);
    }
  };
}

export function pageParams(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 24) || 24));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
