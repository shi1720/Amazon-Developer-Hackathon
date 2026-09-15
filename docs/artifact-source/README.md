# KindHandoff presentation sources

These files generate the editable eight-slide deck, its PDF export, and the two-page judge brief. They use the approved navy/blue/ice palette, Noto Sans, native tables and editable diagrams. No stock images, screenshots, customer testimonials, or observed business metrics appear.

## Files

- `build-pitch.mjs`: Creates the PowerPoint with `@oai/artifact-tool`, validates it, and copies the validated file to `../deliverables/KindHandoff-Pitch.pptx`.
- `set-pptx-metadata.py`: Sets project title and Shivam Gupta creator metadata before PowerPoint package validation.
- `build-brief.py`: Generates the two-page brief with ReportLab and embedded Noto Sans fonts.
- `render-artifacts.sh`: Uses the bundled headless LibreOffice to create the pitch PDF, then bundled Poppler to render all ten pages to PNGs.
- `validate-artifacts.py`: Checks final page counts, creator metadata, key text, editable PowerPoint tables, and expected preview status. This does not replace visual inspection or native PowerPoint testing.

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

- `PREVIEW_CONFIRMED` defaults to `false` in both builders. Change it only after a verified deployment and public browser check. The current link is labelled preview with deployment pending.
- The main repository URL is `https://github.com/shi1720/Amazon-Developer-Hackathon`.
- `@kindhandoff/guard` supplies state transitions, coverage accounting, and candidate ranking. App code handles exact helper identity, dependency readiness, and content-version acknowledgment.
- The web simulator makes actual HTTP MCP calls while its language interpretation remains deterministic.
- The $12 household subscription is a hypothesis. Interviews, pilots, customers, revenue, and production performance remain unclaimed.
- If the implemented workflow, guard scope, or authentication changes, revise both content sources and the Markdown submission copy before regenerating.

## Review outputs

Final deliverables live in `../deliverables/`. Intermediate candidates, JSON validation receipts, and rendered PNGs live in `../.build/` and `../.finalized/`. Review every final PNG after regeneration. The structural finalizer and PDF checks cannot detect all visual issues; the initial visual pass, for example, identified connector directions that structural checks accepted.

The creator credit identifies Shivam Gupta as project creator and product owner. The source materials and implementation used AI assistance, as disclosed in the submission draft.
