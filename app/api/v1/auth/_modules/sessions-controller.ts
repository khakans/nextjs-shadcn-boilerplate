import { apiOk, handleApiError } from "@/lib/api-response";
import { assertSameOriginOrBearerRequest } from "@/lib/auth/csrf";
import {
  assertApiRateLimit,
  assertGlobalApiRateLimit,
} from "@/lib/auth/rate-limit";

import {
  listUserSessionsService,
  logoutOtherUserSessionsService,
  revokeUserSessionService,
} from "./sessions-service";

export async function listUserSessionsController(request: Request) {
  try {
    assertGlobalApiRateLimit(request);
    const sessions = await listUserSessionsService(request);

    return apiOk({ sessions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function revokeUserSessionController(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    assertSameOriginOrBearerRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "auth:session-mutation");

    const { sessionId } = await context.params;
    await revokeUserSessionService(sessionId, request);

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function logoutOtherUserSessionsController(request: Request) {
  try {
    assertSameOriginOrBearerRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "auth:session-mutation");
    await logoutOtherUserSessionsService(request);

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
