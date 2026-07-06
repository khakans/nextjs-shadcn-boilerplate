"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  changePassword,
  deleteAccount,
  uploadAvatar,
} from "@/features/profile/api/profile-client";
import { getApiErrorMessage } from "@/lib/api/http-client";
import type { AuthUser } from "@/lib/auth";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

export const maxAvatarSize = 5 * 1024 * 1024;
export const allowedAvatarTypes = new Set(["image/jpeg", "image/png"]);

export function useProfileSettings(user: AuthUser) {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const passwordFormRef = React.useRef<HTMLFormElement>(null);
  const [profileUser, setProfileUser] = React.useState(user);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = React.useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setAvatarError(null);
    setAvatarSuccess(null);

    if (!allowedAvatarTypes.has(file.type)) {
      setAvatarError(t.avatarInvalidType);
      input.value = "";
      return;
    }

    if (file.size > maxAvatarSize) {
      setAvatarError(t.avatarMaxSize);
      input.value = "";
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const payload = await uploadAvatar(file);
      setProfileUser(payload.user);
      setAvatarSuccess(t.avatarChanged);
      router.refresh();
    } catch (error) {
      setAvatarError(getApiErrorMessage(error, t.avatarChangeFailed));
    } finally {
      setIsUploadingAvatar(false);
      input.value = "";
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordConfirmationMismatch);
      return;
    }

    setIsChangingPassword(true);

    try {
      const payload = await changePassword({
        currentPassword,
        newPassword,
      });
      setProfileUser(payload.user);
      passwordFormRef.current?.reset();
      setPasswordSuccess(t.passwordChanged);
      router.refresh();
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, t.passwordChangeFailed));
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null);

    if (deleteConfirmation !== "DELETE") {
      setDeleteError(t.deleteAccountRequireConfirmation);
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAccount();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, t.deleteAccountFailed));
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    avatarError,
    avatarSuccess,
    deleteConfirmation,
    deleteError,
    fileInputRef,
    handleAvatarChange,
    handleDeleteAccount,
    handlePasswordSubmit,
    isChangingPassword,
    isDeleting,
    isUploadingAvatar,
    passwordError,
    passwordFormRef,
    passwordSuccess,
    profileUser,
    setDeleteConfirmation,
    t,
  };
}
