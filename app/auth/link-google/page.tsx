import { redirect } from "next/navigation";

import { getGoogleLinkRequest } from "@/lib/auth/google";

import { LinkGoogleShell } from "@/features/auth/components/link-google-shell";

export default async function LinkGooglePage() {
  const linkRequest = await getGoogleLinkRequest();

  if (!linkRequest) {
    redirect("/login?authError=google");
  }

  return <LinkGoogleShell email={linkRequest.email} />;
}
