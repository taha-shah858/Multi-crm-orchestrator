import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";
import twilio from "twilio";
import { twilioWebhookUrl } from "@/lib/communications/twilio-webhooks";

type CommunicationKind = "CALL" | "SMS";

interface DispatchInput {
  kind?: unknown;
  mode?: unknown;
  identityId?: unknown;
  contactId?: unknown;
  phoneNumber?: unknown;
  body?: unknown;
  agentPhone?: unknown;
}

function normalizePhone(value: string) {
  return value.replace(/[\s().-]/g, "");
}

function twilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  return accountSid && authToken ? { accountSid, authToken } : null;
}

async function sendWithTwilio(input: {
  kind: CommunicationKind;
  from: string;
  to: string;
  body: string;
  agentPhone: string;
  interactionId: string;
}) {
  const credentials = twilioCredentials();
  if (!credentials) {
    throw new AppError(
      "COMMUNICATION_PROVIDER_UNAVAILABLE",
      409,
      "Twilio credentials are not configured.",
      "Twilio is not configured for this identity. Use the manual dialer fallback or choose another identity.",
    );
  }

  const endpoint = input.kind === "SMS"
    ? "Messages.json"
    : "Calls.json";
  const callback = twilioWebhookUrl(`status?interactionId=${input.interactionId}`);
  const form = new URLSearchParams({ From: input.from, To: input.kind === "CALL" ? input.agentPhone : input.to, StatusCallback: callback });

  if (input.kind === "SMS") {
    form.set("Body", input.body);
  } else {
    const response = new twilio.twiml.VoiceResponse();
    response.dial({ callerId: input.from, action: callback, method: "POST", answerOnBridge: true }, input.to);
    form.set("Twiml", response.toString());
    form.set("StatusCallbackMethod", "POST");
    for (const event of ["initiated", "ringing", "answered", "completed"]) form.append("StatusCallbackEvent", event);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/${endpoint}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      signal: AbortSignal.timeout(15000),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError(
      "EXTERNAL_SERVICE_ERROR",
      502,
      `Twilio ${input.kind} dispatch failed: ${payload?.message ?? response.statusText}`,
      "Twilio could not send this communication. Use the manual fallback and try again later.",
    );
  }

  if (typeof payload.sid !== "string") throw new Error("Twilio returned an incomplete dispatch response. Check Twilio before retrying.");
  return payload.sid;
}

export async function listCommunicationIdentities(context: RequestContext) {
  await prepareActiveClientSync(context);
  return prisma.communicationIdentity.findMany({
    where: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      isEnabled: true,
    },
    select: {
      id: true,
      provider: true,
      label: true,
      phoneNumber: true,
      isDefault: true,
      clientAccount: { select: { name: true, brandName: true } },
    },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });
}

export async function dispatchCommunication(
  context: RequestContext,
  input: DispatchInput,
  requestId: string,
) {
  await prepareActiveClientSync(context);

  const kind = input.kind;
  const mode = input.mode ?? "AUTOMATED";
  const identityId = typeof input.identityId === "string" ? input.identityId : "";
  const contactId = typeof input.contactId === "string" && input.contactId ? input.contactId : null;
  const enteredNumber = typeof input.phoneNumber === "string" ? normalizePhone(input.phoneNumber) : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const agentPhone = typeof input.agentPhone === "string" ? normalizePhone(input.agentPhone) : "";

  if (
    (kind !== "CALL" && kind !== "SMS") ||
    (mode !== "AUTOMATED" && mode !== "MANUAL") ||
    !identityId ||
    (kind === "SMS" && (!body || body.length > 1600))
  ) {
    throw new AppError(
      "INVALID_COMMUNICATION_INPUT",
      422,
      "Invalid communication request.",
      "Choose an identity and valid communication details before continuing.",
    );
  }

  const identity = await prisma.communicationIdentity.findFirst({
    where: {
      id: identityId,
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      isEnabled: true,
    },
  });
  if (!identity) {
    throw new AppError(
      "COMMUNICATION_IDENTITY_NOT_FOUND",
      404,
      "Communication identity is outside the active client account.",
      "Choose an active outgoing identity for the selected client account.",
    );
  }

  const contact = contactId
    ? await prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId: context.user.organizationId,
        clientAccountId: context.activeClientAccountId,
      },
      select: { id: true, firstName: true, lastName: true, phone: true },
    })
    : null;
  if (contactId && !contact) {
    throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "Choose a contact from the active client account.");
  }

  const to = normalizePhone(contact?.phone ?? enteredNumber);
  if (!/^\+[1-9]\d{6,14}$/.test(to)) {
    throw new AppError(
      "INVALID_COMMUNICATION_INPUT",
      422,
      "A valid destination phone number is required.",
      "Select a contact with a phone number or enter a valid number manually.",
    );
  }

  const live = mode === "AUTOMATED" && identity.provider === "TWILIO";
  if (live && kind === "CALL" && !/^\+[1-9]\d{6,14}$/.test(agentPhone)) throw new AppError("INVALID_COMMUNICATION_INPUT", 422, "Agent phone required.", "Enter your phone number with country code. Twilio rings you first, then connects the contact.");
  if (live) {
    if (!twilioCredentials()) throw new AppError("COMMUNICATION_PROVIDER_UNAVAILABLE", 409, "Twilio is not configured.", "Configure Twilio credentials or use manual dispatch.");
    try { twilioWebhookUrl("status"); } catch { throw new AppError("INTEGRATION_CONFIGURATION_ERROR", 409, "Public Twilio URL missing.", "Configure TWILIO_PUBLIC_URL as your public HTTPS application address before live dispatch."); }
  }
  let externalId: string | null = null;
  const source = mode === "MANUAL" ? "MANUAL" : identity.provider;
  const recipient = contact ? `${contact.firstName} ${contact.lastName}` : to;
  let interaction = await prisma.interaction.create({
    data: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      contactId: contact?.id ?? null,
      userId: context.user.id,
      type: kind,
      direction: "OUTBOUND",
      source,
      subject: kind === "CALL" ? `Outbound call to ${recipient}` : `SMS to ${recipient}`,
      body: kind === "CALL"
        ? mode === "MANUAL" ? "Manual dial initiated and logged by the agent." : "Outbound call initiated through the communication gateway."
        : body,
      metadata: {
        deliveryMode: mode,
        provider: identity.provider,
        identityId: identity.id,
        identityLabel: identity.label,
        from: identity.phoneNumber,
        to,
        externalId,
        status: live ? "dispatching" : "manually-logged",
      },
    },
  });

  if (live) {
    try {
      externalId = await sendWithTwilio({ kind, from: identity.phoneNumber, to, body, agentPhone, interactionId: interaction.id });
      interaction = await prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${externalId}))`;
        const current = await tx.interaction.findUniqueOrThrow({ where: { id: interaction.id } });
        const metadata = current.metadata as Record<string, string | null>;
        return tx.interaction.update({ where: { id: current.id }, data: { metadata: { ...metadata, externalId, status: metadata.status === "dispatching" ? "queued" : metadata.status } } });
      });
    } catch (error) {
      await prisma.interaction.updateMany({ where: { id: interaction.id, metadata: { path: ["status"], equals: "dispatching" } }, data: { metadata: { ...(interaction.metadata as Record<string, string | null>), status: error instanceof AppError ? "failed" : "review-required" } } });
      if (error instanceof AppError) throw error;
      throw new AppError("EXTERNAL_SERVICE_ERROR", 502, "Twilio dispatch response uncertain.", "Twilio's response was not received. Check Twilio before retrying to avoid duplicate calls or messages.");
    }
  }

  await recordAuditEvent(context, {
    action: mode === "MANUAL" ? "COMMUNICATION_MANUALLY_LOGGED" : "COMMUNICATION_DISPATCHED",
    entityType: "INTERACTION",
    entityId: interaction.id,
    requestId,
    source: source === "TWILIO" ? "TWILIO" : source === "MOCK" ? "MOCK" : "PLATFORM",
    metadata: { kind, mode, provider: identity.provider, identityId: identity.id },
  });

  return {
    interaction,
    delivery: {
      mode,
      provider: identity.provider,
      externalId,
      manualFallback: mode === "MANUAL" || identity.provider === "MOCK",
    },
  };
}
