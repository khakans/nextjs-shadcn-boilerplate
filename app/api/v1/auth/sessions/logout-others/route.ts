import { logoutOtherUserSessionsController } from "../../_modules/sessions-controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const POST = withApiMiddleware(logoutOtherUserSessionsController);
