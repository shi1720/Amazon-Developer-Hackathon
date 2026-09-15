# KindHandoff — Devpost submission draft

**Project creator:** Shivam Gupta  
**Primary track:** Alexa+  
**Mini challenge:** Open Source — separate public MIT library verified.  
**Draft prepared:** 15 September 2026

> Submission copy for the implemented Firebase release. Add the public video URL after recording and review the personal eligibility/terms fields in Devpost.

## Project name

KindHandoff

## Short tagline

When plans change, practical family support gets a clear next step—and someone who accepts it.

## Elevator pitch

KindHandoff helps families recover everyday support plans when a helper becomes unavailable. It checks time, capabilities, home access, and task dependencies, then proposes workable replacements. Offers stay pending until the named helpers accept. A versioned handoff brief shows what changed and records who has read it.

## Inspiration

A cancelled ride often creates a second job: coordinating the replacement. One relative can get into the house but cannot drive. Another can drive but arrives too late to prepare what is needed. A family group chat may contain every relevant fact, yet someone still has to turn those facts into a workable plan and confirm that people agreed.

KindHandoff focuses on that coordination work. Its starting point is a small, practical question: when an afternoon changes, can the household see what needs to happen next and who has actually accepted responsibility?

The demo uses a fictional family. The product does not depend on an invented personal caregiving story or claim outcomes from a pilot that has not happened.

## What it does

KindHandoff turns a change of availability into a proposed recovery plan for practical support such as packing a bag, giving a ride, preparing a meal, or visiting.

In our demonstration, Maya becomes unavailable for the afternoon. This affects both her 14:30–14:45 library-bag task and her 15:00–16:00 ride. Jo can enter the house from 14:00 to 15:00 but cannot drive. Dev can drive but is available only from 14:45 onward. The planner therefore proposes Jo for the bag and Dev for the ride.

The proposal remains visible for review. Creating an offer does not count as acceptance. Jo and Dev each accept their own commitments through their helper sessions. Dev's accepted ride still waits for the bag to be packed; when Jo completes that prerequisite, the ride becomes ready.

The updated brief explains the current plan. Acknowledgment records the particular brief version read, preserving the distinction between an earlier acknowledgment and a changed plan.

## How we built it

The product combines a web application, a deterministic recovery planner, and a real Model Context Protocol server.

- **MCP integration:** `@modelcontextprotocol/sdk` version 1.30.0, the 2025-11-25 protocol specification, and Web Standard Streamable HTTP transport deployed on Firebase Cloud Functions. Tools execute the same household workflow used by the product.
- **Planner:** Explicit time windows, helper capabilities, home access, and bag-to-ride dependencies determine feasible assignments. A proposed arrangement is explained before offers are created.
- **Commitment handling:** The named helper accepts or declines their own offer. Prerequisites govern readiness, and brief acknowledgments are associated with a plan version.
- **Identity and storage:** Firebase email/password sign-in for household creators, secure one-time helper invitations, and household-scoped records in Firestore, with membership enforced by the application.
- **Simulation:** An explicitly labelled local, deterministic language simulator exercises the workflow. It supports defined requests and does not represent a live Alexa connection or an unrestricted cloud language model.
- **Open-source contribution:** The separate @kindhandoff/guard library makes state transitions, coverage accounting, and candidate ranking reusable outside the app. The additional public MIT repository includes 106 passing tests and CI on Node 20, 22, and 24.

Amazon documents Alexa+ support for MCP specification 2025-11-25 and Streamable HTTP. KindHandoff demonstrates that server through the permitted simulated-experience path; the submission does not claim certification or a live deployment on Alexa+. [Alexa+ MCP overview](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-overview.html), [technical requirements](https://www.developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-quickstart.html)

## What was built during the hackathon

KindHandoff is being developed as a new project for this submission. The work includes the practical-support data model, constraint-based recovery planner, offer and acceptance workflow, prerequisite readiness, versioned briefs, authenticated household experience, helper invitations, persistent storage, MCP server, simulator, tests, and submission materials.

The repository history and release notes should provide the exact build dates and final scope. No pre-existing production customer base or deployed commercial service is claimed.

## Challenges we addressed

The difficult part is the meaning of a promise. A helper who is available has not necessarily agreed. An accepted ride is not ready if an earlier preparation task remains unfinished. An acknowledgment of yesterday's plan cannot silently become acknowledgment of today's changes.

KindHandoff represents those distinctions as product states and checks them in the underlying workflow. The same rules need to hold whether an action arrives from the interface, a helper session, or an MCP client.

A second challenge is honest simulation. The demonstration needs to work end to end without suggesting that a scripted language layer is live Alexa or a cloud AI model. The simulator identifies itself; the MCP server and persisted workflow are real.

## What makes it different

Care calendars, shared notes, AI summaries, and voice logging already exist. KindHandoff's focus is repairing a disrupted practical-support plan: identify all affected commitments, explain a feasible split between helpers, obtain their individual acceptance, and keep dependent work waiting until its prerequisite is done.

We do not claim that no competitor can offer a similar workflow. The distinction we demonstrate is specific, observable, and testable.

## Potential impact and business model

The initial customer is a working adult coordinating regular support for a parent across several helpers. AARP and the National Alliance for Caregiving reported 63 million American family caregivers in 2025. That establishes the scale of caregiving; it is not a count of KindHandoff customers or paying households. [AARP report announcement](https://www.aarp.org/press/releases/2025-07-24-new-report-reveals-crisis-point-for-americas-63-million-family-caregivers.html)

We plan to test a $12-per-household monthly subscription with every helper included. Our first validation step is a ten-interview discovery study followed by a five-household pilot. We will measure time to an accepted replacement, coordinator follow-up effort, repeated helper participation, and voluntary paid continuation. These are planned experiments, not completed results.

The planner's core rules do not require a paid model call. A separate cost brief shows an explicit Firebase/GCP usage scenario and its exclusions. We have not claimed a measured production cost or gross margin.

## What we learned

The product's most important words are ordinary ones: offered, accepted, waiting, ready, and completed. If they are unclear, a household can be looking at the same screen and still have different expectations.

We also learned from competitor research that voice notes and handoff summaries are established features. The stronger product focus is the moment a plan breaks—and the exact steps needed to make it workable again.

## What's next

1. Complete the ten-interview study and five-household pilot using the published research protocol.
2. Improve invitation and helper flows based on observed adoption friction.
3. Measure latency, database usage, planner behavior, and support effort with real usage before making scale or cost claims.
4. Evaluate live Alexa+ onboarding where access is available, while retaining the standalone web experience.
5. Add language-model interpretation only with explicit provenance, cost measurement, and the existing commitment checks intact.

## Validation evidence to attach

Executed checks are linked below. The public video remains a human recording/upload step.

- Test command and result: `npm run check`: lint, typecheck, 29 unit tests and production build passed. Additional guard library: 106 tests passed.
- Browser end-to-end evidence: [Executed test evidence](https://github.com/shi1720/Amazon-Developer-Hackathon/tree/main/docs/evidence)
- MCP initialize/list/call evidence: [Executed test evidence](https://github.com/shi1720/Amazon-Developer-Hackathon/tree/main/docs/evidence)
- Required flow: both Maya commitments affected; Jo bag; Dev ride; helper-specific acceptance; ride blocked until bag completion; versioned brief acknowledgment.
- Isolation and invitation checks: 13 checks passed across four independent sessions, including invitation reuse denial, exact-helper acceptance, tenant isolation, token scope/rotation and revocation.

Do not insert an invented test count, latency, success rate, or customer metric.

## Limitations

- The language experience shown is a deterministic web simulator. A live Alexa+ account/device connection and cloud-model interpretation are not claimed.
- The initial domain is practical household support. Medication decisions, clinical recommendations, emergency monitoring, and emergency response are outside its scope.
- Availability and capabilities come from household records; the product cannot know about unrecorded changes.
- An accepted task is a recorded commitment, not proof that a real-world action happened. Completion requires a separate recorded action.
- A brief acknowledgment records the version read. It does not prove comprehension or guarantee future action.
- Commercial demand, willingness to pay, and production-scale operation require validation. The included research and cost documents label their assumptions.
- There is no claimed AWS runtime integration. The AWS Builder mini challenge is not part of this draft entry.

## Team credit

**Shivam Gupta — project creator and product owner.**

Shivam set the challenge brief, commercial priorities, and quality requirements, and owns the product and submission. KindHandoff is developed with AI-assisted research, implementation, testing, and preparation of draft materials.

### Optional AI-use disclosure, if the submission asks

> I used AI coding and research tools extensively to help implement the application, investigate competitors, test workflows, and prepare draft submission materials. I am the project creator and product owner. The repository, working demo, and test evidence show the resulting implementation. Any claims about personal contributions, testing, or customer research are limited to what actually occurred.

## Built with — field-ready keywords

TypeScript; React 19; Vite 8; Model Context Protocol; MCP SDK 1.30.0; Streamable HTTP; Firebase Hosting; Firebase Authentication; Cloud Functions for Firebase; Firestore; deterministic planning.

**Release editor:** Add the actual frontend framework and final package versions from the lockfile. Do not list Bedrock, AgentCore, a live Alexa integration, or an unused model provider.

## Links

| Submission field | Value |
| --- | --- |
| Main public code repository | [shi1720/Amazon-Developer-Hackathon](https://github.com/shi1720/Amazon-Developer-Hackathon) |
| Live application | [Hosted app](https://kindhandoff.web.app) — public Firebase deployment; hosted verification in progress |
| Public demo video, under three minutes | **[INSERT VERIFIED PUBLIC YOUTUBE OR VIMEO URL]** |
| MCP setup and run instructions | [MCP setup](https://github.com/shi1720/Amazon-Developer-Hackathon/tree/main/integrations/alexa) |
| License | MIT; verified in the public repository and GitHub About |

## Open Source mini challenge — additional contribution

**Status:** Public, MIT licensed, runnable, and CI passing on Node 20/22/24.

- **GitHub username:** `shi1720`
- **Main project repository:** `https://github.com/shi1720/Amazon-Developer-Hackathon`
- **Additional contribution repository:** [shi1720/kindhandoff-guard](https://github.com/shi1720/kindhandoff-guard)
- **Contribution URL:** [September 15 contribution](https://github.com/shi1720/kindhandoff-guard/commit/04a15ea016e552e3c031b9ec371af2df6a1de105)
- **Final package name:** `@kindhandoff/guard`
- **License:** MIT, verified in the public repository.

### Short contribution description

> The additional @kindhandoff/guard library provides commitment state transitions, coverage accounting, and candidate ranking for reuse in other coordination tools. KindHandoff applies these primitives to practical household support. The application separately implements identity and authorization checks, dependency readiness, and content-version acknowledgments. The library repository contains its implementation, tests, examples, and MIT license.

**Release editor:** Keep only the capabilities present in the published library and verify its relationship to the main application. Publishing the main application alone does not satisfy the additional-project requirement.

## Product feedback

Use the complete [observed product feedback and friction log](product-feedback.md) for this Devpost field. It documents tool purpose, what worked, onboarding, concrete friction, workarounds, feature requests, and whether we would build again. No AWS usage or native Alexa testing is claimed.

### Feature requests to consider after verification

- **Important:** A reference example for a multi-user MCP workflow where the proposer and the person who accepts responsibility have different identities.
- **Important:** Examples for representing a stale proposal or a versioned acknowledgment consistently across voice and visual clients.
- **Nice-to-have:** A conformance fixture that exercises initialization, tool calls, and error handling against a serverless Streamable HTTP endpoint.

These are proposed requests based on the product's needs. Confirm whether current documentation or tooling already addresses them before submitting.
