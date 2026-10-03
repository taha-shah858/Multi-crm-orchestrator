import type { NextRequest } from "next/server";
import twilio from "twilio";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

async function admin(request: NextRequest) {
  const user = await requireAuthenticatedUser(request);
  if (user.role !== "ADMIN") throw new AppError("FORBIDDEN", 403, "Admin required.", "Only administrators can configure Twilio numbers.");
  return user;
}
export async function GET(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const user = await admin(request);
    const [identities, clients] = await Promise.all([
      prisma.communicationIdentity.findMany({ where: { organizationId: user.organizationId, provider: "TWILIO" }, include: { clientAccount: { select: { name: true } } } }),
      prisma.clientAccount.findMany({ where: { organizationId: user.organizationId }, select: { id: true, name: true } }),
    ]);
    return success({ identities, clients, configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PUBLIC_URL) }, requestId);
  });
}
export async function POST(request: NextRequest) {
  return withApiErrorHandling(request, async requestId => {
    const user = await admin(request), input = await request.json();
    const phone = typeof input.phoneNumber === "string" ? input.phoneNumber.trim() : "";
    const label = typeof input.label === "string" ? input.label.trim() : "";
    if (!/^\+[1-9]\d{6,14}$/.test(phone) || !label || label.length > 100 || typeof input.clientAccountId !== "string") throw new AppError("INVALID_COMMUNICATION_INPUT", 422, "Invalid identity.", "Choose a client, a label and a phone number with country code.");
    const client = await prisma.clientAccount.findFirst({ where: { id: input.clientAccountId, organizationId: user.organizationId } });
    if (!client) throw new AppError("FORBIDDEN", 403, "Client outside organization.", "Choose your organization's client.");
    const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new AppError("COMMUNICATION_PROVIDER_UNAVAILABLE", 409, "Missing credentials.", "Configure Twilio server credentials first.");
    const numbers = await twilio(sid, token).incomingPhoneNumbers.list({ phoneNumber: phone, limit: 2 });
    if (!numbers.some(number => number.phoneNumber === phone)) throw new AppError("INVALID_COMMUNICATION_INPUT", 422, "Unowned phone number.", "Choose a phone number owned by the configured Twilio account.");
    const identity = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${phone}))`;
      const other = await tx.communicationIdentity.findFirst({ where: { provider: "TWILIO", phoneNumber: phone, clientAccountId: { not: client.id }, isEnabled: true } });
      if (other) throw new AppError("INVALID_COMMUNICATION_INPUT", 409, "Ambiguous phone routing.", "This number is already assigned to another client. Each receiving number must identify one client.");
      return tx.communicationIdentity.upsert({ where: { clientAccountId_phoneNumber: { clientAccountId: client.id, phoneNumber: phone } }, create: { organizationId: user.organizationId, clientAccountId: client.id, provider: "TWILIO", label, phoneNumber: phone }, update: { provider: "TWILIO", label, isEnabled: input.isEnabled !== false } });
    });
    return success({ identity }, requestId);
  });
}
