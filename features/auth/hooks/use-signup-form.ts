"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { signup } from "@/features/auth/api/auth-client";
import { getApiErrorMessage } from "@/lib/api/http-client";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

export function useSignupForm() {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError(t.passwordConfirmationMismatch);
      return;
    }

    setIsPending(true);

    try {
      await signup({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password,
      });
      router.push("/");
      router.refresh();
    } catch (error) {
      setError(getApiErrorMessage(error, t.signupFailed));
    } finally {
      setIsPending(false);
    }
  }

  return {
    error,
    handleSubmit,
    isPending,
    t,
  };
}
