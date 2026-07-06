import {
  ApiError,
  apiOk,
  handleApiError,
} from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOriginRequest } from "@/lib/auth/csrf";
import { clearAuthCookies, revokeUserRefreshTokens } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    assertSameOriginRequest(request);

    const user = await getCurrentUser();

    if (!user) {
      throw new ApiError("Unauthorized.", 401);
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isActive: false,
        tokenVersion: {
          increment: 1,
        },
      },
    });
    await revokeUserRefreshTokens(user.id);
    await clearAuthCookies();

    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
