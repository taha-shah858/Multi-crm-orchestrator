/**
 * Strategy for matching Unified Lead Directory contacts to the active Client Account.
 * Supports:
 * 1. Direct assignment (contact.clientAccountId === clientAccount.id)
 * 2. Company name similarity (exact, substring, and keyword/token overlap)
 * 3. Brand name similarity
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
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(
      /\b(inc|incorporated|llc|ltd|limited|corp|corporation|holdings|group|partners|solutions|services|tech|technologies|growth|primary|account|ecom|co|company|capital|logistics|consulting|marketing)\b/gi,
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

    // 3. Substring Inclusion (if long enough to avoid false positives)
    if (clientNorm.length >= 3 && (clientNorm.includes(comp) || comp.includes(clientNorm))) {
      return {
        matches: true,
        reason: `Company name "${comp}" is similar to client "${client.name}"`,
        confidence: "HIGH",
      };
    }
    if (brandNorm.length >= 3 && (brandNorm.includes(comp) || comp.includes(brandNorm))) {
      return {
        matches: true,
        reason: `Company name "${comp}" is similar to brand "${client.brandName}"`,
        confidence: "HIGH",
      };
    }

    // 4. Token / Keyword Overlap
    const compTokens = comp.split(" ").filter((t) => t.length >= 3);
    const clientTokens = `${clientNorm} ${brandNorm}`.split(" ").filter((t) => t.length >= 3);
    const common = compTokens.filter((t) => clientTokens.includes(t));
    if (common.length > 0) {
      return {
        matches: true,
        reason: `Company keyword match ("${common.join(", ")}") with "${client.name}"`,
        confidence: "MEDIUM",
      };
    }
  }

  return { matches: false, confidence: "NONE" };
}
