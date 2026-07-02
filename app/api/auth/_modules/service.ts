import {
  getCurrentUser,
  hashPassword,
  toAuthUser,
  verifyPassword,
} from "@/lib/auth";
import { ApiError } from "@/lib/api-response";
import {
  clearAuthCookies,
  invalidateUserAuthSessions,
  refreshAuthSession,
  revokeCurrentRefreshToken,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import type { LoginRequest, SignupRequest } from "./request";

export async function signupService(input: SignupRequest) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new ApiError("Email is already registered.", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      tokenVersion: true,
    },
  });
  return toAuthUser(user);
}

export async function loginService(input: LoginRequest) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
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

  if (
    !user ||
    !user.isActive ||
    !(await verifyPassword(input.password, user.passwordHash))
  ) {
    throw new ApiError("Invalid email or password.", 401);
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      tokenVersion: true,
    },
  });
  return toAuthUser(updatedUser);
}

export async function logoutService() {
  const user = await getCurrentUser();

  if (user) {
    await invalidateUserAuthSessions(user.id);
  } else {
    await revokeCurrentRefreshToken();
  }

  await clearAuthCookies();
}

export async function currentUserService() {
  const user = await getCurrentUser();

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  return user;
}

export async function refreshService() {
  const sessionUser = await refreshAuthSession();

  if (!sessionUser) {
    throw new ApiError("Unauthorized.", 401);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      tokenVersion: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new ApiError("Unauthorized.", 401);
  }

  return toAuthUser(user);
}
