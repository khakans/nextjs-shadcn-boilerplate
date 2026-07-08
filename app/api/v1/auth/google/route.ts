import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { withApiMiddleware } from "@/lib/api-middleware";
import {
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  getGoogleClientId,
  getGoogleRedirectUri,
} from "@/lib/auth/config";

export const runtime = "nodejs";

async function googleAuthRoute(request: Request) {
  const state = randomBytes(32).toString("base64url");
  const redirectUri = getGoogleRedirectUri(request.url);
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authorizationUrl.searchParams.set("client_id", getGoogleClientId());
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("access_type", "online");
  authorizationUrl.searchParams.set("prompt", "select_account");

  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(authorizationUrl);
}

export const GET = withApiMiddleware(googleAuthRoute);
