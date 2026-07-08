import { withApiMiddleware } from "@/lib/api-middleware";

import { listAuditTrailsController } from "./_modules/controller";

export const runtime = "nodejs";

export const GET = withApiMiddleware(listAuditTrailsController);
