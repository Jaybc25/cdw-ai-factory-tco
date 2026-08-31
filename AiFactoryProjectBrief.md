# CDW AI Factory Tool Suite: Project Brief and Full Memory Export
**Prepared by Claude for Jay B. Carlile, corrected and augmented by ChatGPT against the live GitHub repository and prior independent validation history. Export date: August 31, 2026.**
**Purpose: durable, repo-backed context anchor for the Claude Project / repo and for future ChatGPT or Cowork sessions. Claude's memory export is preserved, but stale statements are corrected below and the former gaps are resolved where the repository or prior validation record provides evidence.**

---

## 1. Suite Overview

Six tools live on one site, built as a single Vite + React SPA in the public GitHub repo `Jaybc25/cdw-ai-factory-tco`, default branch `main`, auto-deploying via Vercel (Pro plan).

- **Repository:** https://github.com/Jaybc25/cdw-ai-factory-tco (PUBLIC as verified August 31, 2026; this corrects the earlier memory entry that called it private).
- **Repo snapshot used for this export:** `main` at `4106962aa657075ef313f34160e7c3b130a0b5af` immediately before this brief was committed. That HEAD was an automated model-capability sync commit.
- **Live URL:** https://cdw-ai-factory-tco.vercel.app
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

## 3. Platform Infrastructure (Accounts, Auth, Notifications)

- **Supabase project "ai-factory"** (Pro org, Micro compute; DB password in Dashlane). Tables: accounts, download_events (append-only, explicit report views), tool_snapshots (one row per account+tool, upserted by autosave). Recurring gotcha hit THREE times: RLS policies alone are not enough, explicit Postgres GRANTs are also required, and were missed for the authenticated role (02_grant_fix.sql), then for service_role (05_service_role_grant_fix.sql), plus a manual PostgREST schema-cache reload (NOTIFY pgrst).
- **Auth:** magic-link login via AuthContext.jsx / AuthWidget.jsx / supabaseClient.js, wired into all 6 tools. First-time setup captures name/company. Logged-in users with completed profiles skip every tool's contact gate and go straight to reports, pre-filled.
- **Email:** Supabase default sender is capped (2/hr, team members only), so Resend is the SMTP provider, sender no-reply@cdwaifactory.com "CDW AI Factory", DNS auto-configured via Cloudflare. Known issue: sends to @cdw.com addresses get a clean 200 in Resend logs but never arrive (suspected CDW filter blocking a new domain impersonating the CDW brand); may need CDW IT to allowlist cdwaifactory.com. Personal email confirmed working end to end.
- **Slack notifications:** Jay's personal workspace "AI Factory Tools", channel #all-ai-factory-tools. Supabase Edge Function notify-slack-download (deployed slug "bright-endpoint", JWT verification off, SLACK_WEBHOOK_URL as function secret). Called DIRECTLY from AuthContext's logDownloadEvent because Supabase Database Webhooks are broken by a confirmed platform bug (schema "supabase_functions" does not exist). Support case NOT yet filed. Direct invocation is intentional-but-temporary architecture. CORS OPTIONS handling was added after a live 500.
- **Report deliverables:** TCO, GPU Sizing, Model Advisor, ROI, and Readiness all have "Get the full report" style buttons with the login-skip-gate / contact-gate pattern, each logging a download_events row. Use Case Explorer intentionally has NO report (browse tool, no result worth reporting).
- **Combined Summary (/summary):** CombinedSummary.jsx reads all tool_snapshots for the account, renders one expanded card per tool used (each carries the substance of that tool's own report, not just headlines), Print/PDF, and fires its own Slack notification listing included tools. Entry point is a "My Summary" link in AuthWidget's signed-in state. Autosave is a shared debounced (1.5s) useAutosaveSnapshot hook on the 5 snapshot-capable tools. The pre-deployment lost-update race is fixed in current source by flushing a pending save on `pagehide` and `visibilitychange`; the premature empty-summary flash is also fixed by separating auth, account, and snapshot loading phases.
- **Cross-tool handoffs:** Explorer pills to Model Advisor / GPU Sizing (crosswalk-driven, hidden or amber-noted by routingClass); Model Advisor "Size infrastructure for this model" to GPU Sizing (`?model=`); GPU Sizing "Compare TCO" to TCO (`ownSys`, `gpuCount`, `sourceClass`, plus `workingDayHours` for inference); TCO "Send to ROI Calculator" (`initialCost`, `recurringCost`, planning basis). Current GPU Sizing purchase candidates begin at H200, so A100/H100 are no longer emitted as on-prem recommendations. Receiving tools consume handoff params with `history.replaceState` after capture and restore provenance/state from session storage so Back/Forward, refresh, and bare-URL returns do not replay or erase handoff context. Readiness keeps its separate versioned localStorage behavior.

## 4. Audit Trail / Methodology Docs Feature

Built and committed on all four calculating tools, reached via a button next to Print/Save as PDF: TCO, ROI, and GPU Sizing call it "Calculation Methodology & Audit Trail"; Model Advisor calls it "Recommendation Methodology & Decision Trace" (eligibility/ranking logic, not arithmetic). Design principle: it reads ONLY from the same engine output already on screen, never a second independent calculation, and shows every material formula with real substituted numbers, real reconciliation, and source/confidence provenance. Each tool's version went through multiple real review rounds with real bugs found (TCO: tautological reconciliation, mode-branching crash, React.Fragment import crash; GPU Sizing: alternatives-selection engine bugs fixed for real; ROI: three-state handoff provenance entered/prefilled/adjusted; Model Advisor: decision-trace intermediates exposed from the engine, false not-eligible on the fallback path fixed). Live rendered/PDF verification of the audit docs is still pending.

---

## 5. Tool 1: Cloud vs On-Prem TCO Calculator (/tco)

**What it is:** a reverse of NVIDIA's TCO tool. NVIDIA's takes a proposed hardware build and outputs equivalent rental cost; Jay's targets customers already spending on cloud AIaaS and shows the on-prem infrastructure needed to bring those workloads in-house and what it costs vs hyperscaler/neocloud spend. Free to use; report export is the lead-capture gate.

**Current state:** the validated Excel reference workbook remains the audit-complete financial reference after 9 ChatGPT rounds (scores rose from "cannot validate" to 9.7/10 arithmetic). The current repo source has advanced beyond the old v2.8 memory snapshot and contains the v2.9 workload-requirement path: a GPU Sizing handoff can drive TCO from a technical GPU requirement rather than from cloud spend. The repo package is version 2.8.0, but that package version is not a reliable per-tool semantic version. Exact live-deployed per-tool version labels were not independently proven in this export.

**Engine architecture highlights:**
- Validated against NVIDIA's tool: Test 1 fixture (Public Sector, AWS, DGX B200 vs B200 cloud) reproduced exactly; 16 validation checks + 20-check EngineRegression sheet + Crossover sheet (60-month cumulative sim).
- Two-picker rate design: rent-side A100/H100/H200/B200 (workbook blocks B300; web app offers it EST-flagged) x own-side H200/B200/B300/GB200 NVL-72/GB300 NVL-72. SYSTEMS registry carries NVIDIA-sourced loaded per-system costs; $600K cluster mgmt nodes are fixed cluster-level overhead, not per-system; NVL classes have nodeSize 72.
- Harmonic (not arithmetic) workload blend for the generational performance factor; dynamic fleet trajectory (growth buys systems year by year, fleet never shrinks); residual value excludes prof services and software suite; Tier 1 storage Auto mode derives PB from the non-compute budget (reconciles by construction); crossover from monthly cumulative simulation, suppressed when capacity exhausts first; horizon totals suppress to "N/A" past known exhaustion; roughly 45-condition master input guard (Excel trap documented: text compares greater than numbers, so every range check needs ISNUMBER).
- Explicitly cash-flow TCO (not NPV, not depreciation). Workbook is the "auditable reference implementation"; the web app extends it (dynamic growth, multi-provider, B300).
- Capacity & unit economics section (v1.9, EST badge): model size and quantization pickers to GPUs per copy, concurrent users, cost per 1M tokens vs a managed-API blended rate.
- No-crossover state shows "NO COST CROSSOVER AT THIS SPEND LEVEL" plus computed minimum viable spend. Report appendix carries every input, applied rates snapshot, and engine version stamp.

**Open items and corrected status:**
- The Excel-to-JS automated parity suite remains the last unbuilt assurance item from the 9-round TCO model audit. The intended pattern is fixture scenarios, both engines, tolerance of `MAX($1, 0.01%)`, then CI.
- **RESOLVED IN CURRENT SOURCE:** the GPU Sizing workload anchor now persists across Back/Forward, refresh, and bare-URL return. `gpuSizingCount`, `sourceClass`, `workingDayHours`, and mode are saved in TCO session state after handoff capture.
- **RESOLVED IN CURRENT SOURCE:** GPU Sizing to TCO fleet reconciliation is built. Workload mode directly uses the node-rounded technical GPU requirement, with a defensive cross-class capability conversion for legacy/future mismatches and separate workload duty-cycle vs owned-utilization treatment.
- Equinix storage-rack colo modeling stays a disclosed assumption; MLPerf provenance per performance factor remains deploy-phase.

## 6. Tool 2: GPU Sizing Tool (/gpu-sizing)

**What it is:** sizes GPU count/class for LLM inference and training/fine-tuning (mode toggle), simple and advanced input paths, model dropdown of 11 open models plus custom entry, multiple output configs with confidence tags.

**Current state:** the older memory label was v1.15, but the repo now contains post-v1.15 remediation and handoff work, so do not use that number as a definitive current live version. The validated spreadsheet reference model still anchors the logic. Current on-prem sizing candidates are **H200, B200, GB200 NVL72, and B300 only**; A100 and H100 were removed from the purchase candidate set because CDW's current new DGX purchase line begins at H200. Current source anchors are H200 4,373 tok/s/GPU (LISTED), B200 12,357 (LISTED), GB200 NVL72 12,022 (LISTED-derived), and B300 15,200 (LISTED-derived). Training MFU defaults to 0.40 with Meta Llama 3 sourcing. DeepSeek V3/R1 use the MLA-aware KV-cache branch; Muse Glimmer carries kvHeads 2.

**Current feature set:** budget panel with TCO-aligned loaded per-GPU point estimates (H200 $68,721, B200 $93,099, B300 $105,861, GB200 NVL72 $108,909), per-candidate utilization bars, working-day-hours input and 24-hour capacity visualization, Dev/Test/POC-only RTX PRO 6000 Blackwell alternative, and a static "Pod Sizing coming soon" handoff card. Each purchase class carries its own node size (72 for GB200 NVL72, 8 otherwise).

**Open items and corrected status:**
- Pricing values are still duplicated between GPU Sizing's `GPU_PRICE_USD` and TCO's `SYSTEMS` data rather than imported from one shared data module. `pricingProvenance.js` centralizes verification dates/staleness, not the actual price registry.
- **RESOLVED IN CURRENT SOURCE:** the TCO handoff now sends the recommended node-rounded quantity and class, and TCO workload mode consumes that technical requirement directly.
- **RESOLVED IN CURRENT SOURCE:** the sample token-speed preview layout shift is fixed. The component reserves its final wrapped height and reveals words with CSS visibility rather than growing the DOM as it types.
- Future: separate Pod Sizing tool (full deployment build-out: networking, storage, power) that this tool hands off into.

## 7. Tool 3: Open-Weight Model Advisor (/model-advisor)

**What it is:** recommends open-weight models by workload. Hard filters (license, context window, deployment constraints) then ranking into Best Performance / Most Efficient / Best Overall Fit cards, with real explanation text (explainCard, no generic copy), "Other models meeting your requirements" (up to 3), and verification candidates. Hands off to GPU Sizing.

**Workload checkboxes (8):** General chat/assistant, Coding, Agentic/tool use, Classification (renamed), RAG/knowledge retrieval, Summarization (renamed), Reasoning, plus a single-select primary workload for ranking. A Vision/multimodal 9th checkbox is intentionally NOT added pending a real vision model catalog.

**Key fixes shipped:** sync pipeline text_config fallback (multimodal configs nest max_position_embeddings, so context_length was silently null for exactly the 4 multimodal models, causing the "context window excludes everyone" pattern); Gemma 3 27B needs a manual override (its config states context length nowhere, class default 131,072); sweep-winner fix so eligible non-featured models still display; decision-trace intermediates exposed from the engine for the audit doc; session persistence added (was missing entirely).

**Crosswalk:** ModelAdvisorCrosswalk.json maps all 52 Explorer blueprints to routingClass (23 general-model-selection, 9 infrastructure-first, 11 specialized-stack, 9 platform-architecture). Only 2 of Explorer's 7 categories map cleanly to Advisor workloads; the CV/non-LLM gap is confirmed and routed around (2 pure-vision blueprints reclassified to specialized-stack rather than expanding the catalog). Full CV/vision-language expansion is deferred as its own future project.

## 8. Model Data Sync and Governance Pipeline (shared by GPU Sizing and Model Advisor)

This section corrects the largest factual gap in the original memory export.

- **Hugging Face architecture/spec registry:** `sync_model_specs.py` uses the Hugging Face Hub API and each tracked model's `config.json` as the primary source for license, architecture/context, modality, and model identity. **Authentication is required for the production sync.** Several tracked Llama and Gemma repositories are gated, so the GitHub Action supplies a read-only `HF_TOKEN` secret. The Hugging Face account that issued that token must first accept the relevant model license terms. Anonymous access can return 401. This replaces the earlier incorrect statement that "no auth [is] needed."
- **Hugging Face cadence:** `.github/workflows/sync-model-specs.yml` runs monthly at 06:00 UTC on the first day of the month and can be triggered manually. It commits `data/model_specs.json` back to `main` as `model-advisor-bot`.
- **Discovery vs truth:** `dell.huggingface.co` remains only a discovery layer for deciding which models are worth tracking. It is not the data source of record and there is no Dell-branded customer feature in the app.
- **Explicit canonical registry:** `data/canonical_models.json` uses explicit aliases across Hugging Face, Artificial Analysis, and future NVIDIA NIM identifiers. There is no fuzzy auto-matching. New models are deliberately admitted to the canonical registry rather than automatically becoming customer-facing because an external catalog discovered them.
- **Current tracked architecture set:** 11 canonical models spanning Llama 3.1/3.3, Mixtral, Llama 4 Scout/Maverick, DeepSeek V3/R1, Gemma 3 27B, and Muse Glimmer 30B. `KNOWN_PARAM_COUNTS_BILLION`, `KNOWN_CONTEXT_LENGTH`, and the `text_config` fallback cover source gaps that the raw config cannot safely resolve on its own.
- **Artificial Analysis capability registry:** `sync_capability_scores.py` uses Artificial Analysis's **free** Data API tier with an `AA_API_KEY`. HF stays primary for license/modality/parameter fields; Artificial Analysis supplies the capability/ranking side: intelligence, coding, agentic scores, speed, and pricing. This runs weekly on Monday at 06:00 UTC through `.github/workflows/sync-capability-scores.yml`.
- **Discovery quarantine:** Artificial Analysis models that are not in `canonical_models.json` are written to `data/aa_discovery_candidates.json` and excluded from the production capability snapshot. The latest repo HEAD before this brief was an automated August 31 capability-sync commit, confirming this workflow is active.
- **Registry reconciliation:** `.github/workflows/reconcile.yml` runs daily, manually, and after changes under `data/**` to catch cross-registry drift.
- **NVIDIA NIM:** `sync-nim-compatibility-MANUAL-ONLY.yml` is intentionally manual-only and explicitly not production-backed. Its catalog-wide endpoint remains unconfirmed; do not treat NIM compatibility as an automated source of truth until that endpoint is validated live.
- These networked sync scripts are intended to run locally or in CI, not inside Claude or ChatGPT sandboxes that cannot reach the required external APIs.

## 9. Tool 4: AI Use Case Explorer (/use-cases)

**What it is:** browse/discovery tool (no math, no report): pick an industry (13 tiles) or business function (13, dual entry added v2.0) and see NVIDIA Blueprints grouped by 7 use case categories, with an in-tool detail modal (what it does / what it looks like in this industry / infrastructure needs / handoff pills) and a small "View on NVIDIA" escape-hatch link. Keeps visitors on the hub by design.

**Data:** blueprints.json at v2.1, 52 entries (after a churn of verification rounds: some blueprint names confirmed real that were earlier suspected hallucinated and vice versa; 2 deprecated blueprints kept with LEGACY badges). Each entry: identity, industry_fit and department_fit scored objects (primary/adjacent), use_case_categories, capability_tags, industry_pitch (one per blueprint), detail_what_it_does, detail_in_practice (default + per-industry overrides, 78 of them), detail_infrastructure, status, last_verified. Per-industry framing sentences carry the on-prem angle. NO per-blueprint CDW confidence tiers or reference accounts (deliberate). NO lead-time flags (kills conversations; lead times tracked separately, see Section 13).

**Catalog maintenance note:** build.nvidia.com/blueprints loads client-side and returns only ~24 of the full list per fetch; cross-reference github.com/orgs/NVIDIA-AI-Blueprints/repositories (page 2 is robots-blocked).

**ChatGPT verdict:** GO for internal seller-assisted prototype use. SLED adjacent mappings pruned 47 to 39; compliance-adjacent language softened per redlines.

## 10. Tool 5: AI Use Case ROI Calculator (/roi)

**What it is:** ROI for AI use case implementation. HARD FRAMING CONSTRAINT (Jay's): never a headcount-reduction lens. Capacity redeployment is structural in the model itself: Gross Capacity Created (headline) then Realized Economic Value after a realization %, hours-first with FTE-equivalent secondary, redeployment value-uplift optional and walled off as illustrative upside, no fields named headcount reduction or similar.

**Current state:** SHIPPED, GO disposition. Frozen v1.3 workbook (45 validation checks) + React port with a shared engine.js (single source of truth, imported by both the component and a Node cross-check script). Two-stage model, Year 1 ramp %, "Estimated Payback Period" naming with rollout-shape disclosure, Excel-parity rounding helper (excelRound with magnitude-scaled epsilon), input bounds mirrored client-side. Default scenario: 44,160 redeployable hrs/yr, $2.43M/yr realized value, 273.7% 3-yr ROI, 4.4-month payback.

**Fixed post-ship:** tooltip props never threaded into the 14 Field calls (verified with jsdom click simulation); report headline was always Year 1 net regardless of horizon (now dynamic "{N}-Yr Net Benefit" pulling horizonNet). The headline fix was delivered but NOT yet confirmed live.

## 11. Tool 6: AI Readiness Checklists (/readiness)

**What it is:** not a calculator; a tree of interactive checklists behind five doors, each with a "where are you today?" state picker routing to a branch (or a curated full list for "Not sure yet"). Items are In Place / Needs Attention / Don't Know with why-it-matters and typical-owners expansions and impact tags (blocking / important / informational). Qualitative per-door summaries only (never a score, never "you cannot deploy"), deterministic status logic living in the data (readiness_rule_order), branch-end handoffs into the other tools. 6th bubble, end of the journey, deliberately NOT the front door.

**Current state:** SHIPPED. Spec FROZEN after 3+ ChatGPT rounds (ReadinessChecklistsSpec.md); content authored door by door with one external calibration checkpoint (Door 5) then a passed five-dimension final audit; checklists.json at content_version 1.2: 97 items across 5 doors (Data 20, Security & Governance 19, Infrastructure 20, People & Operations 21, Business & Use Case 17), 6 blocking / 87 important / 4 informational (6.2% blocking), 22 sourced items, 11-authority source registry (FBI CJIS, HHS HIPAA, NARA CUI, NIST series, Dept of Ed FERPA, GovRAMP, Section 508, NIST AI RMF), 8-tag applicability vocabulary including federal-contracting. All 5 blockers are identify-your-responsibility questions, never have-you-implemented. React build (AiReadinessChecklists.jsx) passed implementation-parity review with zero changes: presentation-only component, data-driven engines, versioned localStorage.

**Fixed post-ship:** standalone report expanded from a 5-line status summary to full door-by-door Q&A with flagged-item detail and the Jay B. Carlile signature footer (My Summary stays short). Delivered, NOT yet confirmed live.

## 12. Client Summary Brief (separate deliverable generator, own Claude Project)

ClientAiFactorySummary_[insertclientname].pptx: a 2-page CDW-branded portrait PPTX reformatting My Summary snapshot data for clients, including only the tools that client actually used. Built as generate_client_summary.js (pptxgenjs) with client-data-example.json. An expanded multi-page version exists (generate_client_summary_full.js), trialed against real 5-PDF client data through several review rounds. A real fixture/preflight regression suite protects it (preflight_validate.js + run_fixture_suite.sh, 14+ fixtures, verified by deliberately reverting a fix and watching the suite fail correctly). Rename gotcha on record: after renaming the _v2 file, the runner still referenced the old name and silently tested a stale file. Workstream considered CLOSED.

## 13. Sales Context Around the Suite

- Jay is an AI Solutions Executive in CDW's AI Factory practice (founding member, joined July 2025 as founding BDM, ASE since Jan 2026). Focus: enterprise and SLED AI infrastructure, NVIDIA DGX, on-prem, NVIDIA AI Blueprints.
- The suite exists as a prospecting/enablement asset. Related assets: "Prospecting for AI with AI" methodology (v3, weighted rubric), Microsoft Copilot agents (Blueprint Ideation, Salesforce case intake), Blueprint Ideation runs across accounts (Louisville Metro, GATX, Hutto ISD, Sabre Systems, Conagra, City of Seattle), RFP responses (SC ITPS Lot 8, Tennessee DGS, Utah DAS GenAI, Cleveland Metroparks #7045), LCRA AI 101 exec training, NVIDIA AI Factory panel participation.
- NVIDIA lead-time table (as of 2026-07-31) is tracked separately from the tools by design; DGX GB300/GB200/B300/B200 at 36wk, details in memory.
- Suite-level explainer doc exists: AiFactoryToolsExecutiveSummary.docx (Jay's voice, all tools, the validation story, three-kinds-of-accuracy framework).

## 14. Rate Expansion Reference (B300 / GB200 / GB300)

A normalized rate spec (saved Aug 6, 2026) drives the TCO tool's expanded rate card. Highlights: confidence tiers LISTED > NODE-NORM > EST > QUOTE; engine consumes range midpoints; cloud on-demand anchors (B300: AWS $17.80 NODE-NORM, OCI $5.00 EST, CoreWeave $8.00 EST; GB200: CoreWeave $10.50 LISTED, Azure $27.00 LISTED, OCI $16.00 LISTED; GB300: mostly QUOTE); on-prem NVIDIA-sourced loaded per-system captures for H200/B300/GB200/GB300 complete. Known discrepancy documented: a team member's GB200/GB300 anchors divided per-rack price by 144 GPUs instead of 72, roughly 2x too low; NVIDIA-sourced $2.43/$2.91 bare per-GPU-hr used instead. GB200 market rates rose ~42% Aug 2025 to Aug 2026, so refresh these more often. Final two-picker design recorded here (rent: A100/H100/H200/B200; own: H200/B200/B300/GB200/GB300). Full numbers live in the memory file and in the deployed rate card.

## 15. Maintenance

AiFactoryMaintenanceChecklist.md exists covering: cloud rates, NVIDIA DGX pricing, model catalog, blueprints, TCO perf factors, GPU Sizing benchmark anchors, readiness regulatory citations, CDW's sellable line, with cadence, ownership, and safety protocol per item. It has NOT yet been verified against the actual current repo files; Jay is holding that until the build thread settles, then will supply real uploads or repo access so it can be corrected against ground truth.

## 16. Consolidated Open Items and Known Bugs

The original version of this section mixed historical findings with still-open work. Repo inspection on August 31, 2026 shows that most of the high-priority pre-deployment defect ledger has since been remediated in source.

**Resolved in current repo source (code verified in this export; live deployment was not independently rerun):**

1. **TCO workload-mode handoff persistence:** fixed. `gpuSizingCount`, `sourceClass`, `workingDayHours`, mode, and related state restore from `sessionStorage`; query params are consumed after capture.
2. **GPU Sizing token preview layout shift:** fixed with fixed final text footprint plus visibility-based reveal.
3. **GPU Sizing to TCO fleet reconciliation:** built. TCO workload mode uses the actual technical GPU quantity and class from GPU Sizing rather than re-deriving fleet size from spend.
4. **ROI malformed handoff parameters and provenance:** fixed. Blank/garbage numeric params no longer coerce to a truthful `$0` handoff; original TCO values and planning-basis provenance persist.
5. **Autosave debounce lost-update race:** fixed in `useAutosaveSnapshot` with page-exit/background flushing.
6. **Combined Summary premature empty-state flash:** fixed by explicitly separating auth loading, account loading, and snapshot loading.
7. **Accessibility remediation:** current source contains real input labels/ARIA wiring, TCO disclosure `aria-expanded`/`aria-controls`, page landmarks/headings, and multiple color-contrast remediations identified in the final validation round.
8. **Client-summary fixture gap:** the current `src/` tree contains 14 fixture JSON files plus `preflight_validate.cjs` and `run_fixture_suite.sh`; the prior "zero fixtures can falsely pass" state is no longer the current repo state.

**Still open or not proven closed by this export:**

9. **TCO Excel-to-JS automated parity suite:** still the principal unbuilt model-assurance item. The repo's registry reconciliation workflow is a different system and does not satisfy this requirement.
10. **Full current live regression:** the source contains the remediations above, but this export did not repeat the complete browser journey and rendered/PDF checks against the currently deployed Vercel build. Re-run Explorer -> Model Advisor -> GPU Sizing -> TCO -> ROI -> My Summary, including deep links, refresh, Back/Forward, audit documents, and print/PDF output before calling the current release fully revalidated.
11. **Shared pricing data module:** still not built. GPU Sizing and TCO share verification dates through `pricingProvenance.js`, but their actual pricing tables remain separate copies.
12. **NIM production sync:** intentionally blocked until a real supported catalog endpoint is confirmed.
13. **ROI horizon-aware report headline and Readiness verbose standalone report:** source/delivery history records these fixes, but this export did not independently prove the currently deployed Vercel render.
14. **Supabase Database Webhooks platform bug:** direct Edge Function invocation remains the temporary architecture; support case status is not proven changed here.
15. **CDW email deliverability to @cdw.com:** still an external IT/domain reputation issue unless separately resolved.
16. **Domain/publication gating:** `cdwaifactory.com` connection, CDW publication approval, Supabase Auth URL changes, and removal of public-launch gates remain external to the source inspection.
17. **Future scope:** Pod Sizing, journey-level lead signal, vision/CV catalog expansion, and optional financing/lease treatment remain idea-list items unless separately reprioritized.
---

## 17. Resolved Gaps and Remaining Unknowns

Claude's original gap list is retained here as a resolved-status ledger so future sessions do not reopen questions that the repo already answers.

1. **Hugging Face connection - RESOLVED.** The actual production setup is an authenticated Hugging Face Hub sync using a read-only `HF_TOKEN` stored as a GitHub Actions secret. The associated HF account must have accepted licenses for gated models such as Llama and Gemma. The monthly Action commits `data/model_specs.json`. Claude's earlier statement that the public API needed no authentication was wrong. Dell's Hugging Face Enterprise Hub is only a discovery surface, not the source of truth, deployment surface, or customer-facing integration.
2. **GitHub repo details - RESOLVED.** Exact repo: `https://github.com/Jaybc25/cdw-ai-factory-tco`. It is **public**, not private. Default branch is `main`. The connected GitHub account has push/admin permission. No separate branch convention was evidenced in the repo metadata or project brief, so do not invent one. The full current `src/` file list is captured in Section 19.
3. **Current deployed versions - PARTIALLY UNRESOLVED.** `package.json` reports suite/package version `2.8.0`, while current TCO source explicitly contains v2.9 workload-mode logic and several tools contain post-version-label remediation comments. Therefore package version cannot be used as each tool's live semantic version. This export verifies current `main` source, not the exact Vercel deployment artifact/version for every tool. Treat "current deployed version" as unknown until the live build or deployment SHA is checked.
4. **Corrections that did not stick - RESOLVED WHERE EVIDENCE EXISTS.** Material corrections now captured here include: repo is public; HF production sync requires `HF_TOKEN`; A100/H100 are removed from GPU Sizing's on-prem purchase candidates; current B200 inference anchor is 12,357 tok/s/GPU rather than the stale 11,264 figure; the GPU preview layout bug is fixed; GPU Sizing to TCO technical fleet reconciliation is built; TCO workload-mode persistence is fixed; ROI malformed-param/provenance handling is fixed; autosave and Summary loading defects are fixed; the 14 client-summary fixtures are committed.
5. **ChatGPT project knowledge - RESOLVED.** The independent validation history and defect/remediation record that Claude's summary did not fully preserve is exported in Section 18.
6. **CDW sign-off status - STILL EXTERNAL/UNRESOLVED HERE.** The latest source brief says the CDW logo approval was temporary for the draft artifact and website publication was not approved, with `cdwaifactory.com` still parked. Repo inspection does not prove any newer corporate approval, stakeholder decision, or publication authorization. Do not infer approval from the public GitHub visibility or the existence of the CDW logo in source.
7. **Formspree - RESOLVED AS SUPERSEDED IN CURRENT IMPLEMENTATION.** The current package and repo contain no Formspree dependency or active Formspree implementation. Supabase Auth/accounts/download events/tool snapshots plus Resend/Slack now form the live lead/report plumbing. Treat Formspree as dead scope unless Jay explicitly revives it later.
8. **Roadmap priority - UPDATED BY CURRENT STATE, USER PRIORITY NOT RECONFIRMED.** The two items that previously looked highest priority, TCO workload-mode persistence and GPU-to-TCO fleet reconciliation, are already fixed/built in current source. On technical assurance alone, the remaining logical order is: (a) automated TCO Excel-to-JS parity, (b) a fresh full live cross-tool and PDF regression on the current deployment, (c) eliminate duplicated pricing data with a shared registry, then (d) external launch blockers and future features as business priority dictates. This ordering is repo-informed, not a new instruction from Jay.

---

## 18. ChatGPT Independent Validation Export

This section preserves the work ChatGPT performed as an independent reviewer, adversarial checker, and second-opinion validator so that future Claude/Cowork/ChatGPT sessions understand not just the present code, but why the present safeguards exist.

### 18.1 Validation role and philosophy

- ChatGPT was intentionally used as an external reviewer rather than the primary builder. Claude/Claude Cowork often implemented or ran browser work; ChatGPT challenged assumptions, reviewed actual source/workbooks, issued PASS/CONCERN/FAIL or GO/NO-GO findings, and pushed for reproducible proof.
- The durable rule was always **repo/file evidence over memory**. This became especially important after pasted-code reconstruction produced plausible but incorrect files. Later reviews used actual uploads, fresh repo clones, workbook parity, browser automation, or executable harnesses.
- Findings were not to be implemented blindly. Each audit finding had to be evaluated against the model's intended semantics and source evidence.

### 18.2 Formal review history

- **TCO financial model:** 9 adversarial audit rounds. The workbook moved from an initial "cannot validate" state to roughly 9.7/10 arithmetic confidence, with the reference workbook treated as the auditable implementation.
- **Site integration:** 3 structured review rounds before the later full browser-validation campaign.
- **ROI:** workbook/reference-model review plus React parity work; the frozen v1.3 workbook carried 45 validation checks and the React implementation imports the same `engine.js` used by the Node cross-check.
- **Readiness:** multiple specification/content review rounds plus a final multi-dimension audit focused on blocker semantics, source quality, compliance phrasing, applicability, and duplicate/shared-item consistency.
- **Use Case Explorer:** independent catalog/mapping reviews, including SLED pruning and compliance-language softening, produced a GO for internal seller-assisted prototype use.
- **Audit trail feature:** TCO, ROI, GPU Sizing, and Model Advisor each received separate decision-trace/calculation-trace review rather than assuming a pretty methodology document was correct.

### 18.3 Six-round pre-deployment browser validation

A separate pre-deployment program ran against a fresh clone at commit `55c077d` using local Vite plus Playwright with real Chromium. Supabase was mocked so signed-in autosave/My Summary behavior could be tested deterministically. Tailwind was served locally from Round 4 onward. Across the six rounds plus one user-reported UI issue, approximately **130 checks** were verified.

The tested journey covered:

- Use Case Explorer -> Model Advisor -> GPU Sizing -> TCO -> ROI -> My Summary.
- Back/Forward navigation, hard refresh, deep-link isolation, and stale-param replay.
- TCO ordinary spend mode plus workload mode, multiple GPU classes, and five-year variants.
- GPU Sizing inference, training, custom model, zero-input validation, alternatives, and extreme stress.
- ROI ordinary, deep-linked, and negative cases.
- My Summary loading, snapshots, and print behavior.
- Audit-trail arithmetic/decision-trace scenarios.
- Double-click and repeated provider-toggle resilience.
- Accessibility structure and color contrast.
- Runtime/console and report/print smoke checks.

One deliberately extreme sizing case reached **209,752 B300 GPUs** and correctly remained a low-confidence result rather than crashing or pretending the scenario was normal. The problem found there was presentation formatting at extreme magnitude, not the guardrail or engine behavior.

### 18.4 Historical defect ledger and current resolution mapping

The final pre-fix ledger separated material correctness/state defects from UX/accessibility findings:

1. **Handoff-state persistence root cause:** TCO workload mode/technical anchor could disappear after Back/refresh; provenance banners and My Summary planning-basis labels could drift; TCO -> ROI provenance could be lost. **Current repo status: source contains remediation.**
2. **ROI malformed handoff params:** blank/garbage values could be interpreted as valid `$0` and falsely labeled as TCO-provided. **Current repo status: source contains `parseHandoffNumber` remediation.**
3. **Autosave debounce race:** a last edit made shortly before full-page navigation could die with the browsing context before the 1.5s timer fired. **Current repo status: source flushes pending save on page exit/background.**
4. **Client-summary fixture hygiene:** the regression runner could pass a zero-fixture state when fixture files were absent from the fresh clone. **Current repo status: 14 fixtures plus preflight/runner are present in `src/`.**
5. **Combined Summary loading ordering:** signed-in users could briefly see the empty state before account/snapshot retrieval settled. **Current repo status: source separates all three loading phases.**
6. **Accessibility:** missing programmatic labels, TCO disclosure ARIA, missing landmarks/headings, and several contrast misses. **Current repo status: remediation is visible across current TCO/ROI/GPU source.**
7. **GPU sample-output preview layout shift:** animated text changed component height and pushed the form. **Current repo status: fixed with reserved final footprint.**
8. **Cosmetic backlog:** very large-number formatting and React Router future/deprecation warnings were not treated as model-correctness failures.

The prior validation disposition was effectively **NO-GO until the state-consistency and newly discovered defects were remediated**. That disposition is historical. Because current `main` visibly contains the relevant fixes, it should not be quoted as the current release verdict. Equally, do not convert it to a new GO without rerunning the full current live regression.

### 18.5 Cross-tool design findings that should remain durable

- The Explorer -> Model Advisor mismatch was diagnosed as a **scope/routing problem**, not a bug to paper over. `ModelAdvisorCrosswalk.json` maps all 52 blueprints into 23 general-model-selection, 9 infrastructure-first, 11 specialized-stack, and 9 platform-architecture routes. Vision/CV expansion was deliberately deferred rather than stuffing non-LLM use cases into an LLM advisor.
- Model Advisor -> GPU Sizing needs explicit ID normalization because the canonical registry and GPU tool use different slug conventions. Current source includes an explicit mapping table and warns instead of silently substituting when a handoff cannot be matched.
- GPU Sizing -> TCO semantics must keep **technical requirement**, **workload duty cycle**, and **owned utilization** separate. Current TCO workload mode reflects that distinction.
- TCO -> ROI must keep **cost values** and **cost provenance** separate. A user can accept a TCO-prefilled value or modify it; the audit trail should say which actually happened.
- My Summary is an account snapshot of the latest state, not a replacement arithmetic engine. The audit-trail pages likewise explain/reconcile the same calculation output rather than secretly running a second model.

---

## 19. Repo-Verified Source of Truth Snapshot

**Repository:** `Jaybc25/cdw-ai-factory-tco`  
**Visibility:** public  
**Default branch:** `main`  
**Pre-brief HEAD verified:** `4106962aa657075ef313f34160e7c3b130a0b5af`  
**Package name/version at that snapshot:** `cdw-ai-factory-tools` / `2.8.0`  
**Important:** `package.json` also contains `"private": true`; that is the npm publish flag and does **not** mean the GitHub repository is private.

### 19.1 Current `src/` file list

- `AiReadinessChecklists.jsx`
- `App.jsx`
- `AuthContext.jsx`
- `AuthWidget.jsx`
- `CombinedSummary.jsx`
- `GpuSizingCalculator.jsx`
- `LandingPage.jsx`
- `ModelAdvisor.jsx`
- `ModelAdvisorCrosswalk.json`
- `RoiCalculator.jsx`
- `TcoCalculator.jsx`
- `UseCaseExplorer.jsx`
- `blueprints.json`
- `cdw-logo.png`
- `checklists.json`
- `engine.js`
- `fixture-01-three-tools.json`
- `fixture-02-four-tools.json`
- `fixture-03-long-strings.json`
- `fixture-04-negative-roi.json`
- `fixture-05-zero-roi.json`
- `fixture-06-huge-roi.json`
- `fixture-07-horizon-1yr.json`
- `fixture-08-horizon-5yr.json`
- `fixture-09-readiness-all-statuses.json`
- `fixture-10-explicit-nulls.json`
- `fixture-11-unexpected-array-field.json`
- `fixture-12-unexpected-scalar-field.json`
- `fixture-13-tco-spend-basis.json`
- `fixture-14-inconsistent-field.json`
- `generate_client_summary_full.cjs`
- `main.jsx`
- `modelAdvisorEngine.js`
- `preflight_validate.cjs`
- `pricingProvenance.js`
- `run_fixture_suite.sh`
- `sessionState.js`
- `supabaseClient.js`

### 19.2 Repo automation relevant to future sessions

- `.github/workflows/sync-model-specs.yml`: monthly Hugging Face spec sync, using `HF_TOKEN`.
- `.github/workflows/sync-capability-scores.yml`: weekly Artificial Analysis capability sync, using `AA_API_KEY`.
- `.github/workflows/reconcile.yml`: daily/manual/data-change registry reconciliation.
- `.github/workflows/sync-nim-compatibility-MANUAL-ONLY.yml`: manual only; endpoint not yet production-validated.

Only secret **names** belong in documentation. Never put token/key values in this brief.

### 19.3 Fetch-first rule for future AI work

Before reconstructing, editing, or declaring a bug fixed:

1. Fetch the current repo file from `main` or use an actual current upload.
2. Treat this brief as architectural/history context, not a substitute for the source.
3. Distinguish three kinds of status:
   - **Source-verified:** present in current repo code.
   - **Live-verified:** reproduced in the deployed Vercel app/browser.
   - **Externally approved:** CDW/legal/IT/publication decision outside the repo.
4. Never infer one from another. Public GitHub does not equal CDW publication approval; source-present does not equal deployed; package version does not equal each tool's semantic version.
5. After material changes, update this brief if a durable design decision, data source, validation result, or roadmap status changed.

**Sign-off:** this corrected and augmented file is intended to live at repo root as `AiFactoryProjectBrief.md` and to be referenced by the Claude Project instructions with the fetch-first rule above.
