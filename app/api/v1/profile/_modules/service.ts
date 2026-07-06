import { ApiError } from "@/lib/api-response";
import {
  getCurrentUser,
  hashPassword,
  toAuthUser,
  verifyPassword,
} from "@/lib/auth";
import {
  clearAuthCookies,
  issueAuthSession,
  revokeUserRefreshTokens,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import type { AvatarRequest, PasswordRequest, ProfileUpdateRequest } from "./request";

export async function deleteProfileService() {
  const user = await requireProfileUser();

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
}

export async function updateProfileService(input: ProfileUpdateRequest) {
  const user = await requireProfileUser();

  if ("username" in input && input.username && input.username !== user.username) {
    const existingUser = await prisma.user.findUnique({
      where: {
        username: input.username,
      },
      select: {
        id: true,
      },
    });

    if (existingUser && existingUser.id !== user.id) {
      throw new ApiError("Username is already taken.", 409);
    }
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      ...("username" in input
        ? {
            username: input.username,
          }
        : {}),
      ...("birthDate" in input
        ? {
            birthDate: input.birthDate,
          }
        : {}),
      ...("birthPlace" in input
        ? {
            birthPlace: input.birthPlace,
          }
        : {}),
      ...("gender" in input
        ? {
            gender: input.gender,
          }
        : {}),
      ...("mobileNumber" in input
        ? {
            mobileNumber: input.mobileNumber,
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      avatarUrl: true,
      birthDate: true,
      birthPlace: true,
      gender: true,
      mobileNumber: true,
      tokenVersion: true,
    },
  });

  return toAuthUser(updatedUser);
}

export async function updateAvatarService(input: AvatarRequest) {
  const user = await requireProfileUser();
  const buffer = Buffer.from(await input.avatar.arrayBuffer());
  const avatarUrl = `data:${input.avatar.type};base64,${buffer.toString("base64")}`;
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
      username: true,
      avatarUrl: true,
      birthDate: true,
      birthPlace: true,
      gender: true,
      mobileNumber: true,
      tokenVersion: true,
    },
  });

  return toAuthUser(updatedUser);
}

export async function changePasswordService(input: PasswordRequest) {
  const sessionUser = await requireProfileUser();
  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      passwordHash: true,
      avatarUrl: true,
      birthDate: true,
      birthPlace: true,
      gender: true,
      mobileNumber: true,
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

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ApiError("Current password is incorrect.", 400);
  }

  const passwordHash = await hashPassword(input.newPassword);
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
      username: true,
      avatarUrl: true,
      birthDate: true,
      birthPlace: true,
      gender: true,
      mobileNumber: true,
      tokenVersion: true,
    },
  });

  await revokeUserRefreshTokens(updatedUser.id);
  await issueAuthSession({
    id: updatedUser.id,
    email: updatedUser.email,
    tokenVersion: updatedUser.tokenVersion,
  });

  return toAuthUser(updatedUser);
}

async function requireProfileUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  return user;
}
