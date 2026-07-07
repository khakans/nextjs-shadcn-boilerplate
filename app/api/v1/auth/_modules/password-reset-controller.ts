import { ApiError, apiOk, handleApiError } from "@/lib/api-response";
import { assertSameOriginRequest } from "@/lib/auth/csrf";
import {
  assertApiRateLimit,
  assertEmailApiRateLimit,
  assertGlobalApiRateLimit,
} from "@/lib/auth/rate-limit";

import {
  parseForgotPasswordRequest,
  parseResetPasswordRequest,
  readJsonBody,
} from "./request";
import {
  forgotPasswordService,
  resetPasswordService,
} from "./password-reset-service";

export async function forgotPasswordController(request: Request) {
  try {
    assertSameOriginRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "auth:forgot-password");

    const body = await readJsonBody(request);
    const parsed = parseForgotPasswordRequest(body);

    if (!parsed.ok) {
      return handleApiError(new ApiError(parsed.error, 400));
    }

    assertEmailApiRateLimit(parsed.data.email);

    const result = await forgotPasswordService(parsed.data, request.url);

    return apiOk({ ok: result.ok }, undefined, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function resetPasswordController(request: Request) {
  try {
    assertSameOriginRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "auth:reset-password");

    const body = await readJsonBody(request);
    const parsed = parseResetPasswordRequest(body);

    if (!parsed.ok) {
      return handleApiError(new ApiError(parsed.error, 400));
    }

    const result = await resetPasswordService(parsed.data);

    return apiOk({ ok: result.ok }, undefined, "Password has been reset.");
  } catch (error) {
    return handleApiError(error);
  }
}
