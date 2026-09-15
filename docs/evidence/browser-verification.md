# Public browser verification

**Date:** 15 September 2026

**Site:** https://kindhandoff.web.app

**Data:** isolated fictional demo plus a disposable Firebase test account; no real household data.

## Observed working flows

1. Signed-out public entry creates an isolated demo without signup.
2. Mobile 390×844 and desktop 1365×950: document width matched viewport width. No horizontal overflow observed. Final desktop, mobile and full recovery screenshots are in `../screenshots/`.
3. The supported afternoon request first shows Maya, the exact interval and both affected commitments. Confirmation reopens both; the real MCP planner proposes Jo for the bag and Dev for the ride. Creating offers leaves both awaiting acceptance.
4. Your circle shows dated availability and the correct capabilities. The actual Invite control creates a one-use link. Its join page identifies Jo and removes the token fragment from the visible URL after load.
5. Redeeming the invitation opens Jo's actual helper session with no role switch and her pending offer first. Jo can accept and complete her bag task. The ride then shows its earlier handoff complete, while Dev's separate offer still requires acceptance.
6. The page's `kindhandoff_read_day` and `kindhandoff_preview_recovery` WebMCP tools execute real server calls. An unexpected argument to the read tool is rejected. A preview creates no offers.
7. Firebase email/password sign-in opens a blank private-circle setup. Creating a circle and saving a new fictional commitment succeeded; reloading preserved that commitment.
8. Browser sign-out returned to an isolated demo. Signing in again restored the same private circle and saved commitment without another creation dialog.

## Findings addressed

- Helpers now refresh when focus/visibility returns and have a visible refresh control.
- Availability includes dates; invitation expiry uses the actual server timestamp, including shorter demo lifetime.
- A preview with no unassigned commitments no longer reports that no feasible replacement exists.
- HTML entry points revalidate deployments; versioned assets have immutable caching and API responses remain `no-store`. The verification browser's earlier cached page required a hard reload once after this policy changed.
- Two early browser login attempts reported network/session-opening errors. A traced retry succeeded with HTTP200 responses. No cause was established. The final client avoids an unnecessary forced token refresh after fresh sign-in, and server verification still requires recent authentication.

## Limits

This was a functional and visual browser walkthrough, not a human usability study, screen-reader audit, network reliability benchmark, or physical Alexa test. Microphone recognition with human audio and real password-reset email delivery were not exercised. Separate automated production checks cover four independent cookie sessions, token rotation/revocation, exact actor authorization, dependency rejection and authentication cleanup.
