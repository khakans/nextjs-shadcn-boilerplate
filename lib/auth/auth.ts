import "server-only";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { getBearerToken } from "@/lib/auth/bearer";
import {
  getAccessTokenFromCookie,
  getCurrentUserSessionId,
  isActiveUserSession,
  verifyAccessToken,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const passwordSaltRounds = 12;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  gender: string | null;
  mobileNumber: string | null;
  tokenVersion: number;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, passwordSaltRounds);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getAccessTokenFromCookie();

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(token);

    if (!payload) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
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

    if (
      !user ||
      !user.isActive ||
      user.email !== payload.email ||
      user.tokenVersion !== payload.tokenVersion
    ) {
      return null;
    }

    const currentSessionId = await getCurrentUserSessionId(user.id);

    if (
      !currentSessionId ||
      (payload.sessionId && payload.sessionId !== currentSessionId)
    ) {
      return null;
    }

    return toAuthUser(user);
  } catch {
    return null;
  }
}

export async function getCurrentUserFromRequest(
  request: Request,
): Promise<AuthUser | null> {
  const token = getBearerToken(request);

  if (token) {
    return getCurrentUserFromAccessToken(token);
  }

  return getCurrentUser();
}

export async function getCurrentUserFromAccessToken(
  token: string,
): Promise<AuthUser | null> {
  try {
    const payload = await verifyAccessToken(token);

    if (!payload) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
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

    if (
      !user ||
      !user.isActive ||
      user.email !== payload.email ||
      user.tokenVersion !== payload.tokenVersion ||
      !(await isActiveUserSession(payload.sessionId, user.id))
    ) {
      return null;
    }

    return toAuthUser(user);
  } catch {
    return null;
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export function toAuthUser(user: {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  birthDate: Date | string | null;
  birthPlace: string | null;
  gender: string | null;
  mobileNumber: string | null;
  tokenVersion: number;
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    birthDate: formatAuthDate(user.birthDate),
    birthPlace: user.birthPlace,
    gender: user.gender,
    mobileNumber: user.mobileNumber,
    tokenVersion: user.tokenVersion,
  };
}

function formatAuthDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}
