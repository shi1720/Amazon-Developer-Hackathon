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

## Firebase release review

A later independent source/documentation review provisionally scored technical implementation **8.0/10**, design **8.5/10**, potential impact **7.0/10**, and quality of idea **7.5/10**. These are internal critiques, not official judging or a winning forecast. At review time the public Firebase release was still being verified.

The review identified three concrete changes: refresh on focus/visibility return with a visible refresh control, display dates alongside helper availability, and align the submission documents with the actual Firebase runtime and Activity trace location. Those interface/documentation changes were implemented. A separate security review reproduced a logout/session-reissuance race; its fix transactionally consumes the still-live parent session and has dedicated regression coverage.

The remaining evidence gap is human adoption: no household pilot, paid demand, measured savings, or live Alexa connection is claimed. The recording should show the cancellation in its first ten seconds, then distinguish proposed, accepted, and ready.
