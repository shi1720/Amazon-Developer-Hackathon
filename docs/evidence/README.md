# Executed verification

Current runtime: Firebase Hosting, Cloud Functions v2, Firestore, and Firebase Authentication at [kindhandoff.web.app](https://kindhandoff.web.app).

## Latest release records

- [Release pipeline](firebase-release-pipeline.json): the clean deployment pipeline passed 54 unit tests, 23 Firestore integration checks, the compiled local 15/13/11 MCP/multi-user/authentication workflows, and the public read-only smoke check. Firestore and Hosting deployed; the backend was unchanged and skipped. The record preserves the earlier grammar-only Hosting release separately.
- [Production MCP](firebase-production-mcp.json): 15 real calls, protocol 2025-11-25, Streamable HTTP, final state revision 7. The single run observed median 1,184 ms and p95 1,325 ms.
- [Production multi-user](firebase-production-multi-user.json): 13 checks across four independent cookie sessions, including real invitations, exact helper acceptance, dependencies, brief revisions, isolation, token rotation, and revocation.
- [Production authentication](firebase-production-auth.json): 11 checks through actual Firebase Authentication, followed by cleanup of the disposable synthetic circle and account.

The production records preserve the scripts' result structure and add explicit provenance and scope. The implementation lead reported the completed run. The documentation task did not rerun or simulate it. These production suites preceded the final frontend fixes and exercised the same backend, which the final deployment skipped as unchanged. The final frontend release is not presented as a new full production suite or latency run. The final packaging commit is recorded separately from the `d668158` source baseline.

## Other evidence

- `firebase-emulator-*.json` records the final compiled local 15/13/11 MCP/multi-user/Auth emulator checks. The MCP run reached revision 7 with median 30 ms and p95 49 ms. These are local timings, separate from production.
- The separate Firestore integration suite checks races, ownership, expiry, revocation, and transaction authorization. Run `npm run test:firestore` with an isolated loopback emulator.
- [Browser verification](browser-verification.md) records actual UI and viewport observations. It distinguishes functional checks from usability, microphone, and accessibility work that was not performed.
- [Artifact visual QA](artifact-visual-qa.json) identifies the rendered and inspected PPTX and PDFs. It does not establish video completion, application behavior, or native PowerPoint testing.
- [Video QA](../video-source/final-qa.json) records the completed 169-second, 1080p, 24 fps film, 39 captions, successful full decode, all shot previews, and 28 inspected decoded frames. Browser playback also passed. The [public YouTube video](https://youtu.be/t7e00FzIk2M) has verified signed-out playback and an uploaded English transcript; the review was not a continuous human audiovisual screening.
- `legacy-sites-prototype/` contains checks from the archived prototype, not the current Firebase runtime.

A smoke-test latency is an observation from a small run, not a load test, uptime commitment, or statistically established production benchmark. Synthetic accounts contain fictional data. Raw account credentials, sessions, and invitation links are never included in these reports.
