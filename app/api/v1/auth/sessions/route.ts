import { listUserSessionsController } from "../_modules/sessions-controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const GET = withApiMiddleware(listUserSessionsController);
