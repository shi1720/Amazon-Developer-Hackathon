# Public browser verification

**Build session:** 15 to 16 September 2026 (IST)

**Final public browser verification:** 2026-09-15T18:30:28Z

**Site:** https://kindhandoff.web.app

**Data:** isolated fictional demo plus a disposable Firebase test account; no real household data.

## Observed working flows

1. Signed-out public entry creates an isolated demo without signup.
2. Mobile 360×800 and 390×844, and desktop 1365×950: document width matched viewport width. No horizontal overflow observed. Final desktop, mobile and full recovery screenshots are in `../screenshots/`.
3. The supported afternoon request first shows Maya, the exact interval and both affected commitments. Confirmation reopens both; the real MCP planner proposes Jo for the bag and Dev for the ride. Creating offers leaves both awaiting acceptance.
4. Your circle shows dated availability and the correct capabilities. The actual Invite control creates a one-use link. Its join page identifies Jo and removes the token fragment from the visible URL after load.
5. Redeeming the invitation opens Jo's actual helper session with no role switch and her pending offer first. Jo can accept and complete her bag task. The ride then shows its earlier handoff complete, while Dev's separate offer still requires acceptance.
6. The page's `kindhandoff_read_day` and `kindhandoff_preview_recovery` WebMCP tools execute real server calls. An unexpected argument to the read tool is rejected. A preview creates no offers.
7. Firebase email/password sign-in opens a blank private-circle setup. Creating a circle and saving a new fictional commitment succeeded; reloading preserved that commitment.
8. Browser sign-out returned to an isolated demo. Signing in again restored the same private circle and saved commitment without another creation dialog.

## Findings addressed

- A 320 px check found 9 px of header overflow. A compact header rule reduced the brand size and hid the decorative account arrow; the signed-in 320 px view then matched the viewport.
- Helpers now refresh when focus/visibility returns and have a visible refresh control.
- Availability includes dates; invitation expiry uses the actual server timestamp, including shorter demo lifetime.
- A preview with no unassigned commitments no longer reports that no feasible replacement exists.
- HTML entry points revalidate deployments; versioned assets have immutable caching and API responses remain `no-store`. The verification browser's earlier cached page required a hard reload once after this policy changed.
- Two early browser login attempts reported network/session-opening errors. A traced retry succeeded with HTTP200 responses. No cause was established. The final client avoids an unnecessary forced token refresh after fresh sign-in, and server verification still requires recent authentication. A subsequent browser test on the final bundle succeeded on its first attempt with no failed network requests and no extra token-refresh request.

## Latest firsthand browser follow-up

The implementation lead performed the following checks on the public app. These are observed browser interactions, separate from the automated API reports. The latest captures below contain only the fictional household; they show no invitation URLs, tokens, credentials, or real account details.

### Dates, task editing, and availability

- At **320 px**, adding a commitment for the next day defaulted to **09:00 to 10:00**. Editing its title succeeded. Cancelling it required an explicit review, removed it from the active list, and retained the archived record in the backend.
- Reporting Maya unavailable for the specific bag interval, **14:30 to 14:45**, split her availability into **09:00 to 14:30** and **14:45 to 20:00**. Saving the unchanged availability form preserved both intervals. **Why this plan?** excluded Maya from that affected task.
- Next-day navigation and selected-date disruption checks used the actual task windows, rather than applying the wrong day's interval.

### Real coordinator and helper sessions

1. Maya used the in-app browser to create the two handoff offers.
2. Jo redeemed her own private invitation in Chrome and accepted the bag. This was a separate helper session, not the fictional demo role switch.
3. Maya revoked Jo's access. Refreshing Chrome cleared Jo's private household UI and showed **Let's reconnect**. A new invitation restored Jo's access and her already accepted task.
4. After Maya signed out of the in-app browser, Dev joined there using his own private invitation and accepted the ride. Chrome remained Jo's separate helper session. Dev's **Mark complete** control stayed disabled while the bag was unfinished.
5. Jo completed the bag in Chrome. Refreshing Dev's view showed **Earlier handoff complete** and enabled **Mark complete** for the ride. This demonstrated readiness; it did not assert that the real-world ride had occurred.
6. Dev acknowledged content **revision 11**. Jo then added a note, producing **revision 12**. Dev's view showed **New updates to read** and retained the earlier receipt for revision 11.

### Real Firebase account flow

A separate disposable Firebase fixture signed in through the actual browser. It created a blank private circle, added **Bring library books**, and retained the task after reload. Signing out and signing in again restored **My circle** and the same task.

**Cleanup status:** the latest disposable browser fixture was removed and verified absent. The [cleanup record](ui-fixture-cleanup.json) confirms deletion of its Firebase user, personal circle, owner mapping, and associated access records, plus removal of the local credential fixture. This is separate from cleanup in the automated authentication proof. No fixture credentials or account identifiers appear here.

### Responsive views and selected screenshots

The implementation lead reported that document widths matched the viewport at **desktop 1365 px**, **phone 390 x 844**, and **tablet 768 x 1024**, with no horizontal overflow in those checks. The selected phone and tablet images were inspected before copying unchanged into the public screenshot directory.

- [Phone, 390 x 844](../screenshots/mobile-390.jpg): fictional Dev helper view, displayed date, summary, and day list.
- [Tablet, 768 x 1024](../screenshots/tablet-768.jpg): fictional Dev view with the completed bag and accepted ride visible.

These are direct copies of `work/video/captures/qa-mobile-390/00000.png` and `work/video/captures/qa-tablet-768/00000.png`. The source capture directory is a local, ignored video-production workspace. The public copies use .jpg to match their original JPEG encoding and contain no browser address bar or secret invitation data.

### Final review findings resolved on the public deployment

The stale-form and overnight day-view fixes passed the final clean pipeline, including **54 unit tests**, and were deployed. The implementation lead then verified both fixes through the public browser:

- **Stale form:** two in-app-browser tabs used the same private account. Tab A opened an edit form with older details. Tab B saved changed details. Refreshing A through its own `kindhandoff_read_day` WebMCP tool showed an inline stale-form warning and disabled **Save**. Closing and reopening the form showed B's newly saved details. The source capture is `work/video/captures/qa-stale-form/00000.png`.
- **Overnight task:** a commitment ran from **September 15 at 23:30** to **September 16 at 00:30**. Navigating to September 16 still showed it with **From previous day**. The source capture is `work/video/captures/qa-overnight/00000.png`.

These targeted browser checks close the two recorded findings. The original production API suites remain scoped to the unchanged backend; no fresh production timing result is inferred from the final frontend release. The latest disposable browser fixture cleanup is complete and verified in the linked cleanup record.

## Limits

This was a functional and visual browser walkthrough, not a human usability study, screen-reader audit, network reliability benchmark, or physical Alexa test. Microphone recognition with human audio and real password-reset email delivery were not exercised. Separate automated production checks cover four independent cookie sessions, token rotation/revocation, exact actor authorization, dependency rejection and authentication cleanup.
