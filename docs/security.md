# Backend authorization and robustness

This document describes implemented behavior. It is a focused engineering review, not an independent penetration test. For reporting and data-handling policy, see [SECURITY.md](../SECURITY.md).

## Authorization boundaries

- Firebase Admin verifies coordinator ID tokens with revocation checks and a sign-in age below five minutes. The exchanged browser session is opaque, HttpOnly and stored only by its SHA-256 hash. Caller-supplied identity headers do not establish identity.
- The server attaches a private authorization proof to each principal. Tool reads, replay responses and final mutation transactions re-read the live session and circle together. A revoked helper epoch, expired session, rotated MCP marker, missing circle or mismatched tenant rejects access.
- Browser administration rejects bearer tokens. Dedicated MCP bearer credentials work only on `/mcp`; browser/helper cookies cannot be repurposed as MCP bearer tokens. Helpers cannot impersonate a coordinator or another helper.
- A helper invitation is single-use and bound to an exact circle, member and access epoch. Replacing it invalidates its predecessor. Redeeming it and creating the helper session are one transaction. Possession of the link is the helper identity proof; there is no independent verification of the recipient.
- Cookie-derived owner/demo reissuance consumes a still-live parent session transactionally. Logout or a competing reissue invalidates that parent. A fresh verified Firebase login may create a new session independently.

An authorized read has a transactional point in time. Revocation cannot retract data already returned to a browser or stop a response whose authorized read completed before revocation. It does prevent later reads and writes, including reuse of a previously authenticated in-memory principal.

## Integrity boundaries

State, version, activity and the retry receipt are saved atomically. The last 100 request IDs support identical retries; mismatched actors or payloads conflict. Once a receipt ages out, its original `expectedVersion` is stale and cannot reapply the old action. Changing both the version and request ID represents a new user action.

Only a proposed helper can accept. Availability is checked again during acceptance, and a commitment cannot complete before its prerequisites. Corrections/cancellations are coordinator-only and limited to open/blocked tasks. A cancellation preserves its full record in the export. Multiple availability windows retain unavailable gaps and cannot invalidate accepted work silently.

Demo admission uses transactional global limits. Session/invitation expiration and revocation are enforced before Firestore TTL cleanup. Deleting a circle removes its content and owner mapping; remaining authorization metadata immediately becomes unusable and expires later. The short activity history is not an immutable compliance log.

## Regression coverage

The Firestore suite requires a loopback emulator and its own `demo-kindhandoff-backend-tests` project. It clears only that test namespace. It exercises concurrent creation and CAS, one-time invitations, helper epochs, MCP rotation/revocation, tenant scope, logout/reissue races, stale reads/replays, demo quotas/expiry, edit/cancellation dependency protection and split availability. Firebase token verification is mocked in this suite; the separate compiled HTTP authentication proof exercises real emulator-issued JWT exchange.

The release runner executes these tests plus the compiled Auth/MCP/multi-user proofs in temporary local emulators before deployment. A failed check stops the pipeline. `--plan` performs no deployment; `--check-only` completes verification without publishing. The runner refuses emulator build overrides, does not inspect dotenv contents, and preserves the single pinned API/MCP Hosting rewrite. Build/test/deploy subprocesses use a narrow environment allowlist, excluding unrelated shell credentials from the Firebase CLI's emulator debug log.

## Remaining launch work

Application sign-out revokes the current browser session. Firebase-wide account revocation is checked at exchange, not continuously during the resulting 24-hour application session. Full account/session management, independent security review, per-tenant abuse controls, backup/restore verification and measured load/cost telemetry remain commercial-launch work. Anonymous admission quotas are useful bounds, not comprehensive abuse prevention.
