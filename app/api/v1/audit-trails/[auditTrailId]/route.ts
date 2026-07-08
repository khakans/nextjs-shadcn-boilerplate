import { withApiMiddleware } from "@/lib/api-middleware";

import { getAuditTrailDetailController } from "../_modules/controller";

export const runtime = "nodejs";

export const GET = withApiMiddleware(getAuditTrailDetailController);
