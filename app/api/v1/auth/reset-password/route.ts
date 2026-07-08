import { resetPasswordController } from "../_modules/password-reset-controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const POST = withApiMiddleware(resetPasswordController);
