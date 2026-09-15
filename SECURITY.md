# Security and data handling

## Built-in controls

- Household identity and exact helper checks on every MCP invocation.
- Server-side Zod validation; 32 KB streamed request-body limit.
- Same-origin checks for browser writes, prepared SQL statements, no raw HTML rendering.
- Atomic optimistic concurrency, request replay receipts, and collision rejection.
- Single-use invitations, 256-bit random tokens hashed at rest, secure HttpOnly cookies, revocation and expiration.
- External MCP tokens are restricted to `/mcp`; bearer access cannot create invitations, delete circles or issue more credentials.
- Personal household export and typed confirmation before deletion.
- Expiring, isolated demo state with atomic capacity and admission limits.

## Trust boundaries and current limits

Coordinator sign-in relies on **the Sites authenticated gateway stripping/spelling identity headers correctly**. Never publish the development server directly while trusting arbitrary `oai-authenticated-*` request headers. A deployment to another provider must replace this adapter with an independently verified identity provider. HTTPS is required.

An invitation is a capability: whoever first redeems the link becomes that helper. Share it privately and revoke access if it goes to the wrong person. This MVP does not independently verify the recipient's identity, offer MFA, or prevent a coordinator from entering inaccurate availability. A single household shares practical notes with every member. Do not store passwords, home-access codes, clinical records, or unrelated personal information in task details.

The app stores entered task/availability text and structured activity in D1. Browser speech recognition can send speech to the browser vendor's recognition service; it is opt-in and has a typed alternative. KindHandoff does not save audio. ChatGPT sign-in is used for identity, not to send household notes to a language model.

Current operational gaps for a commercial launch: independent security review, monitored backup/restore exercise, per-tenant abuse controls and alerts, account recovery/support policy, billing, formal data-retention policy, and measured load/cost validation. Demo admission limits can intentionally deny new anonymous demos during a burst; they do not constitute distributed abuse prevention.

This is practical coordination software. It provides no clinical recommendations, emergency detection or emergency response guarantee. Recorded acceptance and completion reflect a person's statement.

## Reporting a problem

For a security issue, use GitHub's private vulnerability reporting if enabled for this repository. Do not include real family data or credentials in a public issue. Reproduce with a fresh fictional demo circle and describe the expected authorization boundary.
