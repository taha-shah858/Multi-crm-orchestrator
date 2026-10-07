import "server-only";

import { createHash, randomBytes, randomInt } from "crypto";
import type { Prisma } from "@prisma/client";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";

export function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateCryptoToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function generate6DigitOtp(): string {
  return randomInt(100000, 1000000).toString();
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  fallbackSnippet: string; // for the terminal log
}

/**
 * Enterprise Email Dispatcher:
 * Supports SMTP (via Nodemailer) or Resend API if configured in .env.
 * Gracefully falls back to terminal dispatch log in development/local environments.
 */
export async function sendEmail({ to, subject, html, fallbackSnippet }: SendEmailParams): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const smtpUser = process.env.SMTP_USER?.trim(), smtpPass = process.env.SMTP_PASS?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || (smtpHost.includes("gmail") ? 465 : 587));
  const from = process.env.SMTP_FROM?.trim() || smtpUser;
  const configured = Boolean(resendApiKey || (smtpUser && smtpPass));
  if (!configured && process.env.NODE_ENV !== "production" && process.env.EMAIL_DEV_LOG === "true") {
    console.info("[LOCAL TEST EMAIL] To: " + to + " | Code/Link: " + fallbackSnippet);
    return true;
  }
  if (!configured || !from) throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 503, "Email provider is not configured.", "Configure Resend or SMTP before sending verification codes or invitations.");
  try {
    if (resendApiKey) {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(15000), headers: { Authorization: "Bearer " + resendApiKey, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, html }) });
      if (!response.ok) throw new Error("Email delivery rejected");
    } else {
      const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, connectionTimeout: 15000, socketTimeout: 15000, auth: { user: smtpUser, pass: smtpPass } });
      try { await transporter.sendMail({ from, to, subject, html }); } finally { transporter.close(); }
    }
    return true;
  } catch {
    throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Email delivery failed.", "The email provider could not send this message. Check its configuration and retry.");
  }
}

export function buildOtpEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Multi-CRM Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #0f172a; padding: 24px 32px; text-align: left;">
      <span style="display: inline-block; font-size: 14px; font-weight: 800; letter-spacing: 0.1em; color: #38bdf8; text-transform: uppercase;">
        Multi-CRM Orchestrator
      </span>
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 8px 0 0 0;">Account Verification</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 15px; line-height: 24px; color: #334155; margin-top: 0;">
        You are completing your registration for the Multi-CRM Orchestrator platform. Use the verification code below to confirm your email and activate your administrator workspace.
      </p>

      <div style="margin: 28px 0; text-align: center;">
        <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #94a3b8; border-radius: 10px; padding: 16px 36px;">
          <span style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0284c7;">
            ${otp}
          </span>
        </div>
      </div>

      <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 500;">
          ⏱ This code expires in <strong>10 minutes</strong>. If you did not request this code, no action is needed.
        </p>
      </div>

      <p style="font-size: 13px; line-height: 20px; color: #64748b; margin-bottom: 0;">
        For security reasons, never share this code with anyone. Multi-CRM support will never ask for your one-time code.
      </p>
    </div>
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        &copy; ${new Date().getFullYear()} Multi-CRM Orchestrator. Enterprise Security Architecture.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates an Enterprise HTML email template for Workspace Invitations
 */
export function buildInviteEmailHtml(options: {
  inviteUrl: string;
  role: string;
  organizationName: string;
}): string {
  const roleName = options.role === "ADMIN" ? "Administrator" : options.role === "MANAGER" ? "Manager" : "Sales Agent";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invitation to join ${options.organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #0f172a; padding: 24px 32px; text-align: left;">
      <span style="display: inline-block; font-size: 13px; font-weight: 800; letter-spacing: 0.1em; color: #38bdf8; text-transform: uppercase;">
        Multi-CRM Orchestrator
      </span>
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 8px 0 0 0;">Team Member Invitation</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 15px; line-height: 24px; color: #334155; margin-top: 0;">
        You have been invited to join the <strong>${options.organizationName}</strong> workspace as a <strong>${roleName}</strong>.
      </p>

      <div style="margin: 32px 0; text-align: center;">
        <a href="${options.inviteUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; padding: 14px 32px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
          Accept Invitation & Set Password &rarr;
        </a>
      </div>

      <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #475569;">
          🔐 This invitation is uniquely intended for you and will expire in <strong>48 hours</strong>.
        </p>
      </div>

      <p style="font-size: 12px; line-height: 18px; color: #94a3b8; word-break: break-all; margin-bottom: 0;">
        If button clicking doesn't work, copy and paste this link into your browser:<br/>
        <a href="${options.inviteUrl}" style="color: #2563eb;">${options.inviteUrl}</a>
      </p>
    </div>
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        &copy; ${new Date().getFullYear()} Multi-CRM Orchestrator. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatch OTP verification email to user
 */

export async function sendOtpEmail(email: string, otp: string) {
  return sendEmail({ to: email, subject: "Your Multi-CRM verification code", html: buildOtpEmailHtml(otp), fallbackSnippet: otp });
}

export async function sendInviteEmail(options: { email: string; inviteUrl: string; role: string; organizationName: string }) {
  return sendEmail({ to: options.email, subject: "You've been invited to join " + options.organizationName + " on Multi-CRM", html: buildInviteEmailHtml(options), fallbackSnippet: options.inviteUrl });
}

type PendingSignup = { workspace: string; email: string; passwordHash: string; name?: string; accountType: "ADMIN" };
const cooldown = (updatedAt: Date) => Date.now() - updatedAt.getTime() < 60000;
const waitForResend = () => new AppError("INVALID_REQUEST", 429, "Verification resend throttled.", "Wait one minute before requesting another verification code.");

export async function storePendingSignupOtp(signupData: PendingSignup) {
  const otp = generate6DigitOtp(), otpHash = hashSha256(otp), expiresAt = new Date(Date.now() + 600000);
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', signupData.email);
    const existing = await tx.emailVerificationToken.findUnique({ where: { email: signupData.email } });
    if (existing && cooldown(existing.updatedAt)) throw waitForResend();
    const data = { otpHash, signupData: signupData as Prisma.InputJsonValue, expiresAt, attempts: 0 };
    await tx.emailVerificationToken.upsert({ where: { email: signupData.email }, update: data, create: { email: signupData.email, ...data } });
  });
  await sendOtpEmail(signupData.email, otp);
  return { expiresAt };
}

export async function verifyAndConsumePendingSignupOtp<T>(email: string, otp: string, complete: (tx: Prisma.TransactionClient, data: PendingSignup) => Promise<T>): Promise<T> {
  const record = await prisma.emailVerificationToken.findUnique({ where: { email } });
  if (!record) throw new AppError("INVALID_OTP", 404, "No pending registration.", "Start the signup process again.");
  if (record.expiresAt.getTime() <= Date.now()) throw new AppError("OTP_EXPIRED", 410, "Verification code expired.", "Request a new code.");
  if (record.attempts >= 5) throw new AppError("INVALID_OTP", 429, "Too many verification attempts.", "Request a new code before trying again.");
  if (hashSha256(otp.trim()) !== record.otpHash) {
    await prisma.emailVerificationToken.updateMany({ where: { id: record.id, otpHash: record.otpHash, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
    throw new AppError("INVALID_OTP", 400, "Incorrect verification code.", "Check the six-digit code and try again.");
  }
  return prisma.$transaction(async tx => {
    const consumed = await tx.emailVerificationToken.deleteMany({ where: { id: record.id, otpHash: record.otpHash, expiresAt: { gt: new Date() }, attempts: { lt: 5 } } });
    if (consumed.count !== 1) throw new AppError("INVALID_OTP", 409, "Verification code already used or replaced.", "Request a new code and try again.");
    return complete(tx, record.signupData as unknown as PendingSignup);
  });
}

export async function resendPendingSignupOtp(email: string) {
  const otp = generate6DigitOtp(), expiresAt = new Date(Date.now() + 600000);
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', email);
    const record = await tx.emailVerificationToken.findUnique({ where: { email } });
    if (!record) throw new AppError("INVALID_REQUEST", 404, "No pending signup.", "Start the signup process again.");
    if (cooldown(record.updatedAt)) throw waitForResend();
    await tx.emailVerificationToken.update({ where: { id: record.id }, data: { otpHash: hashSha256(otp), expiresAt, attempts: 0 } });
  });
  await sendOtpEmail(email, otp);
  return { success: true, expiresAt };
}
