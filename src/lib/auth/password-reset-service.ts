import "server-only";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { hashPassword } from "./auth-service";
import { forgotPasswordSchema, resetPasswordSchema, formatZodError } from "./validations";
import { generateCryptoToken, hashSha256, sendEmail } from "@/lib/email/email-service";

const MESSAGE = "If an active account uses this email, a password reset link will be sent. Check your inbox and spam folder.";
const invalidLink = () => new AppError("INVALID_REQUEST", 400, "Invalid password reset token.", "This reset link has expired or has already been used. Request a new link.");

export async function requestPasswordReset(input: unknown, now = new Date()) {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) throw new AppError("INVALID_REQUEST", 400, "Invalid reset request.", formatZodError(parsed.error));
  const account = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, status: true } });
  if (!account || account.status !== "ACTIVE") return { message: MESSAGE };
  // Trust configured application URL, never the incoming Host/Origin header.
  const configuredUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  let resetUrl: URL;
  try {
    resetUrl = new URL("/reset-password", configuredUrl);
    if (!["https:", "http:"].includes(resetUrl.protocol) || resetUrl.username || resetUrl.password || (process.env.NODE_ENV === "production" && resetUrl.protocol !== "https:")) throw new Error("Invalid application URL");
  } catch {
    console.warn("[Password reset] Application URL is not configured correctly.");
    return { message: MESSAGE };
  }
  const token = generateCryptoToken();
  const tokenHash = hashSha256(token);
  const issued = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${account.id} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: account.id }, select: { status: true } });
    if (user?.status !== "ACTIVE") return false;
    const previous = await tx.passwordResetToken.findUnique({ where: { userId: account.id } });
    if (previous && now.getTime() - previous.createdAt.getTime() < 60000) return false;
    const data = { tokenHash, expiresAt: new Date(now.getTime() + 30 * 60000), createdAt: now };
    await tx.passwordResetToken.upsert({ where: { userId: account.id }, create: { userId: account.id, ...data }, update: data });
    return true;
  });
  if (!issued) return { message: MESSAGE };
  resetUrl.searchParams.set("token", token);
  const link = resetUrl.toString().replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  try {
    await sendEmail({ to: parsed.data.email, subject: "Reset your Multi-CRM password", html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a"><h2>Reset your password</h2><p>Use the link below to choose a new password. The link expires in 30 minutes and can be used once.</p><p><a href="${link}">Reset password</a></p><p>If you did not request this, you can ignore this email. Your password has not changed.</p></div>`, fallbackSnippet: resetUrl.toString() });
  } catch {
    await prisma.passwordResetToken.deleteMany({ where: { userId: account.id, tokenHash } });
    console.warn("[Password reset] Email delivery failed; issued link invalidated.");
  }
  // Same public response for missing, suspended, throttled and eligible accounts.
  return { message: MESSAGE };
}

export async function resetPassword(input: unknown, now = new Date()) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) throw new AppError("INVALID_REQUEST", 400, "Invalid reset input.", formatZodError(parsed.error));
  const tokenHash = hashSha256(parsed.data.token);
  const pending = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!pending || pending.expiresAt <= now) throw invalidLink();
  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${pending.userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: pending.userId }, select: { id: true, organizationId: true, status: true } });
    if (!user || user.status !== "ACTIVE") throw invalidLink();
    const consumed = await tx.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash, expiresAt: { gt: now } } });
    if (consumed.count !== 1) throw invalidLink();
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.authSession.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id, action: "USER_UPDATED", entityType: "USER", entityId: user.id, source: "PLATFORM", metadata: { passwordReset: true, sessionsRevoked: true } } });
  });
  return { message: "Password updated. Sign in with your new password." };
}
