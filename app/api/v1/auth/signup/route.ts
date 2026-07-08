import { signupController } from "../_modules/controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const POST = withApiMiddleware(signupController);
