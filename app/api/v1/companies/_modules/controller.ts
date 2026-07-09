import { ApiError, apiOk } from "@/lib/api-response";
import { assertSameOriginOrBearerRequest } from "@/lib/auth/csrf";
import {
  assertApiRateLimit,
  assertGlobalApiRateLimit,
} from "@/lib/auth/rate-limit";

import { parseCompanyRequest, readCompanyBody } from "./request";
import {
  getCompanyService,
  saveCompanyService,
} from "./service";

export async function getCompanyController(request: Request) {
  assertGlobalApiRateLimit(request);

  const result = await getCompanyService(request);

  return apiOk(result);
}

export async function saveCompanyController(request: Request) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "company:mutation");

  const body = await readCompanyBody(request);
  const parsed = parseCompanyRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const result = await saveCompanyService(parsed.data, request);

  return apiOk(result);
}
