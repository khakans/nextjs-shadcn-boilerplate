import { apiOk } from "@/lib/api-response";
import { assertSameOriginOrBearerRequest } from "@/lib/auth/csrf";
import {
  assertApiRateLimit,
  assertGlobalApiRateLimit,
} from "@/lib/auth/rate-limit";

import {
  listUserSessionsService,
  logoutOtherUserSessionsService,
  parseUserSessionsQuery,
  revokeUserSessionService,
} from "./sessions-service";

export async function listUserSessionsController(request: Request) {
  assertGlobalApiRateLimit(request);
  const result = await listUserSessionsService(
    parseUserSessionsQuery(request),
    request,
  );

  return apiOk(result);
}

export async function revokeUserSessionController(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:session-mutation");

  const { sessionId } = await context.params;
  await revokeUserSessionService(sessionId, request);

  return apiOk({ ok: true });
}

export async function logoutOtherUserSessionsController(request: Request) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:session-mutation");
  await logoutOtherUserSessionsService(request);

  return apiOk({ ok: true });
}
