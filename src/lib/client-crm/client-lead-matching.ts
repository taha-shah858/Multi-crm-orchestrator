/**
 * Strategy for matching Unified Lead Directory contacts to the active Client Account.
 * Supports:
 * Full normalized company or brand name matching only.
 * Storage assignment and partial keyword overlap are not client relationships.
 */

export interface ContactCandidate {
  id: string;
  clientAccountId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  crmCompany?: {
    id: string;
    name: string;
    domain?: string | null;
    website?: string | null;
  } | null;
  deals?: Array<{
    id: string;
    title: string;
    valueCents: number;
    currency: string;
    status: string;
    stageLabel?: string | null;
  }>;
  externalRecords?: Array<{
    externalId: string;
    connection?: { provider: string } | null;
  }>;
}

export interface ClientAccountTarget {
  id: string;
  name: string;
  brandName?: string | null;
}

export interface MatchResult {
  matches: boolean;
  reason?: string;
  confidence: "DIRECT" | "HIGH" | "MEDIUM" | "NONE";
}

/**
 * Normalizes corporate names by stripping punctuation and legal/entity suffixes.
 */
export function normalizeCompanyName(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(
      /\b(inc|incorporated|llc|ltd|limited|corp|corporation)\s*$/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a unified contact belongs to or is associated with a given client account.
 */
export function doesContactMatchClient(
  contact: {
    clientAccountId: string;
    company?: string | null;
    crmCompany?: { name: string } | null;
  },
  client: ClientAccountTarget,
): MatchResult {
  const clientNorm = normalizeCompanyName(client.name);
  const brandNorm = normalizeCompanyName(client.brandName);
  const contactComp = normalizeCompanyName(contact.company);
  const crmComp = contact.crmCompany ? normalizeCompanyName(contact.crmCompany.name) : "";

  // Require company name or CRM company name to be present
  if (!contactComp && !crmComp) {
    return { matches: false, confidence: "NONE" };
  }

  for (const comp of [contactComp, crmComp].filter(Boolean)) {
    // 2. Exact Normalized Match
    if (comp === clientNorm || (brandNorm && comp === brandNorm)) {
      return {
        matches: true,
        reason: `Matched company name "${comp}" to client "${client.name}"`,
        confidence: "HIGH",
      };
    }

  }

  return { matches: false, confidence: "NONE" };
}
