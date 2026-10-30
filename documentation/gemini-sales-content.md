# Gemini sales content

Implemented on `codex/gemini-sales-content`, 2026-10-24. The existing server-side `GEMINI_API_KEY` now supports Sales Script Architect and Documents & Proposals as well as Copilot. No additional paid provider is required.

## Setup and use

Keep the private key in `.env.local` (native development) or `.env.docker` (Compose). `GEMINI_MODEL` selects the shared model; `GEMINI_CONTENT_MODEL` optionally overrides only scripts/documents. The writing service otherwise retains the existing Copilot default, `gemini-2.5-flash`. Choose an available model for your Google account. Restart native development after changing environment values; rebuild Compose after changing code. No database migration is required for these content changes.

Select a prospect and optional lead analysis. Add a writing brief describing the relevant service, facts, tone and desired next step. The server checks client access and relationships before contacting Gemini. It sends a minimal prospect summary, selected-client context and up to five recent conversations for that prospect (each marked as an excerpt if over 6,000 characters). Account-only drafts do not borrow other prospects' conversations. The brief is saved with the draft for traceability; it does not establish approved commercial terms.

All three AI-module contact selectors use `/api/ai/contacts`, backed by the same company/brand-matched agency directory projection as Client CRM Contacts. Agency import storage (`Contact.clientAccountId`) is not treated as proof that a lead belongs to that client. A Northstar lead can remain stored under the original agency import account and still appear only for Northstar in these selectors. Server-side context validation applies the same rule, including contacts reached indirectly through an interaction, analysis or deal. This is read-only filtering; the shared Unified Lead Directory and existing stored contact ownership do not change. Legacy assessments linked to another client's company are excluded from the AI context choices.

Call drafts request a permission-based opener, discovery questions, listening branches, value discussion, objection handling, closing and voicemail. Email drafts request a connected message and subject; SMS drafts remain brief and focused. Proposal drafts request needs, scope, deliverables, milestones, assumptions/exclusions and next steps. Structured responses are checked for required sections, order, useful length and complete generation.

Proposal pricing, payment terms and delivery dates remain confirmation placeholders. Prospect budgets and deal values are not quotations and are not supplied as commercial authority. Currency-bearing AI proposal output is rejected in favor of a template. Other unsupported claims still require human review; prompts and validation do not guarantee factual accuracy.

## Fallback and manual work

Each draft records provider/model or fallback reason in `contextSnapshot.generation`. Pages distinguish **Gemini draft**, **Template draft**, manual documents and uploaded PDFs. Existing generated records without provenance are conservatively labeled templates. A missing key, timeout, refusal/truncation, malformed response or insufficient draft produces a labeled editable template. Generating creates a new record and does not modify previously saved human edits. Emails/messages remain drafts and nothing is automatically sent, booked or written back to a CRM.

Copilot now sends the complete transcript up to an explicit 100,000-character limit, validates structured qualification fields and tells the model to preserve negation, speaker attribution and uncertainty. Longer inputs are rejected rather than silently truncated. Provider failures retain the existing labeled rules fallback; its keyword-based scores remain heuristic estimates.

## Verification and remaining work

`npm run test:gemini-content` uses disposable local PostgreSQL fixtures and mocked Gemini responses. It checks all writing types, relevant conversation context, account-only isolation, authorization before provider calls, malformed/truncated/short/commercial output, missing-key fallback and preservation of saved edits. `npm run test:gemini` additionally checks full-transcript processing, explicit length limits and strict Copilot output validation.

On 2026-10-24 the content and Copilot regression suites, changed-file lint, TypeScript and production build passed. Synthetic live writing checks using the existing configured `gemini-3.8-flash` returned template fallbacks; a diagnostic request reported provider HTTP 504 (`DEADLINE_EXCEEDED`). Low thinking for Gemini 3/4 writing and a 60-second timeout were added, but the follow-up live check still fell back. Successful live generation and writing quality are not certified by the mocked tests. No actual prospect data was used for these live checks.

This stage does not add a persistent approved offer catalogue, evidence-linked qualification, document revision history, branded generated PDF/DOCX export, audio transcription, automatic sending or fine-tuning. Writing briefs and editable drafts supply working manual controls while those workflows are designed separately.
