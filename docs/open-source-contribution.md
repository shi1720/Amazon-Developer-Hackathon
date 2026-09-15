# Additional Open Source mini challenge

- **GitHub username:** shi1720
- **Primary project:** https://github.com/shi1720/Amazon-Developer-Hackathon
- **Additional project:** https://github.com/shi1720/kindhandoff-guard
- **Contribution URL:** https://github.com/shi1720/kindhandoff-guard/commit/04a15ea016e552e3c031b9ec371af2df6a1de105
- **License:** MIT, copyright Shivam Gupta 2026; recognized by GitHub.
- **Created:** September 15, 2026, during the hackathon window.

`@kindhandoff/guard` is a small, dependency-free TypeScript library for auditable commitment transitions, honest coverage accounting and deterministic candidate ranking. An offer is not acceptance. The proposed person must accept; completed work has a separate state. Explicit time/capability assessment explains candidate exclusions.

The library provides reusable primitives instead of coupling those rules to a caregiver application or a particular LLM. Its examples show a tool adapter. The main app imports a vendored copy under `packages/handoff-guard/src/index.ts`; the standalone source is maintained in the separate public repository. The application owns multi-task recovery search, task prerequisites, identity/storage and brief content revisions.

**Verification:** 106 tests, typed build, executable MCP-adapter example, package dry run and a fresh tarball installation/import smoke check passed. Public GitHub Actions passed on Node 20, 22 and 24: https://github.com/shi1720/kindhandoff-guard/actions/runs/34991347793 . The package is not published to the npm registry; install/build from the repository or package it locally with `npm pack`.

This is a new additional open-source project alongside the primary Alexa+ submission, not just the act of making the main submission repository public.
