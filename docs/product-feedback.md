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

**What worked:** typed tool registration, JSON schemas, structured output and protocol negotiation made the integration inspectable. The Worker-compatible transport avoids pretending an in-memory function call is MCP. Independent helper clients can exercise the same rules.

**Needs work:** runtime/export compatibility of transitive dependencies could be clearer for Workers. We had to map `pkce-challenge` to its official Web Crypto browser build because its exports offered browser/node variants without a matching Worker condition.

**Onboarding:** straightforward after the import/runtime mismatch was diagnosed. Stateless transport initialization per request fits this small app, while durable business state lives in D1.

**Would build again:** yes. Keep auth and business invariants explicit rather than expecting the protocol to supply them.

## Cloudflare D1 and Worker runtime

**Used for:** persistent circle state, sessions, invitations and admission limits; atomic SQL compare-and-swap; invocation of Web Crypto and the MCP fetch handler.

**What worked:** one conditional update can atomically save a household transition, activity event and retry receipt. Transactional batches support one-time invitation redemption and token rotation. Local migrations made repeatable integration tests practical.

**Needs work:** examples for JSON-document compare-and-swap plus result-change checking would shorten onboarding. Global anonymous-demo capacity needs atomic enforcement, not a read-then-insert counter.

**Onboarding:** a local D1 binding plus checked-in migrations is reproducible. Production binding/provisioning is managed by Sites, separate from the local placeholder database ID.

**Would build again:** yes for a bounded MVP. Measure row growth, query counts, contention and backups before scaling.

## Sites, Vinext and React

**Used for:** scaffold, React UI, D1 binding, hosted Worker packaging, and ChatGPT coordinator sign-in.

**What worked:** a single TypeScript codebase covers interface and server routes. Shared accessible Tabs, Dialog, Sheet, Select and Checkbox primitives give coherent interaction behavior. Local iteration exercises the real Worker runtime.

**Needs work:** the initial scaffold's dependency combination required updates before the security audit was clean. Local development identity must be visually and operationally distinct from a production sign-in. Hosting access and application-level helper invitations are separate controls; both must permit an invited helper to reach the app.

**Onboarding:** required checking current package versions, applying D1 migrations explicitly, and validating the production archive. No additional user-supplied API keys were needed for this implementation.

**Would build again:** yes for this pilot, with explicit gateway identity tests and a documented deployment trust boundary.

## Browser speech recognition and synthesis

**Used for:** optional speech-to-text with review before submission, and optional spoken replies.

**What worked:** the typed workflow stays complete when speech is unavailable. Recognition does not automatically commit a cancellation.

**Needs work:** browser availability/permissions differ. The app therefore reports failure and supports typing. The microphone was not exercised with recorded human audio during automated validation; no speech-recognition accuracy claim is made.

**Would build again:** as an optional input mode, pending real-user testing for accents, noisy rooms, privacy expectations and accessibility.

## Observed friction log

These are actual development findings. Severity describes their effect on this build, not a claim of a vendor-wide defect. Fixed items remain listed so the workaround is reproducible.

| Task and steps | Expected → observed | Severity | Workaround / resolution | Actionable suggestion |
|---|---|---|---|---|
| Import MCP SDK into the Worker build and run the local app | Compatible Web Crypto dependency → `pkce-challenge` package export resolution failed for this environment | High: blocked MCP startup | Vite aliases to the package's official `dist/index.browser.js`; verified real SDK calls afterwards | Add/document a Worker export condition and a Worker integration test |
| Install scaffold and run `npm audit` | A clean starting dependency graph → reported vulnerable transitive/framework versions | High: release blocker | Update compatible framework/tool versions and lock dependencies; audit then reported zero vulnerabilities | Refresh scaffold regularly and test lockfile security/compatibility together |
| Have Jo and Dev acknowledge the same brief | Both receipts reference unchanged content → a generic storage-version increment made the next helper's brief appear changed | High: product correctness | Separate content revision from storage CAS revision; regression and independent-session tests | Reference multi-actor MCP examples should distinguish content version from write version |
| Propose a replacement for several flexible jobs plus one driving-only job | Keep the only driver available → simple chronological/greedy choices could consume that capability | High: product correctness | Most-constrained-first bounded search with explicit unresolved/search-limit reporting; scarce-driver regression | Include feasible-plan examples that require considering tasks jointly |
| Redeem invitation / rotate token concurrently | One invitation redemption and one surviving token → needed transactional conditional writes to prevent races | High: authorization | Atomic D1 batches and concurrent integration tests | Document affected-row checks and transaction ordering in examples |
| Preview at mobile width and complete forms | Clear controls and no horizontal overflow → validated at 390 px; keyboard and labels inspected | None in final layout | Shared primitives, responsive stacking and explicit time-zone hint | Preserve device-zone vs displayed-circle-zone explanation |

## Mini challenge declaration

**AWS services used: none.** Cloudflare Workers/D1 and Sites are not represented as AWS usage. We enter the additional Open Source challenge through the public `@kindhandoff/guard` repository. This declaration should remain consistent with the final Devpost form.
