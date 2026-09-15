# Release status: 16 September 2026

## Public release

**[Open KindHandoff](https://kindhandoff.web.app)** · **[Watch the public demo](https://youtu.be/t7e00FzIk2M)**

The app is public on Firebase Hosting with Cloud Functions v2, Firestore, and Firebase Authentication. Signed-out visitors receive an isolated fictional demo. Personal circles require coordinator sign-in or a private helper invitation. The earlier Sites prototype is archived in the `sites-prototype` Git tag.

**Final public browser verification:** 2026-09-15T18:30:28Z. The [disposable browser fixture cleanup](evidence/ui-fixture-cleanup.json) is complete and verified.

## Latest completed deployment

The full clean `npm run deploy:firebase -- --project kindhandoff` pipeline passed. It installed the root and Functions dependencies from their lockfiles, ran lint and type checks, passed **54 unit tests**, built the production application, and passed **23 Firestore emulator integration checks**. The compiled local workflow also passed **15 MCP calls**, **13 multi-user checks**, and **11 authentication checks**.

The final pipeline deployed Firestore rules and Hosting. Firebase skipped the API function because its backend was unchanged. Its public read-only smoke check passed for the HTML entry, anonymous session API, MCP route, and Firebase project configuration.

The previously completed live checks against that unchanged backend remain valid:

- **15 MCP calls** over Streamable HTTP using protocol **2025-11-25**, ending at state revision **7**.
- **13 multi-user checks across four independent cookie sessions**.
- **11 real Firebase Authentication checks**, followed by cleanup of the disposable circle and temporary account.

The MCP smoke run observed a **1,184 ms median** and **1,325 ms p95** using the script's sorted sample. These are timings from one small functional run, not a load test, capacity claim, or established production latency percentile.

The final clean pipeline includes the stale-form and overnight day-view fixes. Its compiled local MCP run observed median 30 ms and p95 49 ms at revision 7. The earlier grammar-only Hosting publication is retained in the evidence as a separate preceding release. No new production latency or repeated live-suite run is claimed for the final frontend release.

See the [release pipeline record](evidence/firebase-release-pipeline.json) and [production reports](evidence/README.md). The tested application source and deliverables are committed at [`e5e0170`](https://github.com/shi1720/Amazon-Developer-Hackathon/commit/e5e0170034d4dddab184d2bb3468356f8ae0dee9). Later packaging changes update documentation only. Pushed-source verification is available in [current CI](https://github.com/shi1720/Amazon-Developer-Hackathon/actions/workflows/ci.yml).

## Product and supporting materials

- Public MIT [application repository](https://github.com/shi1720/Amazon-Developer-Hackathon) with reproducible setup and lockfiles.
- Firebase email/password identity, opaque server sessions, blank personal circles, persistent commitments, single-use helper invitations, export, revocation, and deletion.
- Real MCP server and an explicitly labelled deterministic Alexa+ browser simulator.
- Actual browser checks of the public fictional demo, reviewed cancellation, feasible Jo/Dev offers, invited helper acceptance, prerequisite completion, and personal-circle persistence. Latest follow-up checked editing, cancellation, adding commitments, next-day navigation, and selected-date disruption windows at 320 px. Post-deployment browser checks also verified stale-form protection across two tabs and an overnight task remaining visible on the next day. See [browser verification](evidence/browser-verification.md) for scope and earlier viewports.
- Additional public MIT [handoff guard library](https://github.com/shi1720/kindhandoff-guard), with the previously verified 106 tests and passing Node 20/22/24 CI. No new guard run is implied by the latest app deployment.
- Business research, explicit pricing and cost hypotheses, discovery protocol, observed product feedback, friction log, and field-ready Devpost and YouTube copy.
- Eight-slide editable PowerPoint and PDF, plus a two-page judge brief. All ten rendered pages were visually inspected. [Artifact QA](evidence/artifact-visual-qa.json) records the actual files and hashes.
- A completed [169-second demo](deliverables/KindHandoff-Demo.mp4), [39 timed English captions](deliverables/KindHandoff-Captions.srt), and [YouTube thumbnail](deliverables/KindHandoff-Thumbnail.png). The 293-word narration uses an AI-generated OpenAI voice, not a recording of Shivam Gupta. Export checks, all shot previews, 28 decoded frames, and real browser playback passed. [Video QA](video-source/final-qa.json) states the inspection limits.

Detailed references: [evidence](evidence/README.md), [security and operating scope](../SECURITY.md), [Firebase setup](firebase-deployment.md), [submission fields](submission-fields.md).

## Public video and submitted Devpost entry

The [YouTube demo](https://youtu.be/t7e00FzIk2M) is published publicly with the prepared title and description, original thumbnail, English SRT captions, and AI-narration disclosure. The implementation lead verified signed-out in-app-browser playback, a **169.021-second** duration, and a visible public transcript. The local master remains a 169-second, 1920 x 1080, 24 fps export.

The [Devpost entry](https://devpost.com/software/kindhandoff), project **1184871**, is **submitted to the Build, Ship, Shape: Amazon Developer Hackathon**. Shivam completed the final step. On **16 September 2026**, the implementation lead observed the "Project submitted!" confirmation and the "SUBMITTED TO" hackathon listing. All 23 non-eligibility additional fields, gallery images and captions, creator credit, the working video embed, and the submission-kit attachment had been verified after saving. There are no remaining submission actions. Devpost permits edits until the stated deadline of 23 October 2026 at 3:00 p.m. EDT.

The creator and product owner is **Shivam Gupta**. AI assistance supported development and submission preparation. No real household pilot, native Alexa deployment, or AWS integration is represented as completed. The deadline is **October 24, 2026 at 00:30 IST**.

## Operating scope

This is a tested, publicly deployed MVP. Firebase/GCP billing is enabled on the existing account. The server scales to zero, has a maximum of two instances, and removes deployment images after seven days. Free allowances can cover the stated small-pilot scenario; these settings are not a spending cap. The [cost model](market-and-business.md) budgets 2,016 document reads per household/day and labels activity, compute time, retention, and shared allowances as assumptions.

The final clean root and Functions installs reported zero vulnerabilities. This is a dependency advisory snapshot, not a penetration test. Customer adoption, production-load behavior, and broader operational validation remain future work.
