"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/features/auth/api/auth-client";
import { getApiErrorMessage } from "@/lib/api/http-client";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError(t.resetPasswordTokenMissing);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError(t.passwordConfirmationMismatch);
      return;
    }

    setIsPending(true);

    try {
      await resetPassword({
        token,
        password,
      });
      toast.success(t.resetPasswordSuccess);
      router.push("/login");
      router.refresh();
    } catch (submitError) {
      const message = getApiErrorMessage(submitError, t.resetPasswordFailed);
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t.resetPasswordTitle}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {t.resetPasswordDescription}
          </p>
        </div>
        {!token ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t.resetPasswordTokenMissing}
          </p>
        ) : null}
        <Field>
          <FieldLabel htmlFor="password">{t.newPassword}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="bg-background"
          />
          <FieldDescription>{t.signupPasswordDescription}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">{t.confirmPassword}</FieldLabel>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="bg-background"
          />
        </Field>
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Field>
          <Button type="submit" disabled={isPending || !token}>
            {isPending ? t.resetPasswordPending : t.resetPasswordButton}
          </Button>
          <FieldDescription className="text-center">
            <Link href="/login" className="underline underline-offset-4">
              {t.backToLogin}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
