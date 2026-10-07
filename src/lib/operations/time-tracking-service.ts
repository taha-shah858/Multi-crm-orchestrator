import "server-only";

import type { Prisma, TimeTrackingSession } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { AuthenticatedUser } from "@/lib/models/canonical";
import { summarizeTime, TIME_MAX_GAP_MS, type TimeTrackingInput, type TimeTrackingSnapshot } from "@/lib/operations/time-tracking-policy";

export function parseTrackingInput(input: Record<string, unknown>): TimeTrackingInput {
  const reasons = ["IDLE", "HIDDEN", "MANUAL", "SWITCH", "LEAVING", "OFFLINE"];
  if (!input || typeof input !== "object" || Array.isArray(input) || (input.action !== "HEARTBEAT" && input.action !== "PAUSE")
    || typeof input.clientAccountId !== "string" || !input.clientAccountId || input.clientAccountId.length > 128
    || typeof input.tabId !== "string" || !/^[a-f0-9-]{36}$/i.test(input.tabId)
    || !Number.isInteger(input.sequence) || Number(input.sequence) < 1 || Number(input.sequence) > 2147483647
    || (input.reason !== undefined && !reasons.includes(String(input.reason)))
    || (input.reset !== undefined && typeof input.reset !== "boolean")) {
    throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid tracking request.", "Reload the workspace to restart time tracking.");
  }
  return input as unknown as TimeTrackingInput;
}

async function accessibleClient(tx: Prisma.TransactionClient, user: AuthenticatedUser, clientAccountId: string) {
  return tx.clientAccount.findFirst({ where: { id: clientAccountId, organizationId: user.organizationId, status: "ACTIVE", agentAssignments: { some: { userId: user.id } } }, select: { id: true, name: true } });
}

async function snapshot(tx: Prisma.TransactionClient, cursor: TimeTrackingSession, ignored = false): Promise<TimeTrackingSnapshot> {
  const log = cursor.timeLogId ? await tx.timeLog.findUnique({ where: { id: cursor.timeLogId }, select: { trackedSeconds: true } }) : null;
  const groups = cursor.clientAccountId ? await tx.timeLog.groupBy({ by: ["source", "isManualOverride"], where: { organizationId: cursor.organizationId, userId: cursor.userId, clientAccountId: cursor.clientAccountId }, _sum: { minutes: true, trackedSeconds: true } }) : [];
  return { isRunning: cursor.isRunning, clientAccountId: cursor.clientAccountId, timeLogId: cursor.timeLogId, trackedSeconds: log?.trackedSeconds ?? 0, clientTotalSeconds: summarizeTime(groups).activeSeconds, ignored };
}

async function createSegment(tx: Prisma.TransactionClient, user: AuthenticatedUser, client: { id: string; name: string }, at: Date, requestId: string) {
  const log = await tx.timeLog.create({ data: { organizationId: user.organizationId, clientAccountId: client.id, userId: user.id, source: "AUTO", minutes: 0, trackedSeconds: 0, description: `Active work — ${client.name}`, loggedAt: at } });
  await tx.auditLog.create({ data: { organizationId: user.organizationId, clientAccountId: client.id, userId: user.id, action: "TIME_LOG_CREATED", entityType: "TIME_LOG", entityId: log.id, requestId, source: "PLATFORM", metadata: { source: "AUTO" } } });
  return log.id;
}

/** Credit confirmed, bounded intervals. Split UTC midnight so date reports stay accurate. */
async function creditInterval(tx: Prisma.TransactionClient, user: AuthenticatedUser, cursor: TimeTrackingSession, now: Date, requestId: string) {
  if (!cursor.isRunning || !cursor.lastHeartbeatAt || !cursor.clientAccountId) return cursor.timeLogId;
  const gap = now.getTime() - cursor.lastHeartbeatAt.getTime();
  if (gap < 0 || gap > TIME_MAX_GAP_MS) return cursor.timeLogId;
  const client = await accessibleClient(tx, user, cursor.clientAccountId);
  if (!client) return cursor.timeLogId; // Revoked client access must not accrue time.
  let position = cursor.lastHeartbeatAt;
  const end = new Date(position.getTime() + Math.floor(gap / 1000) * 1000);
  let timeLogId = cursor.timeLogId;
  while (position < end) {
    const midnight = new Date(position);
    midnight.setUTCHours(24, 0, 0, 0);
    const boundary = new Date(Math.min(end.getTime(), midnight.getTime()));
    const seconds = Math.round((boundary.getTime() - position.getTime()) / 1000);
    let log = timeLogId ? await tx.timeLog.findUnique({ where: { id: timeLogId } }) : null;
    if (!log || log.isManualOverride || log.loggedAt.toISOString().slice(0, 10) !== position.toISOString().slice(0, 10)) {
      timeLogId = await createSegment(tx, user, client, position, requestId);
      log = await tx.timeLog.findUniqueOrThrow({ where: { id: timeLogId } });
    }
    const trackedSeconds = log.trackedSeconds + seconds;
    await tx.timeLog.update({ where: { id: log.id }, data: { trackedSeconds, minutes: Math.floor(trackedSeconds / 60) } });
    position = boundary;
  }
  return timeLogId;
}

/** The route never accepts client durations or timestamps; now is server-owned. */
export async function trackActiveTime(user: AuthenticatedUser, input: TimeTrackingInput, requestId: string, now = new Date()) {
  if (user.role !== "AGENT") throw new AppError("FORBIDDEN", 403, "Agent access is required.", "Automatic work time is recorded in the agent workspace.");
  now = new Date(Math.floor(now.getTime() / 1000) * 1000);
  return prisma.$transaction(async (tx) => {
    // Upsert + row lock serializes simultaneous tabs and first heartbeats.
    await tx.timeTrackingSession.upsert({ where: { userId: user.id }, create: { organizationId: user.organizationId, userId: user.id }, update: {} });
    await tx.$queryRaw`SELECT "id" FROM "TimeTrackingSession" WHERE "userId" = ${user.id} AND "organizationId" = ${user.organizationId} FOR UPDATE`;
    const cursor = await tx.timeTrackingSession.findFirst({ where: { userId: user.id, organizationId: user.organizationId } });
    if (!cursor) throw new AppError("FORBIDDEN", 403, "Tracker is outside this agency.", "Sign in again to restart tracking.");
    if (cursor.tabId === input.tabId && input.sequence <= cursor.sequence) return snapshot(tx, cursor, true);

    if (input.action === "PAUSE") {
      // An old tab/client cannot pause the current foreground tab's session.
      if ((cursor.tabId && cursor.tabId !== input.tabId) || (cursor.clientAccountId && cursor.clientAccountId !== input.clientAccountId)) return snapshot(tx, cursor, true);
      const timeLogId = input.reset ? cursor.timeLogId : await creditInterval(tx, user, cursor, now, requestId);
      const stopped = await tx.timeTrackingSession.update({ where: { id: cursor.id }, data: { isRunning: false, timeLogId, tabId: input.tabId, sequence: input.sequence, lastHeartbeatAt: null, pauseReason: input.reason ?? "MANUAL" } });
      return snapshot(tx, stopped);
    }

    const client = await accessibleClient(tx, user, input.clientAccountId);
    if (!client) throw new AppError("CLIENT_ACCESS_DENIED", 403, "Client account access is denied.", "Select an assigned client before tracking work time.");
    const sameOwner = cursor.tabId === input.tabId;
    if (cursor.lastHeartbeatAt && now < cursor.lastHeartbeatAt) {
      // Requests may wait for a row lock or the server clock may move back.
      // Never restart from an earlier timestamp and count the interval twice.
      const latest = sameOwner ? await tx.timeTrackingSession.update({ where: { id: cursor.id }, data: { sequence: input.sequence } }) : cursor;
      return snapshot(tx, latest, true);
    }
    const fresh = cursor.lastHeartbeatAt && now.getTime() - cursor.lastHeartbeatAt.getTime() >= 0 && now.getTime() - cursor.lastHeartbeatAt.getTime() <= TIME_MAX_GAP_MS;
    const continueSegment = cursor.isRunning && sameOwner && fresh && !input.reset && cursor.clientAccountId === client.id;
    // A newly focused tab/reload starts at now: never credit an unconfirmed gap.
    let timeLogId = sameOwner && !input.reset ? await creditInterval(tx, user, cursor, now, requestId) : cursor.timeLogId;
    if (!continueSegment) timeLogId = null; // Do not create empty logs for brief focus changes.
    const elapsed = continueSegment && cursor.lastHeartbeatAt ? Math.floor((now.getTime() - cursor.lastHeartbeatAt.getTime()) / 1000) * 1000 : 0;
    const lastHeartbeatAt = continueSegment && cursor.lastHeartbeatAt ? new Date(cursor.lastHeartbeatAt.getTime() + elapsed) : now;
    const running = await tx.timeTrackingSession.update({ where: { id: cursor.id }, data: { clientAccountId: client.id, timeLogId, tabId: input.tabId, sequence: input.sequence, isRunning: true, lastHeartbeatAt, pauseReason: null } });
    return snapshot(tx, running);
  });
}
