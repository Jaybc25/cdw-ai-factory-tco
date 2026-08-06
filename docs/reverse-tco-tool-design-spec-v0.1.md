# Reverse TCO Tool: Design Specification v0.1

**Working name:** Cloud-to-On-Prem AI TCO Analyzer
**Purpose:** Take what a customer currently spends on cloud AI (hyperscaler or neocloud) and show (1) the on-prem NVIDIA infrastructure required to absorb those workloads and (2) what it would cost to own and operate versus continuing to rent.
**Direction of analysis:** Inverse of the NVIDIA DGX TCO tool. NVIDIA starts from proposed hardware and outputs equivalent cloud cost. We start from actual cloud spend and output the required hardware and its cost.

---

## 1. Architecture Principles

### 1.1 Data and logic are fully separated
No price, rate, factor, or spec is ever hardcoded into a calculation. All values live in an editable **Rate Card** (Section 6). Formulas reference the rate card by key. Updating for an NVIDIA price change, a new AWS rate, or a local power cost is a data edit, not a rebuild.

### 1.2 Hardware is data
On-prem systems and cloud instance types are rows in a **Hardware Registry**, not options baked into the tool. Each row carries the specs the calculator needs. Adding a new DGX generation or a new cloud instance means adding a row.

**On-prem system record fields:**
- System name (e.g., DGX B300)
- GPUs per system
- System acquisition cost
- Software suite cost per system (AI Essentials / AI Factory, tier-dependent)
- Fabric costs per system (compute / storage / management)
- Power draw in kW (average load)
- Systems per rack
- Performance factor vs. each cloud GPU class (see 1.4)
- Effective date of pricing
- Lead time (weeks)

**Cloud instance record fields:**
- Provider (AWS, Azure, GCP, OCI, CoreWeave, other)
- Instance name and GPU class (A100 / H100 / H200 / B200 / GB200)
- GPUs per instance
- Hourly rate: on-demand, 1-yr committed, 3-yr committed
- Managed platform (PaaS) uplift % if applicable
- Effective date of pricing

### 1.3 Every value has a provenance tag
Each number in an analysis is tagged: **Customer-provided**, **Default (industry average)**, or **CDW/NVIDIA rate card**. The output displays the mix so the customer sees exactly what was assumed versus what they told us. This is the credibility mechanism.

### 1.4 Performance factors follow the NVIDIA pattern
For each factor: possible range, reasonable default, breakeven value, all adjustable. Factors are multiplicative into a Net Performance Factor (NPF). The generational factor is a lookup keyed on (customer's current cloud GPU class → proposed on-prem system).

| Factor | Range | Default | Breakeven | Notes |
|---|---|---|---|---|
| GPU generational speedup | 2–30x | 3x per generation gap | 1.2x | Lookup by class pair; 1.0x for like-for-like |
| Reference architecture network | 1–2.5x | 1.5x | 1.05x | Multi-node workloads only; 1.0x for single-node inference |
| AI Factory software (Run:ai / Mission Control) | 1–10x | 1.3x | 1.1x | Utilization improvement 70%→90% |
| NVAIE / NIMs | 1–5x | 1.3x | 1.1x | Inference-heavy workloads benefit most |

**Presentation rule:** Always compute and show the **floor case** (all factors = 1.0) first, then the adjusted case. The floor case is the credibility anchor: like-for-like silicon, ownership vs. rental, no multipliers.

---

## 2. Input Flow: Three Fidelity Tiers

The tool must produce a viable answer at every tier. Confidence labeling scales with input quality.

### Tier 1: Hallway Conversation (2 required inputs)
Designed to be answerable by any customer in two minutes. Output labeled **"Directional Estimate"** with an explicit range (e.g., ±30%).

Required:
1. Approximate monthly cloud AI spend ($)
2. Primary provider (AWS / Azure / GCP / OCI / CoreWeave / other-neocloud)

Everything else defaulted:
- Spend decomposition: default split of 50% compute / 45% storage / 5% admin-egress (seeded from NVIDIA Test 1; refine with real engagement data over time)
- GPU class: default H100 (the most common installed cloud fleet as of 2026)
- Commitment: default 1-yr reserved rates
- Storage mix: default 25% fast / 75% bulk
- Utilization pattern: default steady-state

**Sales purpose:** Tier 1's job is not precision. It is producing a large, defensible-looking savings range fast enough to earn the meeting where the customer brings their bill.

### Tier 2: Discovery Meeting (5–8 inputs)
Output labeled **"Refined Estimate"** (±10–15%).

Adds:
3. Instance type(s) or GPU class actually used, and approximate split if mixed
4. Commitment structure (on-demand %, 1-yr %, 3-yr %)
5. Storage volume (TB/PB) and hot/cold mix if known
6. Workload type mix: training / fine-tuning / inference (drives which perf factors apply)
7. Growth expectation (flat / moderate ~25%/yr / aggressive ~50%+/yr)
8. Facility situation: own datacenter / need colo / unsure (routes to Private Cloud vs. Equinix branch)

### Tier 3: Validated Analysis (invoice-based)
Output labeled **"Validated Analysis."**

Adds:
9. Actual invoice or usage export (12 months preferred): exact GPU-hours by instance type, storage line items, egress, PaaS charges
10. Local power rate ($/kWh) and facility specifics, or colo quote
11. Negotiated discount levels (theirs and CDW's)

**Design rule:** A field the customer skips silently falls back to its default and gets tagged accordingly. The tool never blocks on missing data.

---

## 3. Calculation Specification

### Step 1: Normalize spend to GPU-hours
- **Tier 3:** GPU-hours read directly from usage data.
- **Tier 1/2:** `Estimated compute spend = total spend × compute share`. Then `Monthly instance-hours = compute spend ÷ blended hourly rate` where the blended rate reflects the provider, instance class, commitment mix, and PaaS uplift from the rate card. `Monthly GPU-hours = instance-hours × GPUs per instance`.

### Step 2: Apply Net Performance Factor
`NPF = generational factor × network factor × software factor × NVAIE factor` (each defaulting per Section 1.4, gated by workload type: e.g., network factor forced to 1.0 for single-node inference-only shops).

`Effective on-prem GPU-hours required = cloud GPU-hours ÷ NPF`

### Step 3: Size the on-prem fleet
`Monthly GPU-hours per system = GPUs per system × 730 × target utilization`
(Target utilization default 85%; NVIDIA implicitly uses 100%, we deliberately de-rate for realism.)

`Systems required = ceiling(effective GPU-hours ÷ hours per system)`

Report both the raw ratio and the rounded-up count. The rounding remainder is presented as **growth headroom** (see Output).

### Step 4: Size storage
Cloud storage spend (or stated volume) converts to PB. On-prem: fast PB and bulk PB priced from rate card, including annual support. Egress cost on cloud side computed as % of stored volume per month; on-prem egress ≈ $0.

### Step 5: Build the on-prem cost stack
**Capex:**
- Systems × (system cost + software suite + compute fabric + storage fabric + mgmt fabric + professional services)
- Cluster fixed cost (management server nodes): applied once per cluster
- Racks: `ceiling(systems ÷ systems-per-rack) × rack cost` + storage racks
- Storage hardware (fast + bulk per PB)
- Optional discount % (CDW/NVIDIA negotiated)

**Opex (monthly):**
- Power: `(systems × kW per system + PB × kW per PB) × $/kW-month` (geo-adjustable; see rate card presets)
- Facility other: networking/VPN/firewall monthly + amortized per-rack setup
- Admin: `max(systems ÷ admin ratio, minimum) × loaded FTE cost ÷ 12`, OR CDW managed services line item as alternative
- Storage support (annual ÷ 12)

**Financing view (optional module):** Default presentation is the capex view. Financing is an optional runtime input: the user may enter day-of lease rate factor and term (e.g., 36/48/60 months) at analysis time to generate a leased monthly comparison. No rates are stored as defaults; the NVIDIA 0.0281 3-yr factor is retained in documentation only as a worked example. This keeps the tool current with whatever CDW financing offers on the day of the customer conversation.

### Step 6: Build the cloud trajectory
`Cloud monthly cost = current bill` (Tier 3) or reconstructed (Tier 1/2), grown at the customer's growth rate annually. Ops/admin growth default 4%/yr on both sides. Critically: compute growth compounds the full cloud bill, but on-prem growth only adds marginal systems once headroom is exhausted.

### Step 7: Compare and find breakevens
Outputs over 1 / 3 / 5 years:
- Total cloud cost vs. total on-prem cost (leased and capex views)
- Cumulative savings and % savings
- **Payback month** (capex view): month where cumulative savings turn positive
- **Minimum viable spend:** the monthly cloud bill below which on-prem does not pencil (driven by the cluster fixed cost). Used as a prospect qualification filter.

---

### Step 8 (v1.2): Transition, facility readiness, resilience, residual
**Facility readiness (self-hosted branch):** three states — AI-ready (no cost), retrofit (one-time buildout $ input; ~29 kW/rack at 2 DGX B200/rack exceeds most legacy enterprise DC capacity; typical buildout $10-15K per kW of new capacity), or no facility (route to Equinix branch).
**One-time transition costs (added to on-prem side):** migration/MLOps re-platforming engineering (input, default $100K) + dual-run period (months × current cloud bill, default 2) + cloud exit egress (stored PB × egress $/GB, ≈ $50K/PB at list) + facility retrofit if applicable.
**Redundancy:** N+1 toggle adds one system to both adjusted and floor fleets; material at small scale where a 1-system fleet has zero failover (cloud embeds redundancy in its price). Alternative: cloud-burst fallback, which is a hybrid services conversation.
**Residual value:** % of hardware capex (systems + storage; excludes cluster nodes, racks, retrofit, transition) credited at horizon end. Default 15%, editable. Simplification: flat % regardless of horizon length — documented, revisit in v2 with a depreciation curve. This partially answers the refresh objection; full refresh-cycle modeling (fleet upgrades mid-horizon while the cloud column silently refreshes) remains v2.

---

## 4. Output Framing

Ordered deliberately for the sales conversation:

1. **Headline:** "Your estimated N-year savings: $X (Y%)" with confidence label (Directional / Refined / Validated) and range.
2. **The floor case, explicitly:** "Even with zero performance adjustment, like-for-like silicon: $X savings." Then: "With conservative NVIDIA performance factors: $Y." Floor first, upside second.
3. **The build:** what they'd own. N × [system], storage, network, rendered as a simple bill of materials. This is the CDW quote seed.
4. **Growth headroom:** "Your workload uses Z% of this fleet's capacity. Growth to 100% costs you $0 in additional compute; in cloud, the same growth costs $X/yr more."
5. **What disappears:** egress fees, PaaS uplift, per-hour metering anxiety.
6. **Assumption ledger:** every input with its provenance tag (customer / default / rate card). Invitation: "Bring us your invoice and we'll turn this directional estimate into a validated analysis."
7. **Honest exclusions (v1.2):** hardware refresh cadence beyond the flat residual assumption; NPV/discounting (model is nominal dollars); early-termination exposure on existing cloud commitments; stranded-capacity risk if AI demand doesn't materialize; hybrid burst strategy; lead times (pull from registry: e.g., DGX B300 36 weeks as of 2026-07). Migration, dual-run, exit egress, facility retrofit, and redundancy are now modeled (Step 8), not excluded. Naming what remains excluded builds trust and creates the services conversation.

---

## 5. Extensibility Roadmap (not v1)

- **Website v1 (cdwaifactory.com) — lead capture & emailed PDF:** public site = Tier 1 inputs + directional output; full report gated behind a contact form (name, company, work email). Prototype (calculator v1.4) implements the gate, branded report view, print-to-PDF, and demo lead storage. Deployment adds: real lead handling (form endpoint or CRM webhook), server-side PDF render, and email delivery via an email API (e.g., Resend/SendGrid) — a chat prototype cannot send email, so this is deploy-phase. Strip or gate the editable rate card on the public version per sensitivity review; confirm CDW branding sign-off before launch.

- **Equinix / colo branch: CAPTURED.** Capex identical to Private Cloud branch. Operations replaced by a single bundled rate: $11,387/mo per DGX system (colocation + air/liquid cooling + interconnection + managed services). Managed services inclusion removes the admin FTE line on this branch. Tool should auto-compute the facility crossover (self-host vs. colo) as a function of local power rate, rather than forcing an upfront branch choice like NVIDIA's tool does. To verify: whether the per-system rate also covers storage rack colo at larger storage volumes.
- **Token-based AIaaS translation:** customers on Bedrock/Azure OpenAI/Vertex paying per token. Requires tokens→GPU-hours model per model family. v2.
- **Hybrid modeling:** base load on-prem + burst in cloud; often the real-world answer.
- **CDW managed services:** alternative to the admin FTE line; turns the staffing objection into a CDW revenue line.
- **Multi-cloud aggregation:** customers splitting across a hyperscaler + neocloud.

---

## 6. Rate Card v0 (seeded from NVIDIA TCO tool, July 2026)

All values editable, all carry effective dates. Sources: NVIDIA DGX TCO tool defaults extracted 2026-08.

### Cloud (AWS example; replicate per provider)
| Key | Value | Notes |
|---|---|---|
| B200/B300-class 8-GPU instance, on-demand | $113.93/hr | p6-class |
| Same, 1-yr reserved | $68.36/hr | |
| NVAIE support per instance-hr | $8.00 OD / $2.88 reserved | Applied to cloud side |
| Fast storage | $0.14/GB/mo | Parallel FS class |
| Bulk storage | $0.02/GB/mo | Object class |
| Egress | $0.05/GB | Default 5% of stored per month |
| Cloud admin FTE (loaded) | $189,000/yr | |
| Billing/mgmt software | $5,000/yr | |
| PaaS uplift | 0% default; 15–30% typical when applicable | Needs research per platform |

### On-prem (DGX B200 reference config)
| Key | Value | Notes |
|---|---|---|
| DGX B200 system | $485,000 | Effective 2026-07 |
| AI Essentials + AI Factory SW (Tier 2) | $142,800/system | Tier-dependent |
| Compute / storage / mgmt fabric | $54,323 / $23,443 / $14,227 per system | |
| Cluster mgmt server nodes | $600,000/cluster | Fixed; dominates small deployments |
| Professional services | $25,000/system | |
| Rack + PDUs | $15,000; 2 DGX/rack | |
| Power per DGX | 14.4 kW avg load | |
| Fast storage | $1.2M/PB + $100K/PB/yr support; 10 kW/PB; 1 rack/PB | |
| Bulk storage | $500K/PB + $33,333/PB/yr support; 10 kW/PB; 1 rack/PB | |
| Power rate | $300/kW-month default (~$0.41/kWh loaded) | Geo presets below |
| Network/VPN/firewall | $3,000/mo | |
| Setup per rack | $2,000 one-time | |
| Admin ratio | 10 systems/FTE @ $189K | Or CDW managed services |
| Lease rate factor + term | Optional runtime input (no stored default) | NVIDIA example: 0.0281/mo @ 36mo |

### Power geography presets (loaded $/kW-month; to validate)
| Region | Preset |
|---|---|
| Conservative default (NVIDIA) | $300 |
| US Midwest / SLED muni power | $150–200 |
| US South | $175–225 |
| US Coastal (CA / Northeast) | $300–400 |
| Colo (Equinix Private AI, bundled per DGX system incl. cooling, interconnect, managed svcs) | $11,387/system/mo |

*Preset ranges are placeholders pending validation against EIA commercial rates and typical PUE; validate before customer use.*

### Operating assumptions
| Key | Value |
|---|---|
| Hours basis | 730/month, 24×365 |
| Target on-prem utilization | 85% (de-rated from NVIDIA's implicit 100%) |
| Compute growth default | 25%/yr (vs. NVIDIA's 0%; almost no AI consumption is flat) |
| Ops/admin growth | 4%/yr both sides |
| Analysis horizons | 1 / 3 / 5 years |

---

## 7. Open Questions

1. ~~Equinix Private AI assumption set~~ RESOLVED 2026-08: bundled $11,387/system/mo; see Section 5.
2. ~~Confirm AWS instance naming~~ RESOLVED 2026-08: NVIDIA tool label bug. $113.93/hr is the p6-b200.48xlarge rate; p6-b300.48xlarge is a real, separate instance (8× B300, ~$142.42/hr on-demand us-east-1, GA Nov 2025). Rate card math stands; our tool must pair labels and rates from provider pricing sources directly.
3. ~~CDW financing rates~~ RESOLVED BY DESIGN 2026-08: financing is an optional runtime input (rate factor + term entered day-of), not a stored default. No sourcing needed until a specific deal.
4. Default Tier 1 spend-decomposition splits: validate 50/45/5 against real customer bills as engagements accumulate.
5. Generational performance factor lookup table: SEEDED from public sources 2026-08. Training (MLPerf audited): B200 vs H100 = 2.0–2.2x; H200 vs H100 = 1.4–1.47x. Inference: B200 vs H100 = 4x (MLPerf) to 15x (NVIDIA best-case FP4); GB200 vs H200 = 2.86x per chip (Llama 3.1 405B, MLPerf v5.0); H100 vs A100 = up to 4.5x (MLPerf debut). Design rule confirmed: defaults = MLPerf-audited values (note these run BELOW NVIDIA's 3x TCO-tool default for training); NVIDIA marketing claims define range upper bounds only. Remaining work: fill missing pairs (B300/GB300 rows as MLPerf rounds publish), formalize per-workload gating. NVIDIA PDM materials now optional polish, not blocking.
6. Form factor for v1: spreadsheet (fastest to internal demo), web calculator (customer-facing), or both in sequence.
