import { ApiError, apiOk } from "@/lib/api-response";
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
  deleteAvatarService,
  getProfileService,
  updateProfileService,
  updateAvatarService,
} from "./service";

export async function getProfileController(request: Request) {
  assertGlobalApiRateLimit(request);
  const user = await getProfileService(request);

  return apiOk({ user });
}

export async function deleteProfileController(request: Request) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "profile:mutation");
  await deleteProfileService(request);

  return apiOk({ ok: true });
}

export async function deleteAvatarController(request: Request) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "profile:avatar");

  const user = await deleteAvatarService(request);

  return apiOk({ user });
}

export async function updateProfileController(request: Request) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "profile:mutation");

  const body = await readJsonBody(request);
  const parsed = parseProfileUpdateRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const user = await updateProfileService(parsed.data, request);

  return apiOk({ user });
}

export async function updateAvatarController(request: Request) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "profile:avatar");

  const parsed = await parseAvatarRequest(request);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const user = await updateAvatarService(parsed.data, request);

  return apiOk({ user });
}

export async function changePasswordController(request: Request) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "profile:password");

  const body = await readJsonBody(request);
  const parsed = parsePasswordRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const result = await changePasswordService(parsed.data, request);

  return apiOk({
    user: result.user,
    ...(result.tokens ?? {}),
  });
}
