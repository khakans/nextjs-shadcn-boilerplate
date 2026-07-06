import { apiPath } from "@/lib/api-paths";
import { apiRequest } from "@/lib/api/http-client";
import type { AuthUser } from "@/lib/auth";

type AuthUserResponse = {
  user: AuthUser;
};

type OkResponse = {
  ok: true;
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

export function getGoogleAuthUrl() {
  return apiPath("/auth/google");
}

export function getGoogleLinkUrl() {
  return apiPath("/auth/google/link");
}
