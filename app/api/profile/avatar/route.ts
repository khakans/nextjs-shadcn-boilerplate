import {
  ApiError,
  apiOk,
  handleApiError,
} from "@/lib/api-response";
import { getCurrentUser, toAuthUser } from "@/lib/auth";
import { assertSameOriginRequest } from "@/lib/auth/csrf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const maxAvatarSize = 5 * 1024 * 1024;
const allowedAvatarTypes = new Set(["image/jpeg", "image/png"]);

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);

    const user = await getCurrentUser();

    if (!user) {
      throw new ApiError("Unauthorized.", 401);
    }

    const formData = await request.formData();
    const avatar = formData.get("avatar");

    if (!(avatar instanceof File)) {
      throw new ApiError("Avatar file is required.", 400);
    }

    if (!allowedAvatarTypes.has(avatar.type)) {
      throw new ApiError("Avatar must be a JPG or PNG image.", 400);
    }

    if (avatar.size > maxAvatarSize) {
      throw new ApiError("Avatar must be 5 MB or smaller.", 400);
    }

    const buffer = Buffer.from(await avatar.arrayBuffer());
    const avatarUrl = `data:${avatar.type};base64,${buffer.toString("base64")}`;
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        avatarUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        tokenVersion: true,
      },
    });

    return apiOk({ user: toAuthUser(updatedUser) });
  } catch (error) {
    return handleApiError(error);
  }
}
