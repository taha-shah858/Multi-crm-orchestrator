# Client CRM contact directory

Client CRM Contacts displays the existing agency Unified Lead Directory contacts whose company or linked company matches the selected client's name or brand. Matching ignores case, punctuation, whitespace, and trailing legal suffixes; partial names and shared keywords are not sufficient.

The authenticated read-only endpoint `/api/client-crm/contacts` uses the same organization-scoped, company-owned HubSpot contact source as the Unified Lead Directory. It does not copy contacts, change their stored client ownership, import from Zoho, or call external providers. Refresh, window focus, and a visible-page 15-second refresh read this directory projection. Contact edits remain in the Unified Lead Directory.

Creating a deal links the canonical contact to the selected authorized client. An open deal does not send the contact to Zoho. The existing explicit Closed Won handoff sends the contact and deal to the client's Zoho connection. Local deal previews have no fabricated external ID or successful sync timestamp.

## Validation

- CRM boundary suite: 59 checks passed, including matching, client isolation, directory changes, read-only behavior, canonical deal attribution, and explicit Zoho handoff.
- Closed-deal commission database suite: 11 checks passed.
- Production build and TypeScript checks passed.
- A read-only check of existing northstar ecom data returned Noah Bennett and Ava Carter; neither contact was inserted or modified.
- Browser checks with disposable data confirmed client switching, Refresh, automatic contact updates, and an open deal saved locally with its contact. Test fixtures were removed after verification.
