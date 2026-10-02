export const remoteCalendarProviders = ["GOOGLE", "OUTLOOK", "CALENDLY"] as const;
export type RemoteCalendarProvider = typeof remoteCalendarProviders[number];
export type SupportedCalendarProvider = "MANUAL" | "MOCK" | RemoteCalendarProvider;
export interface CalendarConnectionSummary {
  provider: RemoteCalendarProvider;
  configured: boolean;
  connected: boolean;
  accountName: string | null;
  status: string;
}
export interface CalendlyEventType { uri: string; name: string; duration: number; schedulingUrl: string | null; }
export function isRemoteCalendarProvider(value: unknown): value is RemoteCalendarProvider {
  return remoteCalendarProviders.includes(value as RemoteCalendarProvider);
}
