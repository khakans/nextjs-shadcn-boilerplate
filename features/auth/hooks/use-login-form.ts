"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

  React.useEffect(() => {
    if (authError === "google") {
      toast.error(t.loginGoogleError);
    }
  }, [authError, t.loginGoogleError]);

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
      const message = getApiErrorMessage(error, t.loginFailed);
      setError(message);
      toast.error(message);
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
