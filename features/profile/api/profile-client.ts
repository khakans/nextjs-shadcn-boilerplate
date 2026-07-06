import { apiRequest } from "@/lib/api/http-client";
import type { AuthUser } from "@/lib/auth";

type ProfileUserResponse = {
  user: AuthUser;
};

type OkResponse = {
  ok: true;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type UpdateUsernameInput = {
  username: string | null;
};

export type UpdateProfileDetailsInput = {
  birthDate: string | null;
  birthPlace: string | null;
  gender: string | null;
  mobileNumber: string | null;
};

export function updateUsername(input: UpdateUsernameInput) {
  return apiRequest<ProfileUserResponse>("/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function updateProfileDetails(input: UpdateProfileDetailsInput) {
  return apiRequest<ProfileUserResponse>("/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("avatar", file);

  return apiRequest<ProfileUserResponse>("/profile/avatar", {
    method: "POST",
    body: formData,
  });
}

export function changePassword(input: ChangePasswordInput) {
  return apiRequest<ProfileUserResponse>("/profile/password", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function deleteAccount() {
  return apiRequest<OkResponse>("/profile", {
    method: "DELETE",
  });
}
