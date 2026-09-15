# KindHandoff

## A practical support plan that survives a change of plans

**Business and market brief · 15 September 2026**  
**Status:** Pre-pilot product hypothesis. No customer interviews, revenue, retention, or measured savings are claimed in this document.

### The problem we are choosing

A family can have plenty of goodwill and still have an uncovered afternoon. One person cancels a visit. A second can get into the house but cannot drive. A third can drive, but arrives too late to prepare what is needed. A group chat contains those facts; the coordinator must still assemble a workable plan and discover whether anyone actually agreed to it.

KindHandoff focuses on that moment. It helps a household recover practical commitments—packing a bag, providing a ride, preparing a meal, or visiting—when availability changes. Its central distinction is simple: **an offer is not coverage.**

The first customer is a working adult coordinating regular support for a parent with at least two other helpers. This customer has recurring coordination work, a clear reason to invite others, and a measurable outcome: a workable replacement that the responsible people accept.

### What the demonstration proves

The illustrative family uses three helpers:

| Person | Known constraint | Consequence |
| --- | --- | --- |
| Maya | Becomes unavailable all afternoon | Both her 14:30–14:45 library-bag task and 15:00–16:00 ride need replacement. |
| Jo | Can access the house from 14:00 to 15:00; cannot drive | Can pack the bag; cannot take the ride. |
| Dev | Can drive; available only from 14:45 onward | Can take the 15:00 ride; cannot cover the earlier bag task. |

The deterministic planner proposes **Jo for the bag and Dev for the ride**. The proposed helpers must accept their own offers. Even after acceptance, the ride waits for the bag task to be completed. A handoff brief identifies the current plan version, and acknowledgment records which version was read.

This is a demonstration of the implemented workflow with synthetic people. It is not evidence of clinical outcomes or actual family adoption.

### Market evidence, with its limits

AARP and the National Alliance for Caregiving reported **63 million American family caregivers in 2025**, nearly one in four adults. This supports the relevance of the problem. It does not identify the number of multi-helper households, those who own an Alexa-compatible device, or those willing to pay for this product. Do not multiply 63 million by a subscription price and call the result a serviceable market. [AARP, Caregiving in the U.S. 2025 announcement](https://www.aarp.org/press/releases/2025-07-24-new-report-reveals-crisis-point-for-americas-63-million-family-caregivers.html)

The category already includes paid family software, free community tools, and employer-funded services. Those products establish alternatives and potential channels. They do not validate KindHandoff's proposed price or differentiation.

### Competitive landscape

| Alternative | What its official materials already describe | Our intended focus |
| --- | --- | --- |
| **Family CareRelay** | Voice/text notes become AI-drafted entries for confirmation; shared timeline, family roles, task owners, and handoff summaries. | Recovering a disrupted plan through explicit availability and capability constraints, helper-specific acceptance, and task dependencies. Voice logging and handoff summaries alone are not novel. [Product](https://www.familycarerelay.com/) |
| **Caring Village** | Calendars, tasks, messaging, documents, care plans, and an AI caregiver assistant. Its listed Circle plan is $14.99/month; Village is $24.99/month. | A narrower practical-support workflow whose value must justify another product or replace coordination effort. [Features](https://caringvillage.com/app/), [pricing](https://caringvillage.com/pricing/) |
| **ianacare** | Organizing a support team, requesting help, assigning tasks, and care calendars; additional navigation through employer benefits. | A focused self-serve product, with sponsored household access as a later channel. We are not offering a human care-navigation service. [Approach](https://ianacare.com/our-approach/), [employers](https://ianacare.com/employers/) |
| **Lotsa Helping Hands / My Cancer Circle** | A free support calendar, volunteer coordination, updates, and reminders. | Reduce the work of resolving a change, beyond making requests visible. A free alternative is a serious competitor. [How it works](https://lotsahelpinghands.com/how-it-works) |
| **Birdie** | Agency care records, rosters, and family visibility; its family app is read-only. Agency pricing starts at £200/month excluding VAT. | A family-owned practical-support layer. Replacing an agency's clinical and administrative system is outside the initial scope. [Family app](https://www.birdie.care/product-features/family-app), [pricing](https://www.birdie.care/pricing) |
| **Group chat + calendar** | A familiar workflow with no new software adoption requirement. | Make responsibility, outstanding offers, dependencies, and changes explicit. The pilot should compare against this real baseline. |

These comparisons describe published product materials reviewed on 15 September 2026. They are not hands-on competitive tests. We should say what KindHandoff does, rather than claim that no competitor can provide similar behavior.

### Why Alexa+ is a useful interface

The change often occurs while someone is already doing something else: “I am unavailable this afternoon.” A spoken request can initiate a structured recovery plan; the visual interface makes offers, acceptance, and dependencies easy to inspect.

Amazon's Alexa+ MCP documentation specifies version **2025-11-25** and **Streamable HTTP**. The documented toolkit is available in the United States. KindHandoff implements a standards-based MCP server and an explicitly labelled local language simulator. A working simulator and MCP endpoint do not establish that the service is deployed or certified on live Alexa+. [Amazon MCP overview](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-overview.html), [quickstart](https://www.developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-quickstart.html)

Amazon's former Alexa Together service is no longer available. KindHandoff should not be presented as an emergency-assistance or fall-detection replacement. [Amazon service update](https://www.aboutamazon.com/news/devices/alexa-together-is-helping-bridge-the-miles-between-families)

### Business model to test

**Initial hypothesis:** $12 per household per month, with all invited helpers included. Test willingness to pay within a $9–15 range after users have experienced the workflow. Charging per helper would create an incentive to leave people out of a coordination product.

**Trial:** A 30-day full-feature household pilot. Essential acceptance and dependency checks must remain consistent throughout the trial. Trial expiration must not silently erase or misrepresent commitments.

**Later channel:** Community support organizations or care-navigation providers could sponsor household access. This requires separate discovery: buyer budget, procurement, support requirements, and whether integration would add work. Employer benefits are a possible later channel, not a forecast of near-term sales.

**Acquisition hypothesis:** Start with small caregiver communities and trusted local organizations, using a short demonstration of a cancelled ride and its recovery. Prepare outreach materials; obtain authorization before contacting real people. Avoid paid advertising until activation and repeat use are demonstrated.

**Value metric:** Time from a cancellation to an accepted, feasible replacement, together with the coordinator's follow-up effort. “Tasks created” is not evidence of reduced work.

### An explicit infrastructure-cost scenario

This is arithmetic using published rates and stated assumptions—not measured KindHandoff performance, an invoice, or a complete cost of operating the business. It models the application API and D1 storage on a dedicated Workers Paid account. Actual managed hosting, authentication, support, and optional model charges must be checked separately.

Cloudflare lists Workers Paid at **$5/account/month**, including 10 million monthly requests and 30 million CPU milliseconds; additional CPU is $0.02 per million milliseconds. The Free plan has a 100,000 daily request allowance and a 10 ms CPU limit per invocation. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)

D1 Paid includes 25 billion monthly rows read, 50 million rows written, and 5 GB storage. Additional storage is $0.75/GB-month. D1 meters rows, not merely query count; indexes and query shape affect usage. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

#### Assumptions

- 30 days per month.
- 40 dynamic API requests per household per day, including ordinary reads and mutations.
- 10 ms mean CPU per dynamic request, strictly a placeholder until profiling.
- 50 D1 rows read per dynamic request.
- Six committed changes per household per day, with five billable row writes per change, including an assumed allowance for supporting records and indexes.
- 2 MB aggregate stored data per household, including current records, indexes, and a bounded event history. No audio/video uploads.
- No paid model calls, SMS, transactional email, or other metered services in the scenario.

| Monthly scenario | 20 households | 1,000 households | 5,000 households |
| --- | ---: | ---: | ---: |
| Dynamic requests | 24,000 | 1,200,000 | 6,000,000 |
| CPU milliseconds | 240,000 | 12,000,000 | 60,000,000 |
| D1 rows read | 1,200,000 | 60,000,000 | 300,000,000 |
| D1 rows written | 18,000 | 900,000 | 4,500,000 |
| Aggregate stored data | 0.04 GB | 2 GB | 10 GB |
| Workers base charge | $5.00 | $5.00 | $5.00 |
| Request overage | $0.00 | $0.00 | $0.00 |
| CPU overage | $0.00 | $0.00 | $0.60 |
| D1 usage overage | $0.00 | $0.00 | $0.00 |
| D1 storage overage | $0.00 | $0.00 | $3.75 |
| **Modelled API + database total** | **$5.00** | **$5.00** | **$9.35** |

Example calculations: 5,000 × 40 × 30 = 6 million requests; (60 − 30) million excess CPU milliseconds × $0.02 = $0.60; (10 − 5) excess GB × $0.75 = $3.75.

A small pilot could fit published free quotas, but this is conditional on actual per-request CPU, daily peaks, database limits, and other account usage. The table intentionally budgets a paid baseline. The 5,000-household projection is not a load-test result or proof that one database can support the workload; capacity, storage layout, and query contention require separate validation.

The estimate excludes development, managed Site-hosting fees if any, external identity-provider costs, observability beyond included usage, backups beyond platform defaults, domain registration, email/SMS, payments, tax, customer acquisition, and human support. It is not a gross-margin calculation. A ten-minute support conversation may cost more than months of a household's runtime.

**AI and AWS accounting:** The current language simulator is deterministic. There is no claim of live Alexa inference, a cloud LLM integration, Bedrock, AgentCore, or any other AWS runtime use. If model interpretation is added, calculate input/output token cost from recorded usage and the selected provider's then-current rates before updating this scenario.

### What could become defensible

The interface and prompts are easy to copy. More credible advantages would be reliable plan recovery under concurrency; integrations with workflows that families already use; trusted handling of household data; and recurring household preferences that improve relevance without weakening consent. The open-source handoff guard can build developer trust, but is not a proprietary moat.

The commercial risk is adoption. If only the coordinator uses KindHandoff, another inbox has been created. If helpers accept inside the product and coordinators stop chasing confirmations, the product has begun to demonstrate value.

### Go / change / stop criteria

- **Go:** Helpers use the product repeatedly, changes reach accepted replacements faster, and some pilot households choose to pay.
- **Change:** Coordinators like the planning but helpers do not adopt. Investigate fewer steps, better invitation context, or integration with existing communication habits.
- **Stop or narrow:** Most households rarely encounter coordination changes, do not trust the state, or find the product adds more work than their existing tools.

See `customer-discovery.md` for the actual interview and pilot protocol. No results have been filled in.
