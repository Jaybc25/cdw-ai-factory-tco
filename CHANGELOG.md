# Changelog

This file records meaningful project milestones for the CDW AI Factory tool suite. It is intentionally higher level than individual Git commits and more chronological than `AiFactoryProjectBrief.md`.

Use this file to answer questions such as:

- What materially changed since the prior stable baseline?
- Which defects were fixed versus merely identified?
- What data or pricing sources may be due for refresh?
- What remained open at a given point in time?

For detailed architecture, validation history, source-of-truth rules, and rationale, see `AiFactoryProjectBrief.md`.

## Unreleased

### Added

- `CHANGELOG.md` as the durable human-readable milestone history for the suite.
- Refreshed root `README.md` to describe the current six-tool suite, current platform services, automated data maintenance, manual refresh responsibilities, status language, and remaining assurance priorities.

### Current maintenance state

- Hugging Face model specifications sync monthly on the 1st through GitHub Actions.
- Artificial Analysis capability data sync weekly on Monday through GitHub Actions.
- Registry reconciliation runs daily and on changes under `data/**`.
- NVIDIA NIM compatibility remains manual-only until a production-backed catalog-wide endpoint is confirmed.
- Cloud GPU rates and NVIDIA loaded system prices remain code-maintained rather than centrally automated.
- Pricing provenance is tracked in `src/pricingProvenance.js`, with review due after 45 days and stale after 90 days.

### Still open

- Automated TCO Excel-to-JavaScript parity suite.
- Fresh full live regression of the current deployed application.
- Shared pricing registry for TCO and GPU Sizing.
- Production-backed NVIDIA NIM compatibility sync.
- Live verification of the latest report/audit-trail changes where not already proven.
- External publication/branding approval items tracked in `AiFactoryProjectBrief.md`.

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
