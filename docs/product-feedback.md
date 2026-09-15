# Product feedback and observed friction

Prepared by Shivam Gupta, 15 September 2026. Feedback below separates tools actually exercised from documentation reviewed. We do not claim AWS Builder eligibility, live Alexa testing, or device SDK usage that did not occur.

## Alexa+ MCP toolkit documentation

**Used for:** selecting the permitted simulated-experience route and aligning the endpoint with the documented MCP protocol and Streamable HTTP requirements. Native preview onboarding was reviewed, not completed.

**What worked:** MCP offers a clear contract for useful stateful actions. This product can expose the same handoff rules to the browser simulator and an eventual Alexa client. The hackathon's simulator path makes it possible to build and validate the workflow without a device or preview account.

**Needs work:** the gap between a local MCP server, account linking, preview eligibility, and a real household deployment needs a single clearly ordered checklist. An example covering several human identities would be more valuable here than an API with one omnipotent developer token.

**Onboarding:** the protocol requirements were explicit. Native access is a separate eligibility/onboarding dependency; we have no native-tool execution feedback to report.

**Would build again:** yes, subject to available preview access and validation of native consent/account-linking UX.

**Feature requests:**

- **Important:** a reference household workflow where a coordinator can propose but only a separate helper can accept.
- **Important:** a simulator trace that displays the protocol, authenticated actor, expected version, and confirmation boundary.
- **Nice-to-have:** examples of stale-version recovery and partial plans with unresolved tasks.

Sources: [overview](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-overview.html), [quickstart](https://www.developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-quickstart.html), [hackathon rules](https://amazonappdev2026.devpost.com/rules).

## Official MCP TypeScript SDK 1.30.0

**Used for:** the deployed server's Web Standard Streamable HTTP transport and the actual browser/Node clients. All domain tool calls go through it.

**What worked:** typed tool registration, JSON schemas, structured output and protocol negotiation made the integration inspectable. The Web Standard transport provides real HTTP negotiation and tool calls. Independent helper clients can exercise the same rules.

**Needs work:** runtime/export compatibility could be clearer across serverless environments. The earlier Worker prototype required an explicit browser-build alias for `pkce-challenge`; the final Node 22 deployment does not require that alias.

**Onboarding:** straightforward after the import/runtime mismatch was diagnosed. Stateless transport initialization per request fits this small app, while durable business state lives in Firestore.

**Would build again:** yes. Keep auth and business invariants explicit rather than expecting the protocol to supply them.

## Firebase Authentication

**Used for:** email/password registration, sign-in, and an explicitly requested password-reset flow. The backend verifies a recent Firebase ID token, then creates an opaque, HTTP-only application session. Helpers use one-time invitation sessions.

**What worked:** the Auth emulator supports repeatable account creation, token exchange, sign-out, and restored-circle tests without real email delivery. The browser uses in-memory Firebase persistence and clears its client identity after the exchange.

**Needs work:** two initial hosted browser sign-in attempts encountered a network error and then a session-opening error; a traced retry succeeded. The cause was not established, so no vendor-wide defect is claimed. We removed an unnecessary forced token-refresh round trip after a fresh sign-in, while retaining server verification of recent authentication. Documentation should prominently connect Firebase Hosting's `__session` cookie forwarding behavior to custom backend sessions. A missing emulator `appId` initially produced a generic client initialization failure; adding a complete public SDK configuration fixed it.

**Onboarding:** initialized email/password through the project configuration, added the canonical hosting domain, and exercised both emulator and deployed authentication. Google sign-in remains disabled because it was not configured.

**Would build again:** yes. Account recovery, session management, and abuse controls need further pilot validation.

## Firestore and Cloud Functions for Firebase

**Used for:** persistent circles, hashed session/invitation records, unique coordinator ownership, bounded demo admission, and transactionally checked workflow changes. A Node 22 second-generation HTTP function serves both the JSON API and MCP.

**What worked:** transactions can reread a credential and membership epoch immediately before committing a change. Twenty-three emulator integration tests exercise ownership, compare-and-swap, concurrent invitations, token rotation, expiry, and revoked in-flight principals. Browser Firestore rules deny direct access; the runtime uses its own limited service account.

**Needs work:** delayed TTL cleanup must be distinguished from authorization expiry. KindHandoff checks expiry during requests and treats TTL as eventual storage cleanup. Pricing spans several services, so the cost brief states its request/read assumptions and shared free allowances.

**Onboarding:** provisioned a Standard database in `us-central1`, transaction/index settings, Auth configuration, and a runtime service account. Linked the existing billing account for the server runtime. Minimum instances is zero; maximum instances is two. These settings do not constitute a spending cap.

**Would build again:** yes for the bounded pilot. Measure traffic and contention, validate backup/restore, and refine operational controls before broader use.

## Firebase Hosting, Vite, and React

**Used for:** the public `kindhandoff.web.app` site, static React frontend, API/MCP rewrites, Firebase web configuration, responsive layout, and accessible interface primitives.

**What worked:** a clean project URL and same-origin backend keep invitations and login on one site. Separate sign-in/join bundles avoid loading their full UI until needed. The compiled local server lets CI exercise the production build against emulators.

**Needs work:** the first deployment created the function but stopped before releasing Hosting because Artifact Registry had no cleanup policy. We explicitly configured seven-day cleanup and reran deployment. This is useful cost guidance, but the partial-deployment state needs to be obvious.

**Onboarding:** enabled the relevant GCP APIs and tested actual rewrites and session forwarding. No new user-supplied API keys were required.

**Would build again:** yes, with scripted release verification and a documented rollback procedure.

## Earlier prototype tools

The initial prototype used Sites, Vinext, Cloudflare Workers/D1, and ChatGPT gateway identity. These are preserved in the `sites-prototype` Git tag, but are not part of the submitted Firebase runtime. The scaffold accelerated layout work; dependency compatibility, Worker exports, and the distinction between hosting audience and app-level membership required explicit verification. We would consider these tools again for appropriate projects. The final provider choice and sign-in implementation follow the requested Firebase deployment.

## Browser speech recognition and synthesis

**Used for:** optional speech-to-text with review before submission, and optional spoken replies.

**What worked:** the typed workflow stays complete when speech is unavailable. Recognition does not automatically commit a cancellation.

**Needs work:** browser availability/permissions differ. The app therefore reports failure and supports typing. The microphone was not exercised with recorded human audio during automated validation; no speech-recognition accuracy claim is made.

**Would build again:** as an optional input mode, pending real-user testing for accents, noisy rooms, privacy expectations and accessibility.

## Observed friction log

These are actual development findings. Severity describes their effect on this build, not a claim of a vendor-wide defect. Fixed items remain listed so the workaround is reproducible.

| Task and steps | Expected → observed | Severity | Workaround / resolution | Actionable suggestion |
|---|---|---|---|---|
| Import MCP SDK into the Worker build and run the local app | Compatible Web Crypto dependency → `pkce-challenge` package export resolution failed for this environment | High: blocked MCP startup | Earlier prototype: official browser-build alias; final Node deployment needs no alias | Add/document a Worker export condition and a Worker integration test |
| Install scaffold and run `npm audit` | A clean starting dependency graph → reported vulnerable transitive/framework versions | High: release blocker | Update compatible framework/tool versions and lock dependencies; audit then reported zero vulnerabilities | Refresh scaffold regularly and test lockfile security/compatibility together |
| Have Jo and Dev acknowledge the same brief | Both receipts reference unchanged content → a generic storage-version increment made the next helper's brief appear changed | High: product correctness | Separate content revision from storage CAS revision; regression and independent-session tests | Reference multi-actor MCP examples should distinguish content version from write version |
| Propose a replacement for several flexible jobs plus one driving-only job | Keep the only driver available → simple chronological/greedy choices could consume that capability | High: product correctness | Most-constrained-first bounded search with explicit unresolved/search-limit reporting; scarce-driver regression | Include feasible-plan examples that require considering tasks jointly |
| Redeem invitation / rotate token concurrently | One invitation redemption and one surviving token → needed transactional conditional writes to prevent races | High: authorization | Firestore transactions, credential epochs, and concurrent integration tests | Document final credential rereads and transaction ordering in examples |
| Pin two Hosting routes to the same function | Both rewrites deployed → concurrent tag updates returned Cloud Run HTTP 409 | High: public release blocked | Combine API/MCP paths in one regex rewrite | Deduplicate service updates in Firebase CLI `runTags` before concurrent writes |
| Deploy Functions and Hosting | Function created → deployment stopped at missing artifact cleanup policy before Hosting release | Medium: release incomplete | Set an explicit seven-day cleanup policy and redeploy | Show partial release status and the exact recovery command |
| Preview at mobile width and complete forms | Clear controls and no horizontal overflow → validated at 390 px; keyboard and labels inspected | None in final layout | Shared primitives, responsive stacking and explicit time-zone hint | Preserve device-zone vs displayed-circle-zone explanation |

## Mini challenge declaration

**AWS services used: none.** Firebase/GCP and the earlier prototype tools are not represented as AWS usage. We enter the additional Open Source challenge through the public `@kindhandoff/guard` repository. This declaration should remain consistent with the final Devpost form.
