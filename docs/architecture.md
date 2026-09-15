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
    Rules --> CAS[Atomic version-checked Firestore transaction]
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
6. Each mutation supplies the latest storage `version` and a UUID `requestId`. A version-checked transaction saves state, event, and retry receipt together. Stale writes fail; identical retries return the current state without repeating the action; reused IDs with different payloads or actors fail.
7. `contentVersion` advances when substantive content changes. Acknowledgments advance storage version for concurrency but do not change the content being read. Two helpers can acknowledge the same brief, while a later note makes that brief stale.
8. Shared notes are untrusted data, never agent instructions. The deterministic interpreter does not execute note text.

## Replacement planning

Candidate assessment checks explicit capabilities, availability, existing accepted work, and offered/selected work in the proposed plan. Most-constrained tasks are considered first so a flexible job does not consume the only driver. Bounded backtracking searches at most 4,096 nodes, eight open tasks and sixteen helpers; the UI discloses the limit and unresolved commitments. The plan is a suggestion, recomputed and version checked when the coordinator confirms it.

Dependencies determine task readiness. The plan does not infer travel duration, location, clinical suitability, or unrecorded availability. Those would require new validated inputs.

## Persistence and identity

Firestore collections contain circles, owners, hashed sessions, hashed invitations and a demo-admission control document. One bounded JSON payload per household keeps a state transition and its short event history atomic. A transaction on the owner mapping prevents duplicate personal circles. Browser database rules deny all direct reads/writes; only the server Admin SDK can access storage. The runtime service account has `datastore.user` and `firebaseauth.viewer`, rather than project-wide editor access.

Firebase Authentication verifies coordinator sign-in. A recent, verified ID token is exchanged for a random, hashed server session; caller identity headers are discarded. A coordinator can sign in before creating a circle, and returning sign-in finds the same persisted circle. The browser Firebase SDK uses in-memory persistence, then signs out of client state after exchanging its token. Production uses the attached GCP service account; no service-account key file is deployed.

The cookie is named `__session`, which Firebase Hosting forwards to Cloud Functions. It is HttpOnly, SameSite=Lax and Secure on HTTPS. A coordinator session lasts 24 hours. One-time helper invitations place a 256-bit token in a URL fragment and remove it on page load. Redemption is transactional. Helper sessions last up to seven days, limited by the lifetime of a demo circle.

Each member has an access epoch, and the circle records the current MCP token hash. Revocation/rotation changes these markers transactionally. The final mutation transaction rechecks the authenticated session and marker, so even a principal captured before revocation cannot commit a new write. MCP tokens last up to 24 hours and only work as Bearer credentials on `/mcp`; they cannot administer accounts or invitations.

Firestore TTL is enabled for `expiresAt` on circles, invitations and sessions. Expiration is also enforced in application authorization immediately; security never depends on eventual TTL deletion. Deleting a circle immediately removes its content and owner mapping. Outstanding token/invitation metadata becomes unusable because its circle is missing, then TTL reclaims it.

## Efficiency and operating bounds

No LLM request is required for deterministic planning or the simulator. One persistent document avoids a series of partially completed database writes. The browser refreshes a visible circle every 12 seconds and when focus/visibility returns; hidden tabs do not poll. A manual refresh is always available. Limits: 100 commitments, 16 members, 100 notes, 250 activity events, 100 retry receipts and a 400 KB serialized household. Demo admission is globally bounded to 120 new circles per hour and 500 active circles, with 24-hour expiry; reset reuses the existing demo row. These conservative bounds suit a hackathon/pilot and require measured revision for broader launch.

Application state has bounded retention; the activity view is not a permanent, tamper-proof compliance audit. No automatic helper notifications, push, SMS, billing, clinical logic, or background emergency escalation is implemented. Firebase sends account-recovery email only when a person explicitly requests it.
