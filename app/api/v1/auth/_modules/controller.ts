import {
  ApiError,
  apiCreated,
  apiOk,
} from "@/lib/api-response";
import {
  assertSameOriginOrBearerRequest,
  assertSameOriginRequest,
} from "@/lib/auth/csrf";
import { issueAuthSession } from "@/lib/auth/session";
import {
  assertApiRateLimit,
  assertGlobalApiRateLimit,
} from "@/lib/auth/rate-limit";

import {
  parseLoginRequest,
  parseSignupRequest,
  readJsonBody,
} from "./request";
import {
  currentUserService,
  loginService,
  logoutService,
  refreshService,
  signupService,
} from "./service";

export async function signupController(request: Request) {
  assertSameOriginRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:signup");

  const body = await readJsonBody(request);
  const parsed = parseSignupRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const user = await signupService(parsed.data);
  await issueAuthSession(user, request);

  return apiCreated({ user });
}

export async function loginController(request: Request) {
  assertSameOriginRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:login");

  const body = await readJsonBody(request);
  const parsed = parseLoginRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const user = await loginService(parsed.data);
  await issueAuthSession(user, request);

  return apiOk({ user });
}

export async function logoutController(request: Request) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  await logoutService(request);

  return apiOk({ ok: true });
}

export async function refreshController(request: Request) {
  assertSameOriginRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:refresh");

  const user = await refreshService(request);

  return apiOk({ user });
}

export async function currentUserController(request: Request) {
  assertGlobalApiRateLimit(request);
  const user = await currentUserService(request);

  return apiOk({ user });
}
