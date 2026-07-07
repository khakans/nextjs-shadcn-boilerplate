import { z } from "zod";

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type SignupRequest = {
  name: string;
  email: string;
  password: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  password: string;
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

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required."),
  password: z.string().min(1, "Password is required."),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(32, "Reset token is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function readJsonBody(request: Request) {
  return request.json().catch(() => null);
}

export function parseLoginRequest(body: unknown): RequestParseResult<LoginRequest> {
  const result = loginSchema.safeParse(body);

  return parseZodResult(result);
}

export function parseSignupRequest(
  body: unknown,
): RequestParseResult<SignupRequest> {
  const result = signupSchema.safeParse(body);

  return parseZodResult(result);
}

export function parseForgotPasswordRequest(
  body: unknown,
): RequestParseResult<ForgotPasswordRequest> {
  const result = forgotPasswordSchema.safeParse(body);

  return parseZodResult(result);
}

export function parseResetPasswordRequest(
  body: unknown,
): RequestParseResult<ResetPasswordRequest> {
  const result = resetPasswordSchema.safeParse(body);

  return parseZodResult(result);
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
