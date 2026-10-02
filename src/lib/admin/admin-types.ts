import type { CurrencyTotals } from "@/lib/operations/reconciliation";

export type AdminRole = "ADMIN" | "MANAGER" | "AGENT";

export interface AdminDashboardData {
  clients: Array<{
    id: string;
    name: string;
    brandName: string;
    communicationIdentity: string | null;
    allowAgentIntegrationManagement: boolean;
    status: string;
    createdAt: string;
    integrationConnections: Array<{ id: string; provider: string; status: string; updatedAt: string }>;
    _count: { contacts: number; agentAssignments: number };
  }>;
  agents: Array<{
    id: string;
    name: string;
    email: string;
    role: AdminRole;
    status: string;
    createdAt: string;
    clientAccess: Array<{ clientAccount: { id: string; name: string } }>;
    _count: { commissionRecords: number; timeLogs: number };
  }>;
  commissions: Array<{
    id: string;
    expectedCents: number;
    receivedCents: number;
    currency: string;
    source: "MANUAL" | "CRM";
    status: string;
    updatedAt: string;
    clientAccount: { id: string; name: string };
    user: { id: string; name: string } | null;
    deal: { title: string; valueCents: number; commissionRate: number | null } | null;
  }>;
  timeLogs: Array<{
    id: string;
    minutes: number;
    trackedSeconds: number;
    source: "MANUAL" | "AUTO";
    isManualOverride: boolean;
    description: string;
    loggedAt: string;
    clientAccount: { id: string; name: string };
    user: { id: string; name: string } | null;
  }>;
  audits: Array<{
    id: string;
    action: string;
    entityType: string;
    source: string;
    createdAt: string;
    clientAccount: { name: string } | null;
    user: { name: string; email: string } | null;
  }>;
  syncRuns: Array<{
    id: string;
    provider: string;
    status: string;
    recordsRead: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsFailed: number;
    categoryCounts: unknown;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
    clientAccount: { id: string; name: string };
  }>;
  summary: {
    currencyTotals: CurrencyTotals[];
    recordCount: number;
    expectedCents: number;
    receivedCents: number;
    pendingCents: number;
    dealValueCents: number;
    activeMinutes: number;
    activeSeconds: number;
    activeAgents: number;
  };
}
