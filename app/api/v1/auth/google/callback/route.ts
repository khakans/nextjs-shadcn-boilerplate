import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { withApiMiddleware } from "@/lib/api-middleware";
import { ApiError } from "@/lib/api-response";
import {
  authenticateGoogleOAuth,
  setGoogleLinkRequestCookie,
} from "@/lib/auth/google";
import { emailDomainNotAllowedMessage } from "@/lib/auth/email-domain";
import {
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  getAppBaseUrl,
  getGoogleRedirectUri,
} from "@/lib/auth/config";
import { issueAuthSession } from "@/lib/auth/session";
import { auditAction, auditTrailActions } from "@/lib/audit-trail";

export const runtime = "nodejs";

async function googleCallbackRoute(request: Request) {
  const appBaseUrl = getAppBaseUrl(request.url);
  const requestUrl = new URL(request.url);
  const error = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value;

  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  if (error) {
    throw new ApiError("Google OAuth was cancelled.", 401);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    throw new ApiError("Invalid Google OAuth state.", 401);
  }

  const redirectUri = getGoogleRedirectUri(request.url);
  const result = await auditAction(auditTrailActions.authGoogleLogin, () =>
    authenticateGoogleOAuth(code, redirectUri),
  );

  if (result.status === "link_required") {
    await setGoogleLinkRequestCookie(result.linkRequest);

    return NextResponse.redirect(new URL("/auth/link-google", appBaseUrl));
  }

  await issueAuthSession(result.user, request);

  return NextResponse.redirect(new URL("/", appBaseUrl));
}

export const GET = withApiMiddleware(googleCallbackRoute, {
  onApiError(error, request) {
    if (error.message === emailDomainNotAllowedMessage) {
      return NextResponse.redirect(
        new URL("/login?authError=domain", getAppBaseUrl(request.url)),
      );
    }

    return NextResponse.redirect(
      new URL("/login?authError=google", getAppBaseUrl(request.url)),
    );
  },
});
