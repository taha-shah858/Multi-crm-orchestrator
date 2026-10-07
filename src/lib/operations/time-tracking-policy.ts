export const TIME_HEARTBEAT_MS = 20_000;
export const TIME_IDLE_MS = 120_000;
export const TIME_MAX_GAP_MS = 60_000;

export type TrackingReason = "IDLE" | "HIDDEN" | "MANUAL" | "SWITCH" | "LEAVING" | "OFFLINE";
export interface TimeTrackingInput {
  action: "HEARTBEAT" | "PAUSE";
  clientAccountId: string;
  tabId: string;
  sequence: number;
  reason?: TrackingReason;
  reset?: boolean;
}
export interface TimeTrackingSnapshot {
  isRunning: boolean;
  clientAccountId: string | null;
  timeLogId: string | null;
  trackedSeconds: number;
  clientTotalSeconds?: number;
  ignored: boolean;
}
export function effectiveTimeSeconds(log: { source: string; minutes: number; trackedSeconds: number; isManualOverride: boolean }) {
  return log.source === "AUTO" && !log.isManualOverride ? log.trackedSeconds : log.minutes * 60;
}
export function summarizeTime(groups: Array<{ source: string; isManualOverride: boolean; _sum?: { minutes?: number | null; trackedSeconds?: number | null } }>) {
  const activeSeconds = groups.reduce((sum, group) => sum + effectiveTimeSeconds({ ...group, minutes: group._sum?.minutes ?? 0, trackedSeconds: group._sum?.trackedSeconds ?? 0 }), 0);
  return { activeSeconds, activeMinutes: Number((activeSeconds / 60).toFixed(2)), billableHours: Number((activeSeconds / 3600).toFixed(2)) };
}
export function formatTrackedTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  return `${minutes.toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

export function expectedHourlyPayCents(seconds: number, hourlyRateCents: number | null) {
  return hourlyRateCents === null ? null : Math.round(seconds * hourlyRateCents / 3600);
}
