"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { login } from "@/features/auth/api/auth-client";
import { getApiErrorMessage } from "@/lib/api/http-client";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

type UseLoginFormOptions = {
  authError?: string;
};

export function useLoginForm({ authError }: UseLoginFormOptions) {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const displayError = error ?? (authError === "google" ? t.loginGoogleError : null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      await login({
        identifier: String(formData.get("identifier") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
      router.push("/");
      router.refresh();
    } catch (error) {
      setError(getApiErrorMessage(error, t.loginFailed));
    } finally {
      setIsPending(false);
    }
  }

  return {
    displayError,
    handleSubmit,
    isPending,
    t,
  };
}
