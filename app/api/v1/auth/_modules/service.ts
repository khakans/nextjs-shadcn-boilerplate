import {
  getCurrentUser,
  getCurrentUserFromRequest,
  hashPassword,
  toAuthUser,
  verifyPassword,
} from "@/lib/auth";
import { ApiError } from "@/lib/api-response";
import { getBearerToken } from "@/lib/auth/bearer";
import {
  clearAuthCookies,
  refreshAuthSession,
  revokeAuthSessionByAccessToken,
  revokeCurrentAuthSession,
} from "@/lib/auth/session";
import { assertAllowedUserEmailDomain } from "@/lib/auth/email-domain";
import { prisma } from "@/lib/prisma";

import type { LoginRequest, SignupRequest } from "./request";

export async function signupService(input: SignupRequest) {
  assertAllowedUserEmailDomain(input.email);

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
      username: true,
      avatarUrl: true,
      birthDate: true,
      birthPlace: true,
      gender: true,
      mobileNumber: true,
      tokenVersion: true,
    },
  });
  return toAuthUser(user);
}

export async function loginService(input: LoginRequest) {
  const identifier = input.identifier.toLowerCase();
  const user = await prisma.user.findUnique({
    where: identifier.includes("@")
      ? {
          email: identifier,
        }
      : {
          username: identifier,
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

  if (
    !user ||
    !user.isActive ||
    !user.passwordHash ||
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

export async function logoutService(request?: Request) {
  const bearerToken = request ? getBearerToken(request) : null;

  if (bearerToken) {
    await revokeAuthSessionByAccessToken(bearerToken);
  } else {
    await revokeCurrentAuthSession();
  }

  await clearAuthCookies();
}

export async function currentUserService(request?: Request) {
  const user = request
    ? await getCurrentUserFromRequest(request)
    : await getCurrentUser();

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  return user;
}

export async function refreshService(request?: Request) {
  const sessionUser = await refreshAuthSession(request);

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
      username: true,
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

  return toAuthUser(user);
}
