import { ApiError } from "@/lib/api-response";
import { getBearerToken } from "@/lib/auth/bearer";
import { CSRF_SAFE_METHODS } from "@/lib/auth/config";

export function assertSameOriginRequest(request: Request) {
  if (CSRF_SAFE_METHODS.has(request.method)) {
    return;
  }

  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (!host) {
    throw new ApiError("Missing request host.", 400);
  }

  if (origin) {
    assertAllowedUrl(origin, host);
    return;
  }

  if (referer) {
    assertAllowedUrl(referer, host);
    return;
  }

  throw new ApiError("Missing CSRF origin.", 403);
}

export function assertSameOriginOrBearerRequest(request: Request) {
  if (getBearerToken(request)) {
    return;
  }

  assertSameOriginRequest(request);
}

function assertAllowedUrl(value: string, host: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new ApiError("Invalid CSRF origin.", 403);
  }

  if (url.host !== host) {
    throw new ApiError("Invalid CSRF origin.", 403);
  }
}
