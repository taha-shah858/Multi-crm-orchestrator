import "server-only";
import twilio from "twilio";
import { prisma } from "@/lib/db/prisma";

export function twilioWebhookUrl(path: string) {
  const origin = new URL(process.env.TWILIO_PUBLIC_URL ?? "");
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") throw new Error("TWILIO_PUBLIC_URL must be a public HTTPS origin.");
  return new URL(`/api/communications/twilio/${path}`, origin).toString();
}

export async function validateTwilioWebhook(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return null;
  const raw = await request.text();
  if (raw.length > 65536) return null;
  const form = new URLSearchParams(raw);
  const params: Record<string, string> = {};
  for (const [key, value] of form) {
    if (key in params) return null;
    params[key] = value;
  }
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || params.AccountSid !== process.env.TWILIO_ACCOUNT_SID) return null;
  const incoming = new URL(request.url);
  let publicUrl: string;
  try { publicUrl = twilioWebhookUrl(incoming.pathname.split("/twilio/")[1]) + incoming.search; } catch { return null; }
  return twilio.validateRequest(token, request.headers.get("x-twilio-signature") ?? "", publicUrl, params) ? params : null;
}

const terminal = new Set(["completed", "busy", "failed", "no-answer", "canceled", "delivered", "undelivered"]);
export function mergeTwilioStatus(metadata: Record<string, unknown>, params: Record<string, string>) {
  const status = params.DialCallStatus ?? params.MessageStatus ?? params.CallStatus;
  const allowed = new Set(["accepted", "scheduled", "queued", "sending", "sent", "delivered", "undelivered", "failed", "initiated", "ringing", "in-progress", "completed", "busy", "no-answer", "canceled"]);
  if (!status || !allowed.has(status)) return metadata;
  const previous = typeof metadata.status === "string" ? metadata.status : "";
  // Client leg outcomes override agent-leg state; late progress never reopens a terminal event.
  if (terminal.has(previous) && !params.DialCallStatus) return metadata;
  const rank: Record<string, number> = { accepted: 0, queued: 0, scheduled: 0, initiated: 0, sending: 1, ringing: 1, sent: 2, "in-progress": 2 };
  if (!terminal.has(status) && (rank[status] ?? 0) < (rank[previous] ?? 0)) return metadata;
  const duration = params.DialCallDuration ?? params.CallDuration;
  return { ...metadata, status, ...(duration && /^\d+$/.test(duration) ? { durationSeconds: Number(duration) } : {}), ...(params.ErrorCode && /^\d+$/.test(params.ErrorCode) ? { errorCode: params.ErrorCode } : {}), ...(params.DialCallStatus ? { clientLegComplete: true } : {}) };
}

export async function handleTwilioWebhook(kind: "sms" | "voice" | "status", params: Record<string, string>, interactionId?: string | null) {
  const sid = params.MessageSid ?? params.CallSid;
  if (!sid || !/^(SM|MM|CA)[a-fA-F0-9]{32}$/.test(sid)) return null;
  return prisma.$transaction(async tx => {
    // Serializes duplicate deliveries and status events even before a row exists.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sid}))`;
    if (kind === "status") {
      const interaction = await tx.interaction.findFirst({ where: { source: "TWILIO", ...(interactionId ? { id: interactionId } : { metadata: { path: ["externalId"], equals: sid } }) } });
      if (!interaction) return null;
      const metadata = (interaction.metadata ?? {}) as Record<string, unknown>;
      if (metadata.externalId && metadata.externalId !== sid) return null;
      if ((interaction.type === "SMS") !== /^(SM|MM)/.test(sid)) return null;
      if (params.From && metadata.from !== params.From) return null;
      if (metadata.clientLegComplete && !params.DialCallStatus) return null;
      const updated = mergeTwilioStatus({ ...metadata, externalId: sid }, params);
      return tx.interaction.update({ where: { id: interaction.id }, data: { metadata: updated as never, ...(interaction.type === "CALL" ? { body: `Call outcome: ${updated.status ?? "unknown"}${updated.durationSeconds !== undefined ? `. Duration: ${updated.durationSeconds} seconds.` : "."}` } : {}) } });
    }
    const identities = await tx.communicationIdentity.findMany({ where: { provider: "TWILIO", phoneNumber: params.To, isEnabled: true }, take: 2 });
    // A shared number cannot safely identify the tenant. Reject ambiguous routing.
    if (identities.length !== 1) return null;
    const identity = identities[0];
    const existing = await tx.interaction.findFirst({ where: { organizationId: identity.organizationId, source: "TWILIO", metadata: { path: ["externalId"], equals: sid } } });
    if (existing) return existing;
    const contacts = await tx.contact.findMany({ where: { organizationId: identity.organizationId, clientAccountId: identity.clientAccountId, phone: params.From }, select: { id: true }, take: 2 });
    return tx.interaction.create({ data: { organizationId: identity.organizationId, clientAccountId: identity.clientAccountId, contactId: contacts.length === 1 ? contacts[0].id : null, type: kind === "sms" ? "SMS" : "CALL", direction: "INBOUND", source: "TWILIO", subject: `Incoming ${kind === "sms" ? "SMS" : "call"} from ${params.From}`, body: kind === "sms" ? params.Body ?? "" : "Incoming call received.", metadata: { externalId: sid, identityId: identity.id, from: params.From, to: params.To, status: params.MessageStatus ?? params.CallStatus ?? "received", mediaCount: Number(params.NumMedia) || 0 } } });
  });
}

export async function twilioWebhookResponse(request: Request, kind: "sms" | "voice" | "status") {
  const params = await validateTwilioWebhook(request);
  if (!params) return new Response("Invalid Twilio signature or configuration.", { status: 403 });
  const result = await handleTwilioWebhook(kind, params, new URL(request.url).searchParams.get("interactionId"));
  if (!result) return new Response("Unknown or ambiguous communication identity.", { status: 404 });
  const response = new twilio.twiml.VoiceResponse();
  if (kind === "voice") {
    let target: string | undefined;
    try { target = JSON.parse(process.env.TWILIO_INBOUND_ROUTES ?? "{}")[params.To]; } catch { /* Missing routes fail closed. */ }
    if (target && /^\+[1-9]\d{6,14}$/.test(target)) response.dial({ action: twilioWebhookUrl(`status?interactionId=${result.id}`), method: "POST" }, target);
    else { response.say("This line is currently unavailable. Please send a text message."); response.hangup(); }
  }
  const action = Boolean(params.DialCallStatus);
  return new Response(kind === "status" ? action ? "<Response/>" : null : kind === "sms" ? "<Response/>" : response.toString(), { status: kind === "status" && !action ? 204 : 200, headers: { "Content-Type": "text/xml" } });
}
