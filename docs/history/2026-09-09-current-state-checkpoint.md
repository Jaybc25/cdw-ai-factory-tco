# CDW AI Factory Tools - Current-State Checkpoint

**Checkpoint date:** September 9, 2026  
**Repository:** `Jaybc25/cdw-ai-factory-tco`  
**Current production/main checkpoint:** `9ee83d6c71edd5807c683ee2503ae95bc14b8887`  
**Release status:** Unreleased work after `AI Factory Suite 2026.09.1`; this checkpoint is documentation only and does not create or move a release tag.

## Purpose

This file is a durable historical checkpoint for the September 8-9 UX, explainability, and navigation tranche. It supplements `CHANGELOG.md` and `AiFactoryProjectBrief.md` so the current state can be reconstructed even if chat context is unavailable.

GitHub `main`, immutable tags/releases, pull requests, and current source files remain authoritative for exact implementation details. This document records the intent, scope boundaries, validation state, and deliberate decisions around the work summarized below.

## Current suite state at this checkpoint

The suite remains a seven-route Vite/React application:

- `/use-cases` - AI Use Case Explorer
- `/model-advisor` - Open-Weight Model Advisor
- `/gpu-sizing` - GPU Sizing Tool
- `/tco` - Cloud vs On-Prem TCO Calculator
- `/roi` - AI Use Case ROI Calculator
- `/readiness` - AI Readiness Checklists
- `/summary` - My Summary for signed-in users

The core technical/economic ownership chain remains:

**Model Advisor -> GPU Sizing -> TCO -> ROI**

- Model Advisor owns model recommendation/selection context.
- GPU Sizing owns the technical infrastructure requirement.
- TCO consumes that technical result and owns economics/planning assumptions.
- ROI consumes economic cost context where handed off and owns the capacity/value business-case layer.

No September 8-9 UX work described in this checkpoint changes that ownership contract.

## September 8-9 completed tranche

### PR #48 - Model Advisor explanation polish

**Title:** `Model Advisor: polish recommendation explanations`  
**Head SHA:** `fb9804d0a1362deae0dab0ded7424f1305143255`

- Renamed the customer-facing methodology entry point to `Why these recommendations?` while keeping the formal methodology/decision trace.
- Replaced developer-oriented model IDs with friendly names in customer-facing report and trace presentation while preserving canonical IDs for logic and routing.
- Simplified decision-trace terminology around direct evidence, capability tradeoffs, and qualifying floors.
- Removed production `V1` wording from informational-only fields.
- Preserved ranking, hard filters, margins, tie-breaking, eligibility, benchmark mappings, GPU Sizing behavior, and TCO economics.

### PR #49 - Shared tool shell

**Title:** `UX unification: shared tool shell`  
**Head SHA:** `803bf20c297c50195290fd2b733bd640d1630fb8`

- Added a reusable AI Factory tool header and utility-row pattern across the suite.
- Standardized contextual Back/Adjust navigation and account/My Summary/sign-out placement.
- Applied the shared shell to Explorer, Readiness, Model Advisor, GPU Sizing, TCO, ROI, and My Summary.
- Preserved Explorer breadcrumb behavior and TCO explanatory subtitle.
- Standardized `Combined Summary` customer-facing naming to `My Summary`.
- Kept all tool-body calculation, recommendation, handoff, report, and economic logic unchanged.
- Landing-page redesign remained intentionally deferred.

### PR #50 - Direct methodology/audit access

**Title:** `Expose methodology and audit trail beside report actions`  
**Head SHA:** `749bfa00d97db08345dcea2e114fbf0fce081f49`

- Added direct secondary methodology/audit actions next to the primary report action for TCO, GPU Sizing, Model Advisor, and ROI.
- Model Advisor uses `Why these recommendations?`; the calculation tools use `Calculation Methodology & Audit Trail`.
- Readiness remains intentionally audit-free because it is a checklist/assessment experience rather than a calculation engine.
- Direct methodology/audit access does not invoke report-download telemetry.
- No methodology, report content, calculation, recommendation, or handoff logic changed.

### PR #51 - Shared-shell duplicate-header cleanup

**Title:** `Fix duplicate legacy headers under shared shell`  
**Head SHA:** `cff58cc19ddfc5344cb4375c87215486b447161a`

- Fixed duplicate legacy header/account chrome that remained visible beneath the shared shell on Explorer, Readiness, TCO, and ROI.
- Root cause was inline legacy `display` styling overriding the migration suppression rule.
- The fix is presentation-only and preserves tool logic, reports, handoffs, and the existing-deployment model toggle.

### PR #52 - Route-level scroll policy

**Title:** `Reset scroll position on new tool navigation`  
**Head SHA:** `16b4d81756719b3645ae08a0e37aff37d26786a9`

- Added explicit SPA route scroll behavior so new tool navigation starts at the top.
- Fresh/direct/reloaded visits and normal PUSH/REPLACE navigation go to top.
- Genuine browser Back/Forward POP navigation leaves browser scroll restoration intact.
- This changes navigation presentation only.
- Production behavior was manually confirmed after merge.

### PR #53 - Model Advisor progressive disclosure

**Title:** `Simplify Model Advisor input hierarchy`  
**Head SHA:** `09d5c214471a4d8b6475ccc0683a0787aee2caf6`

- Reorganized inputs around a `Core decision` first-use path.
- Moved context, multimodal, license, governance/origin, and data sensitivity into `Deployment requirements`.
- Moved reasoning intensity and fine-tuning intent into `Additional planning details` and kept them explicitly informational-only for ranking.
- Preserved all existing inputs/defaults and the results-side recommendation hierarchy.
- Recommendation/scoring, eligibility, quality margins, evidence data, reports, audit, handoffs, autosave, and telemetry were unchanged.

### PR #54 - Audit-view scroll reset

**Title:** `Reset scroll position when audit views open`  
**Head SHA:** `643cf823ac06ea2c638cf6ab9f2b015d0e284950`

- Fixed TCO, GPU Sizing, Model Advisor, and ROI audit/methodology views opening at a retained mid-page scroll position.
- Root cause was internal same-route React view switching, which is outside the route-level scroll policy added in PR #52.
- The fix is shared-shell presentation/navigation only.

### PR #55 - Report-view scroll reset

**Title:** `Reset scroll position when report views open`  
**Head SHA:** `5c6bae672d98457440d13db9cc13f7ed69c09207`

- Extended the same internal-view scroll correction to all five report-producing tools: TCO, GPU Sizing, Model Advisor, ROI, and Readiness.
- Covers direct signed-in report openings and gated report-submit flows.
- Report content, audit content, calculations, session state, and handoffs remain unchanged.
- Production behavior was manually observed working after merge.

### PR #56 - GPU Sizing progressive disclosure

**Title:** `Simplify GPU Sizing input hierarchy`  
**Head SHA:** `0b286e96e02de0549964025e0ce7be18eea848f8`

- Removed the visible `Simple path` / `Advanced path` choice.
- Kept the core workload questions prominent.
- Moved inference quantization/GPU class and training precision/GPU class into compact `Deployment assumptions` sections.
- Moved token/KV/runtime assumptions and training MFU behind `Advanced sizing assumptions`.
- Retained active values in collapsed summaries and preserved remembered simple/advanced state as disclosure open/closed state.
- Clarified the response-speed label while preserving the previously approved Peak concurrent users semantics for human users, agents, copilots, automations, and parallel sub-agents.
- Inference/training formulas, GPU/model catalogs, throughput anchors, node rounding, recommendations, pricing, utilization, working-day-hours, TCO handoff, reports, audit, autosave, and cross-tool handoffs were unchanged.

### PR #57 - ROI and Readiness report-control consistency

**Title:** `Standardize ROI and Readiness report controls`  
**Head SHA:** `329f434ac360d2ddbb890062ac8c2913f16e3618`  
**Merged main checkpoint:** `9ee83d6c71edd5807c683ee2503ae95bc14b8887`

- Standardized the ROI primary report action to `Get the full report (PDF)` while retaining its methodology/audit action.
- Standardized Readiness to the same primary report wording.
- Changed Readiness's generic `Back` report action to `Back to assessment`.
- Added narrow-mobile stacking for Readiness report controls.
- Readiness remains intentionally audit-free.
- ROI economics, formulas, handoff provenance, reports/audit content, telemetry, autosave, Readiness scoring, checklist content, suggested-next-step logic, and report content were unchanged.

## Deliberate TCO decision: progressive disclosure deferred

A TCO progressive-disclosure design was reviewed after Model Advisor and GPU Sizing simplification. The proposed hierarchy was directionally sound:

- core comparison first,
- comparison assumptions second,
- infrastructure assumptions next,
- transition/resilience and advanced methodology later.

Implementation was intentionally **deferred** before any PR was opened.

Reason: `src/TcoCalculator.jsx` remains a large, methodology-dense monolithic component containing the suite's most sensitive economic behavior, including workload-mode semantics, cloud-rate reconstruction, storage reconciliation, growth/unit-price treatment, GPU Sizing handoff ownership, transition/resilience costs, crossover logic, report/audit output, and ROI downstream values. The UX benefit did not justify introducing structural regression risk during this cleanup tranche.

The approved future-safe path, if TCO hierarchy work is revisited, is:

1. first refactor presentation sections into smaller components with zero behavioral change,
2. prove source/engine/report/handoff parity,
3. then reorganize progressive disclosure in a separate PR.

Until then, current TCO input hierarchy is intentionally preserved.

## Current TCO pricing/growth contract

The cloud GPU unit-price trend sensitivity is now a production input, not a preview.

- Default remains `0%/yr`, preserving prior economics unless explicitly changed.
- The trend applies to modeled cloud GPU compute unit rates.
- Workload growth remains a separate consumption-growth assumption.
- Non-compute cloud costs retain their established escalation treatment.
- The assumption is persisted and represented in TCO report/audit language.
- GPU Sizing remains the technical sizing authority in workload-driven TCO flows.

No September 9 UX PR altered these economics.

## Current UX philosophy

The approved simplification principle for the suite is:

**Core decision first -> meaningful constraints second -> informational/expert planning detail last.**

Supporting operating principles:

- Results first; explainability should remain one click away.
- Preserve enterprise controls and auditability rather than deleting them for simplicity.
- Avoid feature creep.
- Do not alter validated methodology merely to make a screen shorter.
- Use progressive disclosure where it clearly reduces first-use cognitive load without hiding material assumptions.
- Treat TCO more conservatively than other modules because of its downstream economic role and current monolithic implementation.

## Assurance state for this tranche

The PRs in this checkpoint were handled through the existing exact-head quality-gate/Vercel workflow before merge. PR #56 and PR #57 were explicitly verified green immediately before merge in the September 9 working session.

Important assurance language remains unchanged:

- Green CI means the asserted checks passed; it is not proof that unknown defects cannot exist.
- Source-verified, live-verified, and externally approved are separate states.
- Manual production observations are recorded separately from source-level validation.

## Documentation review outcome

At this checkpoint:

- `README.md` required refresh because it still described PR #36 as the current unreleased checkpoint and PR #37 as preview-only.
- `CHANGELOG.md` already contained the September 8 Model Advisor/TCO/GPU milestones but did not yet capture the September 9 shared-shell, scroll, progressive-disclosure, and report-control tranche.
- `AiFactoryProjectBrief.md` contained the September 7 TCO growth/cloud-pricing addendum but did not yet contain the September 9 UX/current-state tranche.
- `MaintenanceRunbook.md` was reviewed at the policy level; no maintenance cadence or operational procedure changed as a result of PRs #48-#57.
- `ServiceInventory.md` was reviewed at the dependency level; PRs #48-#57 introduced no new external service, subscription, secret, or production dependency. Its September 1 content is therefore old in date but not materially invalidated by this tranche.

This checkpoint exists to ensure the missing September 9 history is preserved immediately without rewriting older dated historical sections.

## Next planned work

The next approved workstream after this documentation checkpoint is **My Summary / workflow guidance**.

Goals for that review:

- improve the connected journey without inventing false scenario lineage,
- preserve the existing latest-snapshot semantics and consistency warnings,
- avoid feature creep,
- keep report/tool logic separate from workflow guidance.

Other deferred/current items:

- Hardware/evidence modernization remains pending refreshed NVIDIA DGX/GPU pricing evidence.
- TCO progressive disclosure is intentionally deferred for regression-risk reasons described above.
- Landing-page hierarchy/redesign remains deferred until the tool-level journey is sufficiently stable.
- Email-domain restrictions remain deferred.

## Recovery identity

If future work needs a known source checkpoint for the state documented here, use:

`main` commit `9ee83d6c71edd5807c683ee2503ae95bc14b8887`

This is the merge of PR #57 and the source baseline immediately before the September 9 documentation catch-up and before the My Summary/workflow-guidance workstream begins.
