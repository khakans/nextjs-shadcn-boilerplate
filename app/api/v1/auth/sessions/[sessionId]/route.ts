import { revokeUserSessionController } from "../../_modules/sessions-controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const DELETE = withApiMiddleware(revokeUserSessionController);
