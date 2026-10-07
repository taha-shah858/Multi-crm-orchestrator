# Conversation scheduling signals

Calendar Planner includes **Analyze a conversation**. Select the current client, optionally choose a prospect, paste up to 12,000 characters and generate a scheduling signal. The transcript is sent to Gemini using the existing GEMINI_API_KEY and optional GEMINI_MODEL configuration. The scheduling default is gemini-3.8-flash.

AI checks the prospect's final agreement, retains a verbatim supporting quote and proposes a date/time only when unambiguous. Relative dates use the current instant and browser timezone. No agreement creates no signal. Provider/configuration errors retain the input for retry or manual scheduling.

Signals persist as client-scoped interaction notes with structured scheduling metadata and remain available after refresh. Existing interaction keyword signals remain supported. All signals returned by the existing workspace query are shown (the query scans the latest 100 interactions).

Choose a slot opens the existing confirmation form, prefills the suggested instant/duration, and selects connected Google Calendar by default. Review the date, time and provider, then save. The existing provider sync creates the Google event and stores the local appointment; failures retain the local meeting for retry. An invitation is optional and requires a linked contact email. AI never books automatically.

Validation: scripts/scheduling-analysis-test.cjs uses a Gemini double, not live API calls. Existing scripts/calendar-provider-sync-test.cjs covers provider synchronization.
