import "server-only";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import {
  getAccessTokenFromCookie,
  verifyAccessToken,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const passwordSaltRounds = 12;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
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
        avatarUrl: true,
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
  avatarUrl: string | null;
  tokenVersion: number;
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    tokenVersion: user.tokenVersion,
  };
}
