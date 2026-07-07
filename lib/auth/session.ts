import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  getAccessTokenExpiresAt,
  getAccessTokenMaxAge,
  getJwtSecret,
  getRefreshTokenExpiresAt,
  getRefreshTokenMaxAge,
} from "@/lib/auth/config";
import { getClientIp } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  tokenVersion: number;
  sessionId: string | null;
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

type SessionRequestMetadata = {
  browser: string | null;
  operatingSystem: string | null;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export async function signAccessToken(
  user: AuthSessionUser,
  sessionId: string | null,
) {
  return new SignJWT({
    email: user.email,
    sessionId,
    tokenVersion: user.tokenVersion,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(getAccessTokenExpiresAt())
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

  const sessionId = payload.sessionId;

  if (sessionId !== undefined && typeof sessionId !== "string") {
    return null;
  }

  return {
    sub: payload.sub,
    email: payload.email,
    sessionId: sessionId ?? null,
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

export async function issueAuthSession(user: AuthSessionUser, request?: Request) {
  const expiresAt = getRefreshTokenExpiresAt();
  const userSession = await createUserSession(user.id, expiresAt, request);
  const accessToken = await signAccessToken(user, userSession.id);
  const refreshToken = await createRefreshToken(
    user.id,
    expiresAt,
    userSession.id,
  );

  await setAccessTokenCookie(accessToken);
  await setRefreshTokenCookie(refreshToken.token);
}

export async function refreshAuthSession(request?: Request) {
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
      userSessionId: true,
      userSession: {
        select: {
          id: true,
          expiredAt: true,
          status: true,
        },
      },
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

  const now = new Date();

  if (storedToken.expiresAt <= now || !storedToken.user.isActive) {
    await revokeRefreshTokenById(storedToken.id);
    await expireUserSessionById(storedToken.userSessionId);
    await clearAuthCookies();
    return null;
  }

  let userSessionId = storedToken.userSessionId;

  if (storedToken.userSession) {
    if (
      storedToken.userSession.status !== "ONLINE" ||
      storedToken.userSession.expiredAt <= now
    ) {
      await revokeRefreshTokenById(storedToken.id);
      await expireUserSessionById(storedToken.userSession.id);
      await clearAuthCookies();
      return null;
    }
  } else {
    const session = await createUserSession(
      storedToken.userId,
      storedToken.expiresAt,
      request,
    );
    userSessionId = session.id;
  }

  if (!userSessionId) {
    await revokeRefreshTokenById(storedToken.id);
    await clearAuthCookies();
    return null;
  }

  const nextExpiresAt = getRefreshTokenExpiresAt();
  const nextRefreshToken = await createRefreshToken(
    storedToken.userId,
    nextExpiresAt,
    userSessionId,
  );

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
  await prisma.userSession.update({
    where: {
      id: userSessionId,
    },
    data: {
      lastActiveAt: now,
      expiredAt: nextExpiresAt,
      ...(request
        ? {
            ...getSessionRequestMetadata(request),
          }
        : {}),
    },
  });

  const user = {
    id: storedToken.user.id,
    email: storedToken.user.email,
    tokenVersion: storedToken.user.tokenVersion,
  } satisfies AuthSessionUser;
  const accessToken = await signAccessToken(user, userSessionId);

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

export async function revokeCurrentAuthSession() {
  const token = await getRefreshTokenFromCookie();

  if (!token) {
    return;
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash: hashRefreshToken(token),
    },
    select: {
      id: true,
      userSessionId: true,
    },
  });

  if (!storedToken) {
    return;
  }

  const now = new Date();

  if (!storedToken.userSessionId) {
    await prisma.refreshToken.updateMany({
      where: {
        id: storedToken.id,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        lastUsedAt: now,
      },
    });
    return;
  }

  await prisma.$transaction([
    prisma.userSession.update({
      where: {
        id: storedToken.userSessionId,
      },
      data: {
        status: "LOGGED_OUT",
        logoutAt: now,
        lastActiveAt: now,
      },
    }),
    prisma.refreshToken.updateMany({
      where: {
        userSessionId: storedToken.userSessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        lastUsedAt: now,
      },
    }),
  ]);
}

export async function revokeUserRefreshTokens(userId: string) {
  const now = new Date();

  await prisma.$transaction([
    prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    }),
    prisma.userSession.updateMany({
      where: {
        userId,
        status: "ONLINE",
      },
      data: {
        status: "REVOKED",
        logoutAt: now,
        lastActiveAt: now,
      },
    }),
  ]);
}

export async function invalidateUserAuthSessions(userId: string) {
  const now = new Date();

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
        revokedAt: now,
      },
    }),
    prisma.userSession.updateMany({
      where: {
        userId,
        status: "ONLINE",
      },
      data: {
        status: "REVOKED",
        logoutAt: now,
        lastActiveAt: now,
      },
    }),
  ]);
}

export async function getCurrentUserSessionId(userId?: string) {
  const token = await getRefreshTokenFromCookie();

  if (!token) {
    return null;
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash: hashRefreshToken(token),
    },
    select: {
      expiresAt: true,
      revokedAt: true,
      userId: true,
      userSessionId: true,
      userSession: {
        select: {
          expiredAt: true,
          status: true,
          userId: true,
        },
      },
    },
  });

  if (
    !storedToken ||
    storedToken.revokedAt ||
    storedToken.expiresAt <= new Date() ||
    (userId && storedToken.userId !== userId) ||
    !storedToken.userSessionId ||
    !storedToken.userSession ||
    storedToken.userSession.status !== "ONLINE" ||
    storedToken.userSession.expiredAt <= new Date() ||
    (userId && storedToken.userSession.userId !== userId)
  ) {
    return null;
  }

  return storedToken.userSessionId;
}

async function createRefreshToken(
  userId: string,
  expiresAt: Date,
  userSessionId: string | null,
): Promise<RefreshTokenRecord> {
  const token = randomBytes(48).toString("base64url");
  const storedToken = await prisma.refreshToken.create({
    data: {
      userId,
      userSessionId,
      tokenHash: hashRefreshToken(token),
      expiresAt,
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

async function createUserSession(
  userId: string,
  expiredAt: Date,
  request?: Request,
) {
  return prisma.userSession.create({
    data: {
      userId,
      sessionId: randomBytes(32).toString("base64url"),
      expiredAt,
      ...getSessionRequestMetadata(request),
    },
    select: {
      id: true,
    },
  });
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

async function expireUserSessionById(id: string | null) {
  if (!id) {
    return;
  }

  await prisma.userSession.updateMany({
    where: {
      id,
      status: "ONLINE",
    },
    data: {
      status: "EXPIRED",
      logoutAt: new Date(),
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

function getSessionRequestMetadata(request?: Request): SessionRequestMetadata {
  const userAgent = request?.headers.get("user-agent") ?? null;

  return {
    browser: parseBrowser(userAgent),
    operatingSystem: parseOperatingSystem(userAgent),
    deviceName: parseDeviceName(userAgent),
    ipAddress: request ? getClientIp(request) : null,
    userAgent,
  };
}

function parseBrowser(userAgent: string | null) {
  if (!userAgent) {
    return null;
  }

  if (/Edg\//.test(userAgent)) {
    return "Microsoft Edge";
  }

  if (/OPR\//.test(userAgent)) {
    return "Opera";
  }

  if (/Firefox\//.test(userAgent)) {
    return "Firefox";
  }

  if (/Chrome\//.test(userAgent) && !/Chromium\//.test(userAgent)) {
    return "Chrome";
  }

  if (/Safari\//.test(userAgent) && /Version\//.test(userAgent)) {
    return "Safari";
  }

  return "Unknown browser";
}

function parseOperatingSystem(userAgent: string | null) {
  if (!userAgent) {
    return null;
  }

  if (/Windows NT/.test(userAgent)) {
    return "Windows";
  }

  if (/Android/.test(userAgent)) {
    return "Android";
  }

  if (/(iPhone|iPad|iPod)/.test(userAgent)) {
    return "iOS";
  }

  if (/Mac OS X/.test(userAgent)) {
    return "macOS";
  }

  if (/Linux/.test(userAgent)) {
    return "Linux";
  }

  return "Unknown OS";
}

function parseDeviceName(userAgent: string | null) {
  if (!userAgent) {
    return null;
  }

  if (/iPad|Tablet/.test(userAgent)) {
    return "Tablet";
  }

  if (/Mobile|iPhone|Android/.test(userAgent)) {
    return "Mobile";
  }

  return "Desktop";
}
