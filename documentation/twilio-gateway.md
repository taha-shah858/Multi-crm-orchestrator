# Twilio gateway (6.2 / 6.3)

Admins assign an account-owned Twilio number to a client in Admin → Integrations → Twilio client numbers. Agents select the client identity in Smart Dialer. **Call** uses the laptop microphone and speakers/headset through Twilio's Voice JavaScript SDK. SMS and phone-app launch controls are removed from this screen; existing backend support and manual timeline logging remain. No recording, transcription or automatic call-to-AI pipeline is enabled.

## Outgoing laptop calls

1. Upgrade/fund the Twilio account and obtain a Voice-capable number. Assign the number to one client in the admin integration screen. A US local number can call Pakistan when the account's Voice Geographic Permissions permit Pakistan; dial recipients as `+92…`. Destination calling rates and the browser leg both consume credit.
2. In the **same Twilio account**, create a **Standard API key** in the US1 region. Save its SID and secret as `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET` on the server. These are separate from the Account SID and Auth Token. Keep all secrets out of browser code and Git.
3. Create a **TwiML App** under Voice → Manage → TwiML Apps. Set its **Voice Request URL** to `https://your-public-origin/api/communications/twilio/browser`, method **POST**. Set its voice **Status Callback URL** to `https://your-public-origin/api/communications/twilio/status`, method **POST**. Save its App SID as `TWILIO_TWIML_APP_SID`.
4. Set the remaining variables below in `.env.local` (native development), `.env.docker` (Compose), or the deployed server environment. Restart/rebuild the running app after configuration. `TWILIO_PUBLIC_URL` must match the public HTTPS origin Twilio actually calls; do not add a path. Update Twilio's URLs whenever a tunnel origin changes.
5. Open Smart Dialer in a microphone-capable browser over **HTTPS or localhost**. Select a client, its outgoing identity and a recipient, then click **Call from laptop**. Allow microphone access. Audio uses the browser/system default input and output, so select your headset in those settings. Mute/unmute and hang-up are available while connected.

Keep the dialer open during the call. Switching client/identity or leaving the dialer disconnects browser audio and disposes the SDK device. Each call obtains a fresh two-minute, outgoing-only access token; expiry prevents new setup and does not limit an established call to two minutes. Cancellation invalidates unconsumed call preparation. No automatic retries are made. If an outcome is uncertain, inspect Twilio and the timeline before trying again.

The authenticated preparation endpoint checks the active-client cookie against the displayed client, client access, enabled Twilio identity, contact ownership, international destination and session. The signed TwiML endpoint rechecks the live session, assignment, identity and expiry before atomically binding the intent to one parent Call SID. Destination and caller ID come from the saved intent, never SDK-supplied `To`/`From` choices. Repeated Twilio HTTP requests for that same active parent are supported; another parent SID is rejected. Signed Dial outcomes update the existing timeline interaction, including recipient-leg duration. No database migration is needed.

This implementation adds **outgoing** laptop calls. Incoming calls retain the forwarding behavior below; browser registration, ringing and accepting inbound calls on the laptop are not implemented. The legacy handset-bridge API remains compatible for existing callers, but the dialer now uses browser audio.

Server environment (keep secrets out of Git):

```
TWILIO_ACCOUNT_SID=your account SID
TWILIO_AUTH_TOKEN=your account auth token
TWILIO_PUBLIC_URL=https://your-app-or-tunnel.example
TWILIO_API_KEY_SID=your standard API key SID
TWILIO_API_KEY_SECRET=your API key secret
TWILIO_TWIML_APP_SID=your TwiML App SID
TWILIO_INBOUND_ROUTES={"+15551234567":"+15557654321"}
```

The optional inbound routing object maps each client Twilio number to the phone that should answer its calls. Without a route, the incoming call is logged and receives an unavailable announcement. A public HTTPS tunnel lets Twilio reach local development; deployment is not required.

In Twilio Console, set the number's Messaging incoming webhook to POST `/api/communications/twilio/sms` and Voice incoming webhook to POST `/api/communications/twilio/voice`, both prefixed by TWILIO_PUBLIC_URL. Set the voice status callback to POST `/api/communications/twilio/status` to receive outcomes for calls with no forwarding route. Outbound requests automatically supply their own status callback URL. TWILIO_VOICE_URL is no longer used.

Callbacks validate the official SDK's signature against the configured public origin and account SID. Active receiving numbers must identify exactly one client. Incoming messages and calls appear in that client's Unified Timeline; outbound status and duration update the original interaction. Repeated deliveries are serialized and deduplicated by provider SID. Late progress callbacks cannot replace final outcomes. Unknown and ambiguous numbers are rejected. Contact attachment requires a unique phone match in that client; otherwise the event remains available without a contact link.

API failures retain an interaction marked failed; ambiguous network responses are marked review-required and must be checked in Twilio before retrying. Trial accounts, verified recipient restrictions, enabled destinations, number capabilities and messaging registration still apply. No real communications are sent by the automated tests.

Run `npm run test:twilio` for signed webhook and disposable database checks, including browser call setup, authorization, cancellation/expiry, concurrent/replayed requests and outcomes. Run `npm run test:browser-call` for browser SDK lifecycle checks with injected devices and microphone access. These do not certify live audio, carrier delivery, geographical permissions or actual Twilio configuration. Perform live outgoing/answer/busy/unanswered/hang-up tests and verify caller ID, audio in both directions, timeline outcomes and two-client isolation before production use.
