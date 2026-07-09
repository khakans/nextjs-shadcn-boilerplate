import {
  deactivateTeamController,
  getTeamDetailController,
  updateTeamController,
} from "../_modules/controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const GET = withApiMiddleware(getTeamDetailController);
export const PATCH = withApiMiddleware(updateTeamController);
export const DELETE = withApiMiddleware(deactivateTeamController);
