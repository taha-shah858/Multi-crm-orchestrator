import { AppError } from "@/lib/errors/app-error";

export type SupportedCalendarProvider = "MANUAL" | "MOCK" | "GOOGLE" | "OUTLOOK";

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
 * Calendar providers stay behind this boundary. Manual appointments require no
 * external provider; MOCK supports the complete local MVP flow. Google and
 * Outlook can be registered here later without changing the API or dashboard.
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
