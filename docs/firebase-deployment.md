# Firebase/GCP setup

## Production architecture

- **Project and public site:** `kindhandoff` / https://kindhandoff.web.app
- **Frontend:** Vite/React static assets on Firebase Hosting.
- **API:** Cloud Functions v2 `api`, region `us-central1`, 256 MiB, one CPU, concurrency 40, zero minimum instances, maximum two instances, 30-second timeout.
- **Database:** Firestore Standard `(default)`, `us-central1`; direct browser access denied.
- **Authentication:** Firebase email/password, recent ID-token verification, opaque HttpOnly `__session` server cookies. Optional Google UI stays hidden unless an actual provider is configured.
- **Runtime identity:** `kindhandoff-runtime@kindhandoff.iam.gserviceaccount.com`, with `datastore.user` and `firebaseauth.viewer`.
- **Deployment image retention:** automatic Artifact Registry cleanup after seven days.
- **TTL:** enabled for `expiresAt` in circles, sessions and invitations. Authorization checks expiry before eventual database cleanup.

Firebase server functions require billing-enabled GCP. This project uses an existing billing account, scale-to-zero and a two-instance ceiling. Free allowances may cover a small pilot; charges remain possible. The [cost model](market-and-business.md) states assumptions and excludes unmeasured costs rather than claiming a free commercial service.

## Local interactive development

Install Node22+ and Java21. In three terminals:

```sh
npm ci
npx firebase-tools@15.30.1 emulators:start --only auth,firestore --project demo-kindhandoff
```

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
GCLOUD_PROJECT=demo-kindhandoff \
PUBLIC_ORIGIN=http://127.0.0.1:3001 \
npm run dev:server
```

Create an ignored `.env.development.local` containing:

```dotenv
VITE_FIREBASE_CONFIG={"apiKey":"demo-key","authDomain":"demo-kindhandoff.firebaseapp.com","projectId":"demo-kindhandoff","appId":"demo-app"}
VITE_FIREBASE_AUTH_EMULATOR=http://127.0.0.1:9099
```

Then run `npm run dev` and open http://127.0.0.1:3001. These are emulator-only configuration values, not production credentials. The production browser fetches its public Firebase app configuration from Hosting's reserved `/__/firebase/init.json` endpoint.

## Reproducible automated verification

```sh
npm run check
npx firebase-tools@15.30.1 emulators:exec --only auth,firestore --project demo-kindhandoff 'npm run test:firestore && node scripts/verify-local.mjs'
```

The Firestore suite requires a loopback emulator and selects a separate `demo-kindhandoff-backend-tests` namespace. The HTTP suite starts the actual compiled Node API bundle, then runs MCP, helper-session and Firebase login proofs. It never points Admin SDK tests at production.

## Deploy this project

Use Node 22.13+, Java 21+, and an authenticated Firebase CLI account with project permissions. Preview the release stages without installing, building or publishing:

```sh
npm run deploy:firebase -- --project kindhandoff --plan
```

Run the full release verification without publishing, or complete the deployment:

```sh
npm run deploy:firebase -- --project kindhandoff --check-only
npm run deploy:firebase -- --project kindhandoff
```

The runner installs both lockfiles with `npm ci`, runs lint/type/unit/build checks, then starts temporary Auth/Firestore emulators on unused loopback ports. It executes the Firestore regressions and actual compiled Auth/MCP/multi-user proofs against isolated `demo-*` namespaces. It stops on any failure. The compiled test server also uses an unused port, so a running development server does not receive release-test requests.

The final step deploys Firestore rules, the API function and Hosting together, then checks the public page, anonymous session, MCP routing and Firebase app configuration using read-only requests. It does not create public test accounts or household data. Production dotenv overrides and inherited emulator/build overrides are rejected before the pipeline starts. Dotenv file contents are not inspected. Subprocesses receive a narrow environment allowlist so unrelated shell credentials cannot enter Firebase emulator debug logs. Authenticate through the CLI's local login; the script does not forward token environment variables.

`firebase.json` runs the build before uploading functions and preserves exactly one `^/(api/.*|mcp)$` rewrite with `pinTag: true`, followed by the static application fallback. The runner verifies that structure rather than rewriting it. Function resource limits and the attached runtime service account remain controlled by `functions/index.ts`. With no Functions dotenv file, the pinned Firebase CLI preserves existing deployed environment variables, including `PUBLIC_ORIGIN`. The code also defaults to the canonical `https://kindhandoff.web.app` origin. [Firebase pinned function rewrites](https://firebase.google.com/docs/hosting/functions)

A new fork needs its own Firebase project, web app, enabled Auth provider, Firestore database, billing setup, runtime identity and reviewed deployment-script/configuration changes. The explicit `--project kindhandoff` requirement prevents an accidental default-project selection; do not deploy a fork to Shivam's project.

No LLM API key, paid voice service, service-account JSON key, or AWS credential is required. Firebase's browser configuration is public project identification; it is not a server secret. Database permissions and server authentication enforce access.

Static HTML entry points use `no-cache` so returning browsers revalidate releases; hashed assets use long-lived immutable caching. API and MCP responses use `no-store`.

## Authentication and request routing

Firebase Hosting forwards only the specially named `__session` cookie to the backend; other cookies must not be used for authentication. Browser calls use the same origin. External MCP clients use dedicated Bearer tokens on `/mcp`. The API constructs request URLs from the configured `PUBLIC_ORIGIN` (default `https://kindhandoff.web.app`) and strips upstream identity headers. The canonical public URL should be used for invitations and integrations.

## Operations before a paid launch

Measure real requests and Firestore reads, configure spending alerts, exercise backups/restores, implement an account recovery/session-management policy, review data retention and privacy requirements, and run a real household pilot. Resource ceilings and bounded data are protections, not a guarantee of zero cost or universal availability.

The earlier Sites/D1 prototype is preserved in the Git tag `sites-prototype`. The current application uses Firebase/GCP; the old hosted URL is not the submission destination.
