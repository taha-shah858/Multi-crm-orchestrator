import "server-only";

import type { IntegrationConnection } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "@/lib/integrations/credential-crypto";
import { CLICKUP_DEFAULT_API_URL, refreshClickUpToken } from "./oauth";
import type {
  ClickUpDestinationConfig,
  ClickUpList,
  ClickUpSpace,
  ClickUpTaskCreateInput,
  ClickUpTaskResponse,
  ClickUpTaskUpdateInput,
  ClickUpTeam,
} from "./types";

export interface ClickUpAuthContext {
  accessToken: string;
  refreshToken?: string;
  apiUrl: string;
  isMock: boolean;
  destination: ClickUpDestinationConfig;
}

export async function resolveClickUpCredentials(
  connection: IntegrationConnection,
): Promise<ClickUpAuthContext> {
  const credential = await prisma.integrationCredential.findUnique({
    where: { integrationConnectionId: connection.id },
  });

  if (!credential) {
    const envToken = process.env.CLICKUP_ACCESS_TOKEN;
    const envApiUrl = process.env.CLICKUP_API_URL || CLICKUP_DEFAULT_API_URL;
    if (envToken) {
      return {
        accessToken: envToken,
        apiUrl: envApiUrl,
        isMock: envToken.startsWith("mock") || envToken.startsWith("test"),
        destination: {
          teamId: "mock-team",
          teamName: "Sales Workspace",
          listId: "mock-list",
          listName: "My Closed Deals",
        },
      };
    }
    throw new AppError(
      "CREDENTIAL_NOT_FOUND",
      404,
      "ClickUp credentials are missing.",
      "Connect your personal ClickUp account to continue.",
    );
  }

  let accessToken: string;
  let refreshToken: string | undefined;

  if (credential.encryptedAccessToken.startsWith("env:")) {
    const varName = credential.encryptedAccessToken.slice(4);
    accessToken = process.env[varName] || "";
  } else {
    accessToken = decryptIntegrationSecret(credential.encryptedAccessToken);
  }

  if (credential.encryptedRefreshToken) {
    if (credential.encryptedRefreshToken.startsWith("env:")) {
      const varName = credential.encryptedRefreshToken.slice(4);
      refreshToken = process.env[varName] || undefined;
    } else {
      refreshToken = decryptIntegrationSecret(credential.encryptedRefreshToken);
    }
  }

  const meta = credential.metadata as {
    apiUrl?: string;
    destination?: ClickUpDestinationConfig;
  } | null;

  const apiUrl = meta?.apiUrl || process.env.CLICKUP_API_URL || CLICKUP_DEFAULT_API_URL;
  const destination = meta?.destination || {};
  const isMock =
    accessToken.startsWith("mock") ||
    accessToken.startsWith("test") ||
    accessToken.startsWith("clickup-access-") ||
    Boolean(process.env.CLICKUP_MOCK === "true");

  // Check if token expired and refresh if applicable
  const now = Date.now();
  if (
    !isMock &&
    credential.accessTokenExpiresAt &&
    credential.accessTokenExpiresAt.getTime() - now < 60000 &&
    refreshToken
  ) {
    try {
      const refreshed = await refreshClickUpToken(refreshToken, { apiUrl });
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(now + refreshed.expires_in * 1000);

      await prisma.integrationCredential.update({
        where: { integrationConnectionId: connection.id },
        data: {
          encryptedAccessToken: encryptIntegrationSecret(refreshed.access_token),
          accessTokenExpiresAt: newExpiresAt,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.warn("[ClickUp Client] Token refresh failed:", error);
    }
  }

  return {
    accessToken,
    refreshToken,
    apiUrl,
    isMock,
    destination,
  };
}

export async function fetchClickUpTeams(
  auth: ClickUpAuthContext,
): Promise<ClickUpTeam[]> {
  if (auth.isMock) {
    return [
      {
        id: "mock-team-1",
        name: "Personal Workspace",
        color: "#7B68EE",
        members: [{ user: { id: 101, username: "Sales Agent", email: "agent@agency.com" } }],
      },
      {
        id: "mock-team-2",
        name: "Agency Sales Workspace",
        color: "#00E5FF",
        members: [{ user: { id: 101, username: "Sales Agent", email: "agent@agency.com" } }],
      },
    ];
  }

  const url = `${auth.apiUrl.replace(/\/+$/, "")}/team`;
  const response = await fetch(url, {
    headers: {
      Authorization: auth.accessToken,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new AppError(
      "CLICKUP_API_ERROR",
      response.status,
      `ClickUp fetch teams failed: ${errorText}`,
      "Could not load ClickUp workspaces.",
    );
  }

  const data = (await response.json()) as { teams: ClickUpTeam[] };
  return data.teams || [];
}

export async function fetchClickUpSpaces(
  auth: ClickUpAuthContext,
  teamId: string,
): Promise<ClickUpSpace[]> {
  if (auth.isMock) {
    return [
      { id: "mock-space-1", name: "Deals & Commission Tracking" },
      { id: "mock-space-2", name: "Sales Pipeline" },
    ];
  }

  const url = `${auth.apiUrl.replace(/\/+$/, "")}/team/${teamId}/space`;
  const response = await fetch(url, {
    headers: {
      Authorization: auth.accessToken,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new AppError(
      "CLICKUP_API_ERROR",
      response.status,
      `ClickUp fetch spaces failed: ${errorText}`,
      "Could not load ClickUp spaces.",
    );
  }

  const data = (await response.json()) as { spaces: ClickUpSpace[] };
  return data.spaces || [];
}

export async function fetchClickUpLists(
  auth: ClickUpAuthContext,
  spaceId: string,
): Promise<ClickUpList[]> {
  if (auth.isMock) {
    return [
      { id: "mock-list-1", name: "My Closed Deals", space: { id: spaceId, name: "Deals" } },
      { id: "mock-list-2", name: "Commission Payouts", space: { id: spaceId, name: "Deals" } },
    ];
  }

  const lists: ClickUpList[] = [];

  // Folderless lists
  const spaceListsUrl = `${auth.apiUrl.replace(/\/+$/, "")}/space/${spaceId}/list`;
  const spaceListsRes = await fetch(spaceListsUrl, {
    headers: {
      Authorization: auth.accessToken,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (spaceListsRes.ok) {
    const data = (await spaceListsRes.json()) as { lists: ClickUpList[] };
    if (data.lists) lists.push(...data.lists);
  }

  // Lists in folders
  const foldersUrl = `${auth.apiUrl.replace(/\/+$/, "")}/space/${spaceId}/folder`;
  const foldersRes = await fetch(foldersUrl, {
    headers: {
      Authorization: auth.accessToken,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (foldersRes.ok) {
    const folderData = (await foldersRes.json()) as { folders: Array<{ id: string; lists: ClickUpList[] }> };
    if (folderData.folders) {
      for (const folder of folderData.folders) {
        if (folder.lists) lists.push(...folder.lists);
      }
    }
  }

  return lists;
}

async function resolveListClosedStatus(auth: ClickUpAuthContext, listId: string): Promise<string | null> {
  try {
    const url = `${auth.apiUrl.replace(/\/+$/, "")}/list/${listId}`;
    const res = await fetch(url, {
      headers: {
        Authorization: auth.accessToken,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { statuses?: Array<{ status: string; type: string }> };
    if (!data.statuses || !Array.isArray(data.statuses)) return null;

    // 1. Look for type === "closed"
    const closedStatus = data.statuses.find((s) => s.type === "closed");
    if (closedStatus) return closedStatus.status;

    // 2. Look for status named "won" or containing "won"
    const wonStatus = data.statuses.find((s) => s.status.toLowerCase().includes("won"));
    if (wonStatus) return wonStatus.status;

    // 3. Look for type === "done"
    const doneStatus = data.statuses.find((s) => s.type === "done");
    if (doneStatus) return doneStatus.status;

    return null;
  } catch {
    return null;
  }
}

export async function createClickUpTask(
  auth: ClickUpAuthContext,
  listId: string,
  input: ClickUpTaskCreateInput,
): Promise<ClickUpTaskResponse> {
  if (auth.isMock) {
    const mockId = `task-${Date.now()}`;
    return {
      id: mockId,
      name: input.name,
      status: { status: input.status || "closed", type: "closed", orderindex: 1, color: "#00E5FF" },
      url: `https://app.clickup.com/t/${mockId}`,
      list: { id: listId, name: "My Closed Deals" },
      date_created: new Date().toISOString(),
      date_updated: new Date().toISOString(),
    };
  }

  const url = `${auth.apiUrl.replace(/\/+$/, "")}/list/${listId}/task`;
  let response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth.accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    if (errorText.includes("Status not found") || errorText.includes("CRTSK_001")) {
      const resolvedStatus = await resolveListClosedStatus(auth, listId);
      const retryBody = { ...input };
      if (resolvedStatus) {
        retryBody.status = resolvedStatus;
      } else {
        delete retryBody.status;
      }

      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: auth.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(retryBody),
        cache: "no-store",
      });

      if (response.ok) {
        return (await response.json()) as ClickUpTaskResponse;
      }
    }

    const finalError = await response.text().catch(() => "");
    throw new AppError(
      "CLICKUP_API_ERROR",
      response.status,
      `ClickUp create task failed: ${finalError || errorText}`,
      "Could not create task in ClickUp.",
    );
  }

  return (await response.json()) as ClickUpTaskResponse;
}

export async function updateClickUpTask(
  auth: ClickUpAuthContext,
  taskId: string,
  input: ClickUpTaskUpdateInput,
): Promise<ClickUpTaskResponse> {
  if (auth.isMock) {
    return {
      id: taskId,
      name: input.name || "Updated Task",
      status: { status: input.status || "closed", type: "closed", orderindex: 1, color: "#00E5FF" },
      url: `https://app.clickup.com/t/${taskId}`,
      date_updated: new Date().toISOString(),
    };
  }

  const url = `${auth.apiUrl.replace(/\/+$/, "")}/task/${taskId}`;
  let response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: auth.accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    if (errorText.includes("Status not found") || errorText.includes("CRTSK_001")) {
      const retryBody = { ...input };
      delete retryBody.status;

      response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: auth.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(retryBody),
        cache: "no-store",
      });

      if (response.ok) {
        return (await response.json()) as ClickUpTaskResponse;
      }
    }

    const finalError = await response.text().catch(() => "");
    throw new AppError(
      "CLICKUP_API_ERROR",
      response.status,
      `ClickUp update task failed: ${finalError || errorText}`,
      "Could not update task in ClickUp.",
    );
  }

  return (await response.json()) as ClickUpTaskResponse;
}
