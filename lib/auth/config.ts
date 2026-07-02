export const ACCESS_TOKEN_COOKIE_NAME = "access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
export const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }

  return new TextEncoder().encode(secret);
}

export function getAccessTokenExpiresIn() {
  return process.env.ACCESS_TOKEN_EXPIRES_IN ?? "1h";
}

export function getAccessTokenMaxAge() {
  return parseDurationToSeconds(getAccessTokenExpiresIn(), 60 * 60);
}

export function getRefreshTokenMaxAge() {
  return parseDurationToSeconds(
    process.env.REFRESH_TOKEN_EXPIRES_IN ?? "30d",
    60 * 60 * 24 * 30,
  );
}

export function getRefreshTokenExpiresAt() {
  return new Date(Date.now() + getRefreshTokenMaxAge() * 1000);
}

function parseDurationToSeconds(duration: string, fallbackSeconds: number) {
  const match = duration.match(/^(\d+)([smhd])$/);

  if (!match) {
    return fallbackSeconds;
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 60 * 60 * 24;
    default:
      return fallbackSeconds;
  }
}
