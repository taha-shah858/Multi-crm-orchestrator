import { AppError } from "@/lib/errors/app-error";

import type { SupportedCalendarProvider } from "@/lib/calendar/calendar-types";
export type { SupportedCalendarProvider } from "@/lib/calendar/calendar-types";

interface CalendarAdapterInput {
  title: string;
  startTime: Date;
  endTime: Date;
}

interface CalendarAdapterResult {
  externalId: string;
  metadata: Record<string, string>;
}

interface CalendarAdapter {
  createEvent(input: CalendarAdapterInput): Promise<CalendarAdapterResult>;
  updateEvent(externalId: string, input: CalendarAdapterInput): Promise<void>;
  cancelEvent(externalId: string): Promise<void>;
}

const mockCalendarAdapter: CalendarAdapter = {
  async createEvent(input) {
    return {
      externalId: `mock-calendar-${crypto.randomUUID()}`,
      metadata: {
        title: input.title,
        startTime: input.startTime.toISOString(),
        endTime: input.endTime.toISOString(),
      },
    };
  },
  async updateEvent() {},
  async cancelEvent() {},
};

const adapters: Partial<Record<SupportedCalendarProvider, CalendarAdapter>> = {
  MOCK: mockCalendarAdapter,
};

/**
 * Local appointments need no credentials. Live providers use the authenticated
 * connection and sync service; MOCK remains available for local system checks.
 */
export function calendarAdapterFor(provider: SupportedCalendarProvider) {
  if (provider === "MANUAL") return null;
  const adapter = adapters[provider];
  if (!adapter) {
    throw new AppError(
      "CALENDAR_PROVIDER_UNAVAILABLE",
      422,
      "Calendar provider is not configured.",
      "Use the manual calendar while this provider is not connected.",
    );
  }
  return adapter;
}
