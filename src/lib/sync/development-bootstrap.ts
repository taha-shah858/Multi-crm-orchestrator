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
