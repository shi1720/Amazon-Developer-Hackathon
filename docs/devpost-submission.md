# KindHandoff

Created by Shivam Gupta for the Amazon Developer Hackathon. Primary track: Alexa+. Additional mini challenge: Open Source.

## Inspiration

A cancelled ride can break more than a calendar entry. Someone still needs to pack the bag, find a driver, explain the change, and confirm that both people agreed. The facts may be scattered across a family chat while one person carries the work of assembling a new plan.

KindHandoff focuses on that moment. We chose everyday support for a parent because the need is specific and understandable: help the household recover a disrupted afternoon, with a clear record of who has accepted responsibility. The demonstration uses a fictional family, not an invented personal caregiving story.

## What it does

Maya becomes unavailable for the afternoon. Two commitments need replacements: packing Arun's library bag at 14:30 and driving him to book club at 15:00. The ride depends on the bag being packed.

Jo can access the house from 14:00 to 15:00 but cannot drive. Dev can drive but is only available from 14:45. KindHandoff checks those constraints together and proposes Jo for the bag and Dev for the ride.

The coordinator reviews the change before applying it, then reviews the replacement plan before creating offers. Each named helper accepts through their own session. An offer is not counted as acceptance. Dev's accepted ride remains waiting until Jo records the bag as complete.

A shared handoff brief shows unresolved work, accepted commitments, prerequisites, and attributed notes. Acknowledgments record the exact content revision read, so an earlier receipt cannot silently stand for a later plan.

The public app includes a private fictional demo, email/password accounts, personal circles, single-use helper invitations, activity history, export, and circle deletion. Our focus is recovery, agreement, and readiness across linked tasks.

**Try it in five minutes:** Open [kindhandoff.web.app](https://kindhandoff.web.app) for a private fictional demo. No account, API key, or device is required. Start as Maya, choose **I can’t make it this afternoon**, review and confirm the change, then inspect the suggested Jo/Dev split. Follow the [judge testing guide](https://github.com/shi1720/Amazon-Developer-Hackathon/blob/main/docs/submission-fields.md#testing-instructions-for-judges) to verify acceptance in separate helper sessions, the bag-to-ride prerequisite, and the versioned handoff brief.

## How we built it

The React 19 and Vite 8 interface calls a real Model Context Protocol server through the official TypeScript SDK 1.30.0. It negotiates protocol 2025-11-25 and uses Streamable HTTP. The browser simulator and external MCP clients invoke the same validated workflow.

The language interpreter supports a defined set of English requests. It is deterministic and visibly labelled as an Alexa+ simulation. No cloud language model or native Alexa connection is required for this submission path.

Firebase Hosting serves the public app. A Node 22 Cloud Functions v2 backend handles the API and MCP endpoint. Firebase Authentication establishes coordinator identity; opaque HTTP-only sessions and scoped invitations establish application access. Firestore transactions check credentials, household membership, and the latest state version before committing changes. Content revisions are separate from storage revisions.

We also built the additional MIT-licensed `@kindhandoff/guard` library. It provides reusable commitment transitions, coverage accounting, and candidate ranking. The application owns multi-task recovery, prerequisites, identity, persistence, and brief revisions.

## Challenges we ran into

The central challenge was defining what a promise means. Available, offered, accepted, ready, and completed must remain distinct, including when several people act at once.

A simple chronological planner could assign the only driver to an earlier flexible task. We replaced that approach with bounded search that prioritizes constrained work and reports unresolved commitments. Concurrent invitation redemption, credential revocation, and stale updates required transaction checks at the point of the write. A separate content revision fixed the case where one helper's acknowledgment incorrectly made another helper's unchanged brief appear stale.

Deployment also produced concrete friction. Two Hosting rewrites updating the same function caused a conflict; one combined rewrite resolved it. An explicit artifact cleanup policy was required before the Hosting release completed. These findings and their workarounds are documented in the product feedback.

## Accomplishments that we're proud of

We shipped a public application that carries the cancellation through to separate helper acceptance, dependency readiness, and a versioned handoff. The demo is backed by persistent state and real MCP calls.

Production verification includes 15 MCP calls, 13 multi-user checks across four sessions, and 11 Firebase authentication checks. The repository also contains 54 unit tests and 23 Firestore integration checks. The additional open-source library has 106 tests and passing CI on Node 20, 22, and 24.

Shivam Gupta is the project creator and product owner. The project was developed with AI-assisted research, implementation, testing, and preparation of submission materials. The demo video's synthetic narration is clearly labelled.

## What we learned

The important product words are ordinary ones. If two helpers interpret "accepted" differently, polished screens will not make the handoff reliable. Explicit states, exact-person authorization, and readable explanations make the workflow easier to inspect.

We also learned that voice notes, calendars, and handoff summaries already exist. Our useful focus is the recovery sequence when a plan breaks. Commercial value depends on helpers participating and coordinators spending less time chasing confirmations. Creating more tasks alone would not establish that value.

## What's next for KindHandoff

The next step is a ten-interview discovery study followed by a five-household pilot. We will measure time to an accepted feasible replacement, follow-up effort, repeated helper use, and willingness to continue paying. No interviews, pilot outcomes, customers, or revenue are claimed yet.

Our pricing hypothesis is $12 per household per month with every helper included. The cost model includes visible-page polling, MCP overhead, database reads, retention assumptions, and shared Firebase/GCP allowances. Billing is enabled; the model is not a promise of free operation or a measured margin.

We then plan to pursue native Alexa+ onboarding and validate account linking and confirmation behavior. Broader language interpretation would retain the same authorization and state checks. The current product supports practical household help, without medication decisions or emergency monitoring. No AWS service or live Alexa integration is claimed.
