import { AppError } from "@/lib/errors/app-error";
import { hubSpotContactAdapter } from "@/lib/integrations/hubspot/adapter";
import type { CrmAdapter } from "@/lib/integrations/types";
import type { CrmProvider } from "@/lib/models/canonical";

const adapters: Partial<Record<CrmProvider, CrmAdapter>> = {
  HUBSPOT: hubSpotContactAdapter,
};

export function getCrmAdapter(provider: CrmProvider): CrmAdapter {
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
