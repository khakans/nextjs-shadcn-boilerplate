import { apiPath } from "@/lib/api-paths";
import { apiRequest } from "@/lib/api/http-client";
import type { AuthUser } from "@/lib/auth";
import type { PaginationMeta } from "@/lib/pagination";

type AuthUserResponse = {
  user: AuthUser;
};

type OkResponse = {
  ok: true;
};

export type UserSessionItem = {
  id: string;
  sessionId: string;
  browser: string | null;
  operatingSystem: string | null;
  deviceName: string | null;
  ipAddress: string | null;
  loginAt: string;
  lastActiveAt: string;
  logoutAt: string | null;
  expiredAt: string;
  status: "ONLINE" | "LOGGED_OUT" | "EXPIRED" | "REVOKED";
  isCurrent: boolean;
};

type UserSessionsResponse = {
  sessions: UserSessionItem[];
  pagination: PaginationMeta;
};

export type LoginInput = {
  identifier: string;
  password: string;
};

export type SignupInput = {
  name: string;
  email: string;
  password: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export function login(input: LoginInput) {
  return apiRequest<AuthUserResponse>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function signup(input: SignupInput) {
  return apiRequest<AuthUserResponse>("/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function logout() {
  return apiRequest<OkResponse>("/auth/logout", {
    method: "POST",
  });
}

export function forgotPassword(input: ForgotPasswordInput) {
  return apiRequest<OkResponse>("/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function resetPassword(input: ResetPasswordInput) {
  return apiRequest<OkResponse>("/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function getUserSessions(page = 1, pageSize = 10) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiRequest<UserSessionsResponse>(`/auth/sessions?${params.toString()}`);
}

export function revokeUserSession(sessionId: string) {
  return apiRequest<OkResponse>(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export function logoutOtherUserSessions() {
  return apiRequest<OkResponse>("/auth/sessions/logout-others", {
    method: "POST",
  });
}

export function getGoogleAuthUrl() {
  return apiPath("/auth/google");
}

export function getGoogleLinkUrl() {
  return apiPath("/auth/google/link");
}
