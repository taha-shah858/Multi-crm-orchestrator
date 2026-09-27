import "server-only";

import type { IntegrationAdapter } from "@/lib/integrations/types";

export const clickUpAdapter: IntegrationAdapter = {
  provider: "CLICKUP",
  capabilities: {
    oauth: true,
    listContacts: false,
    updateContact: false,
    salesCrm: false,
    updateCompany: false,
    updateDeal: false,
    createDeal: false,
    disconnect: true,
  },
};
