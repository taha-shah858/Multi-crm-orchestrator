# Twilio gateway (6.2 / 6.3)

Admins assign an account-owned Twilio number to a client in Admin → Integrations → Twilio client numbers. Agents select the client identity in Smart Dialer. Live calling rings the agent phone first, then bridges the contact; this is a phone bridge, not browser microphone calling. Manual phone/SMS links remain available.

Server environment (keep secrets out of Git):

```
TWILIO_ACCOUNT_SID=your account SID
TWILIO_AUTH_TOKEN=your account auth token
TWILIO_PUBLIC_URL=https://your-app-or-tunnel.example
TWILIO_INBOUND_ROUTES={"+15551234567":"+15557654321"}
```

The optional inbound routing object maps each client Twilio number to the phone that should answer its calls. Without a route, the incoming call is logged and receives an unavailable announcement. A public HTTPS tunnel lets Twilio reach local development; deployment is not required.

In Twilio Console, set the number's Messaging incoming webhook to POST `/api/communications/twilio/sms` and Voice incoming webhook to POST `/api/communications/twilio/voice`, both prefixed by TWILIO_PUBLIC_URL. Set the voice status callback to POST `/api/communications/twilio/status` to receive outcomes for calls with no forwarding route. Outbound requests automatically supply their own status callback URL. TWILIO_VOICE_URL is no longer used.

Callbacks validate the official SDK's signature against the configured public origin and account SID. Active receiving numbers must identify exactly one client. Incoming messages and calls appear in that client's Unified Timeline; outbound status and duration update the original interaction. Repeated deliveries are serialized and deduplicated by provider SID. Late progress callbacks cannot replace final outcomes. Unknown and ambiguous numbers are rejected. Contact attachment requires a unique phone match in that client; otherwise the event remains available without a contact link.

API failures retain an interaction marked failed; ambiguous network responses are marked review-required and must be checked in Twilio before retrying. Trial accounts, verified recipient restrictions, enabled destinations, number capabilities and messaging registration still apply. No real communications are sent by the automated tests.

Run `node scripts/twilio-gateway-test.cjs` for signed webhook and disposable database checks.
