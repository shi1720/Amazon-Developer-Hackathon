# Release status — 15 September 2026

## Public release

**[Open KindHandoff](https://kindhandoff.web.app)**

The app is public on Firebase Hosting with Cloud Functions v2, Firestore and Firebase Authentication. Anonymous visitors receive an isolated fictional demo. Personal circles require coordinator sign-in or a private helper invitation. The earlier Sites prototype is archived in the `sites-prototype` Git tag.

## Completed and verified

- Public MIT [application repository](https://github.com/shi1720/Amazon-Developer-Hackathon) with reproducible setup, lockfiles and automated CI.
- Firebase email/password identity, opaque server sessions, blank personal circles, persistent commitments, one-time helper invitations, export, revocation and deletion.
- Real MCP 2025-11-25 over Streamable HTTP and an explicitly labelled deterministic Alexa+ browser simulator.
- **29 unit tests**, **17 Firestore integration tests**, production **15 MCP calls**, **13 multi-user checks across four sessions**, and **11 Firebase account checks** passed.
- [Firebase migration CI](https://github.com/shi1720/Amazon-Developer-Hackathon/actions/runs/34996577422) passed. Subsequent release commits rerun the same workflow; see [current CI](https://github.com/shi1720/Amazon-Developer-Hackathon/actions/workflows/ci.yml).
- Actual public browser review at mobile 390×844 and desktop 1365×950, with no horizontal overflow. A real invited helper accepted and completed a prerequisite; a signed-in coordinator created and saved a private commitment.
- Dependency advisory snapshot: zero reported vulnerabilities in both root and Functions dependency graphs. This is not a penetration test.
- Additional public MIT [handoff guard library](https://github.com/shi1720/kindhandoff-guard), 106 tests and passing Node 20/22/24 CI.
- Business research, explicit pricing/cost hypotheses, discovery protocol, observed product feedback, friction log and Devpost copy.
- Eight-slide editable PowerPoint and PDF, two-page judge brief, 315-word narration, timed shot list and editable draft captions. All ten artifact pages rendered and visually inspected.

Detailed results: [evidence](evidence/README.md), [browser verification](evidence/browser-verification.md), [security and operating scope](../SECURITY.md), [Firebase setup](firebase-deployment.md).

## Human submission steps

1. Record the supplied English narration over the actual working flow. Publish a public YouTube or Vimeo video **under three minutes** and add its URL to the Devpost copy.
2. Review the final Devpost form, confirm personal eligibility, accept the required terms, and submit before **October 24, 2026 at 00:30 IST**.

The creator and product owner is **Shivam Gupta**. No video upload, Devpost submission, real household pilot, native Alexa deployment, or AWS integration is represented as completed.

## Operating scope

This is a tested, publicly deployed MVP. Firebase/GCP billing is enabled on the existing account. The server scales to zero, has a maximum of two instances, and removes deployment images after seven days. Free allowances can cover a small pilot; these settings are not a spending cap. Cost assumptions and commercial-launch work are documented in the business and security notes.
