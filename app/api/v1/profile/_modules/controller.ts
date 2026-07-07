import { ApiError, apiOk, handleApiError } from "@/lib/api-response";
import { assertSameOriginOrBearerRequest } from "@/lib/auth/csrf";
import {
  assertApiRateLimit,
  assertGlobalApiRateLimit,
} from "@/lib/auth/rate-limit";

import {
  parseAvatarRequest,
  parsePasswordRequest,
  parseProfileUpdateRequest,
  readJsonBody,
} from "./request";
import {
  changePasswordService,
  deleteProfileService,
  updateProfileService,
  updateAvatarService,
} from "./service";

export async function deleteProfileController(request: Request) {
  try {
    assertSameOriginOrBearerRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "profile:mutation");
    await deleteProfileService(request);

    return apiOk({ ok: true });
  } catch (error) {
    return handleProfileError(error);
  }
}

export async function updateProfileController(request: Request) {
  try {
    assertSameOriginOrBearerRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "profile:mutation");

    const body = await readJsonBody(request);
    const parsed = parseProfileUpdateRequest(body);

    if (!parsed.ok) {
      return handleApiError(new ApiError(parsed.error, 400));
    }

    const user = await updateProfileService(parsed.data, request);

    return apiOk({ user });
  } catch (error) {
    return handleProfileError(error);
  }
}

export async function updateAvatarController(request: Request) {
  try {
    assertSameOriginOrBearerRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "profile:avatar");

    const parsed = await parseAvatarRequest(request);

    if (!parsed.ok) {
      return handleApiError(new ApiError(parsed.error, 400));
    }

    const user = await updateAvatarService(parsed.data, request);

    return apiOk({ user });
  } catch (error) {
    return handleProfileError(error);
  }
}

export async function changePasswordController(request: Request) {
  try {
    assertSameOriginOrBearerRequest(request);
    assertGlobalApiRateLimit(request);
    assertApiRateLimit(request, "profile:password");

    const body = await readJsonBody(request);
    const parsed = parsePasswordRequest(body);

    if (!parsed.ok) {
      return handleApiError(new ApiError(parsed.error, 400));
    }

    const result = await changePasswordService(parsed.data, request);

    return apiOk({
      user: result.user,
      ...(result.tokens ?? {}),
    });
  } catch (error) {
    return handleProfileError(error);
  }
}

function handleProfileError(error: unknown) {
  return handleApiError(error);
}
