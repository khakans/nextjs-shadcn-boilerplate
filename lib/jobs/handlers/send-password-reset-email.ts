import { z } from "zod";

import {
  maskEmail,
  sendPasswordResetEmail,
} from "@/lib/auth/password-reset-email";

const passwordResetEmailPayloadSchema = z.object({
  userId: z.uuid(),
  email: z.email(),
  name: z.string().min(1),
  resetUrl: z.url(),
});

export async function handleSendPasswordResetEmailJob(payload: unknown) {
  const parsed = passwordResetEmailPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("Invalid SEND_PASSWORD_RESET_EMAIL payload.");
  }

  await sendPasswordResetEmail(parsed.data);
  console.info(
    `[jobs] Password reset email sent to ${maskEmail(parsed.data.email)} for user ${parsed.data.userId}.`,
  );
}
