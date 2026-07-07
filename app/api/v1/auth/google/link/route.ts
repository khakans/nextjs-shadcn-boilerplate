import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api-response";
import { assertSameOriginRequest } from "@/lib/auth/csrf";
import {
  clearGoogleLinkRequestCookie,
  linkGoogleAccount,
} from "@/lib/auth/google";
import { issueAuthSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "cancel") {
      await clearGoogleLinkRequestCookie();
      redirect("/login");
    }

    const user = await linkGoogleAccount();

    await issueAuthSession(user, request);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect("/login?authError=google");
    }

    throw error;
  }

  redirect("/");
}
