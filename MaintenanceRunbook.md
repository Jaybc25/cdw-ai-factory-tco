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
| Pricing provenance | With every pricing refresh | Manual | Update verification dates only after actual source review |
| GPU performance factors | Quarterly or after major MLPerf/NVIDIA release | Manual | Re-check performance anchors and provisional factors |
| Open-weight model catalog | Monthly plus major model releases | Automated discovery plus manual curation | Add models deliberately to canonical registry |
| NVIDIA NIM compatibility | As needed | Manual-only workflow | Do not schedule until a production-backed endpoint is validated |
| Dependencies | Quarterly or for security-critical updates | Manual | Review package updates and breaking changes |
| Full live regression | After meaningful releases | Manual/browser automation | Verify end-to-end deployed behavior |
| Service health and billing | Quarterly | Manual | Review Vercel, Supabase, Resend, Cloudflare, Slack, GitHub, HF, and AA |
| Governance/readiness source review | Quarterly or after major standards changes | Manual | Confirm primary-source citations and wording remain current |
| Documentation review | After meaningful release and quarterly | Manual | Refresh README, changelog, runbook, service inventory, and project brief as needed |

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
- Current architecture uses the Artificial Analysis free API tier.
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

The current implementation has cloud rates and on-prem system pricing embedded in source, while `src/pricingProvenance.js` centralizes the verification dates and staleness logic. GPU Sizing also contains derived per-GPU pricing that must remain aligned with TCO.

### Current provenance policy

`src/pricingProvenance.js` currently defines:

- Review due after 45 days.
- Stale after 90 days.
- Current cloud-rate verification baseline: 2026-08-07.
- Current on-prem pricing verification baseline: 2026-08-07.

Using that baseline, the current data reaches its 45-day review point on 2026-09-21 and its 90-day stale point on 2026-11-05 if it is not refreshed earlier.

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
2. Compare each current value against the TCO `SYSTEMS` registry in `src/TcoCalculator.jsx`.
3. Determine whether any changed value is a pricing change, a product/configuration change, or a source-definition change.
4. Update the TCO `SYSTEMS` registry only after the source is understood.
5. Recalculate and update the corresponding GPU Sizing `GPU_PRICE_USD` values in `src/GpuSizingCalculator.jsx` so they remain aligned.
6. Update `ONPREM_PRICING_VERIFIED_AT` in `src/pricingProvenance.js` only after the underlying values have actually been reviewed.
7. Build the app and run representative TCO and GPU Sizing scenarios.
8. Verify the deployed site after deployment.
9. Record the refresh in `CHANGELOG.md` if values changed materially or the source methodology changed.

### 4.2 Cloud GPU pricing

Providers currently represented in TCO include AWS, Azure, GCP, OCI, and CoreWeave.

Procedure:

1. Check current provider pricing using primary provider pricing pages or APIs where practical.
2. Cross-check difficult or ambiguous SKUs against reputable current market trackers when useful.
3. Verify each GPU class represented in the current `RATES` table.
4. Preserve and reconsider per-record confidence labels such as `LISTED`, `NODE-NORM`, `EST`, and `QUOTE` rather than silently turning estimates into facts.
5. Re-check the reserved-pricing assumption when provider economics change. Do not assume the current discount relationship will remain valid indefinitely.
6. Update `RATES` in `src/TcoCalculator.jsx` only after source review.
7. Update `CLOUD_RATES_VERIFIED_AT` in `src/pricingProvenance.js` only after the underlying rate card has actually been re-verified.
8. Run representative spend-basis and workload-basis TCO scenarios across multiple providers and GPU classes.
9. Verify the deployed site after deployment.
10. Record material changes in `CHANGELOG.md`.

### 4.3 Pricing architecture improvement

The long-term preferred design is a shared pricing registry under a dedicated data layer so TCO and GPU Sizing do not maintain duplicate pricing tables. Until that exists, every on-prem pricing refresh must explicitly reconcile both tools.

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
- Landing page loads all six tools.

### End-to-end journey

Exercise:

1. Use Case Explorer
2. Model Advisor
3. GPU Sizing
4. TCO
5. ROI
6. My Summary

Verify:

- Forward handoffs preserve intended values and provenance.
- Back/Forward navigation does not replay stale URL handoffs.
- Hard refresh preserves expected session state.
- Bare-URL returns do not silently revert planning basis.
- Model identifiers normalize correctly between Advisor and GPU Sizing.
- GPU Sizing technical count reaches TCO correctly.
- TCO cost values and planning basis reach ROI correctly.
- Directly entered ROI values are not mislabeled as TCO-derived.

### Tool-specific checks

TCO:

- Spend-basis scenario.
- Workload-requirement scenario.
- Multiple cloud providers.
- At least one NVL system class.
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

## 10. Release closeout procedure

For a meaningful release:

1. Confirm all intended source changes are committed to `main`.
2. Run the relevant source-level tests.
3. Verify the deployed application.
4. Classify status accurately as source-verified, live-verified, and externally approved where applicable.
5. Update `CHANGELOG.md` with the release-level changes.
6. Update `AiFactoryProjectBrief.md` only for durable architecture, validation, rationale, or roadmap changes.
7. Update this runbook if maintenance responsibilities changed.
8. Update `ServiceInventory.md` if a service, tier, credential location, dependency, or failure mode changed.
9. Once the release qualifies as a known-good baseline, create a Git tag/release identifying the exact commit.

## 11. Current high-priority assurance backlog

As of September 1, 2026, the key remaining assurance/maintenance improvements are:

1. Build the automated TCO Excel-to-JavaScript parity suite.
2. Run a fresh full live regression against the current Vercel deployment.
3. Centralize TCO and GPU Sizing pricing into a shared pricing registry.
4. Establish production-backed NIM compatibility sync only after NVIDIA endpoint validation.
5. Continue explicit live verification of report/audit-trail changes as they evolve.

These priorities are technical assurance priorities, not a substitute for business or CDW publication priorities.