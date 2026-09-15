# KindHandoff presentation sources

These files generate the editable eight-slide deck, its PDF export, and the two-page judge brief. They use the approved navy/blue/ice palette, Noto Sans, native tables and editable diagrams. No stock images, screenshots, customer testimonials, or observed business metrics appear.

**Confirmed release:** The Firebase application is public at [kindhandoff.web.app](https://kindhandoff.web.app). The implementation lead confirmed production protocol, multi-user, and authentication checks and signed-out desktop/mobile browser entry. `release-status.json` records the scope and source baseline, including its working-tree caveat; builders now use `publicVerified: true`. The regenerated deliverables replace the earlier runtime's drafts.

## Files

- `build-pitch.mjs`: Creates the PowerPoint with `@oai/artifact-tool`, validates it, and copies the validated file to `../deliverables/KindHandoff-Pitch.pptx`.
- `set-pptx-metadata.py`: Sets project title and Shivam Gupta creator metadata before PowerPoint package validation.
- `build-brief.py`: Generates the two-page brief with ReportLab and embedded Noto Sans fonts.
- `render-artifacts.sh`: Uses the bundled headless LibreOffice to create the pitch PDF, then bundled Poppler to render all ten pages to PNGs.
- `release-status.json`: Shared application URL, public-verification flag, confirmation timestamp, and evidence summary. Both builders consume it.
- `validate-artifacts.py`: Checks final page counts, creator metadata, key text, editable PowerPoint tables, the guard repository link, final Firebase terms, and the exact verification label. This does not replace visual inspection or native PowerPoint testing.
- `build-thumbnail.py` and `KindHandoff-Thumbnail.svg`: Rebuild the original 1280 x 720 PNG thumbnail using the established brand palette and an editable task-dependency illustration.
- `build-submission-kit.mjs`: Regenerates the field-copy HTML from the current story and submission fields.
- `firebase-cost-scenario.py`: Reproduces the assumption-based serving-cost table in `../market-and-business.md` using Decimal arithmetic. It does not measure application usage.

## Rebuild on this host

Use the bundled runtimes resolved by `load_workspace_dependencies`. Current bundle: `26.905.11957`.

```sh
/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node build-pitch.mjs
/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 build-brief.py
./render-artifacts.sh
/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 validate-artifacts.py
```

The build script imports `@oai/artifact-tool` through the `node_modules` symlink in this directory. On another host, resolve its bundled dependencies again, update the runtime paths, and recreate the symlink. Do not commit the symlink or bundle dependencies into the application repository.

**LibreOffice:** Always use `/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice`, the wrapper for the bundled headless runtime. Do not use an installed desktop LibreOffice, even if the bundled runtime fails.

The PDF skill's operation-start marker ran once before authoring the two PDF outputs. The presentations marker ran once before PowerPoint authoring. New, separate authoring tasks should follow the current installed skills before running source commands.

## Release facts to update

- The final application URL is `https://kindhandoff.web.app`. `release-status.json` sets `publicVerified: true`; builders label it `Verified public app`. The confirmation timestamp records when the implementation lead's results were incorporated, not the exact execution time of every check.
- Final stack: React 19.3, Vite 8.3, Firebase Hosting, Cloud Functions v2 on Node 22, Firestore Standard in `us-central1`, Firebase Authentication email/password, and a secure `__session` cookie. Runtime: 256 MiB, 1 CPU, concurrency 40, zero minimum instances, two maximum instances, 30-second timeout. Seven-day artifact cleanup is configured. No AWS is used.
- The public MIT main repository URL is `https://github.com/shi1720/Amazon-Developer-Hackathon`.
- The additional public MIT guard repository is `https://github.com/shi1720/kindhandoff-guard`; contribution `https://github.com/shi1720/kindhandoff-guard/commit/04a15ea016e552e3c031b9ec371af2df6a1de105`. Both deck and brief link to the repository, and deck notes preserve the contribution URL.
- `@kindhandoff/guard` supplies state transitions, coverage accounting, and candidate ranking. App code handles exact helper identity, dependency readiness, and content-version acknowledgment.
- The web simulator makes actual HTTP MCP calls while its language interpretation remains deterministic.
- The $12 household subscription is a hypothesis. Interviews, pilots, customers, revenue, and production performance remain unclaimed.
- The implementation team reports 106 guard tests and CI on Node 20/22/24; 54 root unit tests and 23 Firestore integration checks (including logout and invitation-reissuance races). Production results are 15 HTTP MCP calls, 13 multi-user checks across four sessions, and 11 real Firebase Authentication checks, all passing. Signed-out browser entry and cancellation-to-offers were checked at widths 1365 and 390 without horizontal overflow. The earlier browser authentication/invitation walkthrough passed. The final clean deployment passed 54 unit tests, 23 Firestore checks, compiled local 15/13/11 proofs, and public read-only smoke checks. The API function was unchanged and skipped. Previously recorded live 15/13/11 results remain scoped to the same backend, with no new production latency claim. The implementation lead also confirmed the 320 px edit, cancel, add, next-day, and selected-date flows. `latestLocalVerification` records the local counts, and `verificationSummary` records the current production scope. Counts are deliberately omitted from the customer pitch and brief.
- Main [CI run](https://github.com/shi1720/Amazon-Developer-Hackathon/actions/runs/34996577422) passed for source `e3e8c5f`. Artifact file/layout validation is separate from these product tests.
- The cost model follows the inspected one `GET /api/session` per visible refresh, at a 12-second interval. Six document reads per authenticated refresh reflect transactional authorization. The scenario budgets six per refresh and other API request, plus 20 per MCP action, totaling 2,016 reads per household/day pending measured telemetry. Account-level compute allowances may already be used elsewhere. The $10 initial pilot operating allowance is a proposed budget, not a spending cap or a predicted invoice.
- If the implemented workflow, guard scope, or authentication changes, revise both content sources and the Markdown submission copy before regenerating.

## Review outputs

Final deliverables live in `../deliverables/`. Intermediate candidates, JSON validation receipts, and rendered PNGs live in `../.build/` and `../.finalized/`. Review every final PNG after regeneration. The structural finalizer and PDF checks cannot detect all visual issues; the initial visual pass, for example, identified connector directions that structural checks accepted.

The creator credit identifies Shivam Gupta as project creator and product owner. The source materials and implementation used AI assistance, as disclosed in the submission draft.
