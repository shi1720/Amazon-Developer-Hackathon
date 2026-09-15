# KindHandoff submission fields

Prepared for Shivam Gupta. The project story is ready to paste from [devpost-submission.md](devpost-submission.md). The video title and description below are ready for the completed English demo. Add its actual public URL after upload; no video URL is invented here.

## Project name

KindHandoff

## Tagline

One cancellation. Two commitments. A workable afternoon.

## Elevator pitch

KindHandoff helps families recover everyday support plans when a helper becomes unavailable. It finds feasible replacements, asks the named helpers to accept, and keeps the next task waiting until its prerequisite is done. A real MCP server powers the clearly labelled Alexa+ web simulation.

## Primary track

**Alexa+.** We enter through the permitted simulated-experience route. The source includes the functioning web simulator and an actual MCP server using protocol **2025-11-25** over **Streamable HTTP**, built with the official TypeScript SDK **1.30.0**. The browser makes real MCP calls. Its bounded English interpreter is deterministic. Native Alexa+ account linking and device access are future work.

## Mini challenges

**Open Source:** entered through the additional public MIT-licensed `@kindhandoff/guard` project. Details are below.

**AWS Builder:** not entered. No AWS services were used. Firebase/GCP hosting and OpenAI-generated video narration are not represented as AWS usage.

## Project links

- **Working app:** https://kindhandoff.web.app
- **Public source repository:** https://github.com/shi1720/Amazon-Developer-Hackathon
- **MIT license:** https://github.com/shi1720/Amazon-Developer-Hackathon/blob/main/LICENSE
- **MCP setup and external-client instructions:** https://github.com/shi1720/Amazon-Developer-Hackathon/tree/main/integrations/alexa
- **Executed verification evidence:** https://github.com/shi1720/Amazon-Developer-Hackathon/tree/main/docs/evidence
- **Product feedback and friction log:** https://github.com/shi1720/Amazon-Developer-Hackathon/blob/main/docs/product-feedback.md
- **Public demo video:** add the final YouTube or Vimeo URL after its playback is verified while signed out.

## Built with

TypeScript, React 19, Vite 8, Model Context Protocol, official MCP TypeScript SDK 1.30.0, Streamable HTTP, Zod, Firebase Hosting, Cloud Functions for Firebase v2, Node.js 22, Cloud Firestore, Firebase Authentication, Vitest, GitHub Actions.

## YouTube title

KindHandoff: One Cancellation, Two Commitments | Amazon Developer Hackathon

## YouTube description

Maya cannot make it this afternoon. Her library-bag task and a ride both need replacements. KindHandoff finds a feasible split, waits for Jo and Dev to accept in their own sessions, and keeps the ride waiting until the bag is ready.

Created by Shivam Gupta for the Amazon Developer Hackathon 2026.

Try the public app: https://kindhandoff.web.app
Source code and setup: https://github.com/shi1720/Amazon-Developer-Hackathon
Additional open-source library: https://github.com/shi1720/kindhandoff-guard
Test evidence: https://github.com/shi1720/Amazon-Developer-Hackathon/tree/main/docs/evidence

This film demonstrates a fictional household using the working product. It uses an AI-generated OpenAI voice, not Shivam Gupta's recorded voice.

Primary track: Alexa+. The clearly labelled, deterministic web simulator calls a real MCP server using protocol 2025-11-25 and Streamable HTTP. No live Alexa connection is claimed. Firebase Hosting, Cloud Functions, Firestore, and Firebase Authentication provide the deployed application.

Additional mini challenge: Open Source, through the separate MIT-licensed @kindhandoff/guard library for commitment transitions, coverage accounting, and candidate ranking. No AWS services were used.

The business hypothesis is $12 per household per month, with every helper included. Household discovery and pilot testing are next. No customer, revenue, or measured time-saving claims are made.

KindHandoff supports practical help such as bags, rides, meals, and visits. Clear plans and accepted responsibility.

## Testing instructions for judges

### Open the working product

Visit **https://kindhandoff.web.app** while signed out. A private fictional demo is created automatically. No account, API key, device, or payment is required to try it. The household and names are fictional. Use a fresh browser profile if you already have a session you want to keep.

Account sign-in is a separate workflow: it creates or restores a private personal circle, which starts blank for a new account. Signing in is not required to load the fictional scenario.

### Follow the recovery in about five minutes

1. Start as **Maya** in the fictional demo. Select **I can't make it this afternoon**, or type **Maya is unavailable this afternoon.** The supported request opens a review; it does not apply the change yet.
2. Review the affected tasks, displayed date, and time zone. Confirm the change. Both **Pack the library bag, 14:30 to 14:45 IST**, and **A lift to the library, 15:00 to 16:00 IST**, need replacements.
3. Open **Why this plan?** Jo can enter the home from 14:00 to 15:00 but cannot drive. Dev can drive from 14:45. The proposed split is **Jo for the bag, Dev for the ride**. A preview does not create offers or claim acceptance.
4. Create the two handoff offers. Open **Your circle** and create an invitation for Jo and another for Dev. Open each private, single-use invitation in a separate browser profile or isolated context, and join as the named helper. Use genuinely separate sessions; ordinary windows may share cookies.
5. In Jo's helper session, accept the bag. In Dev's helper session, accept the ride. An offer remains uncovered until its named helper accepts it. Each invited helper sees their own identity and has no demo role switch.
6. Observe Dev's accepted ride waiting for the bag. As Jo, mark the bag complete. Return to Dev and refresh or refocus the page. The ride's prerequisite is now complete. Acceptance and readiness are separate; do not mark the ride completed for this demonstration.
7. As Dev, open **Handoff brief** and choose **I've read this handoff**. Observe the recorded content revision. Add a fictional note from the coordinator's session, then refresh Dev's brief. The earlier receipt still identifies the revision he read, with new updates to read.
8. Open **Activity** and the **Live MCP execution trace**. Inspect the actual tool invocation and protocol information. These are real browser-to-server calls, not prerecorded response text.

For a quick single-browser tour, the fictional demo also offers a role switch. Use the real invitations above to verify independent helper authorization.

### Test a personal circle separately

In a separate session, use **Settings > Sign in to create a circle**. Register with email and password, then create a blank personal circle. Add a helper and a practical commitment. Reload to check persistence, export the circle, sign out, and sign back in to see the saved circle. Account recovery email delivery is outside the recorded automated checks. Use fictional details for evaluation; account and circle deletion are available when finished.

### Reproduce the automated checks locally

Prerequisites: Node.js **22.13 or later**, npm, and Java **21** for Firebase emulators. The isolated local check needs no cloud account or secret key.

```sh
git clone https://github.com/shi1720/Amazon-Developer-Hackathon.git
cd Amazon-Developer-Hackathon
npm ci
npm run check
npx firebase-tools@15.30.1 emulators:exec --only auth,firestore --project demo-kindhandoff "npm run test:firestore && node scripts/verify-local.mjs"
```

For interactive development, use the [Firebase setup guide](https://github.com/shi1720/Amazon-Developer-Hackathon/blob/main/docs/firebase-deployment.md). To exercise the live deployment with fresh synthetic test households:

```sh
BASE_URL=https://kindhandoff.web.app npm run test:integration
BASE_URL=https://kindhandoff.web.app npm run test:e2e
```

The optional live authentication proof creates and cleans up its own temporary synthetic account. It requires the explicit live-test flag:

```sh
ALLOW_LIVE_AUTH_TEST=1 BASE_URL=https://kindhandoff.web.app npm run test:auth
```

The recorded release evidence includes **15 production MCP calls**, **13 multi-user checks across four sessions**, **11 production Firebase authentication checks**, **54 unit tests**, and **23 Firestore integration checks**. The separate guard repository has **106 tests**, with CI on Node 20, 22, and 24. These are functional verification results, not a claim of load testing, clinical certification, or completed customer validation.

## Additional Open Source fields

**GitHub username:** shi1720

**Primary repository URL:** https://github.com/shi1720/Amazon-Developer-Hackathon

**Additional project URL:** https://github.com/shi1720/kindhandoff-guard

**Contribution URL:** https://github.com/shi1720/kindhandoff-guard/commit/04a15ea016e552e3c031b9ec371af2df6a1de105

**License:** MIT. Copyright Shivam Gupta, 2026. The public repositories display their licenses.

**What we contributed, how it works, and why it matters:**

We created `@kindhandoff/guard`, a separate, dependency-free TypeScript library for auditable commitment transitions, honest coverage accounting, and deterministic candidate ranking. It preserves the distinction between an offer, acceptance by the proposed person, and completion. Candidate assessments explain time or capability exclusions.

The library lets other tool-based workflows reuse these primitives without adopting a caregiving application or a particular language model. KindHandoff imports a vendored copy at `packages/handoff-guard/src/index.ts`. Multi-task recovery search, task prerequisites, authentication, storage, and brief content revisions belong to the application, not the library.

The contribution was created during the hackathon window and is additional to the primary app. Verification includes 106 tests, a typed build, an executable adapter example, a package dry run, and a fresh tarball import check. CI passes on Node 20, 22, and 24. The package is not published to the npm registry; it can be built from the repository or packaged with `npm pack`.

## Product feedback field

### Alexa+ MCP toolkit documentation

**Used for:** selecting the permitted simulated-experience route and understanding MCP protocol and transport requirements. Native preview onboarding was reviewed, not completed.

**Worked well:** the simulator path enabled a working, inspectable workflow without a device or preview account. MCP provides a shared action contract for the simulator and a future Alexa client.

**Needs work:** one ordered checklist should connect local MCP development, account linking, preview eligibility, and deployment. A multi-person reference example should show why a coordinator can propose while only the assigned helper can accept.

**Onboarding and reuse:** the protocol requirements were explicit. We would build with it again, subject to native access and validation of consent and account-linking behavior. We have no native-device execution feedback to claim.

### MCP TypeScript SDK 1.30.0

**Used for:** the real server transport and browser/Node MCP clients.

**Worked well:** typed registration, JSON schemas, structured results, and protocol negotiation make tool calls easy to inspect. Independent sessions exercise the same rules.

**Needs work:** runtime/export compatibility needs clearer serverless examples. The earlier Worker prototype needed an official browser-build alias for `pkce-challenge`; the final Node 22 deployment does not need that alias.

**Onboarding and reuse:** the import mismatch was the main setup friction. We would use the SDK again, while keeping authentication and business invariants explicit in the application.

### Firebase Authentication

**Used for:** email/password accounts and the backend's verified ID-token exchange into an opaque, HTTP-only application session. Helpers use scoped invitation sessions.

**Worked well:** the Auth emulator enabled repeatable account and restored-circle tests. The final hosted flow was also exercised with real Firebase authentication. Browser SDK persistence is in memory and is cleared after the server-session exchange.

**Needs work:** a missing emulator `appId` initially caused a generic initialization failure. A complete public SDK configuration fixed it. Two early hosted sign-in attempts had network/session errors; the cause was not established, and a traced retry succeeded. Removing an unnecessary forced token refresh simplified the final flow. Documentation should connect Hosting's `__session` cookie forwarding to custom backend sessions.

**Onboarding and reuse:** email/password and the canonical hosting domain were configured; Google sign-in was not enabled. We would use Firebase Auth again, with further recovery, session-abuse, and real-user validation.

### Firestore and Cloud Functions for Firebase

**Used for:** durable household records, hashed credentials, unique coordinator ownership, bounded demo admission, and transactionally checked writes. A second-generation Node 22 function serves the API and MCP endpoint.

**Worked well:** transactions reread credentials, membership, and versions at commit time. Twenty-three emulator integration checks exercise ownership, stale writes, concurrent invitations, token rotation, expiry, and revocation. Direct browser database access is denied, and the function uses a limited runtime service account.

**Needs work:** documentation should clearly separate delayed TTL cleanup from authorization expiry. The app checks expiry during requests. Pricing spans multiple services and shared allowances, so our cost model makes polling, MCP overhead, reads, and retention assumptions explicit.

**Onboarding and reuse:** we provisioned Standard Firestore in `us-central1`, configured the runtime identity, and linked the existing billing account. The function scales from zero to two instances; that is not a spending cap. We would use this stack for a bounded pilot, then measure contention and validate operational recovery before broader use.

### Firebase Hosting, React, and Vite

**Used for:** the public site, responsive interface, split sign-in/join bundles, same-origin API/MCP routing, and compiled production build.

**Worked well:** the clean `kindhandoff.web.app` URL keeps invitations and accounts on one site. A compiled local server allows the production bundle to be exercised against emulators. Shared semantic controls and responsive layouts made the coordinator/helper experience coherent.

**Needs work:** a first deployment created the function but stopped before Hosting release because Artifact Registry needed a cleanup policy. Seven-day cleanup resolved it. Two rewrites targeting the same function also caused a concurrent Cloud Run tag-update conflict; one combined rewrite resolved that failure. Partial-deployment status and recovery commands should be more prominent.

**Onboarding and reuse:** relevant GCP APIs, routing, session forwarding, and public viewports were checked. We would use this stack again with scripted release verification and rollback instructions.

### Earlier prototype tools

**Used for:** the initial prototype used Sites, Vinext, Cloudflare Workers/D1, and ChatGPT gateway identity. That version is archived in the `sites-prototype` Git tag and is not the final Firebase runtime.

**Worked well:** the scaffold accelerated interface and workflow exploration.

**Needs work:** dependency compatibility, Worker package exports, and the distinction between hosting audience and app membership needed explicit verification.

**Onboarding and reuse:** the final provider choice followed the requested Firebase deployment. We would consider the earlier tools again for suitable projects; no current Firebase behavior is attributed to them.

### Browser speech recognition and synthesis

**Used for:** optional reviewed speech input and optional spoken replies. Typing remains a complete way to use the product.

**Worked well:** recognizing a transcript cannot automatically apply a cancellation; the review boundary remains visible.

**Needs work:** support and permission behavior vary by browser. The microphone was not tested with recorded human audio in automated validation, so we make no recognition-accuracy claim.

**Onboarding and reuse:** browser capability checks and a typed fallback are required. We would retain speech as optional input, then test accents, noise, privacy expectations, and accessibility with people.

### TypeScript, Zod, Vitest, and GitHub Actions

**Used for:** typed domain rules, validated tool inputs, regression tests, production builds, and reproducible CI in the app and additional library.

**Worked well:** shared schemas and focused tests exposed ambiguous states and concurrency failures before recording the demo. The guard's Node 20, 22, and 24 matrix checks its declared runtime support separately from the Node 22 application.

**Needs work:** passing unit tests alone did not establish correct helper identity or hosted routing. We added real HTTP, separate-session, authentication, and emulator concurrency checks. Small smoke-test timings must remain separate from production performance claims.

**Onboarding and reuse:** pinned dependencies and documented npm commands make the checks reproducible. We would use this combination again and preserve tests around product invariants rather than mirror every implementation detail.

### AI-assisted development

**Used for:** research, implementation, testing, review, and submission preparation under Shivam Gupta's product direction.

**Worked well:** separating implementation from independent review helped identify unclear commitment states, identity boundaries, and unsupported draft claims.

**Needs work:** generated explanations required comparison with actual code. For example, the additional guard library exports transitions, coverage, and ranking; dependency readiness and brief acknowledgments belong to the application. We corrected that distinction in the submission.

**Onboarding and reuse:** workspace and tool access made iteration possible. We would use AI assistance again with reproducible evidence and human control of the product and submission.

### OpenAI speech generation for the demo

**Used for:** English AI-generated narration of the recorded product demo. It is a submission-production tool, not the application's language interpreter or an Alexa runtime integration.

**Worked well:** segment-based generation lets narration follow the exact product states and allows one segment to be regenerated without rerecording the entire film.

**Needs work:** one generated closing segment omitted a short standalone final phrase. We rewrote the ending as one complete sentence, regenerated that segment, and confirmed the complete spoken transcript. Captions must be checked against the generated audio, not assumed to match the script automatically.

**Onboarding and reuse:** the pipeline uses an authorized OpenAI API connection. We would use synthetic narration again with visible disclosure, transcript checks, and final listening review. The voice does not impersonate Shivam Gupta.

## Optional feature requests

- **Important:** an Alexa+ reference household with separate coordinator and helper identities, account linking, and explicit acceptance boundaries.
- **Important:** transport/runtime compatibility fixtures for serverless MCP applications, including Workers and Node functions.
- **Important:** Firebase CLI handling that deduplicates concurrent service-tag updates when several Hosting rewrites share one function.
- **Nice-to-have:** a simulator trace showing authenticated actor, expected version, confirmation boundary, and unresolved plan details.

## Optional friction log field

The [observed friction log](https://github.com/shi1720/Amazon-Developer-Hackathon/blob/main/docs/product-feedback.md#observed-friction-log) records the task, steps, expected and observed behavior, severity, workaround, and actionable suggestion. Findings include Worker exports, dependency updates, acknowledgment revision semantics, scarce-driver planning, invitation/token races, Hosting rewrite conflicts, and artifact cleanup. These are actual build findings; fixed issues remain documented for reproducibility.

## Build-window statement

KindHandoff and its additional guard library were created during the September 2026 hackathon build window. The earlier prototype and final Firebase application are iterations of this entry. Frameworks and third-party dependencies retain their original authorship and licenses. No pre-existing commercial product, customer pilot, or measured business result is claimed.

## Team and AI-assistance disclosure

**Creator and product owner: Shivam Gupta.** Research, implementation, testing, and submission preparation used AI assistance. The demo uses clearly labelled AI-generated OpenAI narration. It does not present the synthetic voice as a recording of Shivam, and the fictional household is not described as his personal experience.

## Commercial viability field

The first proposed buyer is an adult coordinating routine support for a parent with two or more helpers. KindHandoff concentrates on recovering a disrupted chain of commitments: feasible replacements, separate acceptance, prerequisite readiness, and a record of the version read.

The pricing hypothesis is **$12 per household per month, every helper included**. It is unvalidated. The planned next steps are ten discovery interviews and a five-household pilot measuring time to an accepted feasible replacement, follow-up effort, repeat helper use, and willingness to pay. No interviews, customers, revenue, or time savings are claimed yet.

The [business case](market-and-business.md) names existing alternatives and models Firebase/GCP usage, including visible-page polling and MCP overhead. Billing is enabled and allowances may be shared with other workloads. The modeled pilot cost is an assumption, not a promise of permanently free hosting or a measured margin.
