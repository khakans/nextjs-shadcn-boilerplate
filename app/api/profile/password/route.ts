import {
  ApiError,
  apiOk,
  handleApiError,
} from "@/lib/api-response";
import {
  getCurrentUser,
  hashPassword,
  toAuthUser,
  verifyPassword,
} from "@/lib/auth";
import { assertSameOriginRequest } from "@/lib/auth/csrf";
import {
  issueAuthSession,
  revokeUserRefreshTokens,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    assertSameOriginRequest(request);

    const sessionUser = await getCurrentUser();

    if (!sessionUser) {
      throw new ApiError("Unauthorized.", 401);
    }

    const body = await request.json().catch(() => null);
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      throw new ApiError("Current password and new password are required.", 400);
    }

    if (newPassword.length < 8) {
      throw new ApiError("New password must be at least 8 characters.", 400);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: sessionUser.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        avatarUrl: true,
        tokenVersion: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new ApiError("Unauthorized.", 401);
    }

    if (!user.passwordHash) {
      throw new ApiError("Password can only be changed for local accounts.", 400);
    }

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new ApiError("Current password is incorrect.", 400);
    }

    const passwordHash = await hashPassword(newPassword);
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
        tokenVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        tokenVersion: true,
      },
    });

    await revokeUserRefreshTokens(updatedUser.id);
    await issueAuthSession({
      id: updatedUser.id,
      email: updatedUser.email,
      tokenVersion: updatedUser.tokenVersion,
    });

    return apiOk({ user: toAuthUser(updatedUser) });
  } catch (error) {
    return handleApiError(error);
  }
}
