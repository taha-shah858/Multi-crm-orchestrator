import { AppError } from "@/lib/errors/app-error";
import { hubSpotContactAdapter } from "@/lib/integrations/hubspot/adapter";
import { mockCrmAdapter } from "@/lib/integrations/mock/adapter";
import { activeCampaignAdapter } from "@/lib/integrations/activecampaign/adapter";
import { zohoAdapter } from "@/lib/integrations/zoho/adapter";
import { clickUpAdapter } from "@/lib/integrations/clickup/adapter";
import type { IntegrationAdapter } from "@/lib/integrations/types";
import type { IntegrationProvider } from "@/lib/models/canonical";

const adapters: Partial<Record<IntegrationProvider, IntegrationAdapter>> = {
  HUBSPOT: hubSpotContactAdapter,
  MOCK: mockCrmAdapter,
  ACTIVECAMPAIGN: activeCampaignAdapter,
  ZOHO: zohoAdapter,
  CLICKUP: clickUpAdapter,
};

export function getIntegrationAdapter(provider: IntegrationProvider): IntegrationAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new AppError(
      "CRM_PROVIDER_UNAVAILABLE",
      501,
      `No adapter is registered for ${provider}.`,
      "This CRM provider is not available yet.",
    );
  }

  return adapter;
}

export const getCrmAdapter = getIntegrationAdapter;
