import { sendSmtpMail } from "@/lib/email/smtp";

export type PasswordResetEmailPayload = {
  userId: string;
  email: string;
  name: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: PasswordResetEmailPayload) {
  const subject = "Reset your password";
  const text = [
    `Hi ${name},`,
    "",
    "We received a request to reset your password.",
    `Open this link to set a new password: ${resetUrl}`,
    "",
    "This link expires in 30 minutes. If you did not request this, you can ignore this email.",
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(name)},</p>`,
    "<p>We received a request to reset your password.</p>",
    `<p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>`,
    "<p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>",
  ].join("");

  await sendSmtpMail({
    to: email,
    subject,
    text,
    html,
  });
}

export function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return "[invalid-email]";
  }

  const visiblePrefix = localPart.slice(0, 2);
  const visibleSuffix = localPart.length > 4 ? localPart.slice(-1) : "";

  return `${visiblePrefix}${"*".repeat(Math.max(localPart.length - 3, 3))}${visibleSuffix}@${domain}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
