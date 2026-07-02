import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api-response";
import {
  authenticateGoogleOAuth,
  setGoogleLinkRequestCookie,
} from "@/lib/auth/google";
import {
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  getGoogleRedirectUri,
} from "@/lib/auth/config";
import { issueAuthSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
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
    const result = await authenticateGoogleOAuth(code, redirectUri);

    if (result.status === "link_required") {
      await setGoogleLinkRequestCookie(result.linkRequest);

      return NextResponse.redirect(new URL("/auth/link-google", request.url));
    }

    await issueAuthSession(result.user);

    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Google OAuth callback failed", error);

    return NextResponse.redirect(
      new URL("/login?authError=google", request.url),
    );
  }
}
