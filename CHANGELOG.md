# Changelog

## September 23, 2026 - TCO capacity and API comparison ownership

- Retired TCO's standalone $8-per-million-token managed API illustration and the associated token-cost/user-cost comparisons from the UI, PDF and audit appendix. Existing saved overrides for that retired field are discarded.
- Retained TCO's cloud-versus-owned infrastructure economics, estimates of model fit and serving capacity, and the handoff to Guided Inference Economics for demand-bound cost per token against named managed API models. No TCO pricing or core cash-flow methodology changed.

## September 23, 2026 - OpenAI GPT-6 managed API comparison choices

- Added GPT-6 Sol and GPT-6 Luna as first-party verified managed API comparison choices in Inference Economics, using OpenAI's published standard text-token rates and separate cache-read prices.
- Kept the September 18 verification baseline for the older rates; newly verified rows carry their own September 23 date. The selected model now displays its own pricing verification date and staleness.
- The standard short-context comparison still excludes long-context surcharges, regional/Fast premiums, Batch/Flex discounts, and cache-write charges. No private throughput or hardware evidence was inferred from API model releases.

## September 23, 2026 - Managed API catalog shadow comparison

- Added a nightly, read-only models.dev pricing/model discovery comparison for the Inference Economics first-party rate snapshot, with a provider-aware LiteLLM cross-check and one rolling review issue.
- Confirmed all 15 checked-in models and short-context rates currently match both catalogs; surfaced recent frontier model entries only as candidates pending provider verification.
- Documented source licensing and promotion gates. Flagged that existing Artificial Analysis Free API usage needs CDW/provider rights review under the currently published access terms; no client-facing rate, model eligibility, or verification date was changed.

## September 22, 2026 - Cloud price shadow observation rollout

- Extended the scheduled maintenance review to preserve dated Azure GPU VM candidate observations in the rolling issue and a structured workflow artifact.
- Tightened exact SKU, region, USD, hourly VM, and purchase-variant filters; missing, duplicate, changed, and failed source readings remain review signals.
- Documented a four-run validation period and staged AWS, Google Cloud, and Oracle Cloud coverage before considering proposed pricing PRs or narrowly scoped unattended updates. Production pricing and verification dates were not changed.

## September 8, 2026 - Model Advisor explanation polish

- Simplified customer-facing recommendation and decision-trace language without changing ranking, filters, margins, tie-breaking, or model eligibility.
- Replaced developer-oriented model IDs with friendly model names in report and trace presentation while preserving canonical IDs for routing and logic.
- Renamed the methodology entry point to “Why these recommendations?”, removed production “V1” wording, and reduced repeated evidence-language overhead.
- Kept the full formal methodology and decision trace available for auditability, with clearer labels for direct evidence, capability tradeoffs, and qualifying floors.


## September 8, 2026 - TCO cloud GPU unit-price trend production sensitivity

- Activated the cloud GPU unit-price trend sensitivity with a default of 0%/yr, preserving prior results unless changed.
- The trend applies only to modeled cloud GPU compute rates; workload growth remains a separate consumption assumption and non-compute cloud costs retain their existing escalation basis.
- Moved the control into the calculator flow between Tier 1 and Tier 2 refinement and removed the preview-only warning.
- Persisted the selected assumption and exposed it in TCO reporting/audit language.


## September 8, 2026 - GPU Sizing selected-budget cleanup

- Estimated Budget now follows the configuration explicitly selected for TCO, so selecting a Higher-Growth Alternative updates the visible budget to that configuration's existing pricing basis.
- Removed the Pod Sizing `Coming soon` placeholder from the current production GPU Sizing journey; deployment-buildout/pod experience remains deferred to Phase 2.
- No sizing methodology, pricing data, TCO economics, or hardware recommendation logic changed.


## September 8, 2026 - GPU Sizing higher-growth capacity semantics

- Redefined the Higher-Growth Alternative as the next valid deployable capacity/headroom step, rather than requiring a faster GPU class.
- Top-of-catalog recommendations can now grow within the same class by one additional deployment quantum (for example, 8x B300 to 16x B300).
- The selector remains hardware-agnostic so future GB300, Vera Rubin, and other supported production classes can participate without changing card semantics.
- GPU Sizing -> TCO selection behavior is unchanged: users may explicitly select the higher-growth configuration and the exact class/count is handed downstream.


## September 8, 2026 - Model Advisor recommendation explanation UX

- Expanded recommendation cards into an advisory pattern with Why it fits, Primary tradeoff, Also consider, and the existing benchmark-evidence disclosure.
- Alternate suggestions are selected only from the already-computed recommendation slots or eligible-model list; the UI does not run a second ranking pass.
- Ranking margins, hard filters, tie-breaking, recommendation-slot ownership, GPU Sizing, and TCO economics are unchanged.


## September 8, 2026 - Model Advisor benchmark-evidence confidence disclosure

- Added a benchmark-evidence confidence layer that is explicitly separate from technical-spec confidence.
- Current evidence states distinguish exact benchmark coverage, exact-but-limited coverage, limited comparative evidence, and mappings requiring verification.
- Model Advisor cards and reports now disclose both spec confidence and recommendation-evidence quality.
- Evidence-confidence metadata is disclosure-only and does not change eligibility, ranking margins, recommendation slots, GPU Sizing, or TCO economics.


This file records meaningful project milestones for the CDW AI Factory tool suite. It is intentionally higher level than individual Git commits and more chronological than `AiFactoryProjectBrief.md`.

Use this file to answer questions such as:

- What materially changed since the prior stable baseline?
- Which defects were fixed versus merely identified?
- What data or pricing sources may be due for refresh?
- What remained open at a given point in time?

For detailed architecture, validation history, source-of-truth rules, and rationale, see `AiFactoryProjectBrief.md`.

## Unreleased

### September 23, 2026 - NVL72 infrastructure cost readiness

- Extended TCO infrastructure qualification to a single GB200 or GB300 NVL72 and to spend-derived NVL72 scenarios. A quote or documented existing-facility coverage reference and explicit review now accompany rack, cooling, power distribution, fabric, installation, selected software, and facility/operating assumptions. The review is bound to the selected design and modeled cost inputs; changing them invalidates it.
- The generic Equinix bundle cannot qualify an NVL72 scenario without a project-specific per-system override. Rubin Phase 1 stays directional with high-density costs still quote-dependent. Existing dollar inputs, TCO formulas, smaller-system planning allowances, and release tags are unchanged.

### September 22, 2026 - Read-only maintenance review automation

- Added a weekly GitHub Actions evidence report and one rolling maintenance issue covering pricing age, managed API snapshot age, cloud rows using proxies/quote placeholders, and manual IE/model/governance review tasks.
- Added an exact-SKU Azure Retail Prices API candidate comparison for four listed GPU VM configurations. It records missing, ambiguous, changed, and source-error states without changing pricing, provenance dates, methodology, or customer-facing output. Provider meter and purchase-basis review remains required.
- Corrected the runbook's on-prem price verification date and expanded its live regression checklist for Guided Inference Economics. The existing HF/AA syncs, freshness check, and human approval boundaries remain in place.

### September 22, 2026 - Guided Inference Economics and cross-tool completion

- PR #112 merged the Guided Inference Economics experience into `main`: a landing-page entry at `/inference-economics`, contextual TCO and GPU Sizing handoffs, session input persistence, an exportable report, a calculation/audit view, and a path onward to ROI. The earlier TCO preview routes remain available in source.
- Private inference cost per million **useful output tokens** is demand-bound: assigned private cost is divided by expected output demand, subject to the selected horizon and a production-capacity check. The required production-throughput assumption validates feasibility; it does not continuously reduce the quoted unit cost. An undersized configuration does not produce a valid economics result.
- Exact benchmark configurations and qualified whole benchmark-sized serving replicas can support an estimate. Non-whole deployments and cases requiring topology/model-parallel extrapolation are suppressed without adequate evidence; deployment basis is shown in the result and audit trail. The 16-B200 GPU Sizing -> TCO -> IE journey gained permanent regression coverage.
- Managed API comparison uses a dated, first-party last-known-good public pricing snapshot with provider/model selectors and user overrides. The reference blended rate and workload-specific input/output-token assumptions are kept distinct. BenchLM is a disconnected future adapter on commercial-use hold, not a live pricing feed.
- TCO handoff preserves fleet, horizon, workload-cost attribution, and eligible investment context. A directly identified inference workload can allocate 100% of its TCO; mixed workloads use a disclosed modeled inference share. ROI only inherits the upfront/recurring split when the original TCO context supplies it; otherwise the user must enter or confirm investment inputs.
- September 22 follow-up work added IE input persistence, deployment-evidence detail in the audit view, and Model Advisor Nemotron visibility regression coverage. These changes are on `main`; no new validated suite release or tag was created.

### September 10-22, 2026 - Hardware evidence, methodology, and corrective work

- September NVIDIA pricing/evidence work added guarded Rubin planning and TCO support, deployable GPU Sizing ranking, and Blackwell Ultra inference evidence. Rubin inference remains advisory where an absolute qualified throughput anchor is unavailable; do not treat speculative inference performance as measured capacity. See `docs/RUBIN_EVIDENCE_FOUNDATION_2026-09-10.md` for the evidence gates.
- Corrected cloud unit-price trend percentage scaling; GB300 NVL72 handoff; shared serving-hours context; higher-growth provenance and wording; deployable cost/headroom; training provenance and memory treatment; inference precision anchors and offline-versus-interactive semantics; infrastructure-cost coverage; ROI Year-1 ramp and report assumptions; GPU Sizing loaded-budget framing; and user-facing duty-cycle/copy formatting. Relevant fixes were merged across PRs #78-#86, #89, #94, #96, #101, #105-#106, and #113-#115.
- Built the inference-economics evidence, throughput, serving-workload, TCO connector, and managed-API comparison foundation in staged PRs #87-#111. The Guided entry and subsequent refinements were consolidated through PR #112. Research notes on replica scale-out and model-parallel calibration remain in `docs/` and must be read alongside the implemented guardrails.
- Routine automated model-capability syncs and related validator/test maintenance occurred during this period; they are not a new validated release or an external approval.

### September 7, 2026 - Cloud GPU unit-price trend sensitivity preview
- Added an interactive preview-only cloud GPU unit-price trend control ranging from -20% to +20% per year in 5-point steps, defaulting to 0%/year.
- The preview is explicitly non-functional: it is not persisted, autosaved, passed into the TCO engine, or reflected in report economics.
- Workload growth remains a separate production input; current TCO economics still hold cloud GPU unit rates constant across the analysis horizon.

### September 7, 2026 - TCO cloud unit-price assumption disclosure
- Made the existing cloud-pricing treatment explicit in the TCO UI and report: current cloud GPU unit rates are held constant across the selected analysis horizon.
- Clarified that annual growth changes modeled workload consumption, not assumed provider price inflation or deflation.
- No TCO formulas, pricing values, growth defaults, or provider-selection behavior changed.

### September 7, 2026 - GPU Sizing higher-growth TCO selection
- Kept the node-rounded GPU Sizing recommendation as the default production design while allowing an explicit Higher-growth alternative to be selected for TCO analysis.
- The selected class/count is passed unchanged to TCO with sizing-basis provenance; TCO remains the economic layer and does not re-size the technical design.
- No GPU sizing formulas, hardware performance anchors, or TCO economics changed.

### September 4-5, 2026 - Post-2026.09.1 integration, GPUaaS, authentication, and workspace hardening

#### Combined Summary / My Summary - PRs #15 and #16
- Replaced generic snapshot-key rendering with an explicit per-tool customer-facing presentation schema, curated labels/order/units, friendly model names, and clearer cloud/on-prem terminology.
- Added visible consistency warnings when the latest saved tool snapshots do not appear to describe one coherent scenario, including TCO/GPU fleet mismatch, Advisor/GPU model mismatch, stale downstream timestamps, and stale TCO-sourced ROI.
- Clarified that My Summary contains the latest saved result from each tool rather than implying historical scenario linkage that the current snapshot schema does not store.
- Suppressed duplicate TCO fleet output when it matches GPU Sizing and added print break protection.
- Corrected DGX/NVL consistency checking to compare GPU-equivalent capacity rather than system count directly to GPU count.
- PR #15 merged as `87776956dab793d70f1472f953a631737f7f45d2`; PR #16 merged as `255d85b57d037ca7c6349468e69e2b9b5fda5ded`.

#### Best-Value GPUaaS v1 - PR #17
- Added same-class Best-Value GPUaaS ranking to TCO Workload Requirement mode using the existing TCO engine for candidate economics.
- Ranking preserves GPU Sizing as the technical GPU-class authority, never invents cross-class substitution, and never silently changes the active provider.
- Added pricing-confidence disclosure (`LISTED`, `EST`, `NODE-NORM`, `QUOTE`, `CUSTOM`) and explicit `Use provider` selection.
- Deliberately excludes SLA, region, availability, enterprise discount, support, security, networking, procurement, and operational-fit recommendations from v1.
- PR #17 merged as `1c5153ddf15a32cdd25c5aac2e44ac43697c3f32`.

#### Global Reset - PR #18
- Added whole-workspace `Reset All Tools` for current scenario state while preserving authentication/account/profile and historical download events.
- Added reset write barrier, autosave coordination, two-pass snapshot deletion, server-side emptiness verification, cross-tab reset epoch, and stale-tab invalidation to prevent old scenario data from resurrecting after reset.
- Reset is fail-safe when server-side deletion cannot be verified.
- PR #18 merged as `0235f58cff1944aa935b8e5fc7382504db9e9e9f`.

#### Home account and My Summary access - PR #19
- Added the existing account/auth surface to the home page so signed-in users can see identity, open My Summary, and sign out without first entering a tool.
- Preserved Global Reset and signed-out browser-clear behavior and improved narrow-screen header stacking.
- PR #19 merged as `6a1217fc3a158b7ade9571e7dd84da21db0408be`.

#### Phase 1 authenticated front door - PR #20
- Added a CDW-styled authenticated front door before calculator interfaces for signed-out visitors.
- Preserved deep links through authentication, Supabase magic-link as primary login, temporary-password compatibility for provisioned users, and existing first-time account setup.
- This is an access-control/front-door tranche only; it does not claim all methodology/pricing logic is server-side.
- Email-domain restrictions remain deliberately deferred.
- PR #20 merged as `200c47427e60fee409e32d7dc2dbb2358657a6a2`.

#### GPU Sizing terminology - PR #21
- Clarified `Peak concurrent users` to mean simultaneous active request streams and explicitly include human users, AI agents, copilots, automations, and parallel sub-agents.
- No sizing math, default, label, or validation behavior changed.
- PR #21 merged as `ab7deb03c5e074a861f743a9f89c6ff7686e1d98`.

#### Auth-aware browser regression architecture - PR #22
- Split browser validation by authentication context after the front door changed intentional signed-out production behavior.
- Preview/production tests now assert route health plus signed-out front-door protection; protected tool-internal journeys run against the local auth-bypassed build.
- `E2E_AUTH_BYPASS` is test-only and absent from live production behavior.
- PR #22 merged as `9e975f65aaf8d61f0091308f075173226171857b`.

#### GPUaaS commercial eligibility - PR #23
- Added provider eligibility/display metadata so commercially unavailable providers can remain modeled internally without appearing in customer-facing selection or Best-Value recommendations.
- Current customer-facing provider set is AWS, Azure, Google Cloud, and Oracle Cloud.
- CoreWeave pricing/provenance/modeling remains preserved internally but is commercially disabled in the current CDW context because no reseller agreement is in place.
- No pricing values, TCO math, GPU-class logic, or on-prem economics changed.
- PR #23 merged as `fddf437a5b5ec1cb8514bee8f32f35ce39c59787`.

#### GPU Sizing print/PDF hierarchy - PR #24
- After real Windows PDF review, changed print-only styling so the Recommended configuration does not resemble a disabled/de-selected card in grayscale output.
- Recommended now prints with a white background, strong dark outline, fully opaque dark text, and no shadow; screen styling is unchanged.
- No sizing, pricing, provider, handoff, or calculation logic changed.
- PR #24 merged as `696c4c87122b7dfab25ac5eec59c2c0db8dcef78` and was manually confirmed working in production on Windows.


## AI Factory Suite 2026.09.1 - 2026-09-04

### September 4, 2026 - Report, model-context, handoff, and security hardening

#### Report and mobile presentation work

- Promoted approved customer-facing print layouts for all five report-producing tools without changing calculation/recommendation engines: TCO two pages, ROI one page, GPU Sizing two pages, Model Advisor one page, and Readiness six pages.
- Fixed the GPU Sizing working-day-hours mobile editing defect by separating transient input text from the committed numeric value. Blank/invalid intermediate edits no longer collapse the result panel, and invalid blur restores the last valid 1-24 hour value.

#### Shared model context - PR #7

- Added `src/modelRegistry.js` as the canonical cross-tool model identity/technical-parameter layer used by Model Advisor, GPU Sizing, and TCO.
- Model Advisor -> GPU Sizing -> TCO handoffs now preserve canonical model ID, exact parameter count, and inference quantization where applicable.
- TCO preserves the GPU Sizing technical count as the upstream sizing anchor rather than silently re-sizing the workload from model parameters.
- Added `scripts/validate_model_registry.mjs` and made canonical coverage, alias uniqueness, alias lookup, and parameter reconciliation part of the permanent quality gate.
- PR #7 merged as `644caeb8b8a9e51eb2f5b412c3c3f3aa0807e62b`; the exact merged tree passed the permanent quality gate and deployed successfully.

#### GPU Sizing -> TCO ownership model - PRs #8 and #9

- Corrected a live-discovered state-precedence defect where a fresh B200 GPU Sizing handoff could inherit a stale H100 TCO cloud comparison from an earlier session.
- A fresh handoff now starts the cloud/rental comparison like-for-like with the incoming GPU Sizing class unless the user has explicitly overridden the cloud comparison class in TCO.
- Clarified ownership semantics: upstream technical facts follow the latest GPU Sizing result; TCO-owned economic/planning assumptions remain intact; explicit TCO cloud-comparison overrides remain explicit.
- Locked the on-prem target system in workload mode when the scenario is sourced from GPU Sizing. Users return to GPU Sizing to change the technical design rather than re-specifying it inside TCO.
- Preserved user-entered cloud rates by provider + GPU class and on-prem system-specific economics by target system so prior assumptions do not leak across unrelated hardware classes.
- Kept N+1 redundancy as a TCO resilience assumption and separated it from the GPU Sizing base technical recommendation.
- Added permanent source and PR-local browser coverage for dirty-session -> fresh-handoff ownership, explicit cloud override persistence, model context persistence, and consumed-query behavior.
- PR #8 merged as `fb7801a4625540df2646e6f015b5b8bf65efffad`; PR #9 merged as `a1a9dc2c9daba89b09acf9045bc51f0df322c739`. Both merged trees passed their quality gates and deployed successfully.

#### Model-context regression hardening - PR #10

- Added permanent browser coverage for deterministic legacy size-only TCO migration to `Custom`, canonical Custom-model handoff, query-consumption reload persistence, and Back/Forward behavior after a user edits model context.
- The new tests found and corrected a real defect where TCO accepted Custom model parameters but discarded the incoming canonical `model=custom` identity, which could pair Custom parameters with a stale/default named model.
- PR #10 merged as `99c629956745f0403a370dcffd594fe325fb9a38` after the full PR gate passed.

#### SafeImageInput resource bounds - PR #11

- Extended the existing Client Summary image hardening beyond extension, file type, 10 MiB compressed size, and signature checks.
- Added PNG/JPEG decoded-dimension parsing before PptxGenJS/image-size processes the logo, with 10,000 px maximum width, 10,000 px maximum height, and a 40,000,000 total-pixel ceiling.
- Added permanent tests for valid PNG/JPEG input, renamed non-image rejection, width/height overflow, total-pixel overflow, and malformed JPEG dimension parsing; the test now runs in the permanent quality gate.
- Path containment remains intentionally deferred because the current generator is an offline/operator-local workflow and no dedicated logo staging-root contract exists. Revisit containment if the path becomes upload-driven or a staging root is standardized.
- PR #11 merged as `cfb2ed79ec01320f7669d11b8d5416d09f580117` after the full PR gate passed.

#### Pre-release cross-tool state-precedence pass - PR #13

- Added permanent cross-tool browser journeys for Use Case Explorer to Model Advisor, Use Case Explorer to GPU Sizing, Model Advisor to GPU Sizing, and TCO to ROI state ownership and precedence.
- The pass found and corrected a real Model Advisor to GPU Sizing defect in Training mode and stale provenance handling.
- PR #13 merged as `2222fcd2a5ca6b437b7b46c63fda3ffa21a16020`; the exact merged tree passed build/parity and live Vercel checks and deployed successfully before release preparation.

#### Current assurance and release-preparation state

- The permanent gate now covers production build, shared pricing registry validation, shared model registry validation, TCO handoff ownership guards, SafeImageInput resource-bound tests, checked-in TCO workbook extraction/structure, Excel-to-JavaScript parity, PR-local TCO handoff/model-context browser journeys, and the live Vercel browser regression suite.
- Green CI is treated as evidence that the asserted checks pass, not as proof that no unknown defect exists. Human/adversarial cross-tool review remains a separate pre-release activity because recent live review found a real state-precedence defect that was not yet represented in the gate.
- This release transitions package metadata from legacy 2.8.0 to SemVer-safe 2026.9.1, matching human suite release 2026.09.1 and tag v2026.09.1.
- Combined Summary presentation/schema remediation remains a separate unreleased workstream and is not required to be bundled into `v2026.09.1`.

### Added

- `CHANGELOG.md` as the durable human-readable milestone history for the suite.
- Refreshed root `README.md` to describe the current six-tool suite, current platform services, automated data maintenance, manual refresh responsibilities, status language, and remaining assurance priorities.
- Formalized internal suite calendar versioning: `AI Factory Suite YYYY.MM` / `vYYYY.MM`, with `.1`, `.2`, and so on for additional validated releases in the same month.
- Added `ReleaseRecordTemplate.md` as the standard release-history checklist covering code, rationale, data state, validation, dependencies, open items, approval status, and recovery identity.
- Updated `README.md`, `MaintenanceRunbook.md`, and `AiFactoryProjectBrief.md` so Git tags/GitHub Releases are the authoritative internal release identity and individual tool versions are not independently authoritative.
- Recorded that legacy `package.json` version `2.8.0` will remain untouched for the already validated `v2026.09` baseline and will transition to calendar-aligned SemVer metadata beginning with the next stable release.

### Cloud Pricing Refresh #1 - 2026-09-01

- Completed the first formal provider-by-provider cloud GPU pricing refresh using a canonical purchasing basis for AWS, Azure, GCP, OCI, and CoreWeave.
- AWS public EC2 catalog directly confirmed A100 80GB (`p4de`), H100 (`p5`), H200 (`p5en`), B200 (`p6-b200`), and B300 (`p6-b300`) On-Demand rates in `us-east-1`; GB200/GB300 remain `QUOTE` where a canonical standard On-Demand catalog row was not verified.
- Azure Retail Prices API directly confirmed Linux A100, H100, H200, and GB200 rates; B200, B300, and GB300 remain `QUOTE` where no canonical retail SKU was verified.
- GCP H100 and H200 On-Demand rates were reconfirmed. A100 was normalized to the A100 80GB A2 Ultra class. B200 standard On-Demand is currently `N/A`, so the tool now uses the explicitly disclosed DWS Calendar Mode public proxy rather than presenting the prior value as `LISTED` On-Demand.
- OCI was reconciled to Oracle's current GPU-per-hour Global Price List, correcting A100, H200, B200, B300, and GB300 values while retaining matching H100 and GB200 values.
- CoreWeave H200 was updated to the current North America On-Demand node-normalized rate, while B300 and GB300 were reclassified to `QUOTE` because public On-Demand pricing is currently `Contact sales`.
- Updated `CLOUD_RATES_VERIFIED_AT` to `2026-09-01` after the complete table review. Quote/proxy rows remain explicitly disclosed rather than being treated as verified list prices.

### Dependency Security Review #1 - 2026-09-02

- Reviewed the six current `npm audit` package-level findings individually: 3 moderate, 3 high, 0 critical. No dependency was force-upgraded.
- Vite/esbuild findings are development-server exposures rather than evidence of an exploitable defect in the compiled Vercel production application. A controlled Vite major-version upgrade remains planned and must pass the permanent quality gate.
- React Router's SSR constructor-injection advisory does not apply to the current declarative `BrowserRouter`/`Routes` architecture. The separate open-redirect advisory has low current exposure because application routing uses fixed internal destinations; a controlled React Router upgrade remains planned.
- PptxGenJS inherits high-severity denial-of-service advisories from `image-size`. The known client-controlled image path is the offline Client Summary `clientLogoPath`, so the generator now allows only PNG/JPG/JPEG files, enforces a 10 MiB ceiling, and verifies the actual PNG/JPEG file signature before PptxGenJS sees the image.
- Added permanent Client Summary regression assertions proving a valid PNG is accepted while a non-JPEG payload renamed `.jpg` is rejected by both preflight and generation.

### Shared Pricing Registry - 2026-09-02

- Centralized TCO cloud GPU rates and NVIDIA/DGX loaded system pricing in `src/pricingRegistry.js` without changing the current rate values.
- TCO now imports cloud rates and on-prem system economics from the shared registry instead of owning local `RATES` and `SYSTEMS` tables.
- GPU Sizing no longer owns a duplicate `GPU_PRICE_USD` table; its H200, B200, GB200 NVL72, and B300 planning prices are derived from the same shared system records used by TCO.
- Updated the TCO Excel-to-JavaScript parity harness to inject the shared production pricing registry while continuing to extract the production calculation functions from TCO. Canonical parity remains 20/20 PASS.
- Added `scripts/validate_pricing_registry.mjs` and made it part of the permanent quality gate. The guard fails if local duplicate pricing tables are reintroduced and preserves the exact validated AWS B200 reserved-rate value of `8.545` per GPU-hour.

### Current maintenance state

- Hugging Face model specifications sync monthly on the 1st through GitHub Actions.
- Artificial Analysis capability data sync weekly on Monday through GitHub Actions.
- Registry reconciliation runs daily and on changes under `data/**`.
- NVIDIA NIM compatibility remains manual-only until a production-backed catalog-wide endpoint is confirmed.
- Cloud GPU rates and NVIDIA loaded system prices are code-maintained in the shared `src/pricingRegistry.js`; source verification remains manual even though both calculating tools now consume one registry.
- Pricing provenance is tracked in `src/pricingProvenance.js`, with review due after 45 days and stale after 90 days.

### Current assurance state

- Permanent GitHub Actions quality gate now runs a production build, validates the checked-in final TCO audit workbook structure, executes the canonical Excel-to-JavaScript parity gate, and runs the live Playwright regression suite against Vercel.
- TCO canonical `EngineRegression` parity passes 20/20 checks using the workbook's `MAX($1, 0.01%)` tolerance for continuous values, exact fleet counts, and exact text/crossover outputs.
- Live Vercel regression passes 13/13 automated tests covering all application routes, landing-page tool links, the prior TCO workload-state defect, ROI provenance/malformed handoff behavior, and the canonical TCO fixture through a real TCO-to-ROI click-through.
- The parity gate found and drove correction of a real AWS B200 reserved-rate rounding defect. The web had rounded the exact $68.36 per 8-GPU reserved snapshot too early at the per-GPU level, which could incorrectly cross a fleet-size boundary. Current source preserves the exact 8.545 per-GPU equivalent for that snapshot.

### Still open

- Credentialed live checks that require a real magic-link session or external side effects: auth/email delivery, database download-event verification, Slack notification verification, and final visual inspection of report/PDF output.
- Production-backed NVIDIA NIM compatibility sync.
- Live/manual verification of report/audit-trail presentation where not covered by automated tests.
- Controlled Vite/esbuild and React Router dependency upgrades remain planned; treat them as regression-tested migrations rather than `npm audit fix --force` changes.
- PptxGenJS/image-size remains an upstream dependency concern; the current offline Client Summary client-logo path is restricted to PNG/JPG/JPEG, capped at 10 MiB compressed size, validated by signature, and bounded to 10,000 x 10,000 pixels / 40,000,000 total pixels before PptxGenJS sees the image. Path containment remains deferred until a real staging-root contract exists.
- External publication/branding approval items tracked in `AiFactoryProjectBrief.md`.

## 2026-09-01 - Automated assurance baseline

### Added

- Permanent TCO workbook extractor: `scripts/extract_tco_workbook_snapshot.py`.
- Permanent TCO Excel-to-JavaScript parity runner: `scripts/run_tco_parity.mjs`.
- Playwright configuration and live regression coverage under `tests/e2e/`.
- GitHub Actions quality gate at `.github/workflows/quality-gate.yml`, using Node 22 for the application/test environment.

### Validation

- Confirmed the legacy-named repo workbook `docs/reverse-tco-model-v1.xlsx` is the final audit workbook and contains `EngineRegression` and `Crossover` along with the validated model sheets.
- Canonical TCO Excel-to-JavaScript parity: 20/20 PASS.
- Live Vercel browser regression: 13/13 PASS.
- Canonical live TCO fixture renders one DGX B200 system and Month 24 crossover, confirms the corrected reserved-rate snapshot is deployed, and successfully hands the resulting costs/provenance to ROI through the real production link.

### Corrected

- AWS B200 reserved-rate precision now preserves the validated NVIDIA TCO snapshot of $68.36 per 8-GPU instance rather than prematurely rounding the per-GPU equivalent to two decimals.
- This correction prevents a four-cent instance-rate difference from incorrectly pushing exact-boundary workloads from one DGX B200 system to two.

### Release discipline

- Released as `v2026.09` / `AI Factory Suite 2026.09` from validated commit `31fdb2ff2a321f6101bfa72d3c45b4c31aa3a0eb` after the cleaned repository passed the production build, 20/20 TCO Excel-to-JavaScript parity gate, and 13/13 live Vercel regression suite.
- External CDW publication approval remains separate from source/live technical verification.

## 2026-09-01 - Current source baseline after project-memory consolidation

### Documentation and project continuity

- Added consolidated root `AiFactoryProjectBrief.md` to preserve architecture, history, validation findings, conventions, current source status, and unresolved items.
- Established the rule that current GitHub `main` is the source of truth for code and tracked data, while the brief provides context and history.
- Formalized three distinct status tiers: source-verified, live-verified, and externally approved.
- Repository access was changed to private while retaining authenticated GitHub connector access for ongoing review and maintenance.

### Model-data automation

- Hugging Face model-spec workflow confirmed as monthly plus manual dispatch using `HF_TOKEN`.
- Artificial Analysis capability workflow confirmed as weekly plus manual dispatch using `AA_API_KEY` and the free API tier.
- Daily registry reconciliation confirmed.
- September 1 Hugging Face model-spec sync produced commit `57460e794b4160a9aec2b9c0cfdbabbd4bcf57e6`.

### Current model registry architecture

- Hugging Face remains the primary source for license, context length, architecture, modality, and model specification data.
- Artificial Analysis supplies intelligence, coding, agentic, speed, and token-price intelligence.
- Production data is restricted to explicitly tracked canonical models; unresolved external models are discovery candidates rather than automatically promoted into production.
- Gated Hugging Face models require an authenticated account that has accepted the relevant model terms.

### Current GPU Sizing source state

- Current on-prem purchase candidates are H200, B200, GB200 NVL72, and B300.
- A100 and H100 are no longer purchase candidates in GPU Sizing, though older cloud/rental comparison classes can still appear where appropriate in TCO.
- Current source includes the validated token-speed preview layout-shift fix.
- GPU Sizing to TCO handoff uses the node-rounded technical requirement and current source supports workload-based TCO consumption of that requirement.
- Dev/Test/POC RTX PRO 6000 Blackwell remains a non-production alternative path.

### Current TCO source state

- Current source contains the v2.9 workload-requirement path in addition to the original spend-derived comparison mode.
- GPU Sizing handoff state, source class, working-day hours, and workload mode now persist through session state after URL capture.
- Back/Forward, refresh, and bare-URL return behavior was remediated in source for the previously identified handoff-state defect family.
- Workload duty cycle and owned-system utilization are handled separately.
- GPU Sizing technical requirement now acts as the fleet-sizing anchor in workload mode.
- Cloud GPU rates and on-prem NVIDIA system prices remain hard-coded in the TCO source, with confidence labels and pricing provenance tracked separately.

### Current ROI source state

- Malformed or empty TCO handoff values no longer coerce into false zero-dollar provenance.
- TCO provenance and original handoff values persist through session state.
- Direct-entry, prefilled-unmodified, and prefilled-then-adjusted states are distinguished.
- Accessibility remediation includes programmatic labels and input relationships.
- ROI framing remains capacity creation and realized economic value, not layoffs or headcount reduction.

### Current platform and shared-state remediation

- Autosave now flushes pending snapshot state on `pagehide` and hidden `visibilitychange`, addressing the previously identified lost-update race during navigation.
- Combined Summary separates auth loading, account loading, snapshot loading, empty state, and populated state to avoid premature empty-summary flashes.
- Current source contains accessibility remediation across TCO, ROI, and GPU Sizing.
- Client-summary fixture coverage is present in the current repo, including edge and malformed-data cases.

### Validation history carried forward

- Nine formal TCO review rounds are part of the project record.
- Three site-integration review rounds are part of the project record.
- A six-round pre-deployment browser validation program covered roughly 130 checks using a fresh clone, Vite, Playwright, real Chromium, mocked Supabase, and the complete Explorer to Advisor to GPU to TCO to ROI to Summary journey.
- Prior validation identified handoff-state persistence, malformed ROI parameters, autosave race, fixture hygiene, Combined Summary loading, accessibility, and GPU layout-shift issues. Current source contains remediations for those items.
- Historical source-level remediation does not by itself constitute a fresh live production GO decision.

### Remaining assurance priorities at this baseline

1. Build the automated TCO Excel-to-JavaScript parity suite.
2. Run a fresh end-to-end regression against the current Vercel deployment.
3. Centralize pricing so TCO and GPU Sizing read one shared source.
4. Keep NVIDIA NIM compatibility manual until its endpoint is validated.
5. Reconfirm any external approval, domain, branding, and deployment decisions outside the repository before treating them as approved.

## 2026-08 - Major suite build and validation period

### Added

- Six-tool React/Vite application with routes for Use Case Explorer, Model Advisor, GPU Sizing, TCO, ROI, and Readiness.
- Supabase magic-link authentication and account/profile handling.
- Snapshot autosave and Combined Summary experience.
- Report/download event logging and Slack notifications through Supabase Edge Function integration.
- Resend-backed SMTP for authentication email delivery.
- Cross-tool handoffs among Explorer, Model Advisor, GPU Sizing, TCO, and ROI.
- Calculation Methodology & Audit Trail experiences for TCO, GPU Sizing, and ROI, plus a Recommendation Methodology & Decision Trace for Model Advisor.
- Open-weight model registry and automated Hugging Face / Artificial Analysis synchronization architecture.
- Client Summary PowerPoint generation pipeline and regression fixtures.

### Changed

- GPU Sizing purchase candidates were narrowed to currently relevant new-purchase classes beginning with H200.
- TCO was extended beyond its original spend-derived mode to support workload-requirement handoff from GPU Sizing.
- ROI methodology was refined around redeployable capacity, realization factor, and economic value rather than headcount reduction.
- Model Advisor and Use Case Explorer routing were separated into general-model-selection, infrastructure-first, specialized-stack, and platform-architecture paths where appropriate.

### Validation

- TCO underwent nine formal model/audit rounds.
- ROI spreadsheet and React parity work included a frozen reference workbook and 45 validation checks.
- Site integration, browser journeys, accessibility, resilience, negative/edge cases, report output, and cross-tool persistence were exercised in structured rounds.

### Known issues identified during this period

- URL-derived handoff context could be consumed without durable session persistence.
- ROI could interpret empty malformed handoff values as zero and incorrectly mark provenance.
- Debounced autosave could lose the final edit during navigation.
- Summary could briefly display an empty state before snapshots finished loading.
- Accessibility labels and TCO collapsible state semantics were incomplete.
- GPU sample-output animation could produce layout shift.
- Client Summary fixture handling and fresh-clone regression hygiene needed strengthening.

These issues were subsequently remediated in current source as recorded in the September 1 baseline above.

## How to use this changelog in future sessions

For a current-state recap, use this sequence:

1. Fetch the current repo and identify the current `main` commit.
2. Read `AiFactoryProjectBrief.md`.
3. Read this `CHANGELOG.md`.
4. Inspect Git commits since the most recent stable baseline or tag.
5. Verify any modules implicated by those commits directly from current source.
6. Check pricing/model provenance dates and scheduled workflow health.
7. Distinguish source-verified, live-verified, and externally approved status.
8. Report what changed, what remains open, and which data sources are due for refresh.

When a meaningful new stable baseline is established, add a dated section here and, ideally, tag the corresponding Git commit so later comparisons are exact.
