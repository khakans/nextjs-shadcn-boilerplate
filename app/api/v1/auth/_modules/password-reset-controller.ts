import { ApiError, apiOk } from "@/lib/api-response";
import { assertSameOriginRequest } from "@/lib/auth/csrf";
import {
  assertApiRateLimit,
  assertEmailApiRateLimit,
  assertGlobalApiRateLimit,
} from "@/lib/auth/rate-limit";

import {
  forgotPasswordService,
  resetPasswordService,
} from "./password-reset-service";
import {
  parseForgotPasswordRequest,
  parseResetPasswordRequest,
  readJsonBody,
} from "./request";

export async function forgotPasswordController(request: Request) {
  assertSameOriginRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:forgot-password");

  const body = await readJsonBody(request);
  const parsed = parseForgotPasswordRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  assertEmailApiRateLimit(parsed.data.email);

  const result = await forgotPasswordService(parsed.data, request.url);

  return apiOk({ ok: result.ok }, undefined, result.message);
}

export async function resetPasswordController(request: Request) {
  assertSameOriginRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "auth:reset-password");

  const body = await readJsonBody(request);
  const parsed = parseResetPasswordRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const result = await resetPasswordService(parsed.data);

  return apiOk({ ok: result.ok }, undefined, "Password has been reset.");
}
