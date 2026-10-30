# Zoho client connection invitations

Implemented on `codex/zoho-client-onboarding` on 2026-10-21. This is client CRM authorization, separate from application signup and agent assignments. No invitation emails are sent automatically.

## Use the workflow

1. Open **Admin → Integrations → Client Zoho authorization**, select an active client and click **Create client invitation**.
2. Copy the private link shown once and share it with the client's authorized Zoho representative. It expires after 24 hours; an existing CRM remains connected.
3. The representative opens it in their own browser, sees the agency/client, selects a Zoho region and continues to Zoho. No agency app account is required. They authorize the Zoho organization that belongs to that client.
4. The server verifies the actual Zoho organization ID/name and current user, and stages encrypted credentials. Consent alone does not activate or replace a connection.
5. Refresh requests, review the verified organization/user, check the client/organization confirmation, and approve. Replacing an existing connection requires a separate checkbox. Refresh Managed Connections to see the verified organization name.
6. Agents continue using the existing client selector and assignments. This invitation neither creates agents nor assigns their access.

The existing **Authorize with Zoho CRM** button retains authenticated OAuth, but also stages credentials for agency approval. The raw-token connect endpoint is rejected to prevent bypassing review. The historical `connectZoho` helper remains for fixture-based regression scripts and is no longer exposed by the endpoint.

## Setup

Set `APP_URL`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI` and a stable private `INTEGRATION_ENCRYPTION_KEY` in `.env.local` or `.env.docker`. The callback remains `/api/integrations/zoho/callback` on the same origin as `APP_URL`. Use HTTPS outside localhost development. An invitation works for another computer only when that computer can reach the configured app URL.

OAuth now requests **`ZohoCRM.org.READ`** alongside module/settings permissions and `ZohoCRM.users.READ`. Update the OAuth app permissions and reauthorize as needed. For different regions, enable Multi DC in Zoho with the same OAuth credential pair across enabled data centers. Each client gets independent tokens; never share the OAuth app secret with recipients.

Verification reads `GET /crm/v8/org` and `GET /crm/v8/users?type=CurrentUser`, rejecting missing or ambiguous identities. See [organization API](https://www.zoho.com/crm/developer/docs/api/v8/get-org-data.html), [users API](https://www.zoho.com/crm/developer/docs/api/v8/get-users.html) and [Multi DC setup](https://www.zoho.com/crm/developer/docs/api/v8/multi-dc.html).

Native setup requires migration `20261021000100_zoho_connection_requests`, Prisma generation and a server restart. The additive migration creates a request table and audit values without changing existing users or CRM records. Docker applies it on startup after `docker compose up --build`.

## Boundaries and recovery

- Invitation secrets are random 256-bit values stored as hashes. Shared links use fragments rather than server query strings; the landing page removes the fragment and uses same-origin POSTs. Invite pages disable referrers, and sensitive API/callback responses disable caching.
- External consent uses single-use state, a hashed browser binding in an HttpOnly cookie, and a ten-minute OAuth deadline. Each attempt has its own cookie. A copied bare OAuth URL cannot complete in another browser. Direct OAuth still checks the initiating app user.
- Agency, active client and initiating-user access are rechecked. Only active Admin/Manager users create external invitations or approve connections. A permitted agent can start direct consent but cannot activate it.
- Only exact allowlisted Zoho accounts/API origins receive secrets. Provider redirects are not followed. Callback URLs are server-configured, and regional refresh endpoints are retained. Authorization codes with test/mock prefixes cannot fabricate a grant.
- Pending credentials are encrypted and excluded from API summaries. Approval verifies organization/user again and refreshes expired access tokens as needed. Approval expires within one hour, or the external invitation's earlier deadline.
- Locks serialize client/organization activation and client disconnect. Connection, credentials, request consumption and audit commit together. Stale requests cannot replace newer connections; successful activation invalidates other pending requests for that client. Disconnect cancels pending requests and cannot be undone by a racing approval.
- The same Zoho organization cannot be attached to different clients in one agency, including concurrent approvals. Switching to a different organization with existing mappings, client CRM records or handoffs is blocked; use a new client or explicitly reconcile mappings. Generic legacy `zoho-crm` connections with records receive the same conservative protection because their prior organization was not verified.
- Approved/revoked/failed requests erase staged tokens. Expired requests cannot activate, and their staged tokens are purged on the next onboarding mutation for that agency; no periodic background purge is installed. Revoking a request leaves an existing live connection intact.

## Removing unwanted managed connections

Admins and managers can choose **Remove connection**, review the named account/client, and confirm. This removes the entry from Managed Connections, deletes its local credentials, and stops its use. It does not delete the external Zoho/HubSpot account or revoke another connection's access. Imported records, mappings, synchronization history and audit records are preserved in an archived connection row. No records are automatically reassigned to another CRM organization.

Removal also revokes pending Zoho connection requests for that client. Connecting the same verified organization again restores the entry after approval. A different or previously unverified organization is still blocked when existing Zoho records/mappings/handoffs remain; use a separate client account or perform a separately reviewed reconciliation. Removal is not a data-reset operation.

Apply migration `20261022000100_remove_managed_connections`, regenerate Prisma, and restart the app when updating a native installation. Docker applies migrations during startup after rebuilding.

## Verification

`npm run test:zoho-onboarding` uses disposable PostgreSQL fixtures and intercepted HTTP responses. It covers browser binding, replay/expiry/revocation, withdrawn permissions, replacement confirmation, identity failures/drift, redaction, two-client isolation, regional refresh, rollback, stale snapshots and concurrency. No live email, consent or CRM operation occurs.

Build, TypeScript/lint and existing CRM regression checks provide additional evidence. The older two-client suite uses a direct fixture helper rather than real OAuth. Real browser consent/account selection must still be verified on a reachable test URL before publishing. Public agent signup and Google application authentication remain separate work.
