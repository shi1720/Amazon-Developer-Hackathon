# KindHandoff

## A practical support plan that survives a change of plans

**Business and market brief · 15 September 2026**  
**Status:** Pre-pilot product hypothesis. No customer interviews, revenue, retention, or measured savings are claimed in this document.

**Public release:** Firebase project `kindhandoff`, at [kindhandoff.web.app](https://kindhandoff.web.app). The implementation team verified signed-out desktop/mobile entry, cancellation-to-offers, and production MCP, multi-user, and Firebase Authentication checks. This establishes the recorded technical workflows, not customer adoption or production-scale capacity.

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

This is arithmetic using official published rates reviewed on 15 September 2026 and explicit assumptions. It is **not measured usage, a capacity test, an invoice, or a total operating-cost forecast**. The model includes the frequent refreshes that can make a coordination application more expensive than its number of user actions suggests.

#### Final stack and cost controls

The implemented runtime is **Firebase Hosting + Cloud Functions v2 (Node 22) + Firestore Standard + Firebase Authentication email/password**, with a React 19.3/Vite 8.3 frontend and secure `__session` cookie. The function configuration is `us-central1`, 256 MiB memory, 1 CPU, concurrency 40, zero minimum instances, two maximum instances, and a 30-second timeout. Firestore is the `(default)` Standard database in `us-central1`, with the free tier enabled. The runtime service account uses `datastore.user` and `firebaseauth.viewer`; identity and household membership remain separate application checks. Seven-day artifact cleanup is configured.

The existing Google Cloud billing account is linked because the server runtime requires the Blaze plan. Free allowances reduce eligible charges; linking billing does not make all future usage free. Zero minimum instances avoids paying to keep a baseline instance warm. Maximum instances is a scaling setting, not a total spending cap. The runtime has not been established to support the larger scenario below. [Firebase serverless hosting](https://firebase.google.com/docs/hosting/serverless-overview), [function resource and scaling controls](https://firebase.google.com/docs/functions/manage-functions)

#### Rates used — USD, on demand

| Service | Allowance and unit price used |
| --- | --- |
| Cloud Functions v2 / Cloud Run, request-based billing in Iowa | 180,000 vCPU-seconds, 360,000 GiB-seconds, and 2 million requests per month. Beyond these: $0.000024/vCPU-second, $0.0000025/GiB-second, and $0.40/million requests. The allowance is shared across projects on the billing account. [Pricing](https://cloud.google.com/run/pricing) |
| Firestore Standard, Iowa | The eligible default database includes 50,000 reads, 20,000 writes, and 20,000 ordinary deletes per day, plus 1 GiB storage. Excess operations cost $0.03/$0.09/$0.01 per 100,000 respectively. Excess storage is $0.000205479/GiB-hour; this model uses 720 hours. [Pricing](https://cloud.google.com/firestore/pricing) |
| Firebase Hosting | Model 10 GB/month transfer and 10 GB stored at no charge; excess transfer $0.15/GB and storage $0.026/GB-month. [Hosting usage and pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing) |
| Firebase Authentication | Ordinary email/password authentication has no usage charge in the published Firebase plan. If upgraded to Identity Platform, the current email/social allowance is 50,000 monthly active users; this model stays below it. No phone authentication or SMS. [Firebase pricing](https://firebase.google.com/pricing), [Auth usage limits](https://firebase.google.com/docs/auth#usage_limits) |

Use the **v2** pricing reference: Google's functions pricing overview directs current Cloud Run functions to Cloud Run pricing, separately from first generation. Do not mix first-generation CPU or memory allowances into this configuration. [Functions pricing overview](https://cloud.google.com/functions/pricing-overview)

#### Load, queries, and retention assumptions

- **Household activity:** Four active people per household; each opens one 15-minute visible session per day. Assume an initial refresh plus 75 scheduled refreshes at 12-second intervals: **304 household refreshes/day**. Polling stops while the page is hidden. This is an intentionally active pilot scenario, not observed engagement.
- **Refresh cost:** The current UI issues **one `GET /api/session` per refresh**, including the session and circle data. Budget **five Firestore document reads per refresh**, pending measured telemetry. This gives 304 HTTP requests and 1,520 budgeted reads per household/day. The HTTP count follows the inspected implementation; the document-read count remains an estimate.
- **MCP actions:** Six actions per household/day. Budget three HTTP requests per action for initialization, discovery, and the tool call; **20 total document reads per action** cover its authentication, state, and transaction work. Actual client session reuse and exact read counts are not yet measured.
- **Other requests:** Twelve additional API requests per household/day at five reads each for focus/visibility refreshes, manual refreshes, invitation handling, or retries. Total budget: **334 HTTP requests and 1,700 document reads per household/day**. The refresh request count is observed in code; the activity level, auxiliary calls, and document-read budget are scenario assumptions.
- **Writes:** Six committed changes per household/day, with three document writes per change: **18 writes/day**. Adjust for the actual transaction shape and retries after instrumentation.
- **Function time:** **0.3 seconds of allocated billable time per HTTP request**, at 1 CPU and 0.25 GiB. This placeholder includes database waiting and a startup/retry allowance. It is not a CPU-profile result. The model assumes no concurrency savings; overlapping requests can share an instance, but slow calls or cold starts can raise time. Long-lived idle streams are excluded.
- **Stored data:** **2 MiB aggregate per household**, including current records, indexes, and a proposed 90-day event history. No audio/video upload. Assuming one event per committed change, bounded retention eventually needs six ordinary event deletions per household/day. Retention is a proposed operational policy; this document does not claim that an automatic purge already exists. Export or delete pilot data when a household leaves. If automatic Firestore TTL is selected, its deletion charges are separate and have no free allowance.
- **Transfer:** **16 MB per household/day** through Hosting: roughly 8 MB of browser-delivered static assets across four visits plus 8 MB of API bodies and overhead. Cache hits at the CDN still transfer bytes to users; browser-cache reuse could reduce this assumption. This covers dynamic responses served through the Hosting origin as well as static content. Direct MCP traffic to a function URL and external function egress require their own regional network calculation.
- **Release assets:** Keep five 20 MB Hosting releases: 0.1 GB total. Function deployment images are a separate Artifact Registry expense below. No paid language-model calls, SMS, uploads, or payment processing are included.
- **Period and quota treatment:** 30 even-traffic days. Apply Firestore allowances **each day**, not against a pooled monthly total. Assume no other workload in this Firebase project. Cloud Run allowances may already be used by other projects on the existing billing account, so show that sensitivity separately.

Firestore bills documents and some index-entry reads; broad queries, security-rule dependencies, reconnecting listeners, and retries can add work. Confirm real query usage before expanding the pilot. Ordinary deletes and TTL deletes have different allowance treatment. [Firestore operation billing](https://cloud.google.com/firestore/pricing)

#### Results for the stated scenario

| 30-day scenario | 5-household pilot | 20 households | 1,000-household sensitivity |
| --- | ---: | ---: | ---: |
| Monthly active people assumed | 20 | 80 | 4,000 |
| HTTP requests/month | 50,100 | 200,400 | 10,020,000 |
| Allocated vCPU-seconds/month | 15,030 | 60,120 | 3,006,000 |
| GiB-seconds/month | 3,757.5 | 15,030 | 751,500 |
| Firestore reads/day | 8,500 | 34,000 | 1,700,000 |
| Firestore writes/day | 90 | 360 | 18,000 |
| Ordinary retention deletes/day | 30 | 120 | 6,000 |
| Aggregate Firestore storage | 0.0098 GiB | 0.0391 GiB | 1.9531 GiB |
| Hosting transfer/month | 2.4 GB | 9.6 GB | 480 GB |
| Cloud Run usage, full allowance available | $0.00 | $0.00 | $72.01 |
| Firestore operations + storage | $0.00 | $0.00 | $14.99 |
| Hosting transfer + retained releases | $0.00 | $0.00 | $70.50 |
| Email/password authentication | $0.00 | $0.00 | $0.00 |
| **Selected serving subtotal** | **$0.00** | **$0.00** | **$157.50** |
| **Subtotal if Cloud Run allowances were used elsewhere** | **$0.39** | **$1.56** | **$163.52** |

Example: 20 × 334 × 30 = 200,400 HTTP requests. At the assumed 0.3 seconds, that is 60,120 vCPU-seconds. For 1,000 households, Firestore read overage is (1,700,000 − 50,000) × 30 × $0.03 / 100,000 = $14.85; storage adds approximately $0.14. Reproduce the arithmetic with `artifact-source/firebase-cost-scenario.py`.

**This is a serving subtotal, not a $0 hosting promise.** At 20 households the transfer assumption is already close to the conservatively modelled 10 GB allowance. Doubling visible session time, adding heavy attachments, reconnecting frequently, or leaving polling active in background tabs can change the result materially. The 1,000-household column is a cost sensitivity; it is not evidence that the two-instance configuration, database layout, or helper experience can support that traffic.

#### Deployment costs, exclusions, and a pilot budget

Deployment has its own resources. Seven-day artifact cleanup is configured; billable storage still depends on the average size of retained images. As an illustration, an average 1 GiB retained over 720 hours costs roughly **$0.05/month** when the shared 0.5 GiB Artifact Registry allowance is available, or roughly $0.10 when it is already used. Twenty two-minute builds would be 40 build-minutes. On `e2-standard-2` in the default pool they could fit the current 2,500-minute billing-account allowance; with no allowance, those minutes cost $0.24. The real build machine and retained image size must be checked; these examples are not added to the serving table as if measured. [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing), [Cloud Build pricing](https://cloud.google.com/build/pricing)

The subtotal excludes build-source buckets, direct function internet egress, logging beyond included usage, extended log retention, backup/PITR, automatic TTL deletion, security scanning, transactional email providers, payments, tax, customer acquisition, and human support. It is not a gross-margin calculation. A ten-minute support conversation may cost more than months of one household's serving cost.

**Pilot operating allowance:** reserve $10/month for the initial five households, review actual cost and resource usage weekly, and set billing alerts at $5 and $10 before recruiting. This is a proposed management budget, not a cap or a predicted invoice. Alerts do not stop charges. Audit the existing account's shared allowance usage, delete old deployment artifacts, and instrument function billable time, read counts, response size, and poll frequency. [Firebase budget-alert guidance](https://firebase.google.com/docs/hosting/usage-quotas-pricing)

#### Pricing-documentation friction actually observed

The Hosting usage guide currently describes 10 GB/month of included transfer, while the general Firebase pricing table shows 360 MB/day. These figures are not identical, particularly under uneven traffic. This scenario uses the lower **10 GB/month** figure and even traffic; the pilot columns also remain below 360 MB/day. Before budgeting growth, reconcile the live billing SKU and quota page. Suggested improvement: publish the same unit and reset cadence in both pages. This is documentation research friction, not an application failure or a claimed support response. [Hosting usage guide](https://firebase.google.com/docs/hosting/usage-quotas-pricing), [Firebase pricing table](https://firebase.google.com/pricing)

**AI and AWS accounting:** The current language simulator is deterministic. There is no claim of live Alexa inference, a cloud LLM integration, Bedrock, AgentCore, or any other AWS runtime use. If model interpretation is added, calculate input/output token cost from recorded usage and the selected provider's then-current rates before updating this scenario.

### What could become defensible

The interface and prompts are easy to copy. More credible advantages would be reliable plan recovery under concurrency; integrations with workflows that families already use; trusted handling of household data; and recurring household preferences that improve relevance without weakening consent. The open-source handoff guard can build developer trust, but is not a proprietary moat.

The commercial risk is adoption. If only the coordinator uses KindHandoff, another inbox has been created. If helpers accept inside the product and coordinators stop chasing confirmations, the product has begun to demonstrate value.

### Go / change / stop criteria

- **Go:** Helpers use the product repeatedly, changes reach accepted replacements faster, and some pilot households choose to pay.
- **Change:** Coordinators like the planning but helpers do not adopt. Investigate fewer steps, better invitation context, or integration with existing communication habits.
- **Stop or narrow:** Most households rarely encounter coordination changes, do not trust the state, or find the product adds more work than their existing tools.

See `customer-discovery.md` for the actual interview and pilot protocol. No results have been filled in.
