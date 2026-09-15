# KindHandoff demo film

## One cancellation. Two commitments. A workable afternoon.

**Target runtime:** 2 minutes 55 seconds, including a short closing card.  
**Format:** English narration by Shivam Gupta over a recording of the working product.  
**Data:** Fictional household and helper identities, visibly labelled.  
**Submission requirement:** Publish the final film publicly on YouTube or Vimeo; keep the entire video below three minutes.

## Verbatim narration

I'm Shivam Gupta, and this is KindHandoff. When several people help someone they love, a change of plans creates a new job: finding out who can take over, and whether they actually agreed. KindHandoff makes that work visible.

Meet our fictional household. Maya was going to pack a library bag at two thirty, then provide a ride at three. I tell the simulator: “Maya is unavailable this afternoon.” Both commitments now need replacements. The ride also depends on the bag being packed.

Here is why the suggested plan matters. Jo can enter the house between two and three, but cannot drive. Dev can drive, but is only available from two forty-five. The planner checks those constraints and proposes Jo for the bag, Dev for the ride.

I review the proposal before creating offers. They remain pending until each named helper accepts. Jo accepts her bag task in her own helper view. Dev accepts his ride separately. Every acceptance belongs to the person taking responsibility.

Watch the ride. Even after Dev accepts, it is still waiting for the bag. Jo records the bag as packed, and the ride becomes ready. That small dependency is the difference between having two names on a calendar and having a workable afternoon.

The updated handoff brief shows what changed and what remains. Dev acknowledges this specific version. If the plan changes again, the record still tells us which version he read. People can see what was agreed, by whom, and when.

Behind this is a real MCP server using the November twenty-fifth, twenty twenty-five specification and Streamable HTTP. The web language simulator is explicitly deterministic. This demonstration uses persistent household data, real sign-in, and separate helper invitations; it does not claim a live Alexa connection.

KindHandoff starts with practical support: bags, rides, meals, and visits. We plan to test a household subscription, with every helper included. The promise is simple: make the next step clear, and make responsibility something people actually accept.

## Timed shot list

| Time | Picture / action | Narration paragraph | Evidence the viewer should see |
| --- | --- | --- | --- |
| 0:00–0:19 | Open directly on the afternoon plan, with a small kindhandoff wordmark and “Fictional demonstration household” label. Avoid a long logo animation. | 1 | Maya owns both commitments; the bag-to-ride dependency is visible. |
| 0:19–0:43 | Enter the exact supported request, “Maya is unavailable this afternoon.” Show both affected commitments and the preview. | 2 | Bag: 14:30–14:45. Ride: 15:00–16:00. Both are impacted. |
| 0:43–1:06 | Show the planner's explanation and helper constraints. | 3 | Jo: home access 14:00–15:00, cannot drive. Dev: driving, available from 14:45. Proposed assignment matches both. |
| 1:06–1:29 | Review and create offers. Briefly show the invitation flow, then Jo and Dev in separate helper sessions accepting only their own offers. | 4 | Pending does not display as accepted. Named helper identity is visible; invitation tokens are not. |
| 1:29–1:51 | Show Dev's accepted ride waiting. Switch to Jo, complete the bag task, then return to the ride. | 5 | The ride changes from waiting on a prerequisite to ready only after bag completion. Do not mark the ride completed unless demonstrating that later action. |
| 1:51–2:12 | Open the updated brief and acknowledge it in Dev's helper view. | 6 | Brief version and the acknowledgment record are readable. |
| 2:12–2:37 | Open the real MCP inspection/evidence view. Show protocol version, tool invocation, response, and persistent state. Include a compact sign-in/invitation inset if needed. | 7 | Real MCP request/response; SDK details may appear visually. Persistent database state and honest simulator label. |
| 2:37–2:55 | Return to the calm, ready afternoon plan. End on “KindHandoff · Clear plans. Accepted responsibility.” and the verified demo/repository URL. | 8 | A coherent result and a restrained commercial hypothesis. |

The narration is 325 words (counted as whitespace-separated words). Read at a natural pace near 125–130 words per minute and allow short pauses for the state changes. Rehearse once with the actual recording; trim pauses before cutting evidence. The final export must remain under 3:00.

## Recording procedure

1. Reset only the synthetic demonstration household. Confirm the dates, time zone, task windows, helper capabilities, and prerequisite match the shot list.
2. Prepare owner, Jo, and Dev sessions before recording. Use the real invitation mechanism; make identities clear without exposing secrets.
3. Run the complete flow once without recording. Confirm both cancellations, correct proposals, separate acceptance, dependency readiness, and a versioned acknowledgment.
4. Record the application at a readable resolution, preferably 1920×1080. Keep the cursor deliberate and zoom text enough to read in the final video.
5. Record the narration verbatim in a quiet room. A laptop or phone microphone is sufficient if speech is clear.
6. Cut between actual states and interactions. Do not animate a success state that the product did not produce. If an action is sped up, preserve its order and outcome.
7. Add English captions. Use only original assets or assets licensed for the video; no music is needed.
8. Watch the final export from beginning to end. Confirm no real household data, tokens, email addresses, private keys, or unrelated browser tabs appear.
9. Publish the final export publicly, then open the public URL in a signed-out browser to confirm it plays without requesting access.

## Final release check

- [ ] The public film is under three minutes, in English, and opens with the working product.
- [ ] The demo labels the household as fictional and the language simulator as deterministic.
- [ ] Both cancelled commitments appear, with the correct time windows.
- [ ] Jo and Dev's constraints explain the proposed split.
- [ ] Each helper accepts their own offer; offers are never shown as completed coverage.
- [ ] The ride waits for the bag and becomes ready after bag completion.
- [ ] The brief acknowledgment visibly refers to a version.
- [ ] The MCP sequence is a real recorded invocation.
- [ ] The film does not claim live Alexa, cloud AI, AWS usage, customers, or measured savings.
- [ ] The final name and verified URLs are consistent across product, repository, video, and submission.
