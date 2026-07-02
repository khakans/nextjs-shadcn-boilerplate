import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

import { ApiError } from "@/lib/api-response";
import {
  GOOGLE_OAUTH_LINK_COOKIE_NAME,
  getGoogleClientId,
  getGoogleClientSecret,
  getJwtSecret,
} from "@/lib/auth/config";
import { toAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const googleUserInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
};

type GoogleLinkRequest = {
  userId: string;
  email: string;
  googleId: string;
  googleName: string | null;
  googleAvatarUrl: string | null;
};

type GoogleOAuthResult =
  | {
      status: "authenticated";
      user: ReturnType<typeof toAuthUser>;
    }
  | {
      status: "link_required";
      linkRequest: GoogleLinkRequest;
    };

export async function authenticateGoogleOAuth(
  code: string,
  redirectUri: string,
): Promise<GoogleOAuthResult> {
  const token = await exchangeCodeForToken(code, redirectUri);
  const profile = await fetchGoogleUserInfo(token.access_token);

  if (!profile.email_verified) {
    throw new ApiError("Google email must be verified.", 401);
  }

  const email = profile.email.toLowerCase();
  const now = new Date();
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      provider: true,
      googleId: true,
      avatarUrl: true,
      tokenVersion: true,
      isActive: true,
      emailVerifiedAt: true,
    },
  });

  if (existingUser) {
    if (!existingUser.isActive) {
      throw new ApiError("Account is disabled.", 403);
    }

    if (existingUser.googleId && existingUser.googleId !== profile.sub) {
      throw new ApiError("Google account does not match this user.", 409);
    }

    if (!existingUser.googleId && existingUser.provider !== "GOOGLE") {
      return {
        status: "link_required",
        linkRequest: {
          userId: existingUser.id,
          email: existingUser.email,
          googleId: profile.sub,
          googleName: profile.name ?? null,
          googleAvatarUrl: profile.picture ?? null,
        },
      };
    }

    const user = await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        googleId: existingUser.googleId ?? profile.sub,
        avatarUrl: existingUser.avatarUrl ?? profile.picture ?? null,
        emailVerifiedAt: existingUser.emailVerifiedAt ?? now,
        lastLoginAt: now,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        tokenVersion: true,
      },
    });

    return {
      status: "authenticated",
      user: toAuthUser(user),
    };
  }

  const user = await prisma.user.create({
    data: {
      name: profile.name ?? email.split("@")[0] ?? "Google User",
      email,
      passwordHash: null,
      provider: "GOOGLE",
      googleId: profile.sub,
      avatarUrl: profile.picture ?? null,
      emailVerifiedAt: now,
      lastLoginAt: now,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      tokenVersion: true,
    },
  });

  return {
    status: "authenticated",
    user: toAuthUser(user),
  };
}

export async function setGoogleLinkRequestCookie(
  linkRequest: GoogleLinkRequest,
) {
  const token = await new SignJWT({
    email: linkRequest.email,
    googleId: linkRequest.googleId,
    googleName: linkRequest.googleName,
    googleAvatarUrl: linkRequest.googleAvatarUrl,
    type: "google_link",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(linkRequest.userId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getJwtSecret());
  const cookieStore = await cookies();

  cookieStore.set(GOOGLE_OAUTH_LINK_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
}

export async function getGoogleLinkRequest() {
  const cookieStore = await cookies();
  const token = cookieStore.get(GOOGLE_OAUTH_LINK_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    if (
      payload.type !== "google_link" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.googleId !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
      googleId: payload.googleId,
      googleName:
        typeof payload.googleName === "string" ? payload.googleName : null,
      googleAvatarUrl:
        typeof payload.googleAvatarUrl === "string"
          ? payload.googleAvatarUrl
          : null,
    } satisfies GoogleLinkRequest;
  } catch {
    return null;
  }
}

export async function clearGoogleLinkRequestCookie() {
  const cookieStore = await cookies();

  cookieStore.set(GOOGLE_OAUTH_LINK_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function linkGoogleAccount() {
  const linkRequest = await getGoogleLinkRequest();

  if (!linkRequest) {
    throw new ApiError("Google account link request has expired.", 401);
  }

  const now = new Date();
  const existingUser = await prisma.user.findUnique({
    where: {
      id: linkRequest.userId,
    },
    select: {
      id: true,
      email: true,
      googleId: true,
      avatarUrl: true,
      emailVerifiedAt: true,
      isActive: true,
    },
  });

  if (
    !existingUser ||
    !existingUser.isActive ||
    existingUser.email !== linkRequest.email
  ) {
    throw new ApiError("Unable to link Google account.", 401);
  }

  if (existingUser.googleId && existingUser.googleId !== linkRequest.googleId) {
    throw new ApiError("This account is linked to another Google account.", 409);
  }

  const user = await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      googleId: existingUser.googleId ?? linkRequest.googleId,
      avatarUrl: existingUser.avatarUrl ?? linkRequest.googleAvatarUrl,
      emailVerifiedAt: existingUser.emailVerifiedAt ?? now,
      lastLoginAt: now,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      tokenVersion: true,
    },
  });

  await clearGoogleLinkRequestCookie();

  return toAuthUser(user);
}

async function exchangeCodeForToken(code: string, redirectUri: string) {
  const response = await fetch(googleTokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | GoogleTokenResponse
    | null;

  if (!response.ok || !payload?.access_token) {
    throw new ApiError(
      payload?.error_description ?? "Unable to exchange Google OAuth code.",
      401,
    );
  }

  return {
    access_token: payload.access_token,
  };
}

async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(googleUserInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const profile = (await response.json().catch(() => null)) as
    | GoogleUserInfo
    | null;

  if (
    !response.ok ||
    !profile?.sub ||
    !profile.email ||
    typeof profile.email_verified !== "boolean"
  ) {
    throw new ApiError("Unable to read Google profile.", 401);
  }

  return {
    sub: profile.sub,
    name: profile.name,
    email: profile.email,
    email_verified: profile.email_verified,
    picture: profile.picture,
  };
}
