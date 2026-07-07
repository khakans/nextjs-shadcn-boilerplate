import { getCurrentUserFromRequest, toAuthUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { ApiError } from "@/lib/api-response";
import { authenticateGoogleIdToken } from "@/lib/auth/google";
import {
  issueAuthSessionTokens,
  refreshAuthSessionTokens,
  revokeAuthSessionByRefreshToken,
} from "@/lib/auth/session";
import type { IssuedAuthTokens } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import {
  loginService,
  signupService,
} from "@/app/api/v1/auth/_modules/service";
import type { LoginRequest, SignupRequest } from "@/app/api/v1/auth/_modules/request";

import type {
  MobileGoogleRequest,
  MobileLogoutRequest,
  MobileRefreshRequest,
} from "./request";

export type MobileAuthResponse = AuthTokenResponse & {
  user: AuthUser;
};

type AuthTokenResponse = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
};

export async function mobileSignupService(
  input: SignupRequest,
  request: Request,
): Promise<MobileAuthResponse> {
  const user = await signupService(input);
  const tokens = await issueAuthSessionTokens(user, request);

  return buildMobileAuthResponse(user, tokens);
}

export async function mobileLoginService(
  input: LoginRequest,
  request: Request,
): Promise<MobileAuthResponse> {
  const user = await loginService(input);
  const tokens = await issueAuthSessionTokens(user, request);

  return buildMobileAuthResponse(user, tokens);
}

export async function mobileGoogleService(
  input: MobileGoogleRequest,
  request: Request,
): Promise<MobileAuthResponse> {
  const user = await authenticateGoogleIdToken(input.idToken);
  const tokens = await issueAuthSessionTokens(user, request);

  return buildMobileAuthResponse(user, tokens);
}

export async function mobileRefreshService(
  input: MobileRefreshRequest,
  request: Request,
): Promise<MobileAuthResponse> {
  const result = await refreshAuthSessionTokens(input.refreshToken, request);

  if (!result) {
    throw new ApiError("Unauthorized.", 401);
  }

  const user = await findActiveAuthUser(result.user.id);

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  return buildMobileAuthResponse(user, result.tokens);
}

export async function mobileLogoutService(input: MobileLogoutRequest) {
  await revokeAuthSessionByRefreshToken(input.refreshToken);
}

export async function mobileCurrentUserService(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  return user;
}

function buildMobileAuthResponse(
  user: AuthUser,
  tokens: IssuedAuthTokens,
): MobileAuthResponse {
  return {
    user,
    accessToken: tokens.accessToken,
    accessTokenExpiresIn: tokens.accessTokenExpiresIn,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresIn: tokens.refreshTokenExpiresIn,
  };
}

async function findActiveAuthUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
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

  if (!user?.isActive) {
    return null;
  }

  return toAuthUser(user);
}
