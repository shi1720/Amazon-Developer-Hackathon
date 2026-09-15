# Rubric review and iteration

An independent LLM agent reviewed the implementation against the four official criteria. This is internal critique, not an official score or a prediction of winning.

## First review

| Criterion | Provisional score / 10 | Main concern |
|---|---:|---|
| Technical implementation | 7.5 | Distinguish real separate-person acceptance from a demo role switch; correct stale acknowledgment behavior |
| Design | 8.0 | Provisional before final visual inspection; put a helper's pending offers ahead of coordinator information |
| Potential impact | 7.0 | No customer interviews or adoption data yet; avoid treating market size as demand |
| Quality of idea | 7.0 | Voice notes and shared care calendars already exist; demonstrate disruption recovery clearly |

## Changes made because of critique

- Added a four-session integration proof with one-time invitations, actor isolation, individual acceptance, dependency completion, token restrictions and revocation.
- Separated substantive content versions from concurrency versions. Two helpers can acknowledge the same brief; a changed plan invalidates old acknowledgments.
- Put a helper's own pending offers first, with task timing and dependencies visible before acceptance.
- Added a copyable, human-readable invitation request for manual private sharing.
- Corrected the fictional helper's available window to match the planner explanation and video story.
- Kept library scope accurate: guard transitions/coverage/ranking; app dependencies and brief revisions.
- Added scarce-driver and bounded-search regressions; preserved explicit unresolved outcomes.
- Named direct competitors and documented interview/pilot evidence still needed.

## Adversarial engineering review

A second independent agent probed ambiguous name parsing, future-day requests, invalid identity, constrained planning, anonymous admission races, oversized streamed bodies, token scope and concurrent rotation. The resulting fixes include fail-closed name/date interpretation, bounded request streaming, transactional token rotation, MCP-only token scope, atomic demo admission/capacity and version-aware briefs. Regression tests and HTTP evidence are checked in.

## Remaining route to a stronger submission

A convincing recorded walkthrough, five-household pilot, observed native Alexa onboarding feedback and measured production behavior would add evidence that code alone cannot provide. The current materials do not invent these results. The video should lead with the broken afternoon and show the precise change from offered to accepted to ready.
