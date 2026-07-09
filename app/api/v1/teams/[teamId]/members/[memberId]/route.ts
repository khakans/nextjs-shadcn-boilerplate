import {
  removeTeamMemberController,
  updateTeamMemberController,
} from "../../../_modules/controller";
import { withApiMiddleware } from "@/lib/api-middleware";

export const runtime = "nodejs";

export const PATCH = withApiMiddleware(updateTeamMemberController);
export const DELETE = withApiMiddleware(removeTeamMemberController);
