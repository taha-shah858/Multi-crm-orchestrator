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

    const connection = await prisma.crmConnection.upsert({
      where: {
        clientAccountId_provider: {
          clientAccountId: client.id,
          provider: client.provider,
        },
      },
      update: { status: "CONNECTED" },
      create: {
        organizationId: context.user.organizationId,
        clientAccountId: client.id,
        provider: client.provider,
        status: "CONNECTED",
      },
    });

    // This is a server-only reference, never a token value. It preserves the
    // current development setup while allowing each connection to point at a
    // distinct HubSpot credential such as env:HUBSPOT_NORTHSTAR_ACCESS_TOKEN.
    if (client.provider === "HUBSPOT" && !connection.encryptedAccessToken) {
      await prisma.crmConnection.update({
        where: { id: connection.id },
        data: { encryptedAccessToken: "env:HUBSPOT_ACCESS_TOKEN" },
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
