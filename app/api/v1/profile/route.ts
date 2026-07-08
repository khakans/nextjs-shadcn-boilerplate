import {
  deleteProfileController,
  getProfileController,
  updateProfileController,
} from "./_modules/controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const GET = withApiMiddleware(getProfileController);
export const DELETE = withApiMiddleware(deleteProfileController);
export const PATCH = withApiMiddleware(updateProfileController);
