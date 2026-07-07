import { z } from "zod";

import {
  parseLoginRequest,
  parseSignupRequest,
  readJsonBody,
} from "@/app/api/v1/auth/_modules/request";

export { parseLoginRequest, parseSignupRequest, readJsonBody };

export type MobileRefreshRequest = {
  refreshToken: string;
};

export type MobileLogoutRequest = {
  refreshToken: string;
};

export type MobileGoogleRequest = {
  idToken: string;
};

type RequestParseResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(32, "Refresh token is required."),
});

const googleSchema = z.object({
  idToken: z.string().trim().min(1, "Google ID token is required."),
});

export function parseMobileRefreshRequest(
  body: unknown,
): RequestParseResult<MobileRefreshRequest> {
  return parseZodResult(refreshTokenSchema.safeParse(body));
}

export function parseMobileLogoutRequest(
  body: unknown,
): RequestParseResult<MobileLogoutRequest> {
  return parseZodResult(refreshTokenSchema.safeParse(body));
}

export function parseMobileGoogleRequest(
  body: unknown,
): RequestParseResult<MobileGoogleRequest> {
  return parseZodResult(googleSchema.safeParse(body));
}

function parseZodResult<T>(
  result:
    | {
        success: true;
        data: T;
      }
    | {
        success: false;
        error: z.ZodError;
      },
) {
  if (result.success) {
    return {
      ok: true,
      data: result.data,
    } satisfies RequestParseResult<T>;
  }

  return {
    ok: false,
    error: result.error.issues[0]?.message ?? "Invalid request body.",
  } satisfies RequestParseResult<T>;
}
