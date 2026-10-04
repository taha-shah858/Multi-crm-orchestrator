import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";

type AnalysisInput = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Structured result shape shared by both engines
// ---------------------------------------------------------------------------
interface AnalysisResult {
  summary: string;
  budget: string | null;
  timeline: string | null;
  requirements: string | null;
  intent: string | null;
  objections: string | null;
  leadScore: number;
  temperature: string;
  dealProbability: number;
}

// ---------------------------------------------------------------------------
// Rules-engine baseline (deterministic, always available)
// ---------------------------------------------------------------------------
function firstMatch(text: string, pattern: RegExp) {
  return text.match(pattern)?.[0] ?? null;
}

function rulesEngineAnalyze(transcript: string): AnalysisResult {
  const lower = transcript.toLowerCase();
  const budget = firstMatch(transcript, /(?:\$|usd\s?)\s?[\d,.]+(?:\s?[kKmM])?/i);
  const timeline = firstMatch(
    transcript,
    /(?:this|next)\s+(?:week|month|quarter)|q[1-4]|\d+\s+(?:days?|weeks?|months?)/i,
  );
  const intentSignals = ["ready", "approved", "proposal", "demo", "next step", "buy", "move forward"];
  const objectionSignals = ["concern", "budget", "expensive", "delay", "risk", "not sure", "objection"];
  const requirementSignals = ["need", "require", "integration", "security", "onboarding", "compliance"];
  const intentHits = intentSignals.filter((s) => lower.includes(s));
  const objectionHits = objectionSignals.filter((s) => lower.includes(s));
  const requirementHits = requirementSignals.filter((s) => lower.includes(s));
  const leadScore = Math.max(
    20,
    Math.min(95, 35 + intentHits.length * 13 + (budget ? 12 : 0) + (timeline ? 10 : 0) - objectionHits.length * 6),
  );
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

// ---------------------------------------------------------------------------
// Gemini AI engine
// ---------------------------------------------------------------------------
async function geminiAnalyze(transcript: string): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  // Lazy import so the module is still usable on builds where the SDK is absent
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an expert B2B sales analyst. Analyze the following sales call transcript and extract structured lead qualification data. Return ONLY a valid JSON object (no markdown, no extra text) with exactly these fields:

{
  "summary": "One or two sentence assessment of the prospect's readiness and fit.",
  "budget": "Estimated budget or range mentioned (e.g. '$5,000/month', '$50k–$100k'), or null if not mentioned.",
  "timeline": "Urgency or timeline (e.g. 'Immediate', 'Q1 2025', '3–6 months'), or null if not mentioned.",
  "requirements": "Key technical or business requirements and pain points, comma-separated string, or null if none.",
  "intent": "Purchase intent signals detected, comma-separated string, or 'No strong purchase intent detected' if none.",
  "objections": "Objections or blockers raised, comma-separated string, or 'None detected' if none.",
  "leadScore": <integer 0–100 representing overall qualification strength>,
  "temperature": "<exactly one of: Cold, Warm, Hot>",
  "dealProbability": <integer 0–100 representing estimated probability of closing>
}

Transcript:
"""
${transcript.slice(0, 12000)}
"""`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const raw = response.text?.trim() ?? "";
  // Strip possible markdown fences
  const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${raw.slice(0, 200)}`);
  }

  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  const int = (v: unknown, min: number, max: number, fallback: number): number => {
    const n = typeof v === "number" ? Math.round(v) : parseInt(String(v), 10);
    return isNaN(n) ? fallback : Math.max(min, Math.min(max, n));
  };
  const temp = str(parsed.temperature);
  const validTemps = ["Cold", "Warm", "Hot"];
  const leadScore = int(parsed.leadScore, 0, 100, 50);

  return {
    summary: str(parsed.summary) ?? "Gemini analysis complete.",
    budget: str(parsed.budget),
    timeline: str(parsed.timeline),
    requirements: str(parsed.requirements),
    intent: str(parsed.intent) ?? "No strong purchase intent detected",
    objections: str(parsed.objections) ?? "None detected",
    leadScore,
    temperature: temp && validTemps.includes(temp) ? temp : leadScore >= 75 ? "Hot" : leadScore >= 55 ? "Warm" : "Cold",
    dealProbability: int(parsed.dealProbability, 0, 100, Math.max(10, Math.min(90, leadScore - 8))),
  };
}

// ---------------------------------------------------------------------------
// Unified analysis dispatcher
// ---------------------------------------------------------------------------
async function analyzeTranscript(transcript: string): Promise<AnalysisResult> {
  try {
    return await geminiAnalyze(transcript);
  } catch (err) {
    console.warn("[lead-analysis] Gemini unavailable, falling back to rules engine:", err instanceof Error ? err.message : err);
    return rulesEngineAnalyze(transcript);
  }
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------
async function activeContact(context: RequestContext, contactId: string | null) {
  if (!contactId) return null;
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId },
    select: { id: true },
  });
  if (!contact) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "Choose a contact from the active client account.");
  return contact;
}

// ---------------------------------------------------------------------------
// Public service exports (unchanged signatures)
// ---------------------------------------------------------------------------
export async function listLeadAnalyses(context: RequestContext) {
  await prepareActiveClientSync(context);
  return prisma.leadAnalysis.findMany({
    where: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      interaction: { select: { id: true, type: true, occurredAt: true } },
    },
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
    ? await prisma.interaction.findFirst({
        where: { id: interactionId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId },
        select: { id: true, contactId: true },
      })
    : null;
  if (interactionId && !interaction) throw new AppError("INVALID_LEAD_ANALYSIS_INPUT", 422, "Interaction is outside active client.", "Choose an interaction from the active client account.");
  if (contact && interaction?.contactId && contact.id !== interaction.contactId) {
    throw new AppError("LEAD_ANALYSIS_LINK_MISMATCH", 422, "Contact and interaction do not match.", "Use the contact associated with the selected interaction.");
  }
  const result = await analyzeTranscript(transcript);
  const analysis = await prisma.leadAnalysis.create({
    data: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      contactId: contact?.id ?? interaction?.contactId ?? null,
      interactionId,
      userId: context.user.id,
      source: interactionId ? "INTERACTION" : "MANUAL_TRANSCRIPT",
      provider: "RULES_ENGINE",
      transcript,
      ...result,
    },
  });
  await recordAuditEvent(context, { action: "LEAD_ANALYSIS_CREATED", entityType: "LEAD_ANALYSIS", entityId: analysis.id, requestId, source: "PLATFORM", metadata: { provider: analysis.provider, leadScore: analysis.leadScore } });
  return analysis;
}

export async function updateLeadAnalysis(context: RequestContext, id: string, input: AnalysisInput, requestId: string) {
  await prepareActiveClientSync(context);
  const existing = await prisma.leadAnalysis.findFirst({ where: { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } });
  if (!existing) throw new AppError("LEAD_ANALYSIS_NOT_FOUND", 404, "Lead analysis is outside active client.", "Choose an analysis from the active client account.");
  const text = (value: unknown, fallback: string | null) => (typeof value === "string" ? value.trim() || null : fallback);
  const number = (value: unknown, fallback: number) => (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100 ? value : fallback);
  const analysis = await prisma.leadAnalysis.update({
    where: { id },
    data: {
      summary: text(input.summary, existing.summary) ?? existing.summary,
      budget: text(input.budget, existing.budget),
      timeline: text(input.timeline, existing.timeline),
      requirements: text(input.requirements, existing.requirements),
      intent: text(input.intent, existing.intent),
      objections: text(input.objections, existing.objections),
      leadScore: number(input.leadScore, existing.leadScore),
      temperature: text(input.temperature, existing.temperature) ?? existing.temperature,
      dealProbability: number(input.dealProbability, existing.dealProbability),
      isManualOverride: true,
    },
  });
  await recordAuditEvent(context, { action: "LEAD_ANALYSIS_UPDATED", entityType: "LEAD_ANALYSIS", entityId: analysis.id, requestId, source: "PLATFORM", metadata: { leadScore: analysis.leadScore, manualOverride: true } });
  return analysis;
}
