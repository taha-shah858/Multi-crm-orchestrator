import "server-only";
import { createHash, randomUUID } from "node:crypto";
import twilio from "twilio";
import { prisma } from "@/lib/db/prisma";
import { assertClientAccess } from "@/lib/auth/auth-service";
import { AppError } from "@/lib/errors/app-error";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import type { AuthenticatedUser, RequestContext } from "@/lib/models/canonical";
import { twilioWebhookUrl, validateTwilioWebhook } from "./twilio-webhooks";

const callSid = /^CA[a-fA-F0-9]{32}$/;
const phone = /^\+[1-9]\d{6,14}$/;
const normalizePhone = (value: string) => value.replace(/[\s().-]/g, "");

export function browserVoiceConfiguration() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const apiKey = process.env.TWILIO_API_KEY_SID ?? "";
  const apiSecret = process.env.TWILIO_API_KEY_SECRET ?? "";
  const applicationSid = process.env.TWILIO_TWIML_APP_SID ?? "";
  if (!/^AC[a-fA-F0-9]{32}$/.test(accountSid) || !/^SK[a-fA-F0-9]{32}$/.test(apiKey) ||
      !/^AP[a-fA-F0-9]{32}$/.test(applicationSid) || !apiSecret || !process.env.TWILIO_AUTH_TOKEN) {
    throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 409, "Browser voice is not configured.",
      "Configure the Twilio account, auth token, API key SID/secret, TwiML App SID and public HTTPS URL for laptop calling.");
  }
  try { twilioWebhookUrl("browser"); } catch {
    throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 409, "Public Twilio URL missing.", "Configure TWILIO_PUBLIC_URL as the public HTTPS application origin.");
  }
  return { accountSid, apiKey, apiSecret, applicationSid };
}

export async function prepareBrowserCall(context: RequestContext, input: Record<string, unknown>, sessionToken: string, requestId: string) {
  if (input.clientAccountId !== context.activeClientAccountId) {
    throw new AppError("CLIENT_ACCESS_DENIED", 409, "Client changed.", "The active client changed. Select the recipient again.");
  }
  await assertClientAccess(context.user, context.activeClientAccountId);
  const config = browserVoiceConfiguration();
  const session = await prisma.authSession.findFirst({ where: {
    tokenHash: createHash("sha256").update(sessionToken).digest("hex"), userId: context.user.id,
    expiresAt: { gt: new Date() }, user: { status: "ACTIVE" },
  }, select: { id: true } });
  if (!session) throw new AppError("UNAUTHENTICATED", 401, "Session expired.", "Sign in again before calling.");
  const identity = await prisma.communicationIdentity.findFirst({ where: {
    id: typeof input.identityId === "string" ? input.identityId : "",
    organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId,
    provider: "TWILIO", isEnabled: true,
  } });
  if (!identity) throw new AppError("COMMUNICATION_IDENTITY_NOT_FOUND", 404, "Invalid calling identity.", "Choose an enabled Twilio number for the active client.");
  const contactId = typeof input.contactId === "string" && input.contactId ? input.contactId : null;
  const contact = contactId ? await prisma.contact.findFirst({ where: {
    id: contactId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId,
  }, select: { id: true, phone: true } }) : null;
  if (contactId && !contact) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact outside active client.", "Choose a contact from the active client.");
  const to = normalizePhone(contact?.phone ?? (typeof input.phoneNumber === "string" ? input.phoneNumber : ""));
  if (!phone.test(to) || !phone.test(identity.phoneNumber)) throw new AppError("INVALID_COMMUNICATION_INPUT", 422, "Invalid phone number.", "Use an international number with country code, such as +923001234567.");
  const browserIdentity = `call_${randomUUID().replaceAll("-", "")}`;
  const expiresAt = Date.now() + 120_000;
  // A fresh SDK identity grants access to this one intent, never arbitrary destinations.
  const token = new twilio.jwt.AccessToken(config.accountSid, config.apiKey, config.apiSecret, { identity: browserIdentity, ttl: 120 });
  token.addGrant(new twilio.jwt.AccessToken.VoiceGrant({ outgoingApplicationSid: config.applicationSid, incomingAllow: false }));
  const interaction = await prisma.interaction.create({ data: {
    organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId,
    userId: context.user.id, contactId: contact?.id, source: "TWILIO", type: "CALL", direction: "OUTBOUND",
    subject: `Browser call to ${to}`, body: "Laptop call prepared; not yet connected.",
    metadata: { deliveryMode: "BROWSER", provider: "TWILIO", identityId: identity.id, identityLabel: identity.label,
      from: identity.phoneNumber, to, browserIdentity, expiresAt, status: "browser-prepared",
      sessionId: session.id },
  } });
  await recordAuditEvent(context, { action: "COMMUNICATION_DISPATCHED", entityType: "INTERACTION", entityId: interaction.id, requestId, source: "TWILIO", metadata: { identityId: identity.id, deliveryMode: "BROWSER", status: "browser-prepared" } });
  return { token: token.toJwt(), interactionId: interaction.id, clientAccountId: context.activeClientAccountId, to, from: identity.phoneNumber };
}

// Only invalidate an unconsumed intent. An established call is ended through the SDK,
// and only signed provider callbacks can write its outcome or billable duration.
export async function cancelPreparedBrowserCall(user: AuthenticatedUser, interactionId: string) {
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${interactionId}))`;
    const interaction = await tx.interaction.findFirst({ where: { id: interactionId, organizationId: user.organizationId, userId: user.id, source: "TWILIO", type: "CALL" } });
    const metadata = interaction?.metadata as Record<string, unknown> | null;
    if (!interaction || metadata?.deliveryMode !== "BROWSER" || metadata.status !== "browser-prepared") return;
    await tx.interaction.update({ where: { id: interaction.id }, data: { body: "Laptop call canceled before dialing.", metadata: { ...metadata, status: "canceled" } as never } });
  });
}

export async function browserCallTwiml(request: Request) {
  const params = await validateTwilioWebhook(request);
  if (!params) return new Response("Invalid Twilio signature or configuration.", { status: 403 });
  if (!params.InteractionId || !callSid.test(params.CallSid ?? "")) return new Response("Invalid call request.", { status: 400 });
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${params.InteractionId}))`;
    const interaction = await tx.interaction.findFirst({ where: { id: params.InteractionId, source: "TWILIO", type: "CALL", direction: "OUTBOUND" } });
    const metadata = interaction?.metadata as Record<string, unknown> | null;
    if (!interaction || !metadata || metadata.deliveryMode !== "BROWSER" || params.From !== `client:${metadata.browserIdentity}`) return null;
    // Signed HTTP retries may reuse the parent SID; a second call may not consume it.
    if (metadata.externalId && metadata.externalId !== params.CallSid) return null;
    if (!metadata.externalId && (metadata.status !== "browser-prepared" || typeof metadata.expiresAt !== "number" || metadata.expiresAt < Date.now())) return null;
    if (metadata.externalId && metadata.status !== "connecting") return null;
    const session = await tx.authSession.findFirst({ where: {
      id: typeof metadata.sessionId === "string" ? metadata.sessionId : "",
      userId: interaction.userId ?? "", expiresAt: { gt: new Date() },
      user: { status: "ACTIVE", organizationId: interaction.organizationId },
    }, include: { user: true } });
    if (!session) return null;
    const client = await tx.clientAccount.findFirst({ where: {
      id: interaction.clientAccountId, organizationId: interaction.organizationId, status: "ACTIVE",
      ...(session.user.role === "AGENT" ? { agentAssignments: { some: { userId: session.user.id } } } : {}),
    } });
    const identity = await tx.communicationIdentity.findFirst({ where: {
      id: typeof metadata.identityId === "string" ? metadata.identityId : "", organizationId: interaction.organizationId,
      clientAccountId: interaction.clientAccountId, provider: "TWILIO", isEnabled: true,
      phoneNumber: typeof metadata.from === "string" ? metadata.from : "",
    } });
    if (!client || !identity || typeof metadata.to !== "string" || !phone.test(metadata.to)) return null;
    await tx.interaction.update({ where: { id: interaction.id }, data: {
      body: "Laptop call dialing. Awaiting provider outcome.", metadata: { ...metadata, externalId: params.CallSid, status: "connecting" } as never,
    } });
    return { id: interaction.id, from: identity.phoneNumber, to: metadata.to };
  });
  if (!result) return new Response("Call expired, consumed, or unauthorized.", { status: 403 });
  const response = new twilio.twiml.VoiceResponse();
  const dial = response.dial({ callerId: result.from, answerOnBridge: true, timeout: 30,
    action: twilioWebhookUrl(`status?interactionId=${result.id}`), method: "POST" });
  dial.number(result.to);
  return new Response(response.toString(), { headers: { "Content-Type": "text/xml", "Cache-Control": "no-store" } });
}
