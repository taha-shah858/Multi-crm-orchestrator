import { prisma } from "@/lib/db/prisma";
import type { RequestContext } from "@/lib/models/canonical";

const developmentClients = [
  {
    id: "client-northstar-growth",
    name: "Northstar Growth",
    brandName: "Northstar",
    communicationIdentity: "+1 (555) 010-2001",
    provider: "HUBSPOT" as const,
  },
  {
    id: "client-atlas-revenue",
    name: "Atlas Revenue Partners",
    brandName: "Atlas",
    communicationIdentity: "+1 (555) 010-2002",
    provider: "MOCK" as const,
  },
];

/** Seeds only the temporary Phase 1 development identity used by the existing UI. */
export async function ensureDevelopmentTenant(context: RequestContext) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  await prisma.organization.upsert({
    where: { id: context.user.organizationId },
    update: { name: "Zenith Sales Agency" },
    create: { id: context.user.organizationId, name: "Zenith Sales Agency" },
  });

  await prisma.user.upsert({
    where: { id: context.user.id },
    update: {
      email: context.user.email,
      name: context.user.name,
      role: context.user.role,
      status: "ACTIVE",
    },
    create: {
      id: context.user.id,
      organizationId: context.user.organizationId,
      email: context.user.email,
      name: context.user.name,
      role: context.user.role,
      status: "ACTIVE",
    },
  });

  // Provision Agency-level HubSpot CRM connection
  const hasAgencyHubSpotToken = Boolean(process.env.HUBSPOT_ACCESS_TOKEN?.trim());
  const agencyConnection = await prisma.integrationConnection.upsert({
    where: {
      ownershipKey_provider: {
        ownershipKey: `company:${context.user.organizationId}`,
        provider: "HUBSPOT",
      },
    },
    update: {
      organizationId: context.user.organizationId,
      ownershipType: "COMPANY",
      status: hasAgencyHubSpotToken ? "CONNECTED" : "AUTHENTICATION_REQUIRED",
    },
    create: {
      organizationId: context.user.organizationId,
      ownershipType: "COMPANY",
      ownershipKey: `company:${context.user.organizationId}`,
      provider: "HUBSPOT",
      status: hasAgencyHubSpotToken ? "CONNECTED" : "AUTHENTICATION_REQUIRED",
    },
  });

  if (hasAgencyHubSpotToken) {
    await prisma.integrationCredential.upsert({
      where: { integrationConnectionId: agencyConnection.id },
      update: {},
      create: {
        integrationConnectionId: agencyConnection.id,
        encryptedAccessToken: "env:HUBSPOT_ACCESS_TOKEN",
        metadata: { migratedLegacyReference: true },
      },
    });
  }

  for (const client of developmentClients) {
    await prisma.clientAccount.upsert({
      where: { id: client.id },
      update: {
        name: client.name,
        brandName: client.brandName,
        communicationIdentity: client.communicationIdentity,
        status: "ACTIVE",
      },
      create: {
        id: client.id,
        organizationId: context.user.organizationId,
        name: client.name,
        brandName: client.brandName,
        communicationIdentity: client.communicationIdentity,
      },
    });

    await prisma.clientAssignment.upsert({
      where: {
        clientAccountId_userId: {
          clientAccountId: client.id,
          userId: context.user.id,
        },
      },
      update: {},
      create: { clientAccountId: client.id, userId: context.user.id },
    });

    const hasLegacyHubSpotToken = client.provider === "HUBSPOT" && Boolean(process.env.HUBSPOT_ACCESS_TOKEN?.trim());
    const connection = await prisma.integrationConnection.upsert({
      where: {
        ownershipKey_provider: {
          ownershipKey: `client:${client.id}`,
          provider: client.provider,
        },
      },
      update: {
        organizationId: context.user.organizationId,
        ownershipType: "CLIENT_ACCOUNT",
        clientAccountId: client.id,
        status: client.provider === "MOCK" || hasLegacyHubSpotToken ? "CONNECTED" : "AUTHENTICATION_REQUIRED",
      },
      create: {
        organizationId: context.user.organizationId,
        ownershipType: "CLIENT_ACCOUNT",
        ownershipKey: `client:${client.id}`,
        clientAccountId: client.id,
        provider: client.provider,
        status: client.provider === "MOCK" || hasLegacyHubSpotToken ? "CONNECTED" : "AUTHENTICATION_REQUIRED",
      },
    });

    // Transitional development compatibility only: this stores an environment
    // variable reference, never the token itself. Completing OAuth replaces it
    // with per-connection AES-256-GCM encrypted credentials.
    if (hasLegacyHubSpotToken) {
      await prisma.integrationCredential.upsert({
        where: { integrationConnectionId: connection.id },
        update: {},
        create: {
          integrationConnectionId: connection.id,
          encryptedAccessToken: "env:HUBSPOT_ACCESS_TOKEN",
          metadata: { migratedLegacyReference: true },
        },
      });
    }

    // Provision ActiveCampaign as Client CRM
    const acConnection = await prisma.integrationConnection.upsert({
      where: {
        ownershipKey_provider: {
          ownershipKey: `client:${client.id}`,
          provider: "ACTIVECAMPAIGN",
        },
      },
      update: {
        organizationId: context.user.organizationId,
        ownershipType: "CLIENT_ACCOUNT",
        clientAccountId: client.id,
        status: "CONNECTED",
      },
      create: {
        organizationId: context.user.organizationId,
        ownershipType: "CLIENT_ACCOUNT",
        ownershipKey: `client:${client.id}`,
        clientAccountId: client.id,
        provider: "ACTIVECAMPAIGN",
        status: "CONNECTED",
      },
    });

    await prisma.integrationCredential.upsert({
      where: { integrationConnectionId: acConnection.id },
      update: {},
      create: {
        integrationConnectionId: acConnection.id,
        encryptedAccessToken: "env:ACTIVECAMPAIGN_API_KEY",
        metadata: { apiUrl: "https://client-crm.api-us1.com/api/3" },
      },
    });

    await prisma.communicationIdentity.upsert({
      where: {
        clientAccountId_phoneNumber: {
          clientAccountId: client.id,
          phoneNumber: client.communicationIdentity,
        },
      },
      update: {
        label: `${client.brandName} primary line`,
        isDefault: true,
        isEnabled: true,
      },
      create: {
        organizationId: context.user.organizationId,
        clientAccountId: client.id,
        provider: "MOCK",
        label: `${client.brandName} primary line`,
        phoneNumber: client.communicationIdentity,
        isDefault: true,
      },
    });
  }
}
