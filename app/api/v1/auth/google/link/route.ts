import { NextResponse } from "next/server";

import { withApiMiddleware } from "@/lib/api-middleware";
import { ApiError } from "@/lib/api-response";
import { assertSameOriginRequest } from "@/lib/auth/csrf";
import {
  clearGoogleLinkRequestCookie,
  linkGoogleAccount,
} from "@/lib/auth/google";
import { issueAuthSession } from "@/lib/auth/session";
import { auditAction, auditTrailActions } from "@/lib/audit-trail";

export const runtime = "nodejs";

async function linkGoogleRoute(request: Request) {
  assertSameOriginRequest(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "cancel") {
    await clearGoogleLinkRequestCookie();

    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = await auditAction(auditTrailActions.authGoogleLink, () =>
    linkGoogleAccount(),
  );

  await issueAuthSession(user, request);

  return NextResponse.redirect(new URL("/", request.url));
}

export const POST = withApiMiddleware(linkGoogleRoute, {
  onApiError(error, request) {
    if (error instanceof ApiError) {
      return NextResponse.redirect(new URL("/login?authError=google", request.url));
    }

    return undefined;
  },
});
