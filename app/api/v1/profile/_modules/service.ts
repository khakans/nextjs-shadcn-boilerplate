import { ApiError } from "@/lib/api-response";
import {
  getCurrentUser,
  getCurrentUserFromRequest,
  hashPassword,
  toAuthUser,
  verifyPassword,
} from "@/lib/auth";
import { getBearerToken } from "@/lib/auth/bearer";
import {
  clearAuthCookies,
  issueAuthSession,
  issueAuthSessionTokens,
  revokeUserRefreshTokens,
} from "@/lib/auth/session";
import type { IssuedAuthTokens } from "@/lib/auth/session";
import { auditAction, auditTrailActions } from "@/lib/audit-trail";
import { prisma } from "@/lib/prisma";

import type {
  AvatarRequest,
  PasswordRequest,
  ProfileUpdateRequest,
} from "./request";

export async function deleteProfileService(request?: Request) {
  const user = await requireProfileUser(request);

  await auditAction(auditTrailActions.accountDeactivated, async () => {
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
      select: {
        id: true,
      },
    });
    await revokeUserRefreshTokens(user.id);
  });
  await clearAuthCookies();
}

export async function getProfileService(request?: Request) {
  return requireProfileUser(request);
}

export async function updateProfileService(
  input: ProfileUpdateRequest,
  request?: Request,
) {
  const user = await requireProfileUser(request);

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

  const updatedUser = await auditAction(auditTrailActions.profileUpdated, () =>
    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        ...("name" in input
          ? {
              name: input.name,
            }
          : {}),
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
    }),
  );

  return toAuthUser(updatedUser);
}

export async function updateAvatarService(
  input: AvatarRequest,
  request?: Request,
) {
  const user = await requireProfileUser(request);
  const buffer = Buffer.from(await input.avatar.arrayBuffer());
  const avatarUrl = `data:${input.avatar.type};base64,${buffer.toString("base64")}`;
  const updatedUser = await auditAction(auditTrailActions.avatarUpdated, () =>
    prisma.user.update({
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
    }),
  );

  return toAuthUser(updatedUser);
}

export async function deleteAvatarService(request?: Request) {
  const user = await requireProfileUser(request);
  const updatedUser = await auditAction(auditTrailActions.avatarUpdated, () =>
    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        avatarUrl: null,
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
    }),
  );

  return toAuthUser(updatedUser);
}

export async function changePasswordService(
  input: PasswordRequest,
  request?: Request,
) {
  const sessionUser = await requireProfileUser(request);
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
  const updatedUser = await auditAction(
    auditTrailActions.passwordChanged,
    async () => {
      const profileUser = await prisma.user.update({
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

      await revokeUserRefreshTokens(profileUser.id);

      return profileUser;
    },
  );

  const authSessionUser = {
    id: updatedUser.id,
    email: updatedUser.email,
    tokenVersion: updatedUser.tokenVersion,
  };
  let tokens: IssuedAuthTokens | null = null;

  if (request && getBearerToken(request)) {
    tokens = await issueAuthSessionTokens(authSessionUser, request);
  } else {
    await issueAuthSession(authSessionUser, request);
  }

  return {
    user: toAuthUser(updatedUser),
    tokens,
  };
}

async function requireProfileUser(request?: Request) {
  const user = request
    ? await getCurrentUserFromRequest(request)
    : await getCurrentUser();

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  return user;
}
