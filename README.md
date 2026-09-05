# CDW AI Factory Tool Suite

Private source repository for the CDW AI Factory tool suite, a Vite + React single-page application focused on AI use-case discovery, open-weight model selection, GPU sizing, cloud vs on-prem TCO, ROI, readiness, and consolidated client summaries.

Live application: https://cdw-ai-factory-tco.vercel.app

For architecture, history, validation findings, conventions, and durable project context, read `AiFactoryProjectBrief.md` at the repo root.

For a human-readable history of meaningful milestones and current open items, read `CHANGELOG.md`.

## Internal release and version record

Versioning is an internal engineering, audit, maintenance, and recovery mechanism. It is not intended to be displayed prominently in the customer-facing application unless a business reason is established later.

**Current validated releases:** `v2026.09` remains the immutable September 1 baseline, followed by `AI Factory Suite 2026.09.1` released September 4, 2026. Existing release tags/releases are immutable.

**Current unreleased code checkpoint before this documentation catch-up:** `main` at `696c4c87122b7dfab25ac5eec59c2c0db8dcef78` on September 5, 2026. Post-2026.09.1 work includes curated My Summary consistency handling, Best-Value GPUaaS, Global Reset, home account/My Summary access, the Phase 1 authenticated front door, auth-aware regression architecture, provider commercial-eligibility gating, and the GPU Sizing print/PDF hierarchy refinement. These changes remain `Unreleased` until a new validated tag is created.

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
- `/roi` - AI Use Case ROI Calculator
- `/readiness` - AI Readiness Checklists
- `/summary` - Combined Summary for signed-in users

The tools are designed as one connected journey, with state and provenance handoffs where appropriate.

## Current platform architecture

- Front end: React 18 + Vite
- Routing: React Router
- Backend services: Supabase Postgres, Auth, and Edge Functions
- Authentication: Phase 1 authenticated front door backed by Supabase Auth; magic-link primary, temporary-password compatibility for provisioned users
- Email delivery: Resend SMTP through Supabase Auth
- Hosting and deployment: Vercel
- Notifications: Slack webhook invoked through a Supabase Edge Function
- Model metadata source: Hugging Face Hub API
- Model capability source: Artificial Analysis free API
- Domain/DNS: Cloudflare for `cdwaifactory.com`

The GitHub repository is the source of truth for code and tracked data. Before reviewing or editing a module, fetch its current file from `main` rather than relying on memory, prior chat context, or old exported files.

## Data maintenance and automation

### Automated today

- Hugging Face model-spec sync: monthly on the 1st at 06:00 UTC, plus manual dispatch
- Artificial Analysis capability sync: weekly on Monday at 06:00 UTC, plus manual dispatch
- Canonical model-registry reconciliation: daily at 07:00 UTC and on changes under `data/**`

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

The permanent GitHub quality gate, TCO Excel-to-JavaScript parity suite, PR-local handoff regression suite, live Vercel regression suite, and first formal known-good release are now in place. The gate now validates the shared pricing registry, shared model registry, GPU Sizing -> TCO handoff ownership rules, SafeImageInput resource bounds, the checked-in TCO workbook structure, and Excel-to-JavaScript parity in addition to browser regressions. The main remaining technical maintenance priorities are:

1. Complete the final pre-release human/adversarial cross-tool pass and run credentialed/manual checks where the release scope requires auth, report, download-event, Slack notification, or PDF verification.
2. Maintain the shared pricing registry and continue provider-by-provider refreshes with explicit `LISTED`, `NODE-NORM`, `EST`, and `QUOTE` confidence.
3. Keep NIM compatibility manual until the NVIDIA endpoint is production-validated.
4. For the next validated release, preserve the same release discipline: release record, package metadata, merged-tree gate, deployed-scope verification, and exact immutable tag/commit identity.
5. Keep post-2026.09.1 My Summary, Best-Value GPUaaS, Global Reset, authentication, provider-eligibility, and print refinements under `Unreleased` until an explicit next validated tag is created.
6. Execute controlled Vite/esbuild and React Router upgrades separately with regression testing; continue monitoring the PptxGenJS/image-size upstream path while retaining the client-logo mitigation.

See `AiFactoryProjectBrief.md` for the detailed defect history, current source-level remediation status, prior validation record, and current validated baseline.

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
