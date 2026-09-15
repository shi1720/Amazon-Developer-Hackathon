# Executed verification

Current release: Firebase Hosting, Functions v2, Firestore and Firebase Authentication.

- `firebase-emulator-*.json`: real SDK/HTTP workflows against the Auth and Firestore emulators.
- `firebase-production-*.json`: live hosted results, added only after execution on https://kindhandoff.web.app.
- The separate Firestore integration suite checks races, ownership, expiry and revocation. Run `npm run test:firestore` with an isolated loopback emulator.
- Browser evidence and viewport observations are recorded in `browser-verification.md` after the final hosted walkthrough.
- `legacy-sites-prototype/` contains checks from the earlier archived prototype, not the current Firebase runtime.

A smoke-test latency is an observation from that small test run, not a load test, uptime commitment, or statistically established production benchmark. Synthetic accounts contain fictional data; their raw credentials and invitation links are never included.
