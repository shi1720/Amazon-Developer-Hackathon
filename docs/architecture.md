# Architecture

## One set of rules, several entry points

```mermaid
flowchart TD
    UI[Coordinator and helper browser] --> Client[Official MCP client]
    Voice[Reviewed speech or typed request] --> Grammar[Bounded language interpreter]
    Grammar --> Client
    External[External MCP client with scoped token] --> MCP
    Client --> MCP[Streamable HTTP /mcp]
    MCP --> Auth[Authenticate household and exact member]
    Auth --> Schema[Validate tool input with Zod]
    Schema --> Rules[Authorize and apply domain rules]
    Rules --> Guard[MIT handoff guard library]
    Rules --> CAS[Atomic version-checked D1 write]
    CAS --> State[Circle, event and retry receipt]
    State --> UI
```

The browser actually initializes an SDK MCP connection and calls tools. There is no parallel fake tool implementation. Administrative HTTP routes handle session creation, invitation redemption, exports, revocation and deletion.

## State and invariants

`open → offered → accepted → done`, with `blocked` representing a disrupted handoff. Declines and reported unavailability reopen work. Only accepted/done commitments count as claimed. Readiness is separately computed from completed prerequisites.

1. A helper's availability never means acceptance.
2. Only the proposed helper can accept their offer. Demo impersonation is available only inside an explicitly isolated, expiring synthetic session.
3. An accepted task cannot complete while a prerequisite is unfinished.
4. Availability changes cannot invalidate an accepted commitment silently; the disruption must be recorded first.
5. Exact actor identity, household membership, capability, window and overlap checks are enforced on the server.
6. Each mutation supplies the latest storage `version` and a UUID `requestId`. A conditional SQL update saves state, event, and retry receipt together. Stale writes fail; identical retries return the current state without repeating the action; reused IDs with different payloads or actors fail.
7. `contentVersion` advances when substantive content changes. Acknowledgments advance storage version for concurrency but do not change the content being read. Two helpers can acknowledge the same brief, while a later note makes that brief stale.
8. Shared notes are untrusted data, never agent instructions. The deterministic interpreter does not execute note text.

## Replacement planning

Candidate assessment checks explicit capabilities, availability, existing accepted work, and offered/selected work in the proposed plan. Most-constrained tasks are considered first so a flexible job does not consume the only driver. Bounded backtracking searches at most 4,096 nodes, eight open tasks and sixteen helpers; the UI discloses the limit and unresolved commitments. The plan is a suggestion, recomputed and version checked when the coordinator confirms it.

Dependencies determine task readiness. The plan does not infer travel duration, location, clinical suitability, or unrecorded availability. Those would require new validated inputs.

## Persistence and identity

D1 tables contain circles, hashed sessions, hashed invitations, and demo admission rate buckets. One JSON document per household keeps a state transition and its short event history atomic. A unique owner-identity index prevents duplicate personal circles. Prepared statements bind values. SQL migrations are checked in under `drizzle/` and must be applied before serving requests.

The managed Sites gateway supplies coordinator identity headers after sign-in and must strip untrusted copies. This is a deployment trust boundary, not a client credential. Local development identity is only for testing. Do not expose a raw development Worker as a public service with these headers trusted; use the Sites gateway or replace the identity adapter with verified OIDC sessions.

One-time helper tokens are 256-bit random values, SHA-256 hashed at rest, placed in the URL fragment and removed immediately by the join page. Atomic redemption creates one helper session. Cookie sessions are HttpOnly, SameSite=Lax and Secure on HTTPS. Coordinator-issued MCP tokens last 24 hours, work only as Bearer tokens on `/mcp`, and cannot administer accounts or invitations. Rotation revokes the prior token atomically.

## Efficiency and operating bounds

No LLM request is required for deterministic planning or the simulator. One persistent row avoids a series of partially completed database writes. The browser refreshes a visible circle every 12 seconds; hidden tabs do not poll. Limits: 100 commitments, 16 members, 100 notes, 250 activity events, 100 retry receipts and a 400 KB serialized household. Demo admission is globally bounded to 120 new circles per hour and 500 active circles, with 24-hour expiry; reset reuses the existing demo row. These conservative bounds suit a hackathon/pilot and require measured revision for broader launch.

Application state has bounded retention; the activity view is not a permanent, tamper-proof compliance audit. No push, SMS, email, billing, clinical logic, or background emergency escalation is implemented.
