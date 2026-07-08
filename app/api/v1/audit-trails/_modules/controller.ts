import { apiOk } from "@/lib/api-response";
import { assertGlobalApiRateLimit } from "@/lib/auth/rate-limit";

import { parseAuditTrailQuery } from "./request";
import {
  getAuditTrailDetailService,
  listAuditTrailsService,
} from "./service";

export async function listAuditTrailsController(request: Request) {
  assertGlobalApiRateLimit(request);

  const query = parseAuditTrailQuery(request);
  const result = await listAuditTrailsService(query, request);

  return apiOk(result);
}

export async function getAuditTrailDetailController(
  request: Request,
  context: { params: Promise<{ auditTrailId: string }> },
) {
  assertGlobalApiRateLimit(request);

  const { auditTrailId } = await context.params;
  const result = await getAuditTrailDetailService(auditTrailId, request);

  return apiOk(result);
}
