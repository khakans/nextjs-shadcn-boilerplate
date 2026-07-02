import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  getAccessTokenExpiresIn,
  getAccessTokenMaxAge,
  getJwtSecret,
  getRefreshTokenExpiresAt,
  getRefreshTokenMaxAge,
} from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  tokenVersion: number;
};

export type AuthSessionUser = {
  id: string;
  email: string;
  tokenVersion: number;
};

type RefreshTokenRecord = {
  id: string;
  token: string;
};

export async function signAccessToken(user: AuthSessionUser) {
  return new SignJWT({
    email: user.email,
    tokenVersion: user.tokenVersion,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(getAccessTokenExpiresIn())
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());

  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.tokenVersion !== "number" ||
    payload.type !== "access"
  ) {
    return null;
  }

  return {
    sub: payload.sub,
    email: payload.email,
    tokenVersion: payload.tokenVersion,
  } satisfies AccessTokenPayload;
}

export async function getAccessTokenFromCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null;
}

export async function getRefreshTokenFromCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value ?? null;
}

export async function issueAuthSession(user: AuthSessionUser) {
  const accessToken = await signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  await setAccessTokenCookie(accessToken);
  await setRefreshTokenCookie(refreshToken.token);
}

export async function refreshAuthSession() {
  const token = await getRefreshTokenFromCookie();

  if (!token) {
    return null;
  }

  const tokenHash = hashRefreshToken(token);
  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          tokenVersion: true,
          isActive: true,
        },
      },
    },
  });

  if (!storedToken) {
    await clearAuthCookies();
    return null;
  }

  if (storedToken.revokedAt) {
    await invalidateUserAuthSessions(storedToken.userId);
    await clearAuthCookies();
    return null;
  }

  if (storedToken.expiresAt <= new Date() || !storedToken.user.isActive) {
    await revokeRefreshTokenById(storedToken.id);
    await clearAuthCookies();
    return null;
  }

  const nextRefreshToken = await createRefreshToken(storedToken.userId);

  await prisma.refreshToken.update({
    where: {
      id: storedToken.id,
    },
    data: {
      revokedAt: new Date(),
      lastUsedAt: new Date(),
      replacedBy: nextRefreshToken.id,
    },
  });

  const user = {
    id: storedToken.user.id,
    email: storedToken.user.email,
    tokenVersion: storedToken.user.tokenVersion,
  } satisfies AuthSessionUser;
  const accessToken = await signAccessToken(user);

  await setAccessTokenCookie(accessToken);
  await setRefreshTokenCookie(nextRefreshToken.token);

  return user;
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  cookieStore.set(ACCESS_TOKEN_COOKIE_NAME, "", cookieOptions);
  cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, "", cookieOptions);
}

export async function revokeCurrentRefreshToken() {
  const token = await getRefreshTokenFromCookie();

  if (!token) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashRefreshToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      lastUsedAt: new Date(),
    },
  });
}

export async function revokeUserRefreshTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function invalidateUserAuthSessions(userId: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ]);
}

async function createRefreshToken(userId: string): Promise<RefreshTokenRecord> {
  const token = randomBytes(48).toString("base64url");
  const storedToken = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(token),
      expiresAt: getRefreshTokenExpiresAt(),
    },
    select: {
      id: true,
    },
  });

  return {
    id: storedToken.id,
    token,
  };
}

async function revokeRefreshTokenById(id: string) {
  await prisma.refreshToken.update({
    where: {
      id,
    },
    data: {
      revokedAt: new Date(),
      lastUsedAt: new Date(),
    },
  });
}

async function setAccessTokenCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getAccessTokenMaxAge(),
  });
}

async function setRefreshTokenCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getRefreshTokenMaxAge(),
  });
}

function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
