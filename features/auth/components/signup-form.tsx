"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button"
import { useSignupForm } from "@/features/auth/hooks/use-signup-form"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignupForm({
  className,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit">) {
  const { error, handleSubmit, isPending, t } = useSignupForm()

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t.signupTitle}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {t.signupDescription}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="name">{t.fullName}</FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder={t.fullNamePlaceholder}
            required
            className="bg-background"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">{t.email}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t.emailPlaceholder}
            required
            className="bg-background"
          />
          <FieldDescription>
            {t.signupEmailDescription}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">{t.password}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="bg-background"
          />
          <FieldDescription>
            {t.signupPasswordDescription}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">{t.confirmPassword}</FieldLabel>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            required
            className="bg-background"
          />
          <FieldDescription>{t.confirmPasswordDescription}</FieldDescription>
        </Field>
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? t.signupPending : t.signupButton}
          </Button>
        </Field>
        <FieldSeparator>{t.orContinueWith}</FieldSeparator>
        <Field>
          <GoogleAuthButton label={t.continueWithGoogle} />
          <FieldDescription className="px-6 text-center">
            {t.alreadyHaveAccount} <Link href="/login">{t.signIn}</Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
