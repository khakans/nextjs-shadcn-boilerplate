import nodemailer from "nodemailer";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendSmtpMail(input: SendMailInput) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  const encryption = process.env.SMTP_ENCRYPTION ?? "starttls";
  const secure = encryption === "tls";

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP configuration is incomplete.");
  }

  if (!["tls", "starttls", "none"].includes(encryption)) {
    throw new Error("SMTP_ENCRYPTION must be tls, starttls, or none.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: encryption === "starttls",
    ignoreTLS: encryption === "none",
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
