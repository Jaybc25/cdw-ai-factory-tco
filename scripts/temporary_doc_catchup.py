from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def insert_after(path, anchor, addition, marker):
    p = Path(path)
    text = p.read_text()
    if marker in text:
        return
    if anchor not in text:
        raise SystemExit(f"Anchor not found in {path}: {anchor[:120]!r}")
    p.write_text(text.replace(anchor, anchor + addition, 1))

# README
anchor = "**Current validated baseline:** AI Factory Suite 2026.09 (`v2026.09`), validated commit `31fdb2ff2a321f6101bfa72d3c45b4c31aa3a0eb`, released September 1, 2026.\n"
addition = "\n**Current unreleased code checkpoint before this documentation catch-up:** `main` at `cfb2ed79ec01320f7669d11b8d5416d09f580117` on September 4, 2026. This includes the five approved individual report-layout upgrades, the GPU working-day mobile input fix, shared model context across Model Advisor / GPU Sizing / TCO, the corrected GPU Sizing -> TCO ownership model, permanent legacy/Custom/model-navigation regression coverage, and SafeImageInput decoded-dimension protection. These changes remain `Unreleased` until a new validated tag is created.\n"
insert_after("README.md", anchor, addition, "Current unreleased code checkpoint before this documentation catch-up")

replace_once(
    "README.md",
    "- `package.json` still carries the legacy `2.8.0` value. Do not rewrite the already validated `v2026.09` baseline. Starting with the next stable release, mirror the suite release in SemVer-safe package metadata, for example human release `2026.10` maps to package version `2026.10.0`.\n",
    "- `package.json` still carries the legacy `2.8.0` value. Do not rewrite the already validated `v2026.09` baseline. Starting with the next stable release, mirror the suite release in SemVer-safe package metadata. The expected next same-month release `v2026.09.1` maps to package version `2026.9.1`; numeric SemVer components do not use leading zeroes.\n",
)

old = "The permanent GitHub quality gate, TCO Excel-to-JavaScript parity suite, live Vercel regression suite, and first formal known-good release are now in place. The main remaining technical maintenance priorities are:\n\n1. Run credentialed/manual live checks when a release changes auth, report, download-event, Slack notification, or PDF behavior.\n2. Maintain the shared pricing registry and continue provider-by-provider refreshes with explicit `LISTED`, `NODE-NORM`, `EST`, and `QUOTE` confidence.\n3. Keep NIM compatibility manual until the NVIDIA endpoint is production-validated.\n4. Execute controlled Vite/esbuild and React Router upgrades with regression testing; continue monitoring the PptxGenJS/image-size upstream path while retaining the client-logo mitigation.\n"
new = "The permanent GitHub quality gate, TCO Excel-to-JavaScript parity suite, PR-local handoff regression suite, live Vercel regression suite, and first formal known-good release are now in place. The gate now validates the shared pricing registry, shared model registry, GPU Sizing -> TCO handoff ownership rules, SafeImageInput resource bounds, the checked-in TCO workbook structure, and Excel-to-JavaScript parity in addition to browser regressions. The main remaining technical maintenance priorities are:\n\n1. Complete the final pre-release human/adversarial cross-tool pass and run credentialed/manual checks where the release scope requires auth, report, download-event, Slack notification, or PDF verification.\n2. Maintain the shared pricing registry and continue provider-by-provider refreshes with explicit `LISTED`, `NODE-NORM`, `EST`, and `QUOTE` confidence.\n3. Keep NIM compatibility manual until the NVIDIA endpoint is production-validated.\n4. Prepare the next validated same-month release only after the release record, package metadata, merged-tree gate, deployed-scope verification, and exact tag/commit identity are complete.\n5. Resume the Combined Summary presentation/schema work as a separate unreleased workstream after the shared-model/handoff hardening release boundary.\n6. Execute controlled Vite/esbuild and React Router upgrades separately with regression testing; continue monitoring the PptxGenJS/image-size upstream path while retaining the client-logo mitigation.\n"
replace_once("README.md", old, new)

# CHANGELOG
anchor = "## Unreleased\n"
addition = """

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

#### Current assurance and release-preparation state

- The permanent gate now covers production build, shared pricing registry validation, shared model registry validation, TCO handoff ownership guards, SafeImageInput resource-bound tests, checked-in TCO workbook extraction/structure, Excel-to-JavaScript parity, PR-local TCO handoff/model-context browser journeys, and the live Vercel browser regression suite.
- Green CI is treated as evidence that the asserted checks pass, not as proof that no unknown defect exists. Human/adversarial cross-tool review remains a separate pre-release activity because recent live review found a real state-precedence defect that was not yet represented in the gate.
- The next same-month stable candidate is `v2026.09.1`; when cut, `package.json` should move from legacy `2.8.0` to SemVer-safe `2026.9.1`.
- Combined Summary presentation/schema remediation remains a separate unreleased workstream and is not required to be bundled into `v2026.09.1`.
"""
insert_after("CHANGELOG.md", anchor, addition, "September 4, 2026 - Report, model-context, handoff, and security hardening")

replace_once(
    "CHANGELOG.md",
    "- PptxGenJS/image-size remains an upstream dependency concern; the current Client Summary client-logo input path is hardened while a clean upstream dependency resolution is monitored.\n",
    "- PptxGenJS/image-size remains an upstream dependency concern; the current offline Client Summary client-logo path is restricted to PNG/JPG/JPEG, capped at 10 MiB compressed size, validated by signature, and bounded to 10,000 x 10,000 pixels / 40,000,000 total pixels before PptxGenJS sees the image. Path containment remains deferred until a real staging-root contract exists.\n",
)

# MaintenanceRunbook
replace_once(
    "MaintenanceRunbook.md",
    "The current implementation has cloud rates and on-prem system pricing embedded in source, while `src/pricingProvenance.js` centralizes the verification dates and staleness logic. GPU Sizing also contains derived per-GPU pricing that must remain aligned with TCO.\n",
    "`src/pricingRegistry.js` is the shared source of truth for cloud GPU rates and NVIDIA/DGX loaded system economics used by TCO and GPU Sizing. `src/pricingProvenance.js` separately owns verification dates and staleness logic. GPU Sizing derives its loaded per-GPU planning prices from the shared on-prem system records rather than maintaining a second price table.\n",
)
replace_once(
    "MaintenanceRunbook.md",
    "- Current cloud-rate verification baseline: 2026-08-07.\n- Current on-prem pricing verification baseline: 2026-08-07.\n\nUsing that baseline, the current data reaches its 45-day review point on 2026-09-21 and its 90-day stale point on 2026-11-05 if it is not refreshed earlier.\n",
    "- Current cloud-rate verification baseline: 2026-09-01, after the first formal provider-by-provider refresh.\n- Current on-prem pricing verification baseline: 2026-08-07, from the existing NVIDIA TCO tool capture.\n\nUnder the current 45-day review / 90-day stale policy, the cloud baseline reaches review on 2026-10-16 and stale on 2026-11-30. The on-prem baseline reaches review on 2026-09-21 and stale on 2026-11-05 if not refreshed earlier. Treat the two provenance dates independently.\n",
)
replace_once(
    "MaintenanceRunbook.md",
    "1. Capture the current NVIDIA/CDW-supported pricing source used for the comparison, preferably the NVIDIA DGX TCO tool or another authoritative current source.\n2. Compare each current value against the TCO `SYSTEMS` registry in `src/TcoCalculator.jsx`.\n3. Determine whether any changed value is a pricing change, a product/configuration change, or a source-definition change.\n4. Update the TCO `SYSTEMS` registry only after the source is understood.\n5. Recalculate and update the corresponding GPU Sizing `GPU_PRICE_USD` values in `src/GpuSizingCalculator.jsx` so they remain aligned.\n6. Update `ONPREM_PRICING_VERIFIED_AT` in `src/pricingProvenance.js` only after the underlying values have actually been reviewed.\n7. Build the app and run representative TCO and GPU Sizing scenarios.\n8. Verify the deployed site after deployment.\n9. Record the refresh in `CHANGELOG.md` if values changed materially or the source methodology changed.\n",
    "1. Capture the current NVIDIA/CDW-supported pricing source used for the comparison, preferably the NVIDIA DGX TCO tool or another authoritative current source.\n2. Compare each current value against `ONPREM_SYSTEMS` in `src/pricingRegistry.js`.\n3. Determine whether any changed value is a pricing change, a product/configuration change, or a source-definition change.\n4. Update the shared on-prem registry only after the source is understood. Do not add a local `SYSTEMS` table back into TCO or a `GPU_PRICE_USD` table back into GPU Sizing.\n5. Run `node scripts/validate_pricing_registry.mjs` and confirm GPU Sizing's derived per-GPU planning prices still reconcile to the shared loaded-system economics.\n6. Update `ONPREM_PRICING_VERIFIED_AT` in `src/pricingProvenance.js` only after the underlying values have actually been reviewed.\n7. Build the app and run representative TCO and GPU Sizing scenarios.\n8. Run the TCO Excel-to-JavaScript parity gate for any TCO-relevant economics change.\n9. Verify the deployed site after deployment.\n10. Record the refresh in `CHANGELOG.md` if values changed materially or the source methodology changed.\n",
)
replace_once(
    "MaintenanceRunbook.md",
    "- Model identifiers normalize correctly between Advisor and GPU Sizing.\n- GPU Sizing technical count reaches TCO correctly.\n- TCO cost values and planning basis reach ROI correctly.\n",
    "- Canonical model ID, exact model parameter count, and inference quantization survive Advisor/GPU Sizing/TCO handoffs where applicable.\n- Legacy size-only TCO sessions migrate deterministically to `Custom` without inventing a named-model identity.\n- Custom-model handoffs preserve `Custom` identity, exact parameter count, and quantization.\n- Back/Forward and refresh do not replay consumed model-context URL parameters over later persisted edits.\n- GPU Sizing technical count/source class/target system reach TCO correctly and remain the upstream technical subject.\n- When TCO is entered from GPU Sizing, the on-prem target is locked; changing the technical design requires returning to GPU Sizing.\n- TCO-owned economic/planning assumptions survive a fresh sizing handoff unless the upstream change directly invalidates them.\n- Cloud GPU class follows the sizing class by default, while an explicit TCO cloud-class override remains explicit and survives later sizing changes.\n- User cloud rates remain scoped by provider + GPU class, and on-prem overrides remain scoped by target system.\n- TCO cost values and planning basis reach ROI correctly.\n",
)
replace_once(
    "MaintenanceRunbook.md",
    "- **PptxGenJS / image-size:** current high-severity advisories concern malformed ICNS/JXL/HEIF image parsing and denial of service. The offline Client Summary path now validates `clientLogoPath` before PptxGenJS sees it: only PNG/JPG/JPEG are accepted, files are capped at 10 MiB, and PNG/JPEG magic bytes must match the extension. Keep this mitigation covered by `src/run_fixture_suite.sh` while monitoring upstream dependency resolution.\n",
    "- **PptxGenJS / image-size:** current high-severity advisories concern malformed image parsing and denial of service. The offline Client Summary path validates `clientLogoPath` before PptxGenJS sees it: only PNG/JPG/JPEG are accepted, files are capped at 10 MiB, signatures must match, dimensions are capped at 10,000 x 10,000, and total decoded size is capped at 40,000,000 pixels. Permanent coverage lives in `tests/safe-image-input.cjs` and the quality gate. Path containment is intentionally deferred until the workflow has a defined staging-root contract or becomes upload-driven.\n",
)
replace_once(
    "MaintenanceRunbook.md",
    "- Human release `2026.10` maps to package version `2026.10.0`.\n- Human release `2026.10.1` maps to package version `2026.10.1`.\n",
    "- Human release `2026.09.1` maps to package version `2026.9.1`; SemVer numeric components do not use leading zeroes.\n- Human release `2026.10` maps to package version `2026.10.0`.\n- Human release `2026.10.1` maps to package version `2026.10.1`.\n",
)

old = """## 11. Current assurance baseline and remaining backlog

As of September 1, 2026:

### Completed and now permanent

1. The automated TCO Excel-to-JavaScript parity suite is built into GitHub Actions and the canonical `EngineRegression` fixture passes 20/20 checks.
2. The automated live Vercel regression suite is built into GitHub Actions and passes 13/13 tests across all routes plus the highest-risk handoff/provenance paths and the canonical TCO live fixture.
3. The quality gate runs on relevant source, test, workbook, package, and workflow changes, so these checks are reusable rather than one-time audit work.

### Remaining

1. Perform credentialed live checks when needed for a release that changes auth/report infrastructure: magic-link delivery, database download events, Slack notifications, and final report/PDF visual inspection.
2. Maintain the shared TCO/GPU Sizing pricing registry and continue disciplined source/provenance refreshes; consider further automation only where provider APIs are dependable.
3. Establish production-backed NIM compatibility sync only after NVIDIA endpoint validation.
4. Continue explicit live/manual verification of report/audit-trail presentation as those surfaces evolve.
5. Execute the planned controlled Vite/esbuild and React Router upgrades when scheduled, with full regression validation; continue monitoring the PptxGenJS/image-size upstream path while retaining the client-logo input mitigation.

These priorities are technical assurance priorities, not a substitute for business or CDW publication priorities."""
new = """## 11. Current assurance baseline and remaining backlog

As of September 4, 2026, after PR #11:

### Completed and now permanent

1. The automated TCO Excel-to-JavaScript parity suite is built into GitHub Actions and the canonical `EngineRegression` fixture passes 20/20 checks.
2. The shared pricing registry validator, shared model registry validator, TCO GPU Sizing handoff ownership guard, and SafeImageInput resource-bound tests run in the permanent quality gate.
3. PR-local Chromium regression covers dirty-session -> fresh-handoff ownership, explicit cloud override persistence, legacy size-only migration, Custom model identity, model-context reload persistence, and Back/Forward consumed-query behavior.
4. The automated live Vercel regression suite remains part of the quality gate for deployed behavior already represented in the live suite.
5. The on-prem technical target is structurally owned by GPU Sizing for workload handoffs; TCO owns economic comparison/planning assumptions and preserves explicit user cloud-comparison overrides.
6. All five individual report-producing tools have approved print-layout states in source. Combined Summary remains a separate presentation/schema workstream.

### Remaining before the next stable tag

1. Complete this documentation catch-up across README, project brief, changelog, and runbook.
2. Perform one deliberate human/adversarial cross-tool pass focused on state precedence and cross-session interactions. Treat a green gate as proof that asserted checks pass, not as proof that no unknown defect exists.
3. Run credentialed/manual checks if the final release scope requires magic-link delivery, database download events, Slack notifications, or report/PDF visual verification.
4. Prepare the release record, set `package.json` to `2026.9.1`, run the final merged-tree gate and deployed-scope verification, and create `v2026.09.1` only after the exact release commit is known-good.

### Carried forward after the release boundary

1. Maintain the shared TCO/GPU Sizing pricing registry and disciplined source/provenance refreshes.
2. Establish production-backed NIM compatibility sync only after NVIDIA endpoint validation.
3. Resume Combined Summary with a curated per-tool presentation schema, deliberate pagination, and 1-through-5-tool regression fixtures.
4. Execute controlled Vite/esbuild and React Router upgrades separately, with full regression validation.
5. Continue monitoring the PptxGenJS/image-size upstream path while retaining SafeImageInput mitigation.

These priorities are technical assurance priorities, not a substitute for business or CDW publication priorities."""
replace_once("MaintenanceRunbook.md", old, new)

# Project Brief addendum
anchor = "**Purpose: durable, repo-backed context anchor for the Claude Project / repo and for future ChatGPT or Cowork sessions. Claude's memory export is preserved, but stale statements are corrected below and the former gaps are resolved where the repository or prior validation record provides evidence.**\n\n---\n"
addition = """

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
"""
insert_after("AiFactoryProjectBrief.md", anchor, addition, "September 4, 2026 Current-State Addendum")

replace_once(
    "AiFactoryProjectBrief.md",
    "- **Cross-tool handoffs:** Explorer pills to Model Advisor / GPU Sizing (crosswalk-driven, hidden or amber-noted by routingClass); Model Advisor \"Size infrastructure for this model\" to GPU Sizing (`?model=`); GPU Sizing \"Compare TCO\" to TCO (`ownSys`, `gpuCount`, `sourceClass`, plus `workingDayHours` for inference); TCO \"Send to ROI Calculator\" (`initialCost`, `recurringCost`, planning basis). Current GPU Sizing purchase candidates begin at H200, so A100/H100 are no longer emitted as on-prem recommendations. Receiving tools consume handoff params with `history.replaceState` after capture and restore provenance/state from session storage so Back/Forward, refresh, and bare-URL returns do not replay or erase handoff context. Readiness keeps its separate versioned localStorage behavior.\n",
    "- **Cross-tool handoffs:** Explorer pills to Model Advisor / GPU Sizing (crosswalk-driven, hidden or amber-noted by routingClass); Model Advisor \"Size infrastructure for this model\" to GPU Sizing with canonical model identity; GPU Sizing \"Compare TCO\" to TCO with `ownSys`, `gpuCount`, `sourceClass`, model ID, exact parameter count, inference quantization where applicable, and `workingDayHours` for inference; TCO \"Send to ROI Calculator\" carries costs and planning-basis provenance. Current GPU Sizing purchase candidates begin at H200, so A100/H100 are no longer emitted as on-prem recommendations. In workload mode, GPU Sizing owns the on-prem technical target and TCO locks it; TCO-owned economic assumptions persist, and the cloud comparison follows the sizing class unless explicitly overridden by the user. Receiving tools consume handoff params with `history.replaceState` after capture and restore provenance/state from session storage so Back/Forward, refresh, and bare-URL returns do not replay or erase handoff context. Readiness keeps its separate versioned localStorage behavior.\n",
)
replace_once(
    "AiFactoryProjectBrief.md",
    "- **RESOLVED IN CURRENT SOURCE:** GPU Sizing to TCO fleet reconciliation is built. Workload mode directly uses the node-rounded technical GPU requirement, with a defensive cross-class capability conversion for legacy/future mismatches and separate workload duty-cycle vs owned-utilization treatment.\n",
    "- **RESOLVED IN CURRENT SOURCE:** GPU Sizing to TCO technical authority is structurally enforced for workload handoffs. TCO uses the node-rounded upstream GPU requirement and locks the on-prem target system/class; technical design changes return to GPU Sizing. Cloud comparison class remains a TCO economic assumption and may be explicitly overridden without changing the upstream technical fleet. Workload duty cycle and owned utilization remain separate concepts.\n",
)

print("Documentation catch-up patch applied")
