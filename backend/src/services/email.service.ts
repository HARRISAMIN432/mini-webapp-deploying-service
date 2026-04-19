import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";
import { logger } from "../utils/logger";

// ─── Transport Singleton ─────────────────────────────────────────────────────
let transporter: Transporter;

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      pool: true,
      maxConnections: 5,
    });
  }
  return transporter;
};

// ─── Template Engine (inline — swap for a template library if needed) ─────────
const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ShipStack</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#161b27;border:1px solid #1e2537;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px;border-bottom:1px solid #1e2537;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">⚡ ShipStack</span>
            </td>
          </tr>
          <tr><td style="padding:36px 40px;">${content}</td></tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1e2537;text-align:center;">
              <p style="color:#4b5563;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} ShipStack. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Email Senders ────────────────────────────────────────────────────────────
export const sendVerificationEmail = async (
  to: string,
  name: string,
  otp: string,
): Promise<void> => {
  const html = baseTemplate(`
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Verify your email</h2>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 28px;">Hi ${name}, use the code below to verify your email address.</p>
    <div style="background:#0f1117;border:1px solid #1e2537;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
      <span style="font-size:36px;font-weight:700;color:#3b82f6;letter-spacing:8px;">${otp}</span>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">
      This code expires in ${env.OTP_EXPIRES_MINUTES} minutes. Do not share it with anyone.
    </p>
  `);

  await send({ to, subject: "Verify your ShipStack account", html });
};

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  otp: string,
): Promise<void> => {
  const html = baseTemplate(`
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Reset your password</h2>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 28px;">Hi ${name}, use the code below to reset your password.</p>
    <div style="background:#0f1117;border:1px solid #1e2537;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
      <span style="font-size:36px;font-weight:700;color:#3b82f6;letter-spacing:8px;">${otp}</span>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">
      This code expires in ${env.OTP_EXPIRES_MINUTES} minutes. If you didn't request this, ignore this email.
    </p>
  `);

  await send({ to, subject: "Reset your ShipStack password", html });
};

export const sendLoginOtpEmail = async (
  to: string,
  name: string,
  otp: string,
): Promise<void> => {
  const html = baseTemplate(`
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Your sign-in code</h2>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 28px;">Hi ${name}, here is your one-time sign-in code.</p>
    <div style="background:#0f1117;border:1px solid #1e2537;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
      <span style="font-size:36px;font-weight:700;color:#3b82f6;letter-spacing:8px;">${otp}</span>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">
      Expires in ${env.OTP_EXPIRES_MINUTES} minutes. Never share this code.
    </p>
  `);

  await send({ to, subject: "Your ShipStack sign-in code", html });
};

// ─── Core Send ─────────────────────────────────────────────────────────────────
interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

const send = async (options: MailOptions): Promise<void> => {
  try {
    await getTransporter().sendMail({
      from: `"ShipStack" <${env.EMAIL_FROM}>`,
      ...options,
    });
    logger.info("Email sent", { to: options.to, subject: options.subject });
  } catch (err) {
    logger.error("Email send failed", {
      to: options.to,
      error: (err as Error).message,
    });
    // Don't throw — log and continue (caller can decide to surface this)
    throw err;
  }
};
