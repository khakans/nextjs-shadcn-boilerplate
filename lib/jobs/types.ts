import type { PasswordResetEmailPayload } from "@/lib/auth/password-reset-email";

export const jobTypes = {
  sendPasswordResetEmail: "SEND_PASSWORD_RESET_EMAIL",
} as const;

export type JobType = (typeof jobTypes)[keyof typeof jobTypes];

export type JobPayloadByType = {
  [jobTypes.sendPasswordResetEmail]: PasswordResetEmailPayload;
};

export type JobPayload<T extends JobType> = JobPayloadByType[T];
