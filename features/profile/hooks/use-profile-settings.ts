"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  changePassword,
  deleteAccount,
  updateProfileDetails,
  updateUsername,
  uploadAvatar,
  type ChangePasswordInput,
  type UpdateProfileDetailsInput,
} from "@/features/profile/api/profile-client";
import { formatMobileNumber } from "@/features/profile/lib/phone-country-codes";
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
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = React.useState(false);
  const [isUsernameConfirmOpen, setIsUsernameConfirmOpen] = React.useState(false);
  const [usernameDraft, setUsernameDraft] = React.useState(
    user.username ?? "",
  );
  const [pendingUsername, setPendingUsername] = React.useState<string | null>(
    null,
  );
  const [usernameError, setUsernameError] = React.useState<string | null>(null);
  const [isUpdatingUsername, setIsUpdatingUsername] = React.useState(false);
  const [profileDetailsError, setProfileDetailsError] = React.useState<
    string | null
  >(null);
  const [isProfileDetailsConfirmOpen, setIsProfileDetailsConfirmOpen] =
    React.useState(false);
  const [pendingProfileDetails, setPendingProfileDetails] =
    React.useState<UpdateProfileDetailsInput | null>(null);
  const [isUpdatingProfileDetails, setIsUpdatingProfileDetails] =
    React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] =
    React.useState(false);
  const [pendingPassword, setPendingPassword] =
    React.useState<ChangePasswordInput | null>(null);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
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
      toast.success(t.avatarChanged);
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.avatarChangeFailed));
    } finally {
      setIsUploadingAvatar(false);
      input.value = "";
    }
  }

  function openUsernameDialog() {
    setUsernameDraft(profileUser.username ?? "");
    setUsernameError(null);
    setIsUsernameDialogOpen(true);
  }

  function handleUsernameDialogOpenChange(open: boolean) {
    setIsUsernameDialogOpen(open);

    if (!open) {
      setIsUsernameConfirmOpen(false);
      setPendingUsername(null);
    }
  }

  function handleUsernameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsernameError(null);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const normalizedUsername = username ? username.toLowerCase() : null;
    const currentUsername = profileUser.username ?? null;

    if (normalizedUsername === currentUsername) {
      setUsernameError(t.usernameUnchanged);
      return;
    }

    setPendingUsername(normalizedUsername);
    setIsUsernameConfirmOpen(true);
  }

  async function confirmUsernameChange() {
    setUsernameError(null);
    setIsUpdatingUsername(true);

    try {
      const payload = await updateUsername({
        username: pendingUsername,
      });
      setProfileUser(payload.user);
      toast.success(t.usernameChanged);
      setUsernameDraft(payload.user.username ?? "");
      setPendingUsername(null);
      setIsUsernameConfirmOpen(false);
      setIsUsernameDialogOpen(false);
      router.refresh();
    } catch (error) {
      setUsernameError(getApiErrorMessage(error, t.usernameChangeFailed));
      setIsUsernameConfirmOpen(false);
    } finally {
      setIsUpdatingUsername(false);
    }
  }

  async function handleProfileDetailsSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setProfileDetailsError(null);

    const formData = new FormData(event.currentTarget);
    const birthDate = String(formData.get("birthDate") ?? "").trim();
    const birthPlace = String(formData.get("birthPlace") ?? "").trim();
    const gender = String(formData.get("gender") ?? "").trim();
    const countryCode = String(formData.get("countryCode") ?? "").trim();
    const localMobileNumber = String(formData.get("mobileNumber") ?? "");

    setPendingProfileDetails({
      birthDate: birthDate || null,
      birthPlace: birthPlace || null,
      gender: gender || null,
      mobileNumber: formatMobileNumber(countryCode, localMobileNumber),
    });
    setIsProfileDetailsConfirmOpen(true);
  }

  async function confirmProfileDetailsChange() {
    if (!pendingProfileDetails) {
      return;
    }

    setProfileDetailsError(null);
    setIsUpdatingProfileDetails(true);

    try {
      const payload = await updateProfileDetails(pendingProfileDetails);
      setProfileUser(payload.user);
      toast.success(t.profileDetailsChanged);
      setPendingProfileDetails(null);
      setIsProfileDetailsConfirmOpen(false);
      router.refresh();
    } catch (error) {
      setProfileDetailsError(
        getApiErrorMessage(error, t.profileDetailsChangeFailed),
      );
      setIsProfileDetailsConfirmOpen(false);
    } finally {
      setIsUpdatingProfileDetails(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordConfirmationMismatch);
      return;
    }

    setPendingPassword({
      currentPassword,
      newPassword,
    });
    setIsPasswordConfirmOpen(true);
  }

  async function confirmPasswordChange() {
    if (!pendingPassword) {
      return;
    }

    setPasswordError(null);
    setIsChangingPassword(true);

    try {
      const payload = await changePassword(pendingPassword);
      setProfileUser(payload.user);
      passwordFormRef.current?.reset();
      toast.success(t.passwordChanged);
      setPendingPassword(null);
      setIsPasswordConfirmOpen(false);
      router.refresh();
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, t.passwordChangeFailed));
      setIsPasswordConfirmOpen(false);
    } finally {
      setIsChangingPassword(false);
    }
  }

  function handleDeleteAccount() {
    setDeleteError(null);
    setDeleteConfirmation("");
    setIsDeleteConfirmOpen(true);
  }

  function handleDeleteConfirmOpenChange(open: boolean) {
    setIsDeleteConfirmOpen(open);

    if (!open) {
      setDeleteConfirmation("");
    }
  }

  async function confirmDeleteAccount() {
    setDeleteError(null);

    if (deleteConfirmation !== "DELETE") {
      setDeleteError(t.deleteAccountRequireConfirmation);
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAccount();
      setIsDeleteConfirmOpen(false);
      setDeleteConfirmation("");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.deleteAccountFailed));
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    avatarError,
    deleteConfirmation,
    deleteError,
    fileInputRef,
    confirmDeleteAccount,
    confirmPasswordChange,
    confirmProfileDetailsChange,
    confirmUsernameChange,
    handleAvatarChange,
    handleDeleteAccount,
    handleDeleteConfirmOpenChange,
    handlePasswordSubmit,
    handleProfileDetailsSubmit,
    handleUsernameDialogOpenChange,
    handleUsernameSubmit,
    isUsernameConfirmOpen,
    isUsernameDialogOpen,
    isChangingPassword,
    isDeleteConfirmOpen,
    isDeleting,
    isPasswordConfirmOpen,
    isProfileDetailsConfirmOpen,
    isUpdatingUsername,
    isUpdatingProfileDetails,
    isUploadingAvatar,
    passwordError,
    passwordFormRef,
    pendingPassword,
    pendingUsername,
    profileUser,
    profileDetailsError,
    pendingProfileDetails,
    openUsernameDialog,
    setIsDeleteConfirmOpen,
    setIsUsernameConfirmOpen,
    setIsPasswordConfirmOpen,
    setIsProfileDetailsConfirmOpen,
    setDeleteConfirmation,
    setUsernameDraft,
    t,
    usernameDraft,
    usernameError,
  };
}
