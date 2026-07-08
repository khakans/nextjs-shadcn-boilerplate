import {
  deleteProfileController,
  updateProfileController,
} from "./_modules/controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const DELETE = withApiMiddleware(deleteProfileController);
export const PATCH = withApiMiddleware(updateProfileController);
