# CDW AI Factory Tool Suite

Source repository for the CDW AI Factory tool suite, a Vite + React single-page application focused on AI use-case discovery, open-weight model selection, GPU sizing, cloud vs on-prem TCO, inference economics, ROI, readiness, and consolidated client summaries.

Live application: https://cdw-ai-factory-tco.vercel.app

For architecture, history, validation findings, conventions, and durable project context, read `AiFactoryProjectBrief.md` at the repo root.

For a human-readable history of meaningful milestones and current open items, read `CHANGELOG.md`.

For the September 26 final internal-review readiness state, read the newest addendum in `AiFactoryProjectBrief.md`. The earlier shared-shell and navigation checkpoint is preserved in `docs/history/2026-09-09-current-state-checkpoint.md`.

For the current model catalog, architecture-aware sizing state, capability-evidence rules, and Model Advisor -> GPU Sizing -> TCO ownership contract, read `docs/MODEL_MODERNIZATION_CURRENT_STATE.md`.

## Internal release and version record

Versioning is an internal engineering, audit, maintenance, and recovery mechanism. It is not intended to be displayed prominently in the customer-facing application unless a business reason is established later.

**Current validated releases:** `v2026.09` remains the immutable September 1 baseline, followed by `AI Factory Suite 2026.09.1` released September 4, 2026. Existing release tags/releases are immutable.

**Current source checkpoint for this documentation update:** `main` at `1a15b8344fe63bc125ba3113f717d9bcde7bd034` on September 26, 2026, the merge of PR #191. Post-2026.09.1 work includes the September 9 UX tranche, Rubin/Blackwell evidence and guarded hardware activation, Guided Inference Economics, cross-tool remediation through PR #189, the PR #190 flat-demand TCO baseline, and PR #191 final acceptance-copy cleanup. These changes remain `Unreleased` until a new validated tag is created. Claude's September 26 final internal acceptance review returned **READY** with no material findings. The intended October 5 internal review target is the existing Vercel deployment; `cdwaifactory.com` remains intentionally post-approval.

The suite uses calendar versioning for validated releases:

- First validated release in a month: `AI Factory Suite YYYY.MM`, Git tag `vYYYY.MM`.
- Additional validated release in the same month: append `.1`, `.2`, and so on.
- Changes between validated releases stay under `Unreleased` in `CHANGELOG.md` and do not receive a release identifier merely because code was committed.
- Git tags and GitHub Releases are the authoritative release identity. Existing release tags are immutable and must never be moved or reused.
- Individual tools do not maintain authoritative independent release versions. Their changes are documented inside the suite release record.
- `package.json` transitioned to `2026.9.1` with the validated `AI Factory Suite 2026.09.1` release. The older `v2026.09` tag remains immutable with its historical metadata. Future releases continue to mirror the suite release in SemVer-safe package metadata; numeric SemVer components do not use leading zeroes.

Use `ReleaseRecordTemplate.md` when preparing each future validated release. The release record captures code changes, rationale, data/pricing state, validation evidence, service/dependency changes, known limitations, and external approval status.

## Current tool suite

Routes in the current application:

- `/use-cases` - AI Use Case Explorer
- `/model-advisor` - Open-Weight Model Advisor
- `/gpu-sizing` - GPU Sizing Tool
- `/tco` - Cloud vs On-Prem TCO Calculator
- `/inference-economics` - Guided Inference Economics (standalone or contextual handoff)
- `/roi` - AI Use Case ROI Calculator
- `/readiness` - AI Readiness Checklists
- `/summary` - My Summary for signed-in users

The tools are designed as one connected journey, with state and provenance handoffs where appropriate.

The core ownership chain is **Model Advisor -> GPU Sizing -> TCO -> Inference Economics -> ROI**, with direct GPU Sizing -> Inference Economics and TCO -> ROI paths where appropriate. Model Advisor owns recommendation/selection context, GPU Sizing owns the technical infrastructure requirement, TCO owns economics and planning assumptions, Inference Economics compares demand-bound private inference unit cost against managed API pricing, and ROI owns the capacity/value business case. TCO and IE do not silently re-size the upstream technical deployment.

Inference Economics evaluates expected useful output-token demand against production-serving capacity. The required production-throughput assumption is a feasibility check, not a continuous discount to cost per token. The managed API selector uses a dated first-party snapshot or explicit user override; BenchLM is a disconnected future adapter on hold. See the September 22 project-brief addendum for allocation, evidence, and ROI handoff limits.

The managed API comparison includes first-party verified GPT-6 Sol and GPT-6 Luna rates. Each selected model displays its own verification date; the snapshot-level freshness date remains the oldest verified row so new additions do not conceal older price reviews.

TCO retains its infrastructure cash-flow comparison and clearly labeled directional serving-capacity estimates. Its earlier standalone $8-per-million-token API illustration has been retired; use the TCO handoff to Guided Inference Economics to compare demand-bound private token costs with a named managed API model.

For GB200 and GB300 NVL72, even a single rack has a directional TCO result in both workload and spend modes. A user can record a project quote or existing-facility coverage reference for rack, cooling, power distribution, fabric, installation, selected software, and facility/operating costs; that review remains labeled directional because the tool does not validate the evidence or edit the costs. The generic Equinix bundle needs a positive, distinct NVL72 rate before a review can be recorded. Changing the fleet, facility, storage, or rate-card inputs invalidates the review. Rack-scale retrofit amounts can be entered directly without a generic $2 million cap. Five-year scenarios disclose that renewal after an initial three-year system commercial term is excluded. Rubin Phase 1 remains directional because its quoted high-density infrastructure is excluded. Smaller B200/B300 designs retain their existing planning allowances; workload storage still requires explicit confirmation, and large fleets still require architecture review.

## Current TCO demand/pricing contract

GPU Sizing's node-rounded Recommended production design remains the default, with an explicit Higher-growth alternative selectable for TCO when available. TCO receives the exact selected class/count plus sizing-basis provenance and remains the economics layer rather than re-sizing the workload.

Current TCO production economics use a **flat workload-demand baseline** across the selected horizon. TCO does not assume annual workload growth, increase cloud GPU-hour consumption because of speculative demand growth, or automatically add future on-prem systems when headroom would otherwise be exhausted. The selected on-prem fleet stays fixed to the user-selected technical design. GPU Sizing's explicit Higher-growth alternative remains an upstream sizing choice and, when selected, is priced as that larger fixed design.

The separate **Cloud GPU unit-price trend** remains a production sensitivity input, defaulting to **0%/year**. It changes modeled cloud GPU compute unit rates over time without changing workload quantity, GPU-hours, or on-prem fleet size. Non-compute cloud costs and on-prem recurring operating costs retain their separately disclosed escalation treatment. The selected cloud GPU price trend is persisted and represented in TCO report/audit language.

## Current model-catalog state

The named production catalog currently contains 21 models:

- 13 current/recommended models shown by default.
- 8 existing-deployment models hidden by default behind `Include models for existing deployments`.
- `Custom` remains a separate user-defined sizing option.

The first ten-model modernization tranche is fully activated. The current architecture-aware sizing methodology supports dense, MoE, MLA, DeltaNet/full-attention hybrid, DeepSeek compressed-attention, and Mamba/attention hybrid sequence-state contracts. Exact capability scores are never fabricated merely to fill missing data.

See `docs/MODEL_MODERNIZATION_CURRENT_STATE.md` and `ModelCatalogTranche1.md` for the durable current state and activation history.

## Current platform architecture

- Front end: React 18 + Vite
- Routing: React Router
- Backend services: Supabase Postgres, Auth, and Edge Functions
- Authentication: Phase 1 authenticated front door backed by Supabase Auth; magic-link primary, temporary-password compatibility for provisioned users
- Email delivery: Resend SMTP through Supabase Auth
- Hosting and deployment: Vercel
- Notifications: Slack webhook invoked through a Supabase Edge Function
- Model metadata source: Hugging Face Hub API
- Model capability source: Artificial Analysis API (current Free key; customer-facing rights require review under current published terms)
- Domain/DNS: Cloudflare for `cdwaifactory.com`

The GitHub repository is the source of truth for code and tracked data. Before reviewing or editing a module, fetch its current file from `main` rather than relying on memory, prior chat context, or old exported files.

## Data maintenance and automation

### Automated today

- Hugging Face model-spec sync: monthly on the 1st at 06:00 UTC, plus manual dispatch
- Artificial Analysis capability sync: weekly on Monday at 06:00 UTC, plus manual dispatch
- Managed API catalog shadow comparison: nightly at 10:30 UTC, checks models.dev against the first-party IE snapshot and LiteLLM against exact provider IDs; see `docs/managed-api-catalog-automation.md`. This creates a review issue and does not automatically change IE rates or add models.
- Canonical model-registry reconciliation: daily at 07:00 UTC and on changes under `data/**`
- Weekly maintenance evidence review: Monday at 13:30 UTC; captures Azure GPU VM price candidates, a structured shadow observation, and a dated comment on the rolling review issue. See `docs/cloud-pricing-shadow-rollout.md` for the validation and expansion plan; prices are not automatically changed.

Relevant workflows live under `.github/workflows/`.

### Manual or partially manual today

- NVIDIA DGX loaded system pricing used by TCO and GPU Sizing
- Cloud GPU list-rate verification for AWS, Azure, Google Cloud, Oracle Cloud, and internally preserved provider records such as CoreWeave
- MLPerf/performance-factor refreshes when new evidence materially changes the sizing model
- Review of newly discovered models before adding them to the canonical registry
- NVIDIA NIM compatibility sync, which intentionally remains manual-only until a documented and live-tested catalog-wide endpoint is confirmed
- Full live regression testing after material releases

`src/pricingRegistry.js` is the shared source of truth for cloud GPU rates and NVIDIA/DGX loaded system pricing used by TCO and GPU Sizing. `src/pricingProvenance.js` separately owns pricing verification dates and staleness thresholds. GPU Sizing derives its loaded per-GPU planning prices directly from the shared on-prem system records rather than maintaining a second hard-coded price table.

## Validation and status language

Use three separate status levels and never infer one from another:

1. `source-verified` - current repo code/data has been inspected and supports the claim
2. `live-verified` - the deployed application has been exercised and the behavior was confirmed
3. `externally approved` - CDW or another required external authority has approved the relevant branding, publication, policy, or business decision

A source-level fix is not automatically a live-verified production fix. A deployed site is not automatically externally approved for publication.

## Run locally

```bash
npm install
npm run dev
```

Vite runs locally at the URL printed in the terminal, normally `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

`npm run build` outputs the production bundle to `dist/`.

## Important environment and secret names

Do not commit secret values to this repository.

Runtime and CI depend on configuration including:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `HF_TOKEN`
- `AA_API_KEY`
- `SLACK_WEBHOOK_URL`

The Hugging Face token may be read-only, but its issuing account must have accepted the licenses for gated tracked models such as Llama and Gemma.

## Current data-source notes

Cloud GPU rates and NVIDIA loaded system prices are centralized in `src/pricingRegistry.js`. TCO imports the cloud-rate and on-prem-system registries directly. GPU Sizing derives its per-GPU planning prices from those same on-prem system records, eliminating the prior duplicate price table.

The current pricing provenance dates remain in `src/pricingProvenance.js`. The code defines:

- review due after 45 days
- stale after 90 days

`scripts/validate_pricing_registry.mjs` is enforced by the permanent quality gate. It validates required provider/system data, preserves the exact AWS B200 reserved-rate anchor, confirms GPU Sizing's derived prices reconcile to the shared system costs, and fails if the calculating tools reintroduce local duplicate pricing tables.

## Known assurance and maintenance priorities

The permanent GitHub quality gate, TCO Excel-to-JavaScript parity suite, PR-local handoff regression suite, live Vercel regression suite, and formal known-good release discipline are in place. The gate validates the shared pricing registry, shared model registry, architecture-aware model sizing and activation contracts, GPU Sizing -> TCO handoff ownership rules, SafeImageInput resource bounds, the checked-in TCO workbook structure, and Excel-to-JavaScript parity in addition to browser regressions.

Current priorities are:

1. **October 5 internal-review freeze:** no feature work, discretionary methodology changes, or broad UX/copy churn before the meeting. Reopen code only for a genuinely material correctness, stability, routing/persistence, customer-facing credibility, or production-use defect.
2. Prepare October 5 reviewer guidance, meeting narrative, and documentation without changing validated product behavior.
3. After the internal review, resume deferred UX simplification and My Summary/workflow improvements only if they meaningfully improve enterprise presales usability without altering validated methodology.
4. Keep TCO progressive-disclosure restructuring intentionally deferred until its large monolithic presentation layer can be refactored and parity-validated safely before any hierarchy change.
5. Maintain the shared pricing registry and continue provider-by-provider refreshes with explicit `LISTED`, `NODE-NORM`, `EST`, and `QUOTE` confidence.
6. Refresh NVIDIA DGX/GPU hardware evidence before the deferred hardware/evidence modernization tranche proceeds.
7. Keep NIM compatibility manual until the NVIDIA endpoint is production-validated.
8. Maintain the current model-modernization baseline as model policy, source evidence, sizing methodology, or handoff semantics evolve. New models must clear source qualification, architecture/methodology review, Advisor calibration, visibility/handoff checks, and the exact-head permanent quality gate before customer-facing activation.
9. For the next validated release, preserve the same release discipline: release record, package metadata, merged-tree gate, deployed-scope verification, and exact immutable tag/commit identity.
10. Keep all post-2026.09.1 work under `Unreleased` until an explicit next validated tag is created.
11. Execute controlled Vite/esbuild and React Router upgrades separately with regression testing; continue monitoring the PptxGenJS/image-size upstream path while retaining the client-logo mitigation.

See `AiFactoryProjectBrief.md` for the detailed defect history, architecture, prior validation record, and release history. See `docs/history/2026-09-09-current-state-checkpoint.md` for the latest source checkpoint and `docs/MODEL_MODERNIZATION_CURRENT_STATE.md` for the current model-catalog and architecture-aware sizing baseline.

## Publication and branding status

The project brief remains the authoritative record for CDW approval status. Do not infer publication approval from the existence of a live Vercel deployment, a private GitHub repository, or CDW branding in the source.

The `cdwaifactory.com` domain has been acquired and is managed through Cloudflare, but deployment/domain changes should remain consistent with the external approval state recorded in `AiFactoryProjectBrief.md`.

## Working conventions

- No em dashes in project writing.
- Use actual current repo files for review and edits.
- Preserve exact existing filenames when updating deliverables.
- Treat `main` as the current code/data source of truth.
- Update `AiFactoryProjectBrief.md` after durable architecture, validation, data-source, or roadmap changes.
- Update `CHANGELOG.md` for meaningful release-level changes, not every small commit.
- Update `docs/MODEL_MODERNIZATION_CURRENT_STATE.md` whenever model catalog policy, architecture-aware sizing methodology, capability evidence, or Model Advisor -> GPU Sizing -> TCO ownership semantics change materially.
