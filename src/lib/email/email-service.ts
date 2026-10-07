import "server-only";

import { createHash, randomBytes, randomInt } from "crypto";
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
  return randomInt(100000, 999999).toString();
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
  const smtpUser = process.env.SMTP_USER?.trim();
  const rawSmtpPass = process.env.SMTP_PASS?.trim();
  const smtpPass = rawSmtpPass ? rawSmtpPass.replace(/\s+/g, "") : undefined;
  const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || (smtpHost.includes("gmail") ? 465 : 587));
  const fromAddress = process.env.SMTP_FROM?.trim() || (smtpUser ? `"Multi-CRM Security" <${smtpUser}>` : "Multi-CRM Security <security@multicrm.internal>");

  // 1. Try Resend if configured
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          html,
        }),
      });
      if (response.ok) {
        console.log(`[EMAIL DISPATCH: RESEND] Successfully sent to: ${to}`);
        return true;
      }
      console.warn(`[EMAIL DISPATCH: RESEND] Request failed with status ${response.status}. Falling back to terminal log.`);
    } catch (err) {
      console.warn(`[EMAIL DISPATCH: RESEND] Error dispatching email:`, err);
    }
  }

  // 2. Try SMTP if credentials exist
  if (smtpUser && smtpPass) {
    try {
      const isGmail = smtpHost.includes("gmail");
      const transporter = nodemailer.createTransport(
        isGmail
          ? {
              service: "gmail",
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
            }
          : {
              host: smtpHost,
              port: smtpPort,
              secure: smtpPort === 465,
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
            }
      );

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
      });

      console.log(`[EMAIL DISPATCH: SMTP] Successfully sent to: ${to} (MessageId: ${info.messageId})`);
      return true;
    } catch (err) {
      console.warn(`[EMAIL DISPATCH: SMTP] Error sending via SMTP:`, err);
    }
  }

  // 3. Fallback / Dev Mode
  console.log(`[EMAIL DISPATCH] To: ${to} | Code/Link: ${fallbackSnippet}`);
  return true;
}

/**
 * Generates an Enterprise HTML email template for OTP Verification
 */
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
  try {
    await sendEmail({
      to: email,
      subject: `Your Multi-CRM Verification Code: ${otp}`,
      html: buildOtpEmailHtml(otp),
      fallbackSnippet: otp,
    });
  } catch (err) {
    console.warn(`[OTP EMAIL DISPATCH WARNING]`, err);
  }
  console.log(`[DEV OTP DISPATCH] To: ${email} | Code: ${otp}`);
  return true;
}

/**
 * Dispatch Team Member Invitation email
 */
export async function sendInviteEmail(options: {
  email: string;
  inviteUrl: string;
  role: string;
  organizationName: string;
}) {
  try {
    return await sendEmail({
      to: options.email,
      subject: `You've been invited to join ${options.organizationName} on Multi-CRM`,
      html: buildInviteEmailHtml(options),
      fallbackSnippet: options.inviteUrl,
    });
  } catch (err) {
    console.warn(`[INVITE EMAIL DISPATCH WARNING]`, err);
    console.log(`[DEV INVITE DISPATCH] To: ${options.email} | Link: ${options.inviteUrl}`);
    return false;
  }
}

/**
 * Store or update pending sign up in EmailVerificationToken table (10-minute expiry)
 */
export async function storePendingSignupOtp(signupData: {
  workspace: string;
  email: string;
  passwordHash: string;
  name?: string;
  accountType: "ADMIN";
}) {
  const otp = generate6DigitOtp();
  const otpHash = hashSha256(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Upsert token in database
  await prisma.emailVerificationToken.upsert({
    where: { email: signupData.email },
    update: {
      otpHash,
      signupData: signupData as any,
      expiresAt,
    },
    create: {
      email: signupData.email,
      otpHash,
      signupData: signupData as any,
      expiresAt,
    },
  });

  // Safely attempt email dispatch without throwing
  try {
    await sendOtpEmail(signupData.email, otp);
  } catch (err) {
    console.warn(`[EMAIL DISPATCH SAFE FALLBACK]`, err);
    console.log(`[DEV OTP DISPATCH] To: ${signupData.email} | Code: ${otp}`);
  }

  return { otp, expiresAt };
}

/**
 * Verify submitted OTP and retrieve pending signup data
 */
export async function verifyAndConsumePendingSignupOtp(email: string, otp: string) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { email },
  });

  if (!record) {
    throw new AppError(
      "INVALID_OTP",
      404,
      "No pending registration found for this email.",
      "Please start the signup process again."
    );
  }

  if (record.expiresAt.getTime() < Date.now()) {
    // Expired token
    await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => null);
    throw new AppError(
      "OTP_EXPIRED",
      410,
      "Verification code has expired.",
      "Please request a new code."
    );
  }

  const providedHash = hashSha256(otp.trim());
  if (providedHash !== record.otpHash) {
    throw new AppError(
      "INVALID_OTP",
      400,
      "Invalid verification code.",
      "Check the 6-digit code and try again."
    );
  }

  // Token is valid! Delete it to prevent re-use
  await prisma.emailVerificationToken.delete({ where: { id: record.id } });

  return record.signupData as {
    workspace: string;
    email: string;
    passwordHash: string;
    name?: string;
    accountType: "ADMIN";
  };
}

/**
 * Resend OTP for existing pending signup
 */
export async function resendPendingSignupOtp(email: string) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { email },
  });

  if (!record) {
    throw new AppError(
      "INVALID_REQUEST",
      404,
      "No pending registration found for this email.",
      "Please start the signup process again."
    );
  }

  const otp = generate6DigitOtp();
  const otpHash = hashSha256(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.emailVerificationToken.update({
    where: { id: record.id },
    data: {
      otpHash,
      expiresAt,
    },
  });

  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    console.warn(`[RESEND OTP DISPATCH WARNING]`, err);
    console.log(`[DEV OTP DISPATCH] To: ${email} | Code: ${otp}`);
  }
  return { success: true, expiresAt };
}
