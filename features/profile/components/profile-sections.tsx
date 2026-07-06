"use client";

import * as React from "react";
import { CameraIcon, LockKeyholeIcon, Trash2Icon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@/lib/auth";
import type { getMessages } from "@/lib/i18n";

type Messages = ReturnType<typeof getMessages>;

type AvatarProfileSectionProps = {
  avatarError: string | null;
  avatarSuccess: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploadingAvatar: boolean;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  t: Messages;
  user: AuthUser;
};

export function AvatarProfileSection({
  avatarError,
  avatarSuccess,
  fileInputRef,
  isUploadingAvatar,
  onAvatarChange,
  t,
  user,
}: AvatarProfileSectionProps) {
  return (
    <section className="flex flex-col gap-6 rounded-lg border bg-background p-5 md:flex-row md:items-center">
      <div className="relative w-fit">
        <Avatar className="size-28 text-3xl">
          <AvatarImage src={user.avatarUrl ?? ""} alt={user.name} />
          <AvatarFallback className="text-3xl">
            {getUserInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <Button
          type="button"
          size="icon"
          className="absolute right-0 bottom-0 rounded-full shadow-sm"
          aria-label={t.changeAvatar}
          disabled={isUploadingAvatar}
          onClick={() => fileInputRef.current?.click()}
        >
          <CameraIcon />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={onAvatarChange}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold">{t.profile}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.profileDescription}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">{t.avatarHelp}</p>
        <StatusMessage error={avatarError} success={avatarSuccess} />
      </div>
    </section>
  );
}

export function AccountInfoSection({
  t,
  user,
}: {
  t: Messages;
  user: AuthUser;
}) {
  return (
    <section className="rounded-lg border bg-background p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{t.accountInfo}</h2>
        <p className="text-sm text-muted-foreground">
          {t.accountInfoDescription}
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <AccountInfoItem label={t.name} value={user.name} />
        <AccountInfoItem label={t.email} value={user.email} />
      </dl>
    </section>
  );
}

type PasswordSectionProps = {
  error: string | null;
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  success: string | null;
  t: Messages;
};

export function PasswordSection({
  error,
  formRef,
  isPending,
  onSubmit,
  success,
  t,
}: PasswordSectionProps) {
  return (
    <section className="rounded-lg border bg-background p-5">
      <div className="mb-5 flex items-center gap-2">
        <LockKeyholeIcon className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">{t.changePassword}</h2>
          <p className="text-sm text-muted-foreground">{t.passwordHelp}</p>
        </div>
      </div>
      <form ref={formRef} onSubmit={onSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="current-password">
              {t.currentPassword}
            </FieldLabel>
            <Input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-password">{t.newPassword}</FieldLabel>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">
              {t.confirmPassword}
            </FieldLabel>
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <StatusMessage error={error} success={success} />
          <Button type="submit" disabled={isPending}>
            {isPending ? t.savePasswordPending : t.savePassword}
          </Button>
        </FieldGroup>
      </form>
    </section>
  );
}

type DeleteAccountSectionProps = {
  confirmation: string;
  error: string | null;
  isPending: boolean;
  onConfirmationChange: (value: string) => void;
  onDeleteAccount: () => void;
  t: Messages;
};

export function DeleteAccountSection({
  confirmation,
  error,
  isPending,
  onConfirmationChange,
  onDeleteAccount,
  t,
}: DeleteAccountSectionProps) {
  return (
    <section className="rounded-lg border border-destructive/30 bg-background p-5">
      <div className="mb-5 flex items-center gap-2">
        <Trash2Icon className="size-4 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">{t.deleteAccount}</h2>
          <p className="text-sm text-muted-foreground">
            {t.accountDeletedLogout}
          </p>
        </div>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="delete-confirmation">
            {t.deleteAccountConfirmation}
          </FieldLabel>
          <Input
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => onConfirmationChange(event.target.value)}
          />
          <FieldDescription>{t.deleteAccountIrreversible}</FieldDescription>
        </Field>
        <StatusMessage error={error} />
        <Button
          type="button"
          variant="destructive"
          className="w-fit"
          disabled={isPending}
          onClick={onDeleteAccount}
        >
          <Trash2Icon />
          {isPending ? t.deleteAccountPending : t.deleteAccountButton}
        </Button>
      </FieldGroup>
    </section>
  );
}

function AccountInfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function StatusMessage({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (error) {
    return (
      <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (success) {
    return (
      <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
        {success}
      </p>
    );
  }

  return null;
}

function getUserInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}
