# CDW AI Factory Tool Suite: Project Brief and Full Memory Export
**Prepared by Claude for Jay B. Carlile, corrected and augmented by ChatGPT against the live GitHub repository and prior independent validation history. Export date: August 31, 2026.**
**Purpose: durable, repo-backed context anchor for the Claude Project / repo and for future ChatGPT or Cowork sessions. Claude's memory export is preserved, but stale statements are corrected below and the former gaps are resolved where the repository or prior validation record provides evidence.**

---

## September 22, 2026 Current-State Addendum

This is the current orientation for the September 9-22 tranche at `main` commit `1de011309a1b9fe3fb5332dc51e5d050227b104b` (PR #112). The September 9 checkpoint and earlier addenda remain historical. Post-`AI Factory Suite 2026.09.1` changes are **Unreleased**; the merge did not create or move a validated release tag. Source review establishes the behavior described here. The production site has been reported live and apparently healthy, but broader internal CDW review and external approval have not been completed by this documentation update.

### Journey and ownership

- The landing page now offers Inference Economics at `/inference-economics`. GPU Sizing can pass technical context directly; TCO can pass its selected deployment, analysis period, and inference-attributable cost. The older `/tco/inference-economics-preview` and `/tco/inference-economics-preview-guided` routes remain in source. The Guided route is the primary current entry, with report/PDF, audit trail, contextual navigation, session input persistence, and an onward ROI action.
- Model Advisor owns model context, GPU Sizing owns technical fleet sizing, TCO owns infrastructure economics, Inference Economics evaluates demand-bound inference unit cost for the specified deployment and allocated cost, and ROI owns the business-value case. Neither IE nor ROI silently re-sizes the upstream technical deployment.
- An inference-only TCO workload can allocate all of its TCO; a mixed workload uses a disclosed proportional inference-share planning assumption, not measured marginal cost. The original TCO investment split passes onward to ROI only when defensible context is present. Standalone or direct GPU Sizing entry requires the user to supply or confirm private cost; ROI asks for investment inputs if the split is unavailable.

### Inference-economics evidence and pricing boundaries

- IE uses expected useful **output-token demand** as the denominator, retaining idle-capacity cost in the numerator. The required production-throughput factor tests whether the benchmark-adjusted deployed fleet can serve demand across the horizon; changing it affects feasibility/headroom, not unit cost continuously. If projected demand exceeds capacity, IE suppresses the private unit-cost result.
- Qualified exact benchmark counts and whole multiples used as independent serving replicas are supported when one benchmark-sized group can host the model. A larger fleet does not itself prove model-parallel scaling. Non-whole groups or a model requiring topology-dependent scale-out are suppressed pending adequate evidence. The audit states exact versus replica-scaled basis; the 16-B200 cross-tool case is covered by a permanent regression.
- Managed API comparison has a dated, first-party public-rate snapshot in `src/managedApiPricingRegistry.js`, a last-known-good fallback design, and explicit user/negotiated overrides. Reference blended rates and workload-specific input/output assumptions are separate comparisons. Cached-input assumptions are explicit where offered; public rates are not a customer quote. BenchLM has only a disconnected future-adapter placeholder with unresolved commercial use and must not be described as a live source.

### Other September 9-22 work and operating status

- September NVIDIA evidence/pricing and Rubin activation work added guarded planning/TCO support while retaining the inference-throughput evidence gate. Blackwell Ultra inference evidence, deployable GPU Sizing ranking, GB300 handoff, shared workload hours, training/inference modeling corrections, ROI Year-1 and report fixes, and user-facing copy/provenance refinements were merged. `CHANGELOG.md` records the milestone groups; `docs/RUBIN_EVIDENCE_FOUNDATION_2026-09-10.md` retains the evidence contract.
- Production cloud GPU unit-price trend is a separate TCO sensitivity with a 0%/year default. It applies to modeled cloud GPU compute rates, while workload growth models consumption; the older September 7 preview description below is historical.
- IE input persistence and audit deployment detail were added before PR #112 merged. Automated model-data refreshes and permanent checks continued. Source-backed coverage and a healthy-appearing production site do not constitute complete internal CDW methodology, pricing, branding, or release approval. `MaintenanceRunbook.md` defines recurring evidence and rate review.


## September 7, 2026 TCO Growth and Cloud Pricing Addendum

This addendum records the TCO/GPU Sizing modernization work tracked in issue #34 and supersedes older ambiguity around growth versus cloud unit-price movement.

### GPU Sizing production-design selection

- PR #35 keeps the node-rounded Recommended configuration as the default production design and allows an explicit Higher-growth alternative to be selected for downstream TCO analysis.
- The Recommended and Higher-growth result cards themselves are the selection controls. The selected card is visibly marked `Selected for TCO`; Minimum Technical and Lower-Cost remain informational.
- GPU Sizing remains the technical authority. TCO receives the exact selected GPU class/count plus `sizingBasis=recommended|higher-growth` provenance and does not independently choose or re-size the design.
- Changing the sizing result resets the downstream choice to Recommended so a prior growth preference cannot silently carry into a materially different workload.
- PR #35 merged as `465c77938a811dec6f08e353664ba87897c540ec` after the exact-head permanent quality gate passed. The direct-card selection interaction was subsequently confirmed working in production.

### Cloud pricing assumption transparency

- PR #36 made the existing cloud-pricing treatment explicit: current cloud GPU unit rates are held constant across the selected analysis horizon.
- The annual TCO growth input represents increased workload/consumption, not provider price inflation or deflation.
- The disclosure appears in the calculator, generated report, and calculation/audit trail. No TCO formulas, provider rates, growth defaults, provider-selection logic, GPU Sizing handoff semantics, or on-prem economics changed.
- PR #36 merged as `05111bbedf4a9176d2ef3ae72ec495be282de894` after the exact-head permanent quality gate passed.

### Cloud GPU unit-price trend preview

- PR #37 is intentionally preview-only and remains subject to review before merge. It adds an interactive Cloud GPU unit-price trend control with default 0%/year, range -20% to +20% per year, and 5 percentage-point steps.
- The preview value is deliberately not persisted, autosaved, passed into the TCO engine, included in My Summary state, or reflected in report economics. Production math therefore remains the same 0%/year unit-price treatment documented by PR #36.
- Workload growth remains a separate production variable. Capacity-ramp modeling remains a separate deferred concept.
- Any future wiring of cloud unit-price trend into economics requires a separate methodology approval defining affected cost components, compounding, interaction with workload growth, treatment by planning mode, and new parity/regression expectations.

### Documentation and assurance discipline

- `CHANGELOG.md` records all three workstreams chronologically.
- `docs/MODEL_MODERNIZATION_CURRENT_STATE.md` now records the durable ownership and growth/unit-price contract because it governs the Model Advisor -> GPU Sizing -> TCO chain.
- `MaintenanceRunbook.md` now contains the operating rule for reviewing any future cloud unit-price trend methodology.
- The README checkpoint is refreshed so the repository landing page does not stop at PR #32.

## September 5, 2026 Current-State Addendum

This addendum supersedes stale current-state statements in earlier dated sections while preserving the historical record. The Project Brief is intentionally cumulative institutional memory: dated addenda record what was true at each checkpoint, while the newest addendum is the primary current-state orientation. GitHub `main`, immutable release tags, and current source files remain authoritative for exact implementation details.

### Record-keeping policy

- Preserve prior dated addenda and historical narrative. Do not rewrite old decisions merely because later architecture supersedes them.
- Add a new dated current-state addendum whenever a material tranche changes architecture, customer behavior, methodology ownership, commercial eligibility, assurance, or operating procedures.
- Use `CHANGELOG.md` for the concise chronological release/change ledger and this brief for rationale, architecture, validation history, decisions, and durable context.
- Use Git history, pull requests, tags, and release records as the forensic source for exact code, timestamps, and diffs.
- If this file eventually becomes genuinely unwieldy, archive old low-value chronology into `docs/history/` while retaining summaries and links here. No archive is needed yet.
- Never allow record-keeping updates to silently change calculator logic, pricing values, sizing methodology, or release tags.

### Current release and source state

- Immutable stable release `v2026.09` remains frozen at `31fdb2ff2a321f6101bfa72d3c45b4c31aa3a0eb`.
- `AI Factory Suite 2026.09.1` was prepared and released on September 4, 2026. Its frozen release history must remain immutable.
- All post-`2026.09.1` work described below remains `Unreleased` until the next explicit validated tag/release.
- Current production `main` checkpoint before this documentation catch-up is `696c4c87122b7dfab25ac5eec59c2c0db8dcef78`, the merge of PR #24 on September 5, 2026.

### Customer-facing report state

- All five report-producing tools have approved print/PDF layouts in current source: TCO two pages, ROI one page, GPU Sizing two pages, Model Advisor one page, and Readiness six pages.
- PR #24 added a print-only GPU Sizing refinement after Windows PDF review. The Recommended configuration now prints with a white background, strong dark outline, fully opaque dark text, and no shadow so it does not resemble a disabled/de-selected card in grayscale. Screen styling and sizing/pricing logic are unchanged.
- Use Case Explorer remains intentionally report-free because it is a browse/discovery tool rather than a result artifact.

### Shared model context and technical authority

- PR #7 introduced `src/modelRegistry.js` and canonical model context across Model Advisor -> GPU Sizing -> TCO: model ID, exact parameter count, and inference quantization where relevant.
- `scripts/validate_model_registry.mjs` permanently guards canonical coverage, aliases, lookup behavior, and parameter reconciliation.
- PR #10 added permanent legacy, Custom, reload, and Back/Forward regression coverage and corrected a real defect where incoming `model=custom` identity could be discarded while Custom parameters were retained.
- GPU Sizing is the technical sizing authority for workload-driven handoffs. TCO does not silently re-size the upstream technical requirement from model parameters.

### GPU Sizing -> TCO ownership model

- PR #8 corrected stale cloud-class precedence so a fresh GPU Sizing handoff begins TCO's cloud comparison like-for-like with the incoming GPU class instead of inheriting an unrelated prior class.
- PR #9 formalized ownership: upstream technical facts follow the latest GPU Sizing result; TCO-owned economic/planning assumptions survive; explicit TCO cloud-comparison overrides remain explicit.
- User cloud-rate overrides persist by provider + GPU class. On-prem economic overrides persist by target system. Old assumptions cannot silently contaminate a different technical target.
- N+1 remains a TCO resilience assumption layered on top of the GPU Sizing base technical recommendation and must not be described as part of the upstream sizing recommendation.
- PR #13 expanded permanent cross-tool state-precedence journeys across Explorer -> Model Advisor, Explorer -> GPU Sizing, Model Advisor -> GPU Sizing, and TCO -> ROI. That review found and corrected a real Model Advisor -> GPU Sizing Training-mode/provenance defect.

### Combined Summary / My Summary current state

- PR #15 replaced generic snapshot-key rendering with an explicit per-tool customer-facing presentation schema: curated labels, order, units, formatting, friendly model names, and clearer cloud/on-prem terminology.
- My Summary now states that it contains the latest saved result from each tool rather than implying historical scenario linkage that the current snapshot schema does not store.
- It detects and visibly warns on likely cross-snapshot incoherence, including TCO/GPU fleet mismatch, Advisor/GPU model mismatch, stale downstream timestamps, and stale TCO-sourced ROI.
- It suppresses duplicate TCO evaluated-fleet output when it matches the GPU Sizing base fleet and protects summary cards from splitting poorly in print.
- PR #16 corrected the consistency checker to compare DGX/NVL system topology in GPU-equivalent units rather than comparing system count directly with GPU count. Current equivalence includes DGX H200/B200/B300 at 8 GPUs per system and GB200 NVL72 at 72 GPUs.
- Signed-in account identity, My Summary, and Sign out are now directly available from the home experience through PR #19.

### Global Reset and scenario lifecycle

- PR #18 added `Reset All Tools` as a whole-workspace current-scenario reset.
- Reset clears shared `ai-factory-session:*` state, Readiness local state, and the signed-in user's current Supabase `tool_snapshots`, which powers My Summary.
- Reset preserves the authenticated session, account/profile, and historical `download_events`.
- The implementation protects against stale-state resurrection with a reset write barrier, waits for in-flight autosaves, performs server-side snapshot deletion and verification, uses a second delete pass, publishes a cross-tab reset epoch, and invalidates stale background/suspended-tab state before later reads/writes.
- Reset is fail-safe: if server-side reset cannot be verified, the application does not falsely claim success.

### Best-Value GPUaaS and provider eligibility

- PR #17 added Best-Value GPUaaS v1 to TCO Workload Requirement mode. It ranks eligible providers only for the exact current rented GPU class and uses the existing TCO engine for candidate economics rather than a duplicate calculation path.
- Ranking is same-class only. GPU Sizing remains the technical GPU-class authority; TCO does not invent cross-class substitution/equivalence in Best-Value v1.
- The user explicitly chooses `Use provider`; ranking never silently changes the active provider.
- Pricing confidence/provenance is disclosed with results, including `LISTED`, `EST`, `NODE-NORM`, `QUOTE`, and `CUSTOM` where applicable. Confidence is disclosed rather than secretly altering ranking order.
- Best-Value intentionally excludes SLA, support, region, availability, enterprise discounts, security, procurement, networking, and operational-fit recommendations.
- PR #23 added commercial eligibility/display metadata to the provider registry. A provider may remain internally modeled while being excluded from customer-facing selection/ranking.
- Current customer-facing providers are AWS, Azure, Google Cloud, and Oracle Cloud.
- CoreWeave pricing/provenance/modeling remains preserved internally for possible future re-enable, but it is commercially ineligible in the current CDW context because no reseller agreement is in place. It must not appear in customer-facing provider selection or Best-Value recommendations while that status remains false.
- Provider eligibility is configuration-driven so future neoclouds such as Nebius can be added without rewriting the ranking engine, subject to commercial approval, source-quality review, and validation.

### Authenticated Phase 1 front door

- PR #20 introduced the Phase 1 authenticated front door. Signed-out users see the CDW-styled access experience before calculator interfaces.
- Existing deep links are preserved through authentication and return the user to the originally requested route.
- Supabase magic-link remains the primary sign-in method. Temporary-password compatibility remains for provisioned users. Existing incomplete-profile setup remains in place.
- Phase 1 is an access-control/front-door improvement. It does not claim that all pricing, methodology, or recommendation logic has been relocated server-side.
- Email-domain restrictions remain deliberately deferred. Do not add consumer-email blocking, competitor/watchlist rules, or other domain policy until explicitly revisited.
- Future authenticated-header direction remains a single horizontal row with `CDW | AI FACTORY TOOLS` left-aligned and signed-in identity, `My Summary`, and `Sign out` right-aligned.

### GPU Sizing usability clarification

- PR #21 clarified `Peak concurrent users` without changing the field name or sizing math. It now means simultaneous active request streams during the busiest period and explicitly includes human users, AI agents, copilots, automations, and parallel sub-agents.
- The working-day-hours mobile edit path remains hardened so transient blank/invalid edits do not collapse the result panel.

### Client Summary image hardening

- SafeImageInput restricts client logos to PNG/JPG/JPEG regular files, 10 MiB compressed size, and matching PNG/JPEG signatures.
- PR #11 additionally validates decoded dimensions before PptxGenJS/image-size processing: maximum 10,000 px width, 10,000 px height, and 40,000,000 total pixels.
- Path containment remains deferred because the current pipeline is offline/operator-local and no dedicated logo staging-root contract exists. Revisit if the workflow becomes upload-driven or a staging root is standardized.

### Permanent assurance and regression architecture

The permanent quality gate now protects a materially larger surface than the original release baseline. Depending on change scope it includes:

- production build,
- shared pricing registry validation,
- shared model registry validation,
- TCO handoff ownership guards,
- SafeImageInput resource-bound tests,
- checked-in TCO workbook extraction/structure validation,
- canonical Excel-to-JavaScript TCO parity,
- model-context and cross-tool state regressions,
- Best-Value GPUaaS validators,
- provider eligibility guards,
- Global Reset contract coverage,
- Combined Summary presentation/consistency regression,
- local auth-bypassed browser regression for protected tool internals,
- live Vercel regression for the authenticated production front door and route behavior.

PR #22 corrected the browser-test architecture after the authenticated front door made signed-out production behavior intentionally different from the open local test build. Production/preview tests now assert that signed-out users receive the front door and cannot see protected tool navigation. Tool-internal browser journeys run against the local build with `E2E_AUTH_BYPASS`; that signal is test-only and is not inlined into or enabled in production.

Green CI means the represented assertions pass. It is not synonymous with "no unknown defects." Human/adversarial review and real rendered/PDF review remain distinct validation activities. Recent examples include the state-precedence defects found before permanent tests existed and the Windows GPU Sizing print hierarchy issue found through actual PDF inspection.

### Current provider and naming conventions

- Customer-facing cloud provider names are `AWS`, `Azure`, `Google Cloud`, and `Oracle Cloud`.
- Legacy internal aliases such as GCP/OCI may remain supported for backward compatibility, but new customer-facing copy should use Google Cloud and Oracle Cloud.
- CoreWeave may remain in internal pricing/provenance structures while commercially disabled.

### Current open / deferred items

- Keep email-domain restriction policy on hold until explicitly revisited.
- Future NeoCloud expansion should use provider configuration/eligibility rather than ranking-engine rewrites. Nebius is a known CDW-relevant future candidate; any additional provider must pass commercial, pricing-source, and validation review before customer exposure.
- Continue monthly/manual cloud and on-prem pricing review under the shared registry/provenance process.
- NVIDIA NIM compatibility remains manual-only until a production-backed catalog-wide endpoint is validated.
- Controlled Vite/esbuild and React Router upgrades remain maintenance migrations, not blind `npm audit fix --force` work.
- External CDW publication/branding approval remains separate from source and live technical verification.

### Documentation health at this checkpoint

This addendum intentionally catches the durable Project Brief up through PR #24. `CHANGELOG.md`, `README.md`, and `MaintenanceRunbook.md` are updated in the same documentation-only tranche so the current release/unreleased state, authentication model, provider eligibility, Best-Value GPUaaS, and regression architecture do not contradict this brief.


## September 4, 2026 Current-State Addendum

This addendum supersedes stale current-state statements elsewhere in the historical export while preserving the older chronology. The immutable stable baseline remains `v2026.09` at `31fdb2ff2a321f6101bfa72d3c45b4c31aa3a0eb`. The pre-documentation current code checkpoint is `main` at `cfb2ed79ec01320f7669d11b8d5416d09f580117`; all changes after `v2026.09` remain `Unreleased` until the next validated tag.

### Customer-facing report state

- Approved individual print layouts are now in source for all five report-producing tools: TCO two pages, ROI one page, GPU Sizing two pages, Model Advisor one page, and Readiness six pages.
- GPU Sizing's working-day-hours mobile edit path now uses a local draft value so temporary blank/invalid edits do not collapse the results panel.
- Combined Summary is deliberately not part of the next shared-model/handoff release boundary. Its next workstream is a curated per-tool presentation schema, clearer cloud/on-prem labels, non-splitting print cards, and reproducible 1-through-5-tool fixtures.

### Shared model context and technical authority

- PR #7 introduced `src/modelRegistry.js` and canonical model context across Model Advisor -> GPU Sizing -> TCO: model ID, exact parameter count, and inference quantization where relevant. `scripts/validate_model_registry.mjs` permanently guards coverage, aliases, and parameter reconciliation.
- Legacy TCO size-only sessions migrate to `Custom` plus the preserved numeric parameter size rather than guessing a named model identity.
- PR #10 added permanent legacy, Custom, reload, and Back/Forward model-context regression coverage and fixed a discovered defect where incoming `model=custom` identity had been discarded while its parameter count was retained.
- GPU Sizing is the technical sizing authority. For a workload handoff, TCO locks the on-prem target system/class to the upstream recommendation; changing the technical design requires returning to GPU Sizing.

### GPU Sizing -> TCO ownership model

- PR #8 corrected the stale cloud-class defect discovered during live Combined Summary review: a new B200 sizing handoff can no longer silently inherit an old H100 cloud-comparison class.
- PR #9 formalized ownership: upstream technical facts follow the latest GPU Sizing result; TCO-owned economic/planning assumptions survive; explicit TCO cloud-comparison overrides remain explicit.
- Cloud comparison starts like-for-like with the sizing class unless the user deliberately overrides it. Provider remains a TCO assumption because GPU Sizing supplies no provider fact.
- User cloud rates persist by provider + GPU class; on-prem system-specific economic overrides persist by target system. An old class-specific value cannot silently contaminate a different technical target.
- N+1 is a TCO resilience assumption layered on top of the GPU Sizing base requirement and must not be described as part of the upstream recommendation.
- Permanent source and PR-local browser tests now cover dirty prior TCO state, fresh handoff ownership, explicit cloud override persistence, model-context persistence, and URL query consumption.

### Client Summary image hardening

- SafeImageInput continues to restrict client logos to PNG/JPG/JPEG regular files, a 10 MiB compressed-size ceiling, and matching PNG/JPEG signatures.
- PR #11 additionally validates decoded dimensions before PptxGenJS/image-size processes the logo: maximum 10,000 px width, 10,000 px height, and 40,000,000 total pixels.
- Path containment is not currently enforced because the pipeline remains offline/operator-local and no dedicated staging-root contract exists. Add containment if the workflow later standardizes a logo staging directory or becomes upload-driven.

### Permanent assurance state

The permanent quality gate now includes production build, shared pricing registry validation, shared model registry validation, TCO handoff ownership guards, SafeImageInput resource-bound tests, TCO workbook extraction/structure validation, 20/20 Excel-to-JavaScript parity, PR-local TCO handoff/model-context Chromium regression, and the live Vercel regression suite. Green CI means the asserted behaviors pass; it is not synonymous with "no unknown defects." Human/adversarial review remains a distinct pre-release activity because a recent live session found a real state-precedence defect before a test existed for it.

### Next release boundary

- The expected next same-month stable candidate is `v2026.09.1` once documentation, final human/adversarial review, release record, package metadata, merged-tree gate, and deployed-scope verification are complete.
- At that release, legacy `package.json` version `2.8.0` should become SemVer-safe `2026.9.1` while the human/tag identity remains `2026.09.1` / `v2026.09.1`.
- Combined Summary remediation and controlled Vite/esbuild / React Router migrations remain separate workstreams and should not be bundled into this release solely for convenience.
- External CDW publication/branding approval remains separate from source and live technical verification.

---

## 1. Suite Overview

Six tools live on one site, built as a single Vite + React SPA in the private GitHub repo `Jaybc25/cdw-ai-factory-tco`, default branch `main`, auto-deploying via Vercel (Pro plan).

- **Repository:** https://github.com/Jaybc25/cdw-ai-factory-tco. It was PUBLIC when this brief was originally consolidated on August 31, 2026, then changed to PRIVATE on September 1, 2026. Authenticated GitHub connector access was re-verified after the privacy change, so repo-backed maintenance remains available without public exposure.
- **Repo snapshot used for this export:** `main` at `4106962aa657075ef313f34160e7c3b130a0b5af` immediately before this brief was committed. That HEAD was an automated model-capability sync commit.
- **Live URL:** https://cdw-ai-factory-tco.vercel.app
- **Current validated source baseline:** AI Factory Suite 2026.09 (`v2026.09`), validated commit `31fdb2ff2a321f6101bfa72d3c45b4c31aa3a0eb`, released September 1, 2026 after the permanent quality gate passed the production build, 20/20 canonical TCO Excel-to-JavaScript parity, and 13/13 live Vercel browser tests for the automated scope.
- **Internal release identity:** suite releases use calendar versioning and exist for engineering history, auditability, comparison, and recovery. They are not intended as prominent customer-facing labels. Git tags/GitHub Releases are authoritative; individual tool version labels and the legacy package version are not.
- **Domain:** cdwaifactory.com purchased via Cloudflare Registrar (Aug 2026), verified in Resend, but still PARKED and not connected to Vercel, pending CDW publication sign-off. When connected, Supabase Auth's Site URL and Redirect URLs must be updated from the vercel.app URL or magic-link logins will break.
- **Customer journey order (and landing page order):** AI Use Case Explorer, Open-Weight Model Advisor, GPU Sizing Tool, Cloud vs On-Prem TCO Calculator, AI Use Case ROI Calculator, AI Readiness Checklists. Landing grid is 3x2.
- **Branding:** CDW palette red #CC0000, white, charcoal #2D2D2D, Inter font. Real CDW logo embedded (temporary approval for the DRAFT artifact only; website publication is NOT approved). noindex meta set. Red = CDW/on-prem, gray = cloud incumbent.
- **Routes:** / (landing), /use-cases, /model-advisor, /gpu-sizing, /tco, /roi, /readiness, /summary (Combined Summary). Wildcard route kept last in App.jsx.

## 2. Standing Conventions and Working Rules

These apply across all work on the suite:

1. **File naming rule:** every word gets only its first letter capitalized, rest lowercase, no exception for acronyms (GpuSizingCalculator.jsx, TcoCalculator.jsx, ModelAdvisor.jsx). Deliverables reuse exact filenames so uploads cleanly overwrite in the repo. Exception: the client 2-pager uses ClientAiFactorySummary_[insertclientname].pptx (per-client suffix).
2. **No em-dashes** in any writing, anywhere.
3. **Validated engine pattern:** spreadsheet reference model first (validation tabs, LibreOffice-recalc-verified), then React port, then external parity review. Used for TCO, GPU Sizing, and ROI.
4. **External audit loop:** ChatGPT is used as an adversarial external reviewer in structured rounds (review brief DOCX + source files + prompt txt, PASS/CONCERN/FAIL rulings, GO/NO-GO). TCO went 9 rounds; site integration 3; ROI 3 spreadsheet + 2 parity; Explorer, Readiness, and the audit-trail feature each had their own rounds.
5. **No blind compliance rule (Jay's explicit standard):** Claude evaluates every audit finding before implementing. Documented pushbacks exist (e.g. B300 "reference blocks; product discloses" split: the Excel workbook BLOCKS B300 rent-side, the web app OFFERS it EST-flagged).
6. **Tooltip rubric:** red "?" TipDot opens an "ABOUT THIS FIELD" TipBox. Copy is 2 sentences core (3 with a default), ordered what-it-is then why/if-unsure, always resolves to an action, smart non-specialist reading level, matches Jay's live hallway pitch. Modal close uses document-level pointerdown + Escape, never backdrop geometry.
7. **Content authoring standing rules (Readiness, applies broadly):** no unsourced comparative or empirical claims, no arbitrary numerical prescriptions, blocking items test the actual gating condition, compliance items are applicability questions never verdicts, primary authorities only for citations, shared item ID means shared semantics.
8. **File handling lesson (critical):** pasted document blocks in chat are NOT reliably readable verbatim; Claude twice fabricated plausible-but-wrong code from a paste and broke the live site once. For any reconstruction or edit where correctness matters, work only from an actual uploaded file (or repo fetch), never from a paste or from memory.
9. **Verification habit:** every JSX change is esbuild-verified before delivery; engine changes get Node cross-check scripts against the validated spreadsheet; runtime bugs get jsdom click-simulation tests where relevant.
10. **Preview build pattern:** the chat artifact viewer renders single files only, so tools with separate JSON/image imports ship two builds (e.g. UseCaseExplorer.jsx + blueprints.json for the repo, UseCaseExplorer-preview.jsx with data inlined for chat viewing). Regenerate the preview after any change so they don't drift.
11. **Jay's working style:** bulk up multiple build changes before doing live verification passes, rather than testing after every individual change.
12. **Internal versioning and release record:** validated suite releases use calendar versioning. The first validated release in a month is `AI Factory Suite YYYY.MM` / `vYYYY.MM`; additional same-month validated releases append `.1`, `.2`, and so on. Between releases, work remains `Unreleased` in `CHANGELOG.md`. Git tags and GitHub Releases are authoritative and immutable. Individual tools do not maintain authoritative independent release versions. Use `ReleaseRecordTemplate.md` to capture the release's code changes, rationale, data state, validation evidence, service/dependency changes, open items, and external approval status. Do not expose suite versioning prominently in the customer-facing UI unless a later business requirement calls for it.

## 3. Platform Infrastructure (Accounts, Auth, Notifications)

- **Supabase project "ai-factory"** (Pro org, Micro compute; DB password in Dashlane). Tables: accounts, download_events (append-only, explicit report views), tool_snapshots (one row per account+tool, upserted by autosave). Recurring gotcha hit THREE times: RLS policies alone are not enough, explicit Postgres GRANTs are also required, and were missed for the authenticated role (02_grant_fix.sql), then for service_role (05_service_role_grant_fix.sql), plus a manual PostgREST schema-cache reload (NOTIFY pgrst).
- **Auth:** magic-link login via AuthContext.jsx / AuthWidget.jsx / supabaseClient.js, wired into all 6 tools. First-time setup captures name/company. Logged-in users with completed profiles skip every tool's contact gate and go straight to reports, pre-filled.
- **Email:** Supabase default sender is capped (2/hr, team members only), so Resend is the SMTP provider, sender no-reply@cdwaifactory.com "CDW AI Factory", DNS auto-configured via Cloudflare. Known issue: sends to @cdw.com addresses get a clean 200 in Resend logs but never arrive (suspected CDW filter blocking a new domain impersonating the CDW brand); may need CDW IT to allowlist cdwaifactory.com. Personal email confirmed working end to end.
- **Slack notifications:** Jay's personal workspace "AI Factory Tools", channel #all-ai-factory-tools. Supabase Edge Function notify-slack-download (deployed slug "bright-endpoint", JWT verification off, SLACK_WEBHOOK_URL as function secret). Called DIRECTLY from AuthContext's logDownloadEvent because Supabase Database Webhooks are broken by a confirmed platform bug (schema "supabase_functions" does not exist). Support case NOT yet filed. Direct invocation is intentional-but-temporary architecture. CORS OPTIONS handling was added after a live 500.
- **Report deliverables:** TCO, GPU Sizing, Model Advisor, ROI, and Readiness all have "Get the full report" style buttons with the login-skip-gate / contact-gate pattern, each logging a download_events row. Use Case Explorer intentionally has NO report (browse tool, no result worth reporting).
- **Combined Summary (/summary):** CombinedSummary.jsx reads all tool_snapshots for the account, renders one expanded card per tool used (each carries the substance of that tool's own report, not just headlines), Print/PDF, and fires its own Slack notification listing included tools. Entry point is a "My Summary" link in AuthWidget's signed-in state. Autosave is a shared debounced (1.5s) useAutosaveSnapshot hook on the 5 snapshot-capable tools. The pre-deployment lost-update race is fixed in current source by flushing a pending save on `pagehide` and `visibilitychange`; the premature empty-summary flash is also fixed by separating auth, account, and snapshot loading phases.
- **Cross-tool handoffs:** Explorer pills to Model Advisor / GPU Sizing (crosswalk-driven, hidden or amber-noted by routingClass); Model Advisor "Size infrastructure for this model" to GPU Sizing with canonical model identity; GPU Sizing "Compare TCO" to TCO with `ownSys`, `gpuCount`, `sourceClass`, model ID, exact parameter count, inference quantization where applicable, and `workingDayHours` for inference; TCO "Send to ROI Calculator" carries costs and planning-basis provenance. Current GPU Sizing purchase candidates begin at H200, so A100/H100 are no longer emitted as on-prem recommendations. In workload mode, GPU Sizing owns the on-prem technical target and TCO locks it; TCO-owned economic assumptions persist, and the cloud comparison follows the sizing class unless explicitly overridden by the user. Receiving tools consume handoff params with `history.replaceState` after capture and restore provenance/state from session storage so Back/Forward, refresh, and bare-URL returns do not replay or erase handoff context. Readiness keeps its separate versioned localStorage behavior.

## 4. Audit Trail / Methodology Docs Feature

Built and committed on all four calculating tools, reached via a button next to Print/Save as PDF: TCO, ROI, and GPU Sizing call it "Calculation Methodology & Audit Trail"; Model Advisor calls it "Recommendation Methodology & Decision Trace" (eligibility/ranking logic, not arithmetic). Design principle: it reads ONLY from the same engine output already on screen, never a second independent calculation, and shows every material formula with real substituted numbers, real reconciliation, and source/confidence provenance. Each tool's version went through multiple real review rounds with real bugs found (TCO: tautological reconciliation, mode-branching crash, React.Fragment import crash; GPU Sizing: alternatives-selection engine bugs fixed for real; ROI: three-state handoff provenance entered/prefilled/adjusted; Model Advisor: decision-trace intermediates exposed from the engine, false not-eligible on the fallback path fixed). Live rendered/PDF verification of the audit docs is still pending.

---

## 5. Tool 1: Cloud vs On-Prem TCO Calculator (/tco)

**What it is:** a reverse of NVIDIA's TCO tool. NVIDIA's takes a proposed hardware build and outputs equivalent rental cost; Jay's targets customers already spending on cloud AIaaS and shows the on-prem infrastructure needed to bring those workloads in-house and what it costs vs hyperscaler/neocloud spend. Free to use; report export is the lead-capture gate.

**Current state:** the validated Excel reference workbook remains the audit-complete financial reference after 9 ChatGPT rounds (scores rose from "cannot validate" to 9.7/10 arithmetic). The current repo source has advanced beyond the old v2.8 memory snapshot and contains the v2.9 workload-requirement path: a GPU Sizing handoff can drive TCO from a technical GPU requirement rather than from cloud spend. `package.json` still carries legacy version `2.8.0`; it is not the authoritative suite release identity and should not be interpreted as a current per-tool semantic version. The authoritative validated baseline is the immutable Git tag/GitHub Release `v2026.09`. Starting with the next stable release, package metadata should mirror the calendar release using SemVer-safe formatting while the human-facing internal record continues to use `YYYY.MM[.patch]`.

**Engine architecture highlights:**
- Validated against NVIDIA's tool: Test 1 fixture (Public Sector, AWS, DGX B200 vs B200 cloud) reproduced exactly; 16 validation checks + 20-check EngineRegression sheet + Crossover sheet (60-month cumulative sim).
- Two-picker rate design: rent-side A100/H100/H200/B200 (workbook blocks B300; web app offers it EST-flagged) x own-side H200/B200/B300/GB200 NVL-72/GB300 NVL-72. SYSTEMS registry carries NVIDIA-sourced loaded per-system costs; $600K cluster mgmt nodes are fixed cluster-level overhead, not per-system; NVL classes have nodeSize 72.
- Harmonic (not arithmetic) workload blend for the generational performance factor; dynamic fleet trajectory (growth buys systems year by year, fleet never shrinks); residual value excludes prof services and software suite; Tier 1 storage Auto mode derives PB from the non-compute budget (reconciles by construction); crossover from monthly cumulative simulation, suppressed when capacity exhausts first; horizon totals suppress to "N/A" past known exhaustion; roughly 45-condition master input guard (Excel trap documented: text compares greater than numbers, so every range check needs ISNUMBER).
- Explicitly cash-flow TCO (not NPV, not depreciation). Workbook is the "auditable reference implementation"; the web app extends it (dynamic growth, multi-provider, B300).
- Capacity estimates section (v1.9, EST badge): model size and quantization pickers to GPUs per copy, estimated concurrent users, and throughput. The separate Guided Inference Economics tool owns demand-bound cost per token and named managed API comparisons; the earlier TCO-only $8 blended API illustration has been retired.
- No-crossover state shows "NO COST CROSSOVER AT THIS SPEND LEVEL" plus computed minimum viable spend. Report appendix carries every input, applied rates snapshot, and engine version stamp.

**Open items and corrected status:**
- **RESOLVED IN CURRENT SOURCE:** the permanent TCO Excel-to-JavaScript parity suite is built into GitHub Actions. The canonical `EngineRegression` fixture passes 20/20 checks and now consumes the shared production pricing registry while extracting production calculation functions from TCO.
- **RESOLVED IN CURRENT SOURCE:** the GPU Sizing workload anchor now persists across Back/Forward, refresh, and bare-URL return. `gpuSizingCount`, `sourceClass`, `workingDayHours`, and mode are saved in TCO session state after handoff capture.
- **RESOLVED IN CURRENT SOURCE:** GPU Sizing to TCO technical authority is structurally enforced for workload handoffs. TCO uses the node-rounded upstream GPU requirement and locks the on-prem target system/class; technical design changes return to GPU Sizing. Cloud comparison class remains a TCO economic assumption and may be explicitly overridden without changing the upstream technical fleet. Workload duty cycle and owned utilization remain separate concepts.
- Equinix storage-rack colo modeling stays a disclosed assumption; MLPerf provenance per performance factor remains deploy-phase.

## 6. Tool 2: GPU Sizing Tool (/gpu-sizing)

**What it is:** sizes GPU count/class for LLM inference and training/fine-tuning (mode toggle), simple and advanced input paths, model dropdown of 11 open models plus custom entry, multiple output configs with confidence tags.

**Current state:** the older memory label was v1.15, but the repo now contains post-v1.15 remediation and handoff work, so do not use that number as a definitive current live version. The validated spreadsheet reference model still anchors the logic. Current on-prem sizing candidates are **H200, B200, GB200 NVL72, and B300 only**; A100 and H100 were removed from the purchase candidate set because CDW's current new DGX purchase line begins at H200. Current source anchors are H200 4,373 tok/s/GPU (LISTED), B200 12,357 (LISTED), GB200 NVL72 12,022 (LISTED-derived), and B300 15,200 (LISTED-derived). Training MFU defaults to 0.40 with Meta Llama 3 sourcing. DeepSeek V3/R1 use the MLA-aware KV-cache branch; Muse Glimmer carries kvHeads 2.

**Current feature set:** budget panel with TCO-aligned loaded per-GPU point estimates (H200 $68,721, B200 $93,099, B300 $105,861, GB200 NVL72 $108,909), per-candidate utilization bars, working-day-hours input and 24-hour capacity visualization, Dev/Test/POC-only RTX PRO 6000 Blackwell alternative, and a static "Pod Sizing coming soon" handoff card. Each purchase class carries its own node size (72 for GB200 NVL72, 8 otherwise).

**Open items and corrected status:**
- **RESOLVED IN CURRENT SOURCE:** TCO and GPU Sizing consume one shared pricing value layer in `src/pricingRegistry.js`. GPU Sizing derives its loaded per-GPU point estimates from the same on-prem system records TCO uses, and the permanent registry validator fails if duplicate local pricing tables are reintroduced.
- **RESOLVED IN CURRENT SOURCE:** the TCO handoff now sends the recommended node-rounded quantity and class, and TCO workload mode consumes that technical requirement directly.
- **RESOLVED IN CURRENT SOURCE:** the sample token-speed preview layout shift is fixed. The component reserves its final wrapped height and reveals words with CSS visibility rather than growing the DOM as it types.
- Future: separate Pod Sizing tool (full deployment build-out: networking, storage, power) that this tool hands off into.

## 7. Tool 3: Open-Weight Model Advisor (/model-advisor)

**What it is:** recommends open-weight models by workload. Hard filters (license, context window, deployment constraints) then ranking into Best Performance / Most Efficient / Best Overall Fit cards, with real explanation text (explainCard, no generic copy), "Other models meeting your requirements" (up to 3), and verification candidates. Hands off to GPU Sizing.

**Workload checkboxes (8):** General chat/assistant, Coding, Agentic/tool use, Classification (renamed), RAG/knowledge retrieval, Summarization (renamed), Reasoning, plus a single-select primary workload for ranking. A Vision/multimodal 9th checkbox is intentionally NOT added pending a real vision model catalog.

**Key fixes shipped:** sync pipeline text_config fallback (multimodal configs nest max_position_embeddings, so context_length was silently null for exactly the 4 multimodal models, causing the "context window excludes everyone" pattern); Gemma 3 27B needs a manual override (its config states context length nowhere, class default 131,072); sweep-winner fix so eligible non-featured models still display; decision-trace intermediates exposed from the engine for the audit doc; session persistence added (was missing entirely).

**Crosswalk:** ModelAdvisorCrosswalk.json maps all 52 Explorer blueprints to routingClass (23 general-model-selection, 9 infrastructure-first, 11 specialized-stack, 9 platform-architecture). Only general-model-selection passes directly to the Model Advisor; infrastructure-first routes to GPU Sizing; specialized-stack gets a specific route note; platform-architecture stays in Explorer. This fixes the original funnel assumption that every use case should go through a general model picker.

## 8. Tool 4: AI Use Case Explorer (/use-cases)

**What it is:** browse/discover tool built from 52 AI solution blueprints, grouped into categories and searchable/filterable. It intentionally does not generate a report or snapshot because the interaction is exploratory rather than a completed calculation.

**Routing design:** Explorer does not pretend every AI use case is solved by picking an LLM. `ModelAdvisorCrosswalk.json` classifies all 52 blueprints into general model selection, infrastructure-first, specialized-stack, or platform-architecture routes. The UI uses those classes to decide whether a Model Advisor or GPU Sizing next-step pill should be shown, hidden, or amber-noted.

**Validation history:** function-track coverage was tested across all 26 Explorer function/category combinations in browser validation and passed. Earlier audits focused heavily on eliminating unsourced promises and making the route language match what downstream tools actually support.

## 9. Tool 5: AI Use Case ROI Calculator (/roi)

**What it is:** converts labor/capacity efficiency into business value without using layoffs/headcount reduction as the value thesis. The economic frame is capacity creation and redeployment.

**Model:** Gross Capacity Created -> Realized Economic Value using one realization factor. Hours are primary; FTE-equivalent is secondary context. Outputs include ROI, payback, 3-year net benefit, and supporting capacity/value metrics.

**Validation:** the frozen v1.3 workbook was independently checked across 45 validation scenarios and the React calculation path uses the shared `engine.js` logic. Historical default scenario: 44,160 redeployable hours/year, about $2.43M realized annual value, 273.7% 3-year ROI, about 4.4-month payback.

**Current source fixes:** malformed/empty TCO handoff values no longer coerce to `$0`; provenance no longer falsely claims TCO origin; TCO original values and planning basis persist through navigation; the UI distinguishes direct entry, unchanged TCO prefill, and TCO-prefilled-then-adjusted states. Programmatic input labels and invalid/described-by accessibility handling are also present in current source.

## 10. Tool 6: AI Readiness Checklists (/readiness)

**What it is:** readiness/governance/security/infrastructure checklist experience intended to identify applicable work and blockers without pretending to issue compliance verdicts.

**Content principles:** primary authorities for citations, applicability-not-verdict phrasing, no arbitrary numerical prescriptions, blockers must test the actual gating condition, shared item IDs imply shared semantics. Readiness retains its own versioned localStorage behavior rather than the cross-tool session-state mechanism.

**Reporting:** Readiness has a report and participates in My Summary. The latest verbose-report changes should be treated as source-verified until a fresh deployed PDF/live pass confirms them.

## 11. Model Data / Registry Architecture

### Canonical identity layer

`data/canonical_models.json` is manually maintained and is the authority for which open-weight models are in production scope. External sources are resolved to canonical model IDs through explicit aliases. New outside models are discovery candidates, never automatically admitted into the customer-facing registry.

### Hugging Face registry

Primary source for model license, context length, architecture, modality, and parameter-count support fields. `sync_model_specs.py` reads the Hugging Face Hub API/configs. The tracked list currently includes 11 models across Llama, Mixtral, DeepSeek, Gemma, and Muse Glimmer.

Authentication is required because several tracked Llama/Gemma models are gated: GitHub Actions uses the `HF_TOKEN` secret. Read-only token scope is sufficient, but the issuing account must first accept each gated model's terms. `dell.huggingface.co` is discovery only, never source of truth.

The workflow `.github/workflows/sync-model-specs.yml` runs at 06:00 UTC on the first of each month and can also be manually dispatched. It commits `data/model_specs.json` when changed.

### Artificial Analysis capability registry

Artificial Analysis supplies intelligence, coding, and agentic indices, median output speed, and input/output token pricing. The current sync uses the **FREE API tier**; Pro is not required for the fields the app consumes. The free-tier design deliberately keeps hard-filter license/modality/parameter facts anchored to Hugging Face rather than making a paid service a single point of failure.

`.github/workflows/sync-capability-scores.yml` runs every Monday at 06:00 UTC with `AA_API_KEY`. Unresolved external AA slugs are written to `data/aa_discovery_candidates.json` and excluded from production.

### Registry reconciliation

`.github/workflows/reconcile.yml` runs daily at 07:00 UTC, manually, and on changes under `data/**`. It reconciles model registries. It is **not** the TCO Excel-to-JS parity suite.

### NVIDIA NIM compatibility

`.github/workflows/sync-nim-compatibility-MANUAL-ONLY.yml` is intentionally manual-only. No documented catalog-wide production endpoint was confirmed. The existing script/workflow should be considered a placeholder/research path and should not be scheduled until a real endpoint is confirmed and live-tested.

## 12. Client Summary Generator

Outside the live SPA, the project includes a Node/PptxGenJS client-summary pipeline that turns My Summary content into a 2-page CDW-branded PPTX. The full generator is `src/generate_client_summary_full.cjs` with `preflight_validate.cjs`, `run_fixture_suite.sh`, and 14 committed fixture scenarios.

Historical fixes include the zero-tools divide-by-zero path, Recommended Next Steps flagging, `[object Object]` fallback rendering, and runner/extension hygiene. This workstream is treated as closed unless new summary/report structures require fixture updates.

## 13. Sales / Customer Context and Positioning

The suite is a customer-facing enablement layer for AI Factory conversations: discover a use case, determine the appropriate model or specialized route, size technical infrastructure, compare cloud vs on-prem economics, frame business value, then assess organizational readiness.

The TCO thesis is not "cloud is bad." The relevant message is avoiding premature commitment before value is proven and comparing workload economics honestly. Likewise the ROI tool is deliberately not a layoff calculator: value is capacity created and economically redeployed.

## 14. Current Pricing / Data Maintenance State

Cloud list rates and NVIDIA/DGX loaded system pricing remain code-maintained, but the values are now centralized in `src/pricingRegistry.js`. TCO imports the cloud-rate and on-prem-system registries directly. GPU Sizing derives its loaded per-GPU planning prices from those same system records rather than maintaining a duplicate hard-coded table. `src/pricingProvenance.js` remains the separate source of truth for verification dates and staleness display.

Current verification dates in source are September 1, 2026 for cloud pricing and August 7, 2026 for on-prem pricing. The code classifies pricing as "review" after 45 days and "stale" after 90 days. `scripts/validate_pricing_registry.mjs` permanently guards the shared architecture and reconciliation in CI. Cloud and on-prem source verification is still a deliberate maintenance activity; centralization eliminates cross-tool value drift but does not make external prices self-updating.

## 15. Maintenance / Operational Habits

- Hugging Face model specs: automated monthly, plus on-demand when new models are deliberately added.
- Artificial Analysis capability data: automated weekly.
- Registry reconciliation: automated daily and data-change-triggered.
- NVIDIA NIM: manual only until a production endpoint exists.
- Cloud GPU pricing: manually verify provider sources, then update the shared pricing registry and cloud verification date.
- DGX/on-prem pricing: manually compare against the current NVIDIA/CDW-supported source, update the shared system record once, and let GPU Sizing derive its per-GPU planning price from that record.
- Model catalog: discovery is automated, production admission is manual and deliberate.
- Major code/data changes: source review first, then live end-to-end regression before claiming live verification.

## 16. Consolidated Open Items / Corrected Status

### Resolved in current source and/or permanent assurance automation

1. TCO workload handoff state/provenance persistence.
2. GPU token-speed preview layout shift.
3. GPU Sizing to TCO technical fleet reconciliation.
4. ROI malformed handoff values and false provenance.
5. Autosave lost-update race before navigation.
6. My Summary loading-versus-empty flash.
7. Core accessibility remediation for identified labels/collapsibles.
8. Client-summary fixture absence/zero-fixture false-pass issue; current repo contains 14 fixtures.
9. **TCO Excel-to-JS automated parity suite.** Built September 1, 2026 as a permanent GitHub Actions quality gate. The checked-in final audit workbook is extracted directly in CI and the canonical `EngineRegression` fixture passes 20/20 comparisons against the current production JavaScript engine.
10. **Automated live Vercel regression.** Built September 1, 2026 with Playwright. The current public-production suite passes 13/13 tests covering all routes, landing links, key handoff/state/provenance defects, and a canonical TCO fixture through the real TCO-to-ROI link.
11. **Shared pricing data module/registry.** Resolved September 2, 2026. Cloud GPU rates and NVIDIA/DGX loaded system economics are centralized in `src/pricingRegistry.js`; GPU Sizing derives its planning prices from the shared system records, and `scripts/validate_pricing_registry.mjs` guards against reintroducing local duplicate tables.

### Still open or not independently proven live

12. **Credentialed/external-side-effect live checks.** Magic-link email delivery, authenticated report/download event verification, Slack notification verification, and final report/PDF visual inspection remain a separate live-manual layer when those paths change.
13. **Production NVIDIA NIM sync endpoint.** Manual workflow remains intentionally unscheduled.
14. **Deployment verification for latest ROI/report and Readiness verbose-report changes.** Source may be correct without the latest deployed PDF path having been independently re-proven.
15. **Supabase Database Webhooks platform/support resolution.** Direct Edge Function invocation remains the current workaround.
16. **@cdw.com Resend deliverability.** External/CDW IT issue, not established as an app-code defect.
17. **Domain/publication gating.** cdwaifactory.com is parked pending external approval; connecting it also requires Supabase Auth redirect changes.
18. **Future product work:** Pod Sizing, journey-level lead signal, Vision/CV catalog/route, financing/lease support, and other roadmap additions as business priority dictates.
19. **Dependency-security review.** The September 1 quality-gate environment reports six npm audit findings (3 moderate, 3 high). These require advisory-level review before deciding on upgrades; a force upgrade is not assumed safe.

## 17. Former Gaps, Now Resolved or Classified

1. **HF connection correction:** resolved. Public API/config is the source, but authenticated read-only access is required for gated models; terms must be accepted first.
2. **GitHub exact repo/visibility/src:** resolved from live repo inspection. Repo is `Jaybc25/cdw-ai-factory-tco`, default `main`. It was public at the August 31 export snapshot and changed to private on September 1, 2026; authenticated connector access was verified after the privacy change. Current `src/` contains the six tools, shared auth/state infrastructure, summary generator/runtime, fixture suite, and supporting JSON/data files described in this brief.
3. **Deployed versions:** partially unresolved. `package.json` says 2.8.0 but current source includes later per-tool work such as TCO v2.9 behavior. Do not invent per-tool deployed version labels. Verify the live build/deployment SHA when needed.
4. **Corrections that did not stick in older memory:** resolved where repository evidence exists, especially H200+ GPU purchase candidates, workload TCO persistence, fleet reconciliation, ROI parsing/provenance, autosave, Summary loading, accessibility, and token-preview reflow.
5. **ChatGPT project knowledge:** consolidated in Section 18 below.
6. **CDW sign-off:** still external/unresolved. Repo visibility, deployment, logo presence, or draft approval does not establish website-publication approval.
7. **Formspree:** no current repo implementation or dependency found. Current implementation uses Supabase/Resend/Slack. Treat Formspree as superseded/dead scope unless deliberately revived.
8. **Roadmap priority:** the TCO parity suite and automated public-production regression were completed September 1, 2026, and the shared pricing registry was completed September 2. Current technical-maintenance priorities are disciplined pricing/provenance refreshes, release-specific credentialed auth/report/notification checks, controlled dependency upgrades, NIM endpoint validation, and future provider expansion through the eligibility/configuration architecture.

## 18. ChatGPT Independent Validation / Audit Memory

### 18.1 Role and review philosophy

ChatGPT has been used as an independent reviewer, validator, and adversarial second opinion rather than as an unquestioned implementation authority. Claude/Cowork handled much of the build/browser execution while ChatGPT reviewed actual source/data artifacts, tested claims against reference models, and used PASS / CONCERN / FAIL or GO / NO-GO language where appropriate.

The durable lesson is to prefer repo/file evidence over remembered conclusions, distinguish root causes from symptoms, and avoid blindly implementing audit suggestions without evaluating whether the underlying model/design is actually wrong.

### 18.2 Formal review history

The project has gone through many iterative review cycles. Durable formal counts include:

- TCO: 9 model/audit rounds.
- Site integration: 3 review rounds.
- ROI: spreadsheet and React parity/validation rounds, including a 45-check reference-model validation set.
- Readiness: multiple content/source review rounds.
- Explorer: mapping, routing, and copy review rounds.
- Calculation methodology / audit trail: separate review work across the four calculating/recommending tools.

Across AI collaborators, the project involved hundreds of prompts/revise-review events. Exact casual-prompt counts are not a quality metric; formal validated artifacts and regression results are the durable record.

### 18.3 Six-round pre-deployment browser-validation program

A canonical pre-fix validation program used a fresh clone at commit `55c077d`, local Vite, Playwright with real Chromium, mocked Supabase for signed-in autosave/My Summary, and locally served Tailwind from Round 4 onward. Roughly 130 checks were verified across six rounds plus a user-reported UI bug.

Coverage included:

- Explorer -> Model Advisor -> GPU Sizing -> TCO -> ROI -> My Summary journey.
- Back/Forward navigation, hard refresh, deep-link isolation, and stale-replay behavior.
- TCO spend mode and workload mode across supported system classes and 5-year scenarios.
- GPU Sizing inference, training, custom models, zero-input validation, alternatives, and extreme stress cases.
- ROI normal, TCO-deep-linked, adjusted, and negative scenarios.
- My Summary loading, snapshots, print/PDF behavior.
- Audit-trail rendering and reconciliation logic.
- Double-click handoffs and repeated provider toggles.
- Accessibility checks.
- Runtime/console/report/print smoke testing.

An extreme GPU Sizing stress scenario (100T parameters, 1000 layers, 10,000 users) produced 209,752 B300 GPUs with LOW CONFIDENCE without crashing the engine. A cosmetic very-large-number formatting issue remained as backlog.

### 18.4 Defect ledger and current source mapping

The pre-deployment validation initially reached a NO-GO disposition because several state/persistence defects were real despite ordinary handoffs appearing to work. The important lesson was that URL-derived handoff context and provenance needed to persist independently of the URL after parameters were consumed.

Key defect groups and current-source disposition:

1. **Handoff-state persistence root cause:** caused workload-anchor loss and provenance inconsistencies across TCO/ROI and summary behavior. Current source contains session-state remediation.
2. **ROI malformed handoff params:** empty strings could coerce to zero and create false TCO provenance. Current source uses `parseHandoffNumber` and preserves original values/provenance.
3. **Autosave debounce lost-update race:** navigation could destroy a pending timer. Current source flushes on `pagehide` and hidden `visibilitychange`.
4. **Regression fixture hygiene:** fresh-clone fixture absence could make a zero-fixture scan falsely pass. Current repo contains 14 fixtures plus preflight/runner files.
5. **Summary loading versus empty:** current source separates auth/account/snapshot loading phases.
6. **Accessibility gaps:** identified missing programmatic labels and TCO collapsible state. Current TCO/ROI/GPU source contains remediation for the identified core issues.
7. **GPU token preview layout shift:** validated patch now reserves final wrapped height and reveals text without DOM growth.
8. **Cosmetic/deprecation backlog:** extreme large-number formatting and router future/deprecation warnings are lower priority than correctness defects.

Current source contains fixes for the serious pre-deployment defects. On September 1, 2026, a new permanent quality gate also established 20/20 canonical TCO Excel-to-JavaScript parity and 13/13 automated live Vercel browser tests across all routes plus the highest-risk handoff/provenance paths. That supports source and automated public-production verification for the tested scope. Credentialed magic-link, database-event, Slack-notification, and report/PDF visual checks remain a separate live-manual layer, and none of these technical results imply external CDW publication approval.

### 18.5 Durable cross-tool design findings

- Explorer -> Advisor mismatches were often routing/scope issues rather than calculation defects. Not every use case belongs in a general LLM selector.
- The 52-blueprint crosswalk currently classifies 23 as general-model-selection, 9 infrastructure-first, 11 specialized-stack, and 9 platform-architecture.
- Advisor -> GPU Sizing requires explicit model-identity normalization because external/internal slug conventions differ. Silent fuzzy matching is inappropriate for a technical sizing handoff.
- GPU -> TCO must keep technical GPU requirement, workload duty cycle, and owned utilization as distinct concepts.
- TCO -> ROI must keep numeric cost values and provenance/planning-basis metadata separate.
- My Summary is a latest-state snapshot/aggregation surface, not another calculation engine.
- Calculation Methodology / Audit Trail surfaces should explain the same existing engine output rather than independently recalculating it.

## 19. Repo Source-of-Truth Snapshot and Future Fetch Rule

At the time of the August 31 consolidated export, the repo was public; it was changed to private on September 1, 2026 and authenticated connector access was subsequently re-verified. The default branch remains `main`.

The pre-brief source snapshot was `4106962aa657075ef313f34160e7c3b130a0b5af`; the consolidated brief itself was later committed as a documentation change. At that August 31 snapshot, `package.json` identified the package as `cdw-ai-factory-tools`, version 2.8.0. The validated 2026.09.1 release later transitioned current package metadata to `2026.9.1`; historical release/tag state remains immutable.

Current live-source modules under `src/` at the snapshot include:

- AiReadinessChecklists.jsx
- App.jsx
- AuthContext.jsx
- AuthWidget.jsx
- CombinedSummary.jsx
- GpuSizingCalculator.jsx
- LandingPage.jsx
- ModelAdvisor.jsx
- ModelAdvisorCrosswalk.json
- RoiCalculator.jsx
- TcoCalculator.jsx
- UseCaseExplorer.jsx
- blueprints.json
- cdw-logo.png
- checklists.json
- engine.js
- fixture-01-three-tools.json
- fixture-02-four-tools.json
- fixture-03-long-strings.json
- fixture-04-negative-roi.json
- fixture-05-zero-roi.json
- fixture-06-huge-roi.json
- fixture-07-horizon-1yr.json
- fixture-08-horizon-5yr.json
- fixture-09-readiness-all-statuses.json
- fixture-10-explicit-nulls.json
- fixture-11-unexpected-array-field.json
- fixture-12-unexpected-scalar-field.json
- fixture-13-tco-spend-basis.json
- fixture-14-inconsistent-field.json
- generate_client_summary_full.cjs
- main.jsx
- modelAdvisorEngine.js
- preflight_validate.cjs
- pricingProvenance.js
- run_fixture_suite.sh
- sessionState.js
- supabaseClient.js

Relevant automation currently includes monthly Hugging Face model-spec sync, weekly Artificial Analysis capability sync, daily/data-change registry reconciliation, manual-only NIM compatibility research/sync, and the AI Factory quality gate for production build, TCO workbook parity, and live Vercel Playwright regression.

### Fetch-first rule for all future work

1. Fetch the current repo `main` or use the actual current uploaded file before reviewing/editing code or data.
2. Treat this brief as history, architecture, and decision context, not as a substitute for current source.
3. Use status labels accurately: **source-verified**, **live-verified**, **externally approved**.
4. Never infer one status from another.
5. Update this brief after durable architecture, data-source, validation, or roadmap changes so future sessions can recover project context quickly.
