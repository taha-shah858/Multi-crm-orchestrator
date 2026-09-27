import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import {
  fetchClickUpLists,
  fetchClickUpSpaces,
  fetchClickUpTeams,
  resolveClickUpCredentials,
} from "./client";
import type { ClickUpDestinationConfig } from "./types";

export async function saveAgentClickUpDestination(
  userId: string,
  organizationId: string,
  destination: ClickUpDestinationConfig,
) {
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      organizationId,
      ownershipType: "USER",
      userId,
      provider: "CLICKUP" as any,
    },
    include: { credential: true },
  });

  if (!connection || !connection.credential) {
    throw new AppError(
      "CLICKUP_NOT_CONNECTED",
      404,
      "ClickUp connection not found for this agent.",
      "Connect ClickUp before selecting a workspace or list.",
    );
  }

  const existingMeta = (connection.credential.metadata as Record<string, unknown>) || {};
  const updatedMeta = {
    ...existingMeta,
    destination: {
      teamId: destination.teamId,
      teamName: destination.teamName,
      spaceId: destination.spaceId,
      spaceName: destination.spaceName,
      listId: destination.listId,
      listName: destination.listName,
    },
  };

  await prisma.integrationCredential.update({
    where: { integrationConnectionId: connection.id },
    data: {
      metadata: updatedMeta,
      updatedAt: new Date(),
    },
  });

  return updatedMeta.destination;
}

export async function getAgentClickUpDestination(
  userId: string,
  organizationId: string,
): Promise<ClickUpDestinationConfig | null> {
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      organizationId,
      ownershipType: "USER",
      userId,
      provider: "CLICKUP" as any,
    },
    include: { credential: true },
  });

  if (!connection || !connection.credential) return null;
  const meta = connection.credential.metadata as {
    destination?: ClickUpDestinationConfig;
  } | null;

  return meta?.destination || null;
}

export async function listAgentClickUpHierarchy(
  userId: string,
  organizationId: string,
) {
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      organizationId,
      ownershipType: "USER",
      userId,
      provider: "CLICKUP" as any,
    },
  });

  if (!connection) {
    throw new AppError(
      "CLICKUP_NOT_CONNECTED",
      404,
      "ClickUp is not connected for this agent.",
      "Connect your ClickUp account first.",
    );
  }

  const auth = await resolveClickUpCredentials(connection);
  const teams = await fetchClickUpTeams(auth);

  const teamHierarchies = [];
  for (const team of teams) {
    const spaces = await fetchClickUpSpaces(auth, team.id).catch(() => []);
    const spaceList = [];
    for (const space of spaces) {
      const lists = await fetchClickUpLists(auth, space.id).catch(() => []);
      spaceList.push({ ...space, lists });
    }
    teamHierarchies.push({ ...team, spaces: spaceList });
  }

  return { teams: teamHierarchies, currentDestination: auth.destination };
}
