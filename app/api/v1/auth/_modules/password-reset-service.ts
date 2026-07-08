import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getAppBaseUrl } from "@/lib/auth/config";
import { clearAuthCookies } from "@/lib/auth/session";
import { ApiError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { jobTypes } from "@/lib/jobs/types";
import { auditAction, auditTrailActions } from "@/lib/audit-trail";
import { prisma } from "@/lib/prisma";

import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "./request";

const passwordResetTokenBytes = 48;
const passwordResetTokenMaxAgeMs = 30 * 60 * 1000;
const forgotPasswordSuccessMessage =
  "If that email exists, we sent password reset instructions.";

export async function forgotPasswordService(
  input: ForgotPasswordRequest,
  requestUrl: string,
) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return {
      ok: true,
      message: forgotPasswordSuccessMessage,
    };
  }

  const token = randomBytes(passwordResetTokenBytes).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + passwordResetTokenMaxAgeMs);
  const resetUrl = new URL("/reset-password", getAppBaseUrl(requestUrl));
  resetUrl.searchParams.set("token", token);

  await auditAction(auditTrailActions.passwordResetRequested, async () => {
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    try {
      await enqueueJob(
        jobTypes.sendPasswordResetEmail,
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          resetUrl: resetUrl.toString(),
        },
        {
          maxAttempts: 5,
        },
      );
    } catch (error) {
      throw new ApiError("Unable to queue password reset email.", 500, {
        cause: error,
      });
    }
  });

  return {
    ok: true,
    message: forgotPasswordSuccessMessage,
  };
}

export async function resetPasswordService(
  input: ResetPasswordRequest,
) {
  const now = new Date();
  const tokenHash = hashResetToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      expiresAt: true,
      usedAt: true,
      user: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt <= now ||
    !resetToken.user.isActive
  ) {
    const invalidResetTokenError = new ApiError(
      "Password reset link is invalid or expired.",
      400,
    );

    await auditAction(auditTrailActions.passwordResetCompleted, async () => {
      throw invalidResetTokenError;
    });
    throw invalidResetTokenError;
  }

  const passwordHash = await hashPassword(input.password);

  await auditAction(auditTrailActions.passwordResetCompleted, () =>
    prisma.$transaction([
      prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: now,
        },
      }),
      prisma.user.update({
        where: {
          id: resetToken.user.id,
        },
        data: {
          passwordHash,
          tokenVersion: {
            increment: 1,
          },
        },
      }),
      prisma.refreshToken.updateMany({
        where: {
          userId: resetToken.user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
          lastUsedAt: now,
        },
      }),
      prisma.userSession.updateMany({
        where: {
          userId: resetToken.user.id,
          status: "ONLINE",
        },
        data: {
          status: "REVOKED",
          logoutAt: now,
          lastActiveAt: now,
        },
      }),
    ]),
  );
  await clearAuthCookies();

  return {
    ok: true,
  };
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
