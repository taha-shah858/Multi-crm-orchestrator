import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";

type CommunicationKind = "CALL" | "SMS";
type DispatchMode = "AUTOMATED" | "MANUAL";

interface DispatchInput {
  kind?: unknown;
  mode?: unknown;
  identityId?: unknown;
  contactId?: unknown;
  phoneNumber?: unknown;
  body?: unknown;
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
  const form = new URLSearchParams({ From: input.from, To: input.to });

  if (input.kind === "SMS") {
    form.set("Body", input.body);
  } else {
    const voiceUrl = process.env.TWILIO_VOICE_URL;
    if (!voiceUrl) {
      throw new AppError(
        "INTEGRATION_CONFIGURATION_ERROR",
        409,
        "TWILIO_VOICE_URL is required for outbound calls.",
        "Twilio calling is not fully configured. Use the manual dialer fallback to place and log this call.",
      );
    }
    form.set("Url", voiceUrl);
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

  return typeof payload.sid === "string" ? payload.sid : null;
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

  if (
    (kind !== "CALL" && kind !== "SMS") ||
    (mode !== "AUTOMATED" && mode !== "MANUAL") ||
    !identityId ||
    (kind === "SMS" && !body)
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
  if (!to || to.length < 7) {
    throw new AppError(
      "INVALID_COMMUNICATION_INPUT",
      422,
      "A valid destination phone number is required.",
      "Select a contact with a phone number or enter a valid number manually.",
    );
  }

  const externalId = mode === "AUTOMATED" && identity.provider === "TWILIO"
    ? await sendWithTwilio({ kind, from: identity.phoneNumber, to, body })
    : null;
  const source = mode === "MANUAL" ? "MANUAL" : identity.provider;
  const recipient = contact ? `${contact.firstName} ${contact.lastName}` : to;
  const interaction = await prisma.interaction.create({
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
      },
    },
  });

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
