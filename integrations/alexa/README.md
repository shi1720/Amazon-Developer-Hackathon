# Alexa+ and MCP integration

## What is demonstrated

The browser includes an **Alexa+ simulation** with a bounded, deterministic English interpreter. It calls the official MCP TypeScript client, which initializes and invokes the app's real `/mcp` endpoint using **2025-11-25 Streamable HTTP**. No Amazon account, Alexa+ preview approval or paid LLM key is needed to run this submission path.

This is not a claim of native Alexa+ account linking, certification or live device deployment. The hackathon allows a simulated experience. Amazon's native onboarding remains a separate next step.

## Inspect the real server

Run the app, then run `npm run test:integration`. The script uses SDK `Client` and `StreamableHTTPClientTransport`, negotiates the protocol and invokes the full recovery workflow. `npm run test:e2e` verifies real helper-cookie sessions, single-use invitations, wrong-actor rejection and token restrictions.

The source entry point is `app/mcp/route.ts`. The browser client is `lib/mcp-client.ts`. Schema, description and authorization are in `lib/server/tools.ts`. The endpoint supports POST; GET/DELETE return 405 for this stateless JSON-response transport. Every request has a fresh transport instance, while D1 stores business state.

## Connect an external client

1. Open your circle and go to **Settings → MCP**.
2. Generate a token. Copy it privately; the server only stores its hash. It expires after 24 hours and rotation invalidates the previous token.
3. Configure a Streamable HTTP client for the absolute `/mcp` URL, with `Authorization: Bearer <your token>`. Use the token in the header, never the query string.
4. Call `get_day` first to obtain exact member/task IDs and the current storage version.
5. Read `preview_recovery`, show the proposed assignments, then ask the user to confirm before `propose_recovery`. Every write needs `expectedVersion` and a fresh UUID `requestId`. Retry the same action with the same ID; refresh on a stale-version error.

The coordinator token cannot impersonate a helper to accept. The helper must accept through their own authenticated session. Tokens cannot call administrative HTTP routes.

## Native Alexa+ preview checklist

Consult the current [Amazon MCP toolkit overview](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-overview.html) and [quickstart](https://www.developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-quickstart.html). Preview availability and onboarding are controlled by Amazon. Register the hosted Streamable HTTP endpoint through the supported toolkit, configure the required account-linking mechanism, and validate exact-person confirmation and token scope in the native environment. A generic development bearer token is not a completed production OAuth account-linking integration.

Before claiming native integration, record actual device/toolkit execution, test account-linking and refresh/revocation, verify confirmation UX and host access, and include observed Amazon-tool feedback. The current repo intentionally does not ship a fabricated Alexa manifest or claim an untested adapter.
