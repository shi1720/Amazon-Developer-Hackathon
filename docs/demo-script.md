# KindHandoff demo film

## One cancellation. Two commitments. A workable afternoon.

**Target runtime:** 2 minutes 55 seconds, including a short closing card.  
**Format:** English narration by Shivam Gupta over a recording of the working product.  
**Data:** Fictional household and helper identities, visibly labelled.  
**Submission requirement:** Publish the final film publicly on YouTube or Vimeo; keep the entire video below three minutes.

**Recording target:** The confirmed public Firebase release at [kindhandoff.web.app](https://kindhandoff.web.app). Production MCP, multi-user, and authentication checks have passed. Record the real hosted interactions below and rehearse the browser sequence once before capturing the final take.

## Verbatim narration

I'm Shivam Gupta. Maya just cancelled this afternoon. For this family, one change breaks two commitments. KindHandoff turns that disruption into a plan people actually accept.

This fictional household has two linked tasks. Maya was going to pack a library bag at two thirty, then give a ride at three. Her cancellation affects both. The ride depends on the bag being packed.

Here is why the suggested plan matters. Jo can enter the house between two and three, but cannot drive. Dev can drive, but is only available from two forty-five. The planner checks those constraints and proposes Jo for the bag, Dev for the ride.

I review the proposal before creating offers. They remain pending until each named helper accepts. Jo accepts her bag task in her own helper view. Dev accepts his ride separately. Every acceptance belongs to the person taking responsibility.

Watch the ride. Even after Dev accepts, it is still waiting for the bag. Jo records the bag as packed, and the ride becomes ready. That small dependency is the difference between having two names on a calendar and having a workable afternoon.

The updated handoff brief shows what changed and what remains. Dev acknowledges this specific version. If the plan changes again, the record still tells us which version he read. People can see what was agreed, by whom, and when.

Behind this is a real MCP server using the November twenty-fifth, twenty twenty-five specification and Streamable HTTP. The web language simulator is explicitly deterministic. Firebase provides email-and-password sign-in, persistent household records, and the public web app. Helper invitations keep responsibilities separate. This is a simulated experience, with no live Alexa connection claimed.

KindHandoff starts with practical support: bags, rides, meals, and visits. The business hypothesis is a household subscription, with every helper included. The promise is simple: make the next step clear, and make responsibility something people actually accept.

## Timed shot list

| Time | Picture / action | Narration paragraph | Evidence the viewer should see |
| --- | --- | --- | --- |
| 0:00–0:14 | Start on the live fictional afternoon. At 0:02, enter “Maya is unavailable this afternoon.” Submit by 0:05, review and confirm the change; show the two affected commitments before 0:10. Keep the small “Fictional demonstration household” label visible. | 1 | The product performs the cancellation in the first ten seconds. No opening animation or title-only preamble. |
| 0:14–0:35 | Hold on the two affected tasks and the preview. Trace the bag-to-ride dependency without repeating the cancellation. | 2 | Bag: 14:30–14:45. Ride: 15:00–16:00. Both are impacted. |
| 0:35–0:58 | Show the planner's explanation and helper constraints, including their displayed dates. | 3 | Jo: home access 14:00–15:00, cannot drive. Dev: driving, available from 14:45. Proposed assignment matches both. |
| 0:58–1:22 | Review and create offers. Briefly show the real invitation flow, then Jo and Dev in isolated helper sessions accepting only their own offers. | 4 | Pending does not display as accepted. Named helper identity is visible; invitation tokens are not. |
| 1:22–1:44 | Show Dev's accepted ride waiting. Switch to Jo, complete the bag task, then return to the ride. Use the actual focus/visibility refresh or Refresh control to reveal the latest state. | 5 | The ride changes from waiting on a prerequisite to ready only after bag completion. Do not mark the ride completed unless demonstrating that later action. |
| 1:44–2:06 | Open the updated brief and acknowledge it in Dev's helper view. | 6 | Brief version and the acknowledgment record are readable. |
| 2:06–2:35 | Open the real MCP inspection/evidence view. Show protocol version, tool invocation, response, and persistent state. A separate inset can show Firebase email/password sign-in, labelled “Account sign-in — separate session.” | 7 | Real MCP request/response; SDK details may appear visually. Firestore-backed state, honest simulator label, and the verified Firebase domain. |
| 2:35–2:55 | Return to the ready afternoon plan. End on “KindHandoff · Clear plans. Accepted responsibility.” and the verified demo/repository URL. | 8 | A coherent result and a restrained commercial hypothesis. |

The narration is 315 words (counted as whitespace-separated words). Read at a natural pace near 125–130 words per minute and allow short pauses for the state changes. Rehearse once with the actual recording; trim pauses before cutting evidence. The final export must remain under 3:00.

## Recording procedure

1. In a fresh browser profile or isolated context, open the verified Firebase application while signed out. Let the app create its fictional demo circle automatically. Confirm the displayed dates, time zone, task windows, helper capabilities, and prerequisite match the shot list.
2. Keep this fictional demo circle as the coordinator's recording session. Create actual one-time invitations for Jo and Dev and open them in two separate isolated browser profiles or contexts. Ordinary windows and same-profile private windows may share cookies; use genuinely isolated sessions. Account sign-in opens a separate blank personal circle, so show it only in a separate inset if desired. Make identities clear without exposing invitation tokens or session cookies.
3. Run the complete flow once without recording. Confirm both cancellations, correct proposals, separate acceptance, dependency readiness, and a versioned acknowledgment. After rehearsal, prepare a fresh fictional demo circle and fresh helper invitations for the recorded take.
4. Record the application at a readable resolution, preferably 1920×1080. Keep the cursor deliberate and zoom text enough to read in the final video.
5. Record the narration verbatim in a quiet room. A laptop or phone microphone is sufficient if speech is clear.
6. Cut between actual states and interactions. Do not animate a success state that the product did not produce. If an action is sped up, preserve its order and outcome.
7. Add English captions. Use only original assets or assets licensed for the video; no music is needed.
8. Watch the final export from beginning to end. Confirm no real household data, tokens, email addresses, private keys, or unrelated browser tabs appear.
9. Publish the final export publicly, then open the public URL in a signed-out browser to confirm it plays without requesting access.

## Final release check

- [ ] The public film is under three minutes, in English, and opens with the working product.
- [ ] The cancellation is submitted by five seconds and its affected tasks appear before ten seconds.
- [ ] The demo labels the household as fictional and the language simulator as deterministic.
- [ ] Both cancelled commitments appear, with the correct time windows.
- [ ] Jo and Dev's constraints explain the proposed split.
- [ ] Each helper accepts their own offer; offers are never shown as completed coverage.
- [ ] The ride waits for the bag and becomes ready after bag completion.
- [ ] The brief acknowledgment visibly refers to a version.
- [ ] The MCP sequence is a real recorded invocation.
- [ ] The film does not claim live Alexa, cloud AI, AWS usage, customers, or measured savings.
- [ ] The final name and verified URLs are consistent across product, repository, video, and submission.
