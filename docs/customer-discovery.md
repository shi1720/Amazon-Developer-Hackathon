# KindHandoff customer discovery

## Find out whether a repaired plan removes real work

**Research protocol · 15 September 2026**  
**Status:** Planned research. Zero completed interviews and zero live household pilots are represented here. Empty fields are intentionally empty.

### The decision this research must support

Does a household with several helpers encounter enough changes and enough uncertainty about who accepted to use and pay for a dedicated practical-support workflow?

We need evidence of a recurring problem, helper participation, successful recovery, and willingness to pay. Positive reactions to an attractive demo are insufficient.

### Ten-interview recruitment plan

Recruit adult participants through authorized invitations and trusted communities. Start with ten individual interviews; record when respondents belong to the same household so their responses are not counted as independent households. Do not recruit only friends who want to be supportive.

| Interview | Target participant | Variation sought | Scheduled | Completed | Notes reference |
| --- | --- | --- | --- | --- | --- |
| 01 | Primary family coordinator | Full-time employment; parent lives elsewhere | Pending | Pending | Pending |
| 02 | Primary family coordinator | Shift work; frequent schedule changes | Pending | Pending | Pending |
| 03 | Primary family coordinator | Three or more recurring helpers | Pending | Pending | Pending |
| 04 | Primary family coordinator | Shares a home with the supported adult | Pending | Pending | Pending |
| 05 | Primary family coordinator | Two-helper household; current system works reasonably well | Pending | Pending | Pending |
| 06 | Primary family coordinator | Tried and abandoned a coordination app | Pending | Pending | Pending |
| 07 | Occasional family/friend helper | Limited weekly availability | Pending | Pending | Pending |
| 08 | Recurring helper | Specific capability or access constraint | Pending | Pending | Pending |
| 09 | Adult receiving practical support | Wants visibility and a say in arrangements | Pending | Pending | Pending |
| 10 | Adult receiving practical support | Prefers voice or needs a simpler interface | Pending | Pending | Pending |

This sample is for learning, not population estimates. Do not publish percentages as if ten participants were a representative survey.

### Invitation draft: use only after outreach is authorized

> I’m Shivam, building a tool for families who share practical support such as rides, meals, and visits. I’m researching what happens when someone’s plans change. I’d like to hear about your current process in a 30-minute conversation; there is no sales pitch and you do not need to share medical details. Participation is optional, and I will ask separately before recording or quoting anything. If this sounds relevant, I can send the study information and available times.

### Thirty-minute interview guide

**0:00–0:03 · Consent and context**

Read: “Thank you for speaking with me. I’m researching how people coordinate everyday help. Please avoid names, addresses, and medical details. You can skip a question or stop at any time. I’ll take notes for product research. May I do that? I will ask separately before recording or using a quote.”

Do not record unless the participant explicitly agrees. Record the agreed use and deletion date for notes.

**0:03–0:18 · Understand a recent event before showing the product**

1. “Who helps with practical things in your household, and who usually keeps track of the arrangements?”
2. “Tell me about the last time someone could not do a ride, meal, visit, or similar commitment.”
3. “What happened next, step by step? Which messages, calls, or tools did you use?”
4. “How did you know someone had actually agreed to take over?”
5. “Was there anything the replacement person could not do, could not access, or could only do at a certain time?”
6. “Did changing one task affect anything else that day?”
7. “How long did coordination take, and what makes you confident in that estimate?”
8. “What worked well about your existing approach? What would be annoying about adding another app?”
9. “Have you tried or paid for a tool to help? What happened?”
10. “When did something like this happen before that? Is it a regular problem or an unusual event?”

Use neutral follow-ups: “Can you give an example?”, “What did you do then?”, “Who else was involved?” Do not suggest the desired answer or ask, “Wouldn’t AI make that easier?”

**0:18–0:25 · Observe a task in the prototype**

Use synthetic people and commitments. Say: “Maya has become unavailable this afternoon. Please work out what needs coverage and arrange replacements.”

Observe whether the participant discovers both affected tasks, understands why Jo and Dev fit different roles, distinguishes pending offers from acceptance, and recognizes why the ride waits for the bag. Do not explain the interface unless the participant is stuck; record each intervention.

Ask: “What do you believe will happen now?” after the plan is proposed and again after one helper accepts. This tests the mental model without suggesting the correct interpretation.

**0:25–0:30 · Adoption and price**

Ask: “Who in your household would need to use this for it to work? What might stop them?” Then: “If this were available for a 30-day pilot, what would you need before inviting them?”

Only after discussing actual experience and alternatives, introduce a possible $12-per-household monthly subscription. Ask: “How would you decide whether to keep it at that price?” Record objections and comparisons. Do not treat “sounds reasonable” as a purchase commitment.

### Notes template: one copy per interview

- Interview ID / date:
- Participant role / household ID alias:
- Consent to notes / recording / quotations, separately:
- Current tools and what works:
- Most recent disruption, in the participant's own sequence:
- Frequency of similar disruptions; basis for estimate:
- Who knew what / who agreed to what:
- Time spent; measured, recalled, or unknown:
- Constraints or dependent tasks involved:
- Prototype task outcome / assistance required:
- Participant's interpretation of “offered,” “accepted,” and “ready”:
- Adoption barrier:
- Price response and existing spend:
- Exact quotation, only if permitted:
- Researcher interpretation, kept separate from quotation:
- Contradictory evidence / reason this may not fit:
- Follow-up permission:
- Note deletion date:

### Synthesis after ten interviews

Summarize the observed workflow, not a list of requested features. Maintain separate columns for **what someone said**, **what we observed**, and **what we infer**. Preserve disconfirming evidence.

Prioritize changes that address repeated breakdowns in a recent real event. A single compelling anecdote can guide a question; it cannot establish market size or an outcome claim.

## Five-household pilot

### Enrollment and scope

Invite five consenting households that have recurring practical support and at least three adult participants. Let the supported adult decide their desired involvement where appropriate. Explain who can see household records and how to leave. Use rides, bag preparation, meals, errands, and visits. Do not enroll medication, emergency-response, or clinical workflows.

The research team should never invent real commitments for a household. Practice the interface with synthetic tasks before enabling ordinary household use.

### Schedule

- **Week 0:** Setup, brief training, and a seven-day baseline diary of current coordination. Preserve the tools participants already rely on.
- **Weeks 1–4:** KindHandoff pilot. Gather lightweight event metrics and a weekly ten-minute check-in.
- **End of week 4:** Individual coordinator/helper interviews; explicit choice about a paid continuation. No automatic charge.

### Primary outcome

**Time to accepted feasible replacement:** The elapsed time from a recorded cancellation to acceptance of all replacement commitments needed for the affected plan. Report median time and the number of qualifying episodes. Track separately the time from acceptance to actual completion of prerequisites.

Do not label a plan “recovered” simply because an offer was sent. Record unresolved episodes and compare similar episodes, acknowledging differences in urgency, helper availability, and task complexity.

### Secondary measures

| Measure | Definition | Why it matters |
| --- | --- | --- |
| Coordinator follow-up effort | Self-reported messages/calls and minutes spent on each recovery episode | Tests whether the product removes chasing rather than relocating it. |
| Helper participation | Distinct helpers who personally accept or decline in a week | A coordinator-only product cannot verify shared commitments. |
| Correct mental model | Participant can explain an offered task versus an accepted task and a blocked task | Misunderstood status can create false confidence. |
| Completion integrity | Prerequisite completion is recorded before a dependent task becomes ready | Tests the dependency promise. |
| Repeated use | Households using the workflow for multiple genuine changes | Distinguishes novelty from habit. |
| Paid continuation | Households explicitly choosing the offered price after the pilot | Stronger evidence than hypothetical willingness to pay. |
| Burden introduced | Setup, sign-in, invitation, and support friction | Detects hidden work caused by the product. |

Collect only the metadata needed to evaluate these measures. Use household aliases in analysis. Do not publish private household data or identifiable quotations without separate permission.

### Proposed decision thresholds

These are targets chosen in advance, not results or validated benchmarks:

- Four of five households complete onboarding with at least three participants.
- Four of five use the workflow for at least two genuine disruptions during the pilot; if disruptions are too rare, reconsider the initial customer.
- At least two non-coordinator helpers participate in each active household during a typical week.
- Among households with comparable baseline episodes, median time to accepted replacement improves by at least 25%, with raw episode counts and limitations reported.
- At least two households elect to continue at $12/month after the pilot.
- No confirmed unauthorized acceptance, cross-household data disclosure, or misleading “covered” state. Investigate and correct any such defect before continuing affected use.

Do not average away a serious state or authorization defect. Small-sample results support the next experiment, not a sweeping effectiveness claim.

### Pilot results: intentionally unfilled

| Field | Result |
| --- | --- |
| Households enrolled | Not yet measured |
| Interviews completed | Not yet measured |
| Qualifying recovery episodes | Not yet measured |
| Median baseline / pilot recovery time | Not yet measured |
| Weekly helper participation | Not yet measured |
| Paid continuations | Not yet measured |
| Observed product failures | Not yet measured |
| Changes made from evidence | Not yet measured |

### Publication rule

A truthful submission may say: “We designed a ten-interview discovery study and a five-household pilot.” It may only say the study ran, people paid, or coordination improved after those things actually happen and supporting records exist.
