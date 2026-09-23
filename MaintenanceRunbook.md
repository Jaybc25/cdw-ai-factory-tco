# AI Factory Maintenance Runbook

This runbook defines the recurring and event-driven work required to keep the CDW AI Factory tool suite accurate, operational, and auditable.

Use this file for the practical question: **What needs to be checked, refreshed, tested, or documented next?**

For architecture, history, rationale, and prior validation findings, read `AiFactoryProjectBrief.md`. For meaningful milestones over time, read `CHANGELOG.md`. For service ownership and dependency details, read `ServiceInventory.md`.

## 1. Operating principles

1. GitHub `main` is the source of truth for code and tracked data.
2. Before reviewing or editing a module, fetch the current repo file rather than relying on memory, old uploads, or prior chat context.
3. Keep three status levels separate:
   - **Source-verified:** confirmed in the current repository.
   - **Live-verified:** confirmed in the deployed application.
   - **Externally approved:** approved by the relevant CDW stakeholder or other external authority.
4. A source fix is not automatically a live verification.
5. A deployed feature is not automatically externally approved.
6. Never place secret values, passwords, API keys, tokens, or webhook URLs in repository documentation.
7. Prefer primary sources for pricing, product specifications, standards, and policy. Use secondary trackers only as a cross-check when needed.
8. Meaningful maintenance changes should update `CHANGELOG.md` and, when they change architecture or long-term rationale, `AiFactoryProjectBrief.md`.

## 2. Maintenance cadence

| Area | Cadence | Current method | Action |
| --- | --- | --- | --- |
| Hugging Face model specifications | Monthly on the 1st | Automated GitHub Action | Review failures and meaningful model changes |
| Artificial Analysis capability data | Weekly on Monday | Automated GitHub Action | Review failures and discovery candidates |
| Registry reconciliation | Daily and after `data/**` changes | Automated GitHub Action | Investigate any reconciliation failure |
| NVIDIA DGX / on-prem pricing | Monthly or when NVIDIA/CDW portfolio changes | Manual | Re-verify loaded system pricing and derived GPU Sizing prices |
| Cloud GPU pricing | Monthly | Manual | Re-verify provider list rates and confidence labels |
| Managed API pricing snapshot | Monthly and when public rates change | Manual first-party review | Re-verify selected model/rate pairs, verification dates, source links, special terms, and staleness disclosures; retain the last successful snapshot on refresh failure |
| Pricing provenance | With every pricing refresh | Manual | Update verification dates only after actual source review |
| GPU performance factors | Quarterly or after major MLPerf/NVIDIA release | Manual | Re-check performance anchors and provisional factors |
| Inference Economics evidence | Quarterly or after new qualified benchmark/hardware evidence | Manual | Re-check model, precision, GPU count, serving scenario, replica eligibility, and topology suppression before extending supported fleets |
| Open-weight model catalog | Monthly plus major model releases | Automated discovery plus manual curation | Add models deliberately to canonical registry |
| NVIDIA NIM compatibility | As needed | Manual-only workflow | Do not schedule until a production-backed endpoint is validated |
| Dependencies | Quarterly or for security-critical updates | Manual | Review package updates and breaking changes |
| Full live regression | After meaningful releases | Manual/browser automation | Verify end-to-end deployed behavior |
| Service health and billing | Quarterly | Manual | Review Vercel, Supabase, Resend, Cloudflare, Slack, GitHub, HF, and AA |
| Governance/readiness source review | Quarterly or after major standards changes | Manual | Confirm primary-source citations and wording remain current |
| Documentation review | After meaningful release and quarterly | Manual | Refresh README, changelog, runbook, service inventory, and project brief as needed |

### Weekly maintenance review queue

`.github/workflows/maintenance-review.yml` runs Monday at 13:30 UTC (or on manual dispatch) and keeps one GitHub issue, **AI Factory: weekly maintenance review**, current. It stores the Markdown report, a structured shadow observation JSON artifact, and the job summary. The issue receives one dated observation comment per UTC day, preserving the history when the issue body is replaced; same-day reruns update that comment. `scripts/maintenanceWatch.mjs` reports TCO and managed API pricing ages, non-listed/quote cloud rows, IE evidence review tasks, and read-only Azure Retail Prices API candidates for four exact GPU VM SKU/region pairs. Source errors and ambiguous meters are reported, not converted to prices. No source registry, verification date, methodology, or customer-facing result is changed by this job.

The Azure comparison is a **candidate signal**, not a verified Linux On-Demand price: check the product, meter, region, purchase basis, currency, GPU count, and any provider changes before a pricing PR. Follow `docs/cloud-pricing-shadow-rollout.md` for the four-run observation period, provider coverage and promotion gates. The workflow does not collect AWS, Google Cloud, Oracle Cloud, CoreWeave, NVIDIA price-book, or managed API provider prices yet; their review tasks remain in the issue. The independent managed API freshness action still fails once the 14-day snapshot threshold is crossed, until the underlying rates are actually re-verified. A refreshed issue or successful source request is not verification.

## 3. Automated model-data jobs

### Hugging Face model specifications

Workflow: `.github/workflows/sync-model-specs.yml`

- Scheduled for 06:00 UTC on the first day of each month.
- Can also be run manually with `workflow_dispatch`.
- Uses GitHub Actions secret `HF_TOKEN`.
- Writes `data/model_specs.json`.
- Tracked gated models require the Hugging Face account behind the token to have accepted the applicable model terms.
- A read-only Hugging Face token is sufficient for the current use case.

After a run:

1. Confirm the workflow succeeded.
2. Review the generated commit if data changed.
3. Check for unexpected license, context-length, parameter-count, architecture, modality, or lifecycle changes.
4. If a tracked model disappears or returns incomplete data, investigate before treating the snapshot as authoritative.

Run this out of cycle when a major tracked model receives a material model-card/config change or when a newly released model is deliberately added to the canonical registry.

### Artificial Analysis capability data

Workflow: `.github/workflows/sync-capability-scores.yml`

- Scheduled for 06:00 UTC every Monday.
- Can also be run manually.
- Uses GitHub Actions secret `AA_API_KEY`.
- The existing sync currently uses an Artificial Analysis Free API key. Current [Data API plan descriptions](https://artificialanalysis.ai/data-api) describe Free as internal-use-only and limited to organizations under 150 employees, while the [Data Platform Terms](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf) restrict external distribution and certain competitive model-selection uses. CDW should confirm the existing Model Advisor display and sync rights with the provider/legal before treating this tier as sufficient; paid access alone does not settle all permitted-use questions.
- Writes `data/model_capability_db.json` and `data/aa_discovery_candidates.json`.

After a run:

1. Confirm the workflow succeeded.
2. Review material changes in intelligence, coding, agentic, speed, or pricing fields.
3. Review `data/aa_discovery_candidates.json` for potentially relevant new open-weight models.
4. Never auto-import discovery candidates into production. Add models deliberately through `data/canonical_models.json` after source verification.

### Registry reconciliation

Workflow: `.github/workflows/reconcile.yml`

- Runs daily at 07:00 UTC.
- Runs after changes under `data/**`.
- Can be run manually.
- Validates consistency across the model registries.

A failure should be treated as a data-integrity issue and investigated before relying on the affected model data.

### NVIDIA NIM compatibility

Workflow: `.github/workflows/sync-nim-compatibility-MANUAL-ONLY.yml`

This workflow is intentionally unscheduled. The repository does not yet have a confirmed, production-backed NVIDIA catalog-wide NIM compatibility endpoint.

Do not add a schedule until:

1. A real supported endpoint is identified.
2. Authentication requirements are understood.
3. The endpoint has been live-tested successfully.
4. The resulting data has been reconciled against the canonical model registry.
5. Failure behavior and provenance are documented.

## 4. Manual pricing refresh procedure

Pricing is currently the most important recurring manual data-maintenance task.

`src/pricingRegistry.js` is the shared source of truth for cloud GPU rates and NVIDIA/DGX loaded system economics used by TCO and GPU Sizing. `src/pricingProvenance.js` separately owns verification dates and staleness logic. GPU Sizing derives its loaded per-GPU planning prices from the shared on-prem system records rather than maintaining a second price table.

### Current provenance policy

`src/pricingProvenance.js` currently defines:

- Review due after 45 days.
- Stale after 90 days.
- Current cloud-rate verification baseline: 2026-09-01, after the first formal provider-by-provider refresh.
- Current on-prem pricing verification baseline: 2026-09-08, for current Blackwell DGX hardware from the NVIDIA NPN Public Price List 202609. H200 retains its prior DGX TCO-tool basis.

Under the current implementation (`age > 45` for review, `age > 90` for stale), the cloud baseline first shows review on 2026-10-17 and stale on 2026-12-01. The on-prem baseline first shows review on 2026-10-24 and stale on 2026-12-08 if not refreshed earlier. Treat the two provenance dates independently; dates must only advance after source review.

### 4.1 NVIDIA / on-prem pricing

Primary items to verify:

- DGX H200
- DGX B200
- DGX B300
- DGX GB200 NVL-72
- DGX GB300 NVL-72
- Professional services assumptions where tied to system class
- NVIDIA AI Enterprise/software assumptions where tied to system class
- Rack/system density assumptions when the hardware platform changes materially

Procedure:

1. Capture the current NVIDIA/CDW-supported pricing source used for the comparison, preferably the NVIDIA DGX TCO tool or another authoritative current source.
2. Compare each current value against `ONPREM_SYSTEMS` in `src/pricingRegistry.js`.
3. Determine whether any changed value is a pricing change, a product/configuration change, or a source-definition change.
4. Update the shared on-prem registry only after the source is understood. Do not add a local `SYSTEMS` table back into TCO or a `GPU_PRICE_USD` table back into GPU Sizing.
5. Run `node scripts/validate_pricing_registry.mjs` and confirm GPU Sizing's derived per-GPU planning prices still reconcile to the shared loaded-system economics.
6. Update `ONPREM_PRICING_VERIFIED_AT` in `src/pricingProvenance.js` only after the underlying values have actually been reviewed.
7. Build the app and run representative TCO and GPU Sizing scenarios.
8. Run the TCO Excel-to-JavaScript parity gate for any TCO-relevant economics change.
9. Verify the deployed site after deployment.
10. Record the refresh in `CHANGELOG.md` if values changed materially or the source methodology changed.

### 4.2 Cloud GPU pricing

Provider records currently represented in the shared TCO pricing architecture include AWS, Azure, Google Cloud, Oracle Cloud, and CoreWeave. Customer-facing eligibility is separate from internal modeling: the current selectable/rankable provider set is AWS, Azure, Google Cloud, and Oracle Cloud. CoreWeave remains internally preserved but customer-facing disabled while commercially ineligible.

#### Canonical provider pricing basis

Use the following basis consistently so monthly refreshes do not mix incomparable purchasing models:

| Provider | Canonical `od` basis | Primary source | Special handling |
| --- | --- | --- | --- |
| AWS | Linux EC2 standard On-Demand in `us-east-1`, normalized by physical GPU count | AWS public EC2 price catalog | Capacity Blocks are a cross-check, not a substitute for standard On-Demand. If no standard On-Demand catalog row exists, retain `QUOTE` or an explicitly documented proxy. |
| Azure | Linux Pay-As-You-Go retail price for a canonical GPU VM SKU in a documented US region, normalized by GPU count | Azure Retail Prices API | Region availability differs. Use the documented canonical region for each SKU and do not substitute Windows pricing. |
| GCP | Explicitly labeled accelerator-optimized On-Demand in Iowa `us-central1`, normalized by GPU count | Google Cloud accelerator-optimized pricing | If On-Demand is `N/A`, use only an explicitly named public proxy such as DWS Calendar Mode and label it accordingly, or use `QUOTE`. Never silently substitute Spot or CUD pricing. |
| OCI | Pay As You Go GPU-per-hour rate | Oracle Cloud PaaS and IaaS Global Price List | Oracle already publishes normalized GPU-per-hour rates, so no node normalization is needed. |
| CoreWeave | North America On-Demand node price divided by GPU count | CoreWeave public pricing page | If On-Demand says `Contact sales`, keep the row `QUOTE`; do not substitute Spot pricing. |

Cloud Pricing Refresh #1 was completed on September 1, 2026 using this policy. Confidence labels remain part of the data model: `LISTED` for directly supported public prices, `NODE-NORM` for a transparent public node/proxy normalization, `EST` for a defensible estimate, and `QUOTE` when a dependable public rate is unavailable. A `QUOTE` row may retain a numeric planning placeholder so the calculator can run, but the placeholder must not be represented as a current provider list price.

Procedure:

1. Check current provider pricing using primary provider pricing pages or APIs where practical.
2. Cross-check difficult or ambiguous SKUs against reputable current market trackers when useful.
3. Verify each GPU class represented in the current `RATES` table.
4. Preserve and reconsider per-record confidence labels such as `LISTED`, `NODE-NORM`, `EST`, and `QUOTE` rather than silently turning estimates into facts.
5. Re-check the reserved-pricing assumption when provider economics change. Do not assume the current discount relationship will remain valid indefinitely.
6. Update `CLOUD_GPU_RATES` in `src/pricingRegistry.js` only after source review. Do not add provider price tables back into `TcoCalculator.jsx`.
7. Update `CLOUD_RATES_VERIFIED_AT` in `src/pricingProvenance.js` only after the underlying rate card has actually been re-verified.
8. Run representative spend-basis and workload-basis TCO scenarios across multiple providers and GPU classes.
9. Verify the deployed site after deployment.
10. Record material changes in `CHANGELOG.md`.

### 4.3 Shared pricing registry architecture

`src/pricingRegistry.js` is now the canonical value layer for cloud GPU rates and NVIDIA/DGX loaded on-prem system economics. TCO imports those registries directly. GPU Sizing derives its loaded per-GPU planning prices from the shared on-prem system records, so a system-cost refresh no longer requires a second hand-maintained GPU price table.

Rules:

1. Update a pricing value in the shared registry only after reviewing the appropriate source and confidence classification.
2. Update `src/pricingProvenance.js` only when the corresponding underlying rate card has actually been re-verified.
3. Do not introduce local `RATES`, `SYSTEMS`, or `GPU_PRICE_USD` pricing tables inside the calculating tools.
4. Run `node scripts/validate_pricing_registry.mjs` after pricing-architecture or value changes. The permanent quality gate runs this automatically for relevant changes.
5. Run the TCO Excel-to-JavaScript parity gate after any TCO-relevant pricing change.
6. Verify the deployed site after a material pricing refresh before calling the new data live-verified.


### 4.4 GPUaaS commercial eligibility maintenance

Provider pricing/model presence and customer-facing commercial eligibility are separate concerns.

1. `src/pricingRegistry.js` may preserve a provider's pricing/provenance/modeling data even when that provider is not customer-facing eligible.
2. Best-Value GPUaaS and provider selectors must honor the eligibility/display metadata rather than hard-coding provider names in ranking logic.
3. Current customer-facing providers are AWS, Azure, Google Cloud, and Oracle Cloud.
4. CoreWeave remains internally preserved but customer-facing disabled in the current CDW context because no reseller agreement is in place.
5. Re-enable a provider only after the commercial status is explicitly confirmed and the full quality gate passes.
6. Add future neoclouds such as Nebius through the provider configuration/registry architecture, with pricing-source review, confidence/provenance classification, commercial eligibility confirmation, and regression validation before customer exposure.
7. Customer-facing copy should use `Google Cloud` and `Oracle Cloud`; legacy GCP/OCI aliases may remain internally for backward compatibility.

### 4.5 TCO workload growth vs. cloud unit-price trend governance

Keep these variables conceptually and operationally separate:

- **Workload growth** is the production TCO assumption for increased consumption over time.
- **Cloud GPU unit-price trend** is a production sensitivity, defaulting to 0%/year. When changed, it affects modeled cloud GPU compute unit rates; non-compute costs retain their existing treatment. The selected assumption is persisted and disclosed in report/audit language.
- PR #37's preview-only control is historical; the September 8 production activation superseded it. Keep the default-zero baseline and the workload-growth distinction in regression coverage.

Before changing the current production unit-price trend methodology:

1. Define which cloud cost components the trend applies to: GPU compute only, software uplift, storage, egress, or another explicitly scoped subset.
2. Define annual compounding and the exact relationship to the separate workload-growth assumption.
3. Decide whether Existing Cloud Spend and Workload Requirement modes use the same unit-price treatment or require mode-specific rules.
4. Decide whether user-entered/custom cloud rates trend from the entered Year-1 rate or remain fixed unless explicitly opted in.
5. Decide how Best-Value GPUaaS provider ranking should use the trend, if at all.
6. Update the companion workbook/reference implementation if the production TCO engine changes in a way covered by Excel-to-JavaScript parity.
7. Maintain source-level tests and browser regressions proving 0% reproduces the baseline and positive/negative trends compound as intended.
8. Re-run the full permanent quality gate and perform representative live checks before calling a changed methodology production-ready.
9. Update `CHANGELOG.md`, `AiFactoryProjectBrief.md`, the relevant current-state methodology document, and this runbook.

Do not mix this work with future capacity-ramp modeling. Purchased future headroom versus current utilized workload is a separate modeling question.

### 4.6 Inference Economics evidence and managed API rates

1. Treat `src/inferenceEconomicsEvidence.js`, `src/inferenceEconomicsThroughput.js`, and `src/inferenceScaleoutClassification.js` as the source for supported benchmark configurations and deployment guardrails. Do not infer absolute throughput from peak FLOPS or extrapolate a model-parallel topology from a larger GPU count. Verify model fit within one benchmark-sized serving group before approving whole-group replica aggregation; preserve explicit suppression when evidence is insufficient.
2. Check that demand is useful output tokens, assigned private cost includes the intended allocation, and the required production-throughput factor validates capacity over the horizon. Re-run the relevant IE source checks and cross-tool browser journey after changing evidence, connector, or capacity behavior.
3. Maintain public managed API rates in `src/managedApiPricingRegistry.js` only after first-party verification. Review model identity, input/output prices, cache and long-context exceptions, source URL, verification date, and snapshot staleness. Newly added rows carry their own verification date; the snapshot-level date remains the oldest first-party verification, so adding one model does not re-verify the existing rates. A failed future refresh should leave the last successful snapshot available; an override should be labeled as user supplied.
4. `src/managedApiPricingSource.js` holds BenchLM as a future adapter with commercial-use status unresolved and activation on hold. Do not call it or present its rates as live without resolving rights, provenance, implementation, and validation.
5. `.github/workflows/managed-api-catalog-watch.yml` compares first-party IE snapshot model IDs and prices to models.dev nightly, with a provider-aware LiteLLM cross-check. It stores read-only artifacts and maintains a rolling issue. Use `docs/managed-api-catalog-automation.md` to triage deltas, catalog failures, and new-model candidates; a successful source read never advances the first-party verification date or adds a model.
6. Distinguish source verification, deployed-site checks, and CDW review. A merged PR or healthy route does not grant pricing, methodology, or external approval. Consult `docs/inference-economics-scaleout-methodology.md` and `docs/inference-economics-model-parallel-calibration.md` as design/evidence notes, then inspect current source for implemented behavior.

## 5. Model-catalog refresh procedure

When a meaningful new open-weight model is released:

1. Determine whether it belongs in the customer-facing Model Advisor scope.
2. Verify official model identity and Hugging Face model ID.
3. Verify license, parameter count, context length, modality, architecture, and lifecycle status using primary sources.
4. Add a deliberate canonical entry and aliases to `data/canonical_models.json`.
5. Add or update the Hugging Face tracked model list if required.
6. Run the Hugging Face sync manually.
7. Run the Artificial Analysis sync manually if the model is present there.
8. Run registry reconciliation.
9. Confirm Model Advisor eligibility/ranking behavior.
10. Confirm the Model Advisor to GPU Sizing handoff normalizes the model ID correctly.
11. Run at least one GPU Sizing scenario for the new model.
12. Update the project brief if the addition materially changes supported capabilities or model-selection architecture.
13. Record the addition in `CHANGELOG.md`.

Do not treat an Artificial Analysis discovery candidate as production-ready merely because it appears in the discovery file.

## 6. GPU and performance-data review

Perform quarterly and after major NVIDIA or MLPerf releases.

Review:

- Current CDW-purchasable GPU classes.
- Whether a newly released NVIDIA class should appear in GPU Sizing, TCO, both, or neither.
- Inference throughput anchors.
- Training performance assumptions and MFU defaults.
- TCO generational capability factors.
- Any factor still labeled provisional or estimated.
- Node-size assumptions and NVLink/NVL architecture implications.
- Whether Dev/Test/POC alternatives remain appropriately separated from production datacenter recommendations.

If a class is removed from the purchase catalog, decide separately whether it should remain available on the cloud/rental comparison side.

## 7. Full live regression checklist

Run after meaningful source changes, pricing refreshes that affect calculations, auth/backend changes, cross-tool handoff changes, or before declaring a new stable release.

### Build and smoke

- `npm install` succeeds from a fresh clone when dependency state changes.
- `npm run build` succeeds.
- No new material console errors on the deployed site.
- Landing page loads all seven tool tiles, including Inference Economics; My Summary is a separate signed-in route.

### End-to-end journey

Exercise:

1. Use Case Explorer
2. Model Advisor
3. GPU Sizing
4. TCO
5. Guided Inference Economics (also test a direct GPU Sizing handoff)
6. ROI
7. My Summary

Verify:

- Forward handoffs preserve intended values and provenance.
- Back/Forward navigation does not replay stale URL handoffs.
- Hard refresh preserves expected session state.
- Bare-URL returns do not silently revert planning basis.
- Canonical model ID, exact model parameter count, and inference quantization survive Advisor/GPU Sizing/TCO handoffs where applicable.
- Legacy size-only TCO sessions migrate deterministically to `Custom` without inventing a named-model identity.
- Custom-model handoffs preserve `Custom` identity, exact parameter count, and quantization.
- Back/Forward and refresh do not replay consumed model-context URL parameters over later persisted edits.
- GPU Sizing technical count/source class/target system reach TCO correctly and remain the upstream technical subject.
- When TCO is entered from GPU Sizing, the on-prem target is locked; changing the technical design requires returning to GPU Sizing.
- TCO-owned economic/planning assumptions survive a fresh sizing handoff unless the upstream change directly invalidates them.
- Cloud GPU class follows the sizing class by default, while an explicit TCO cloud-class override remains explicit and survives later sizing changes.
- User cloud rates remain scoped by provider + GPU class, and on-prem overrides remain scoped by target system.
- TCO cost values and planning basis reach ROI correctly.
- TCO fleet, horizon, and inference-attributable cost reach Guided IE; direct GPU Sizing entry asks for private cost instead of inventing it.
- IE input edits persist through navigation; capacity shortfall suppresses economics, and the report/audit identifies the benchmark or replica basis.
- IE -> ROI carries upfront/recurring investment only when a defensible original TCO split is available; standalone IE requires ROI input confirmation.
- Directly entered ROI values are not mislabeled as TCO-derived.

### Tool-specific checks

TCO:

- Spend-basis scenario.
- Workload-requirement scenario.
- Multiple cloud providers.
- At least one NVL system class.
- For GB200/GB300 NVL72, check one-rack workload and spend results remain directional until a scenario-specific quote/coverage review. Verify a facility, fleet, storage, or rate change invalidates the review. An Equinix scenario also needs a quoted NVL72 bundle override; Rubin Phase 1 remains directional. For client work, reconcile rack, cooling, power distribution, fabric, installation, selected software, and facility/operating costs against the actual customer/CDW quote or documented facility coverage; a user-entered reference is not independently checked by the tool.
- 1-year, 3-year, and 5-year horizons.
- No-crossover case.
- Capacity-exhaustion behavior.
- Calculation Methodology & Audit Trail.

GPU Sizing:

- Inference simple mode.
- Inference advanced mode.
- Training/fine-tuning.
- Custom model.
- Zero/invalid input handling.
- Node rounding.
- Alternatives behavior.
- Calculation Methodology & Audit Trail.

Model Advisor:

- Hard filters.
- Primary workload ranking.
- General-model route.
- Infrastructure-first route.
- Specialized-stack route.
- Fallback/other qualifying models.
- Recommendation Methodology & Decision Trace.

ROI:

- Direct-entry scenario.
- TCO-prefilled scenario.
- Prefilled then adjusted scenario.
- Negative ROI scenario.
- Report horizon consistency.
- Calculation Methodology & Audit Trail.

Inference Economics:

- Standalone, TCO handoff, and direct GPU Sizing entry.
- Demand-bound output-token estimate, production-throughput capacity gate, and later-year shortfall.
- Exact benchmark and whole benchmark-sized replica group; unsupported topology suppresses the estimate.
- First-party managed API snapshot, explicit rate override, stale-rate disclosure, report/PDF, and audit trail.

Readiness:

- Checklist persistence.
- Status changes.
- Report generation.
- Long/verbose output formatting.

My Summary:

- Signed-out state.
- Account setup state.
- Loading state.
- Empty state.
- Populated multi-tool state.
- Latest snapshot behavior.
- Print/PDF.

### Auth, report, and notification checks

- Magic-link login succeeds with a known-working external test address.
- Existing completed profiles skip contact gates.
- Report downloads create the expected database event.
- Slack download notification fires.
- Combined Summary notification identifies included tools.
- Print/PDF output renders without clipping or obvious missing content.
- Resend delivery remains functional.

### Accessibility smoke checks

- Main form inputs retain programmatic labels.
- Collapsible controls expose expanded/collapsed state.
- Keyboard navigation remains usable.
- No obvious contrast regressions in newly changed UI.

## 8. Quarterly service and dependency review

Review `ServiceInventory.md` and confirm:

- Vercel project remains connected to the intended repo/branch.
- Required Vercel environment variables still exist.
- Supabase project, database, Auth, RLS/GRANTs, Edge Functions, and storage tables remain healthy.
- Resend SMTP remains connected to Supabase Auth.
- Cloudflare domain registration and DNS remain in good standing.
- Slack webhook notification path still works.
- GitHub Actions secrets required by scheduled jobs are valid.
- Hugging Face gated-model access has not been revoked.
- Artificial Analysis API key remains valid.
- Dependency updates do not introduce known breaking changes.

Use `npm outdated` or equivalent dependency review tooling when appropriate, but do not upgrade production dependencies solely because a newer version exists. Review release notes and regression-test meaningful upgrades.

### Dependency-security disposition baseline

The first advisory-level review was completed September 2, 2026. The current `npm audit` result is 6 package-level findings: 3 moderate, 3 high, and 0 critical. Do not summarize this merely as an unresolved count; preserve the disposition:

- **Vite / esbuild:** current findings concern development-server behavior. The deployed Vercel application is a compiled build, so these are not treated as evidence of an active production exploit path. Upgrade Vite deliberately on an isolated change and run the permanent quality gate rather than using a force upgrade.
- **React Router:** the SSR constructor-injection advisory is not applicable to the current declarative `BrowserRouter`/`Routes` architecture. The open-redirect advisory remains relevant to affected versions, but current source uses fixed internal routing destinations. Plan a controlled upgrade and regression pass.
- **PptxGenJS / image-size:** current high-severity advisories concern malformed image parsing and denial of service. The offline Client Summary path validates `clientLogoPath` before PptxGenJS sees it: only PNG/JPG/JPEG are accepted, files are capped at 10 MiB, signatures must match, dimensions are capped at 10,000 x 10,000, and total decoded size is capped at 40,000,000 pixels. Permanent coverage lives in `tests/safe-image-input.cjs` and the quality gate. Path containment is intentionally deferred until the workflow has a defined staging-root contract or becomes upload-driven.

Re-run `npm audit --json` during dependency reviews and update this section only when the advisory set or disposition materially changes.

## 9. Event-driven maintenance triggers

Perform an out-of-cycle review when any of the following occurs:

- NVIDIA launches a materially new datacenter GPU or DGX platform.
- CDW changes which NVIDIA systems are sold new in the relevant customer context.
- AWS, Azure, GCP, OCI, or CoreWeave materially changes GPU pricing or SKU structure.
- A major new open-weight model becomes customer-relevant.
- Hugging Face changes gated-model access or metadata behavior.
- Artificial Analysis changes API fields/tiering used by the project.
- NVIDIA exposes a reliable NIM catalog endpoint.
- NIST or another primary governance authority materially updates guidance used by Readiness.
- Supabase, Vercel, Resend, or React platform changes affect the implementation.
- A user reports a calculation, persistence, auth, PDF, or handoff defect.

## 10. Internal versioning and release closeout

Versioning exists for internal engineering history, auditability, maintenance, and recovery. Do not add suite version labels prominently to the customer-facing site unless a business reason is established later.

### 10.1 Release naming policy

Use calendar versioning for validated suite releases:

- First validated release in a month: `AI Factory Suite YYYY.MM` with Git tag `vYYYY.MM`.
- Additional validated releases in the same month: append `.1`, `.2`, and so on.
- Example: the first October 2026 release is `AI Factory Suite 2026.10` / `v2026.10`; a second validated October release is `AI Factory Suite 2026.10.1` / `v2026.10.1`.
- Git tags and GitHub Releases are authoritative and immutable. Never move, overwrite, or reuse an existing release tag.
- Individual tools do not maintain authoritative independent versions. Tool-specific changes are recorded within the suite release record.

The first formal known-good baseline is `AI Factory Suite 2026.09` / `v2026.09`, validated commit `31fdb2ff2a321f6101bfa72d3c45b4c31aa3a0eb`.

### 10.2 Between releases

Do not create a new release identifier for every commit.

- Normal development continues on `main`.
- Meaningful unreleased work is recorded under `Unreleased` in `CHANGELOG.md`.
- At any point, compare the latest stable tag to current `main` to determine exactly what has changed since the validated baseline.
- A future session should be able to answer "what changed since `vYYYY.MM`?" from Git history rather than from AI memory.

### 10.3 Package metadata transition

`package.json` transitioned to `2026.9.1` with the validated `AI Factory Suite 2026.09.1` release. The earlier `v2026.09` tag remains immutable with its historical metadata.

For current and future stable releases:

- Mirror the internal suite release in `package.json` using SemVer-safe numeric formatting.
- Human release `2026.09.1` maps to package version `2026.9.1`; SemVer numeric components do not use leading zeroes.
- Human release `2026.10` maps to package version `2026.10.0`.
- Human release `2026.10.1` maps to package version `2026.10.1`.
- The Git tag/GitHub Release remains authoritative if package metadata ever disagrees.
- The package is private and is not being versioned for npm publication; the field is an additional internal consistency marker only.

### 10.4 Required release record

Use `ReleaseRecordTemplate.md` as the checklist and drafting structure for every validated release. The release record should capture:

- release name, tag, exact commit, date, previous release, and comparison range;
- meaningful changes by tool and shared platform area;
- why material changes were made;
- data state at release time, including NVIDIA/on-prem pricing verification, cloud pricing verification, Hugging Face snapshot, Artificial Analysis snapshot, and other material reference data;
- validation performed and exact pass/fail evidence;
- defects found and corrected during the release cycle;
- services, dependencies, secrets/configuration names, or infrastructure that changed;
- known limitations and open items carried forward;
- source-verified, live-verified, and externally approved status kept separate;
- rollback/recovery target and immutable tag identity.

The detailed release record belongs primarily in GitHub Release notes plus the corresponding `CHANGELOG.md` entry. `AiFactoryProjectBrief.md` should be updated only when the release creates durable architecture, methodology, validation-history, data-source, or roadmap knowledge.

### 10.5 Release closeout procedure

For a meaningful stable release:

1. Identify the intended release scope and keep all incomplete work under `Unreleased`.
2. Confirm all intended source changes are committed to `main`.
3. Review the comparison from the previous stable tag to current `main`.
4. Prepare the release record using `ReleaseRecordTemplate.md`.
5. Record the data/pricing state that the release relies on.
6. Update `CHANGELOG.md` with the release-level changes and move the appropriate items out of `Unreleased`.
7. Update package metadata beginning with the next release after `v2026.09`.
8. Run the permanent quality gate and all relevant source-level tests.
9. Verify the deployed application for the release scope.
10. Run credentialed/manual checks when the release affects auth, reports, database events, Slack notifications, or PDF presentation.
11. Classify status accurately as source-verified, live-verified, and externally approved where applicable.
12. Update `AiFactoryProjectBrief.md` only for durable architecture, validation, rationale, data-source, or roadmap changes.
13. Update this runbook or `ServiceInventory.md` if maintenance responsibilities, services, tiers, credential locations, dependencies, or failure modes changed.
14. Only after the required validation passes, create the immutable Git tag and GitHub Release for the exact validated commit.
15. Confirm the release record names the exact tag and commit and that `main` may subsequently move ahead without changing the frozen release.

## 11. Current assurance baseline and remaining backlog

As of September 5, 2026, after PR #25:

### Completed and now permanent

1. `AI Factory Suite 2026.09.1` shipped September 4 with package metadata `2026.9.1`; the release/tag history is immutable.
2. The automated TCO Excel-to-JavaScript parity suite remains in GitHub Actions and the canonical `EngineRegression` fixture passes 20/20 comparisons against the production JavaScript engine.
3. Shared pricing/model registry validators, GPU Sizing -> TCO ownership guards, SafeImageInput bounds, Best-Value GPUaaS/provider-eligibility guards, Global Reset contracts, Combined Summary presentation/consistency checks, and cross-tool/model-context browser regressions are part of the permanent assurance surface.
4. All five report-producing tools have approved print/PDF layouts; the GPU Sizing Recommended-card print hierarchy was additionally confirmed in production on Windows after PR #24.
5. Combined Summary/My Summary now uses a curated per-tool presentation schema, warns on likely mixed scenarios, and compares DGX/NVL capacity in GPU-equivalent units.
6. The Phase 1 authenticated front door is current production behavior. Browser assurance is intentionally split between signed-out production/front-door checks and protected-tool journeys in the local auth-bypassed test build.
7. Best-Value GPUaaS is current in TCO Workload Requirement mode, and provider commercial eligibility is configuration-driven. CoreWeave remains modeled internally but customer-facing disabled in the current CDW context.

### Current technical maintenance backlog

1. Maintain cloud and on-prem pricing through the shared registry/provenance process and revalidate provider commercial eligibility before changing customer-facing availability.
2. Run credentialed/manual checks when a change affects real magic-link delivery, account setup, My Summary persistence, Global Reset server-side deletion, report/download events, Slack side effects, or PDF presentation not fully represented in automation.
3. Establish production-backed NVIDIA NIM compatibility sync only after a supported catalog-wide endpoint is identified and validated.
4. Execute controlled Vite/esbuild and React Router upgrades separately with full regression validation rather than force-upgrading around audit findings.
5. Continue monitoring the PptxGenJS/image-size upstream path while retaining SafeImageInput mitigation.
6. Keep email-domain restrictions deferred until explicitly revisited.
7. Add future NeoCloud providers only through the provider configuration/eligibility architecture with pricing-source review, provenance/confidence classification, commercial confirmation, and regression validation before customer exposure.

These priorities are technical assurance priorities, not a substitute for business or CDW publication priorities.

## 12. Authentication-aware browser regression

The Phase 1 authenticated front door creates two intentional browser-test contexts:

- **Preview/production:** signed-out users should receive the authenticated front door. Live tests verify route health and that protected tool navigation is not exposed before authentication.
- **Local auth-bypassed build:** tool-internal journeys, calculations, state handoffs, Back/Forward behavior, and other protected UI regressions run locally with the test-only `E2E_AUTH_BYPASS` signal.

Rules:

1. Never enable the auth bypass in production or expose it as a Vite client variable.
2. A production regression that expects protected tool internals while signed out is testing the wrong context.
3. After authentication/front-door changes, run both the live route/front-door checks and the local protected-tool regression suite.
4. Credentialed manual checks remain appropriate for real magic-link delivery, account setup, My Summary persistence, Global Reset server-side deletion, report/download events, and Slack side effects where automation does not hold real credentials.
