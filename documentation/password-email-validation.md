# Email/password validation — 2026-10-07

Originally implemented on `ai-ui-backend`, and retained in the current checkout. Admin OTP signup was integrated separately afterward; see [authentication integration](auth-validation-merge.md) and [current status](PROJECT_ALIGNMENT_AUDIT.md). Branch protections in older reports were subsequently superseded by local consolidation.

- New passwords require 7–128 characters, at least one uppercase letter, one number and one special character. Whitespace does not count as a special character. Shared policy is enforced by admin signup and admin-created agent/manager APIs; signup also validates before submitting. Existing passwords remain usable at login; password hashing and session/role checks remain in place.
- Login, signup and admin account creation validate email format server-side, including malformed local parts/domains and length. Addresses are normalized consistently. This does not prove mailbox existence, delivery or ownership. Those require email verification; no codes, mail delivery, DNS lookups or OAuth flows are added here.
- Login, signup, password confirmation and temporary team passwords have accessible, independent Show/Hide controls. Password confirmation remains mandatory in signup.
- Duplicate signup now explicitly explains that the account already exists and displays a sign-in link. Concurrent duplicate email constraint failures receive the same error; unrelated database errors retain their normal handling.

Independent public agent signup, name-only approval and Google signup/sign-in remain deferred requirements. The historical `email-setup` implementation is outside this checkout; its local branch was deleted with recovery history retained. Any future authorized authentication work should reuse the shared credential policy and password controls, rather than replace the 7-character minimum with an older policy.

Validation: `node scripts/auth-credentials-test.cjs` checks malformed addresses, password requirements, signup and managed-user enforcement, hashing and successful/wrong-password login, role isolation, compatibility with existing passwords, and duplicate/concurrent email errors without accessing a database or sending mail.

Production build and targeted lint pass. Browser checks confirm login and independent signup/confirmation visibility controls, weak-password rejection and mismatched confirmation rejection. These browser checks did not create accounts or send mail.
