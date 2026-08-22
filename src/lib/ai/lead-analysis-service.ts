import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";

type AnalysisInput = Record<string, unknown>;

function firstMatch(text: string, pattern: RegExp) {
  return text.match(pattern)?.[0] ?? null;
}

/** Deterministic, explainable baseline until a configured model provider is added. */
function analyzeTranscript(transcript: string) {
  const lower = transcript.toLowerCase();
  const budget = firstMatch(transcript, /(?:\$|usd\s?)\s?[\d,.]+(?:\s?[kKmM])?/i);
  const timeline = firstMatch(transcript, /(?:this|next)\s+(?:week|month|quarter)|q[1-4]|\d+\s+(?:days?|weeks?|months?)/i);
  const intentSignals = ["ready", "approved", "proposal", "demo", "next step", "buy", "move forward"];
  const objectionSignals = ["concern", "budget", "expensive", "delay", "risk", "not sure", "objection"];
  const requirementSignals = ["need", "require", "integration", "security", "onboarding", "compliance"];
  const intentHits = intentSignals.filter((signal) => lower.includes(signal));
  const objectionHits = objectionSignals.filter((signal) => lower.includes(signal));
  const requirementHits = requirementSignals.filter((signal) => lower.includes(signal));
  const leadScore = Math.max(20, Math.min(95, 35 + intentHits.length * 13 + (budget ? 12 : 0) + (timeline ? 10 : 0) - objectionHits.length * 6));
  const temperature = leadScore >= 75 ? "Hot" : leadScore >= 55 ? "Warm" : "Cold";
  const dealProbability = Math.max(10, Math.min(90, leadScore - 8));

  return {
    summary: `Assessment based on ${intentHits.length} intent signal${intentHits.length === 1 ? "" : "s"}${objectionHits.length ? ` and ${objectionHits.length} objection signal${objectionHits.length === 1 ? "" : "s"}` : ""}.`,
    budget,
    timeline,
    requirements: requirementHits.length ? requirementHits.join(", ") : null,
    intent: intentHits.length ? intentHits.join(", ") : "No strong purchase intent detected",
    objections: objectionHits.length ? objectionHits.join(", ") : "None detected",
    leadScore,
    temperature,
    dealProbability,
  };
}

async function activeContact(context: RequestContext, contactId: string | null) {
  if (!contactId) return null;
  const contact = await prisma.contact.findFirst({ where: { id: contactId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true } });
  if (!contact) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "Choose a contact from the active client account.");
  return contact;
}

export async function listLeadAnalyses(context: RequestContext) {
  await prepareActiveClientSync(context);
  return prisma.leadAnalysis.findMany({
    where: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId },
    include: { contact: { select: { id: true, firstName: true, lastName: true, company: true } }, interaction: { select: { id: true, type: true, occurredAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createLeadAnalysis(context: RequestContext, input: AnalysisInput, requestId: string) {
  await prepareActiveClientSync(context);
  const transcript = typeof input.transcript === "string" ? input.transcript.trim() : "";
  const contactId = typeof input.contactId === "string" && input.contactId ? input.contactId : null;
  const interactionId = typeof input.interactionId === "string" && input.interactionId ? input.interactionId : null;
  if (!transcript) throw new AppError("INVALID_LEAD_ANALYSIS_INPUT", 422, "Transcript is required.", "Paste a transcript or interaction summary before running analysis.");
  const contact = await activeContact(context, contactId);
  const interaction = interactionId
    ? await prisma.interaction.findFirst({ where: { id: interactionId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true, contactId: true } })
    : null;
  if (interactionId && !interaction) throw new AppError("INVALID_LEAD_ANALYSIS_INPUT", 422, "Interaction is outside active client.", "Choose an interaction from the active client account.");
  if (contact && interaction?.contactId && contact.id !== interaction.contactId) {
    throw new AppError("LEAD_ANALYSIS_LINK_MISMATCH", 422, "Contact and interaction do not match.", "Use the contact associated with the selected interaction.");
  }
  const result = analyzeTranscript(transcript);
  const analysis = await prisma.leadAnalysis.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId: contact?.id ?? interaction?.contactId ?? null, interactionId, userId: context.user.id, source: interactionId ? "INTERACTION" : "MANUAL_TRANSCRIPT", provider: "RULES_ENGINE", transcript, ...result } });
  await recordAuditEvent(context, { action: "LEAD_ANALYSIS_CREATED", entityType: "LEAD_ANALYSIS", entityId: analysis.id, requestId, source: "PLATFORM", metadata: { provider: analysis.provider, leadScore: analysis.leadScore } });
  return analysis;
}

export async function updateLeadAnalysis(context: RequestContext, id: string, input: AnalysisInput, requestId: string) {
  await prepareActiveClientSync(context);
  const existing = await prisma.leadAnalysis.findFirst({ where: { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } });
  if (!existing) throw new AppError("LEAD_ANALYSIS_NOT_FOUND", 404, "Lead analysis is outside active client.", "Choose an analysis from the active client account.");
  const text = (value: unknown, fallback: string | null) => typeof value === "string" ? value.trim() || null : fallback;
  const number = (value: unknown, fallback: number) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100 ? value : fallback;
  const analysis = await prisma.leadAnalysis.update({ where: { id }, data: { summary: text(input.summary, existing.summary) ?? existing.summary, budget: text(input.budget, existing.budget), timeline: text(input.timeline, existing.timeline), requirements: text(input.requirements, existing.requirements), intent: text(input.intent, existing.intent), objections: text(input.objections, existing.objections), leadScore: number(input.leadScore, existing.leadScore), temperature: text(input.temperature, existing.temperature) ?? existing.temperature, dealProbability: number(input.dealProbability, existing.dealProbability), isManualOverride: true } });
  await recordAuditEvent(context, { action: "LEAD_ANALYSIS_UPDATED", entityType: "LEAD_ANALYSIS", entityId: analysis.id, requestId, source: "PLATFORM", metadata: { leadScore: analysis.leadScore, manualOverride: true } });
  return analysis;
}
