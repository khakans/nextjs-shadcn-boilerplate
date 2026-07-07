import {
  ApiError,
  apiCreated,
  apiOk,
  handleApiError,
} from "@/lib/api-response";
import { assertSameOriginRequest } from "@/lib/auth/csrf";
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
  try {
    assertSameOriginRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "auth:signup");

    const body = await readJsonBody(request);
    const parsed = parseSignupRequest(body);

    if (!parsed.ok) {
      return handleApiError(new ApiError(parsed.error, 400));
    }

    const user = await signupService(parsed.data);
    await issueAuthSession(user, request);

    return apiCreated({ user });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function loginController(request: Request) {
  try {
    assertSameOriginRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "auth:login");

    const body = await readJsonBody(request);
    const parsed = parseLoginRequest(body);

    if (!parsed.ok) {
      return handleApiError(new ApiError(parsed.error, 400));
    }

    const user = await loginService(parsed.data);
    await issueAuthSession(user, request);

    return apiOk({ user });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function logoutController(request: Request) {
  try {
    assertSameOriginRequest(request);
    assertGlobalApiRateLimit(request);
    await logoutService();

    return apiOk({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function refreshController(request: Request) {
  try {
    assertSameOriginRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "auth:refresh");

    const user = await refreshService(request);

    return apiOk({ user });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function currentUserController(request: Request) {
  try {
    assertGlobalApiRateLimit(request);
    const user = await currentUserService();

    return apiOk({ user });
  } catch (error) {
    return handleAuthError(error);
  }
}

function handleAuthError(error: unknown) {
  return handleApiError(error);
}
