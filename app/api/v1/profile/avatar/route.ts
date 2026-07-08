import {
  deleteAvatarController,
  updateAvatarController,
} from "../_modules/controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const POST = withApiMiddleware(updateAvatarController);
export const DELETE = withApiMiddleware(deleteAvatarController);
