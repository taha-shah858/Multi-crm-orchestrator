# Module 6.8: calendar connections and meeting sync

Agents can connect their own Google Calendar, Outlook Calendar and Calendly account from **Calendar Planner → Your calendars**. The meeting form keeps the manual calendar available and adds a provider selector, an invitation checkbox and Calendly event types. Each meeting displays its sync status. Open a meeting to retry a failed sync, refresh its external changes, or follow its provider link.

This extends the existing scheduling workspace. It does not change the agreed CRM mapping: HubSpot for the agency, Zoho for clients, and ClickUp for agents. The `new` and `email-setup` branches are not merged or changed.

## Provider behavior

| Provider | Booking and updates | Invitations | External changes |
| --- | --- | --- | --- |
| Manual | Save, edit, confirm and cancel locally | None | Local only |
| Google | Create, edit and cancel in the agent's primary calendar | Optional; explicit checkbox and a selected contact with an email | Refresh title, time and cancellation status |
| Outlook | Create, edit and cancel in the agent's default calendar | Optional; explicit checkbox and a selected contact with an email | Refresh title, time and cancellation status |
| Calendly | Book an active individual event type and cancel a confirmed booking | Required for direct booking | Use its reschedule link; refresh follows the contact's replacement booking and updates its time and links |

Times are stored in UTC and shown in the browser's local time. Calendly receives the browser's IANA time zone. Selecting a Calendly event type sets the end time to its duration. The server validates duration, ownership and required questions again before booking.

Google and Outlook meetings without the invitation checkbox have no external attendees. The checkbox and selected recipient are fixed when a meeting is created; later changes to an invited meeting notify its original recipient through the provider. For Calendly event types with required custom questions, use the displayed scheduling link to complete those questions. Bookings made through a general scheduling page are not automatically imported into this app.

## Local credential setup

No deployment is needed to develop this feature. Register OAuth applications and use an allowed localhost redirect URL matching the actual port. The example below assumes `http://localhost:3000`; change both the provider registration and environment value together if using another port. Calendar authorization is separate from signup/sign-in OAuth and does not require merging `email-setup`.

Set these values in `.env.local`, then restart the application:

```dotenv
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/connections/GOOGLE/callback

OUTLOOK_CALENDAR_CLIENT_ID=
OUTLOOK_CALENDAR_CLIENT_SECRET=
OUTLOOK_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/connections/OUTLOOK/callback

CALENDLY_CLIENT_ID=
CALENDLY_CLIENT_SECRET=
CALENDLY_REDIRECT_URI=http://localhost:3000/api/calendar/connections/CALENDLY/callback
```

Use the existing `INTEGRATION_ENCRYPTION_KEY`, a 32-byte base64 encryption key. Keep that key stable: replacing it makes previously stored integration tokens unreadable. Never commit real OAuth secrets. A provider shows **Needs setup** until its ID, secret, redirect URL and encryption key are present.

- **Google:** enable the Google Calendar API, configure an OAuth consent screen and create a Web application OAuth client with the exact callback URL. Add the agent's Google account as a test user while the consent screen is in testing. Requested scopes are `openid`, `email` and `https://www.googleapis.com/auth/calendar.events.owned`. The offline consent flow obtains a refresh token. See [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server) and [Calendar scopes](https://developers.google.com/workspace/calendar/api/auth).
- **Outlook:** register a Microsoft Entra application with a Web callback and client secret. To support both work/school and personal Microsoft accounts through the configured `common` endpoint, choose that supported account type. Use delegated `User.Read` and `Calendars.ReadWrite`, plus `offline_access`. Tenant policies may require admin consent. See [Microsoft OAuth authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow) and [Graph event creation](https://learn.microsoft.com/en-us/graph/api/user-post-events?view=graph-rest-1.0).
- **Calendly:** register an OAuth application and exact callback. Enable `users:read`, `event_types:read`, `event_types:write`, `availability:read`, `availability:write`, `scheduled_events:read` and `scheduled_events:write`. Use **Reconnect Calendly to update permissions** for an existing connection. Direct booking requires a Standard or higher paid account, an active individual event type, and an available slot. See [Calendly OAuth scopes](https://developer.calendly.com/docs/authentication/scopes) and [Create Event Invitee](https://developer.calendly.com/api-docs/calendly-api/scheduled-events/create-event-invitee).

## Manage Calendly event types

After connecting Calendly, open **Your calendars → Manage Calendly event types**. Create a new individual meeting type, or select an existing active/inactive type to edit its name, description, duration and active status. New types default to inactive so availability can be reviewed before enabling bookings. These changes affect the agent's personal Calendly account across clients; existing appointments retain their booked details. Organization-managed and other users' types cannot be edited.

For an existing type, click **Load availability**, choose its IANA time zone and edit weekly time intervals. Multiple shifts are supported. Remove all intervals to mark a day unavailable. Date-specific overrides are displayed and preserved; change those specific overrides in Calendly. Type details and availability have separate save buttons, so each provider operation has a clear result. See [Create Event Type](https://developer.calendly.com/api-docs/calendly-api/event-types/create-event-type), [Update Event Type](https://developer.calendly.com/api-docs/calendly-api/event-types/update-event-type), and [Update Availability](https://developer.calendly.com/api-docs/calendly-api/availability/update-event-type-availability).

An uncertain event-type creation response pauses the create button. Refresh the list and check for the created type before trying again. Editing an event type does not reschedule an existing booking.

Real provider consent and booking still need to be verified after those credentials are supplied. Automated checks intercept provider HTTP requests and use fake tokens; they do not create real calendar events or send invitations.

## Recovery, privacy and boundaries

- A meeting and its audit entry are saved locally before any provider write. A failed request retains the meeting and shows its error. Open it and use **Retry calendar sync** after correcting the cause. **Refresh from calendar** applies only after local changes have synchronized.
- Google uses a stable event ID and Outlook uses a stable transaction ID to recover a lost create response. Writes and refresh-token rotations are serialized per connection. Retrying a synchronized meeting does not create another event.
- An ambiguous Calendly create is marked **Check booking** / `REVIEW_REQUIRED`; retries and edits cannot silently create another booking. Check Calendly before booking again. This version has no automatic recovery of an unknown Calendly booking ID.
- Only the agent who booked a live meeting can modify, cancel or synchronize it. Other agents assigned to that client may view it; provider action links are withheld from them, including Calendly links that can reschedule or cancel without signing in. Agency and active-client boundaries are enforced by the server.
- Appointments remain pinned to the calendar account that created them. Connecting a different account does not redirect an old appointment's writes. Reconnect the original account when its credentials expire or are revoked.
- Disconnect deletes stored access/refresh tokens and invalidates pending authorization attempts. Existing meetings remain in the ledger and provider. Disconnect does not cancel meetings or revoke the provider's app grant; those actions remain available in the provider account.
- Tokens and PKCE verifiers are encrypted. OAuth state is hashed, expires after ten minutes, is single-use, and belongs to the signed-in agent and agency. API summaries expose connection status and account name, never tokens.

## Scope still separate

This adds live-provider booking adapters and explicit refresh for meetings created here. It does not import unrelated personal events, offer a background calendar feed/webhooks, or synchronize external notes and attendees. Calendly refresh follows up to two consecutive reschedules; longer chains require provider review. Shared/team/group Calendly types and event types requiring additional answers use the scheduling page.

The existing scheduling signals still use deterministic detection of meeting language. They require agent confirmation of date and time; an external AI intent model is a separate remaining module 6.8 item. This change does not claim every module 6.1–6.9 is complete.

## Validation

Run `node scripts/calendar-provider-sync-test.cjs` against a migrated local PostgreSQL database. It creates disposable agency/client/agent records and removes them afterward. Thirteen integration checks cover local fallback, OAuth state and encryption, provider lifecycle, invitation consent, access boundaries, rate-limit recovery, token rotation, duplicate prevention, account pinning, disconnect races, Calendly rescheduling/ambiguous outcomes, event-type management and availability validation. All outbound calendar traffic is intercepted.

Apply the additive migration with `prisma migrate deploy`, then generate the Prisma client. Do not reset the database or merge the credential-setup branch to apply this migration.
