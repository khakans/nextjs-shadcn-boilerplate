import { randomUUID } from "node:crypto";

import { ApiError, apiError } from "@/lib/api-response";
import { runWithAuditRequestContext } from "@/lib/audit-trail";
import { logger } from "@/lib/logger";

type RouteHandler<TArgs extends unknown[] = unknown[]> = (
  request: Request,
  ...args: TArgs
) => Response | Promise<Response>;

type ApiMiddlewareOptions = {
  onApiError?: (
    error: ApiError,
    request: Request,
  ) => Response | undefined | Promise<Response | undefined>;
};

export function withApiMiddleware<TArgs extends unknown[]>(
  handler: RouteHandler<TArgs>,
  options: ApiMiddlewareOptions = {},
) {
  return async function apiMiddleware(request: Request, ...args: TArgs) {
    const requestId = randomUUID();
    const startedAt = performance.now();

    return runWithAuditRequestContext(
      {
        request,
        requestId,
      },
      async () => {
        try {
          const response = await handler(request, ...args);
          setRequestIdHeader(response, requestId);
          logRequest("info", request, response.status, startedAt, requestId);

          return response;
        } catch (error) {
          if (isNextControlFlowError(error)) {
            throw error;
          }

          if (error instanceof ApiError) {
            const response =
              (await options.onApiError?.(error, request)) ??
              apiError(error.message, error.status);
            const level = error.status >= 500 ? "error" : "warn";

            setRequestIdHeader(response, requestId);
            logRequest(level, request, response.status, startedAt, requestId, {
              error,
              errorStatus: error.status,
            });

            return response;
          }

          logger.error("Unhandled API error", {
            error,
            request: getRequestContext(request, undefined, startedAt, requestId),
          });

          throw error;
        }
      },
    );
  };
}

function logRequest(
  level: "info" | "warn" | "error",
  request: Request,
  status: number,
  startedAt: number,
  requestId: string,
  context?: Record<string, unknown>,
) {
  logger[level]("API request completed", {
    ...context,
    request: getRequestContext(request, status, startedAt, requestId),
  });
}

function getRequestContext(
  request: Request,
  status: number | undefined,
  startedAt: number,
  requestId: string,
) {
  const url = new URL(request.url);

  return {
    requestId,
    method: request.method,
    path: url.pathname,
    query: url.search || undefined,
    status,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

function setRequestIdHeader(response: Response, requestId: string) {
  try {
    response.headers.set("x-request-id", requestId);
  } catch {
    // Some framework-created responses may not expose mutable headers.
  }
}

function isNextControlFlowError(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;

  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"))
  );
}
