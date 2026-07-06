"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button"
import { useLoginForm } from "@/features/auth/hooks/use-login-form"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  authError,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  authError?: string
}) {
  const { displayError, handleSubmit, isPending, t } = useLoginForm({
    authError,
  })

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t.loginTitle}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {t.loginDescription}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="identifier">{t.emailOrUsername}</FieldLabel>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            placeholder={t.emailOrUsernamePlaceholder}
            autoComplete="username"
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">{t.password}</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              {t.forgotPassword}
            </a>
          </div>
          <Input id="password" name="password" type="password" required />
        </Field>
        {displayError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {displayError}
          </p>
        ) : null}
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? t.loginPending : t.login}
          </Button>
        </Field>
        <FieldSeparator>{t.orContinueWith}</FieldSeparator>
        <Field>
          <GoogleAuthButton label={t.continueWithGoogle} />
          <FieldDescription className="text-center">
            {t.dontHaveAccount}{" "}
            <Link href="/signup" className="underline underline-offset-4">
              {t.signUp}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
