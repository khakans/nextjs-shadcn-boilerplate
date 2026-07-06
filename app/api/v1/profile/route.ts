import {
  deleteProfileController,
  updateProfileController,
} from "./_modules/controller";

export const runtime = "nodejs";

export const DELETE = deleteProfileController;
export const PATCH = updateProfileController;
