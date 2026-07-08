import { ApiError, apiCreated, apiOk } from "@/lib/api-response";
import {
  assertApiRateLimit,
  assertGlobalApiRateLimit,
} from "@/lib/auth/rate-limit";

import {
  parseLoginRequest,
  parseMobileGoogleRequest,
  parseMobileLogoutRequest,
  parseMobileRefreshRequest,
  parseSignupRequest,
  readJsonBody,
} from "./request";
import {
  mobileCurrentUserService,
  mobileGoogleService,
  mobileLoginService,
  mobileLogoutService,
  mobileRefreshService,
  mobileSignupService,
} from "./service";

export async function mobileSignupController(request: Request) {
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:signup");

  const body = await readJsonBody(request);
  const parsed = parseSignupRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const data = await mobileSignupService(parsed.data, request);

  return apiCreated(data);
}

export async function mobileLoginController(request: Request) {
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:login");

  const body = await readJsonBody(request);
  const parsed = parseLoginRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const data = await mobileLoginService(parsed.data, request);

  return apiOk(data);
}

export async function mobileGoogleController(request: Request) {
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:login");

  const body = await readJsonBody(request);
  const parsed = parseMobileGoogleRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const data = await mobileGoogleService(parsed.data, request);

  return apiOk(data);
}

export async function mobileRefreshController(request: Request) {
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:refresh");

  const body = await readJsonBody(request);
  const parsed = parseMobileRefreshRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const data = await mobileRefreshService(parsed.data, request);

  return apiOk(data);
}

export async function mobileLogoutController(request: Request) {
  assertGlobalApiRateLimit(request);

  const body = await readJsonBody(request);
  const parsed = parseMobileLogoutRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  await mobileLogoutService(parsed.data);

  return apiOk({ ok: true });
}

export async function mobileCurrentUserController(request: Request) {
  assertGlobalApiRateLimit(request);

  const user = await mobileCurrentUserService(request);

  return apiOk({ user });
}
