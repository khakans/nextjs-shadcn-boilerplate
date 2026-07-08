import { mobileCurrentUserController } from "../_modules/controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const GET = withApiMiddleware(mobileCurrentUserController);
