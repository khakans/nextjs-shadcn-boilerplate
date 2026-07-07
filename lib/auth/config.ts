import { apiPath } from "@/lib/api-paths";

export const ACCESS_TOKEN_COOKIE_NAME = "access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
export const GOOGLE_OAUTH_STATE_COOKIE_NAME = "google_oauth_state";
export const GOOGLE_OAUTH_LINK_COOKIE_NAME = "google_oauth_link";
export const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }

  return new TextEncoder().encode(secret);
}

export function getAccessTokenExpiresIn() {
  return parseDurationSeconds(process.env.ACCESS_TOKEN_EXPIRES_IN, 60 * 60);
}

export function getAccessTokenExpiresAt() {
  return Math.floor(Date.now() / 1000) + getAccessTokenExpiresIn();
}

export function getAccessTokenMaxAge() {
  return getAccessTokenExpiresIn();
}

export function getRefreshTokenMaxAge() {
  return parseDurationSeconds(
    process.env.REFRESH_TOKEN_EXPIRES_IN,
    60 * 60 * 24 * 30,
  );
}

export function getRefreshTokenExpiresAt() {
  return new Date(Date.now() + getRefreshTokenMaxAge() * 1000);
}

export function getGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is required.");
  }

  return clientId;
}

export function getGoogleClientSecret() {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is required.");
  }

  return normalizeGoogleClientSecret(clientSecret);
}

export function getAppBaseUrl(requestUrl: string) {
  const configuredUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const url = new URL(requestUrl);

  if (url.hostname === "127.0.0.1") {
    url.hostname = "localhost";
  }

  return url.origin;
}

export function getGoogleRedirectUri(requestUrl: string) {
  return new URL(
    apiPath("/auth/google/callback"),
    getAppBaseUrl(requestUrl),
  ).toString();
}

function normalizeGoogleClientSecret(clientSecret: string) {
  const trimmedClientSecret = clientSecret.trim();
  const googleSecretMatches = [
    ...trimmedClientSecret.matchAll(/GOCSPX-[A-Za-z0-9_-]+?(?=GOCSPX-|$)/g),
  ].map((match) => match[0]);

  if (googleSecretMatches.length <= 1) {
    return trimmedClientSecret;
  }

  const uniqueSecrets = new Set(googleSecretMatches);

  if (uniqueSecrets.size === 1) {
    return googleSecretMatches[0];
  }

  throw new Error(
    "GOOGLE_CLIENT_SECRET contains multiple different Google client secrets.",
  );
}

function parseDurationSeconds(value: string | undefined, fallbackSeconds: number) {
  if (!value) {
    return fallbackSeconds;
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return fallbackSeconds;
  }

  return Math.floor(seconds);
}
