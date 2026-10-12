# Conversation scheduling signals

Calendar Planner includes **Analyze a conversation**. Select the current client, optionally choose a prospect, paste up to 12,000 characters and generate a scheduling signal. The transcript is sent to the configured provider.

Set `CALENDAR_AI_PROVIDER=openai`, `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `.env.local` for native development or `.env.docker` for Docker, then restart/recreate the server. The code defaults to `gpt-4.1-mini` and uses the Responses API with a strict JSON schema, a 20-second timeout and `store: false`. The key stays server-side. Live OpenAI verification requires your key.

To use Gemini instead, set `CALENDAR_AI_PROVIDER=gemini` and configure `GEMINI_API_KEY` and optional `GEMINI_MODEL` (default `gemini-3.8-flash`). If provider selection is omitted, existing deployments continue using Gemini. There is no automatic fallback to a different provider. Each newly analyzed signal stores its provider in metadata. This setting affects Calendar Planner analysis; AI Copilot keeps its existing Gemini implementation.

AI checks the prospect's final agreement, retains a verbatim supporting quote and proposes a date/time only when unambiguous. Relative dates use the current instant and browser timezone. No agreement creates no signal. Provider/configuration errors retain the input for retry or manual scheduling.

Signals persist as client-scoped interaction notes with structured scheduling metadata and remain available after refresh. Existing interaction keyword signals remain supported. All signals returned by the existing workspace query are shown (the query scans the latest 100 interactions).

Choose a slot opens the existing confirmation form, prefills the suggested instant/duration, and selects connected Google Calendar by default. Review the date, time and provider, then save. The existing provider sync creates the Google event and stores the local appointment; failures retain the local meeting for retry. An invitation is optional and requires a linked contact email. AI never books automatically.

Validation: scripts/scheduling-analysis-test.cjs uses Gemini and OpenAI doubles, not live API calls. It verifies provider selection, request schema, missing keys, access checks, provider errors, refusals and incomplete results. Existing scripts/calendar-provider-sync-test.cjs covers provider synchronization.
