from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing expected block: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"Expected one match for {label}, found {text.count(old)}")
    return text.replace(old, new, 1)

# MaintenanceRunbook.md
p = Path("MaintenanceRunbook.md")
s = p.read_text()
s = replace_once(
    s,
    "`package.json` currently contains the legacy version `2.8.0`. Because `v2026.09` is already an immutable validated baseline, do not rewrite that tagged commit merely to align metadata.\n\nStarting with the next stable release:\n\n- Mirror the internal suite release in `package.json` using SemVer-safe numeric formatting.\n- Human release `2026.09.1` maps to package version `2026.9.1`; SemVer numeric components do not use leading zeroes.",
    "`package.json` transitioned to `2026.9.1` with the validated `AI Factory Suite 2026.09.1` release. The earlier `v2026.09` tag remains immutable with its historical metadata.\n\nFor current and future stable releases:\n\n- Mirror the internal suite release in `package.json` using SemVer-safe numeric formatting.\n- Human release `2026.09.1` maps to package version `2026.9.1`; SemVer numeric components do not use leading zeroes.",
    "runbook package metadata",
)
old11 = '''## 11. Current assurance baseline and remaining backlog

As of September 4, 2026, after PR #11:

### Completed and now permanent

1. The automated TCO Excel-to-JavaScript parity suite is built into GitHub Actions and the canonical `EngineRegression` fixture passes 20/20 checks.
2. The shared pricing registry validator, shared model registry validator, TCO GPU Sizing handoff ownership guard, and SafeImageInput resource-bound tests run in the permanent quality gate.
3. PR-local Chromium regression covers dirty-session -> fresh-handoff ownership, explicit cloud override persistence, legacy size-only migration, Custom model identity, model-context reload persistence, and Back/Forward consumed-query behavior.
4. The automated live Vercel regression suite remains part of the quality gate for deployed behavior already represented in the live suite.
5. The on-prem technical target is structurally owned by GPU Sizing for workload handoffs; TCO owns economic comparison/planning assumptions and preserves explicit user cloud-comparison overrides.
6. All five individual report-producing tools have approved print-layout states in source. Combined Summary remains a separate presentation/schema workstream.

### Remaining before the next stable tag

1. Perform one deliberate human/adversarial cross-tool pass focused on state precedence and cross-session interactions. Treat a green gate as proof that asserted checks pass, not as proof that no unknown defect exists.
2. Run credentialed/manual checks if the final release scope requires magic-link delivery, database download events, Slack notifications, or report/PDF visual verification.
3. Prepare the release record, set `package.json` to `2026.9.1`, run the final merged-tree gate and deployed-scope verification, and create `v2026.09.1` only after the exact release commit is known-good.

### Carried forward after the release boundary

1. Maintain the shared TCO/GPU Sizing pricing registry and disciplined source/provenance refreshes.
2. Establish production-backed NIM compatibility sync only after NVIDIA endpoint validation.
3. Resume Combined Summary with a curated per-tool presentation schema, deliberate pagination, and 1-through-5-tool regression fixtures.
4. Execute controlled Vite/esbuild and React Router upgrades separately, with full regression validation.
5. Continue monitoring the PptxGenJS/image-size upstream path while retaining SafeImageInput mitigation.

These priorities are technical assurance priorities, not a substitute for business or CDW publication priorities.

## 10. Authentication-aware browser regression
'''
new11 = '''## 11. Current assurance baseline and remaining backlog

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
'''
s = replace_once(s, old11, new11, "runbook current assurance section")
p.write_text(s)

# README.md
p = Path("README.md")
s = p.read_text()
s = replace_once(
    s,
    "- `package.json` still carries the legacy `2.8.0` value. Do not rewrite the already validated `v2026.09` baseline. Starting with the next stable release, mirror the suite release in SemVer-safe package metadata. The expected next same-month release `v2026.09.1` maps to package version `2026.9.1`; numeric SemVer components do not use leading zeroes.",
    "- `package.json` transitioned to `2026.9.1` with the validated `AI Factory Suite 2026.09.1` release. The older `v2026.09` tag remains immutable with its historical metadata. Future releases continue to mirror the suite release in SemVer-safe package metadata; numeric SemVer components do not use leading zeroes.",
    "README package/release wording",
)
s = replace_once(
    s,
    "4. Prepare the next validated same-month release only after the release record, package metadata, merged-tree gate, deployed-scope verification, and exact tag/commit identity are complete.\n5. Resume the Combined Summary presentation/schema work as a separate unreleased workstream after the shared-model/handoff hardening release boundary.\n6. Execute controlled Vite/esbuild and React Router upgrades separately with regression testing; continue monitoring the PptxGenJS/image-size upstream path while retaining the client-logo mitigation.",
    "4. For the next validated release, preserve the same release discipline: release record, package metadata, merged-tree gate, deployed-scope verification, and exact immutable tag/commit identity.\n5. Keep post-2026.09.1 My Summary, Best-Value GPUaaS, Global Reset, authentication, provider-eligibility, and print refinements under `Unreleased` until an explicit next validated tag is created.\n6. Execute controlled Vite/esbuild and React Router upgrades separately with regression testing; continue monitoring the PptxGenJS/image-size upstream path while retaining the client-logo mitigation.",
    "README priorities",
)
p.write_text(s)

# AiFactoryProjectBrief.md
p = Path("AiFactoryProjectBrief.md")
s = p.read_text()
s = replace_once(
    s,
    "10. **Automated live Vercel regression.** Built September 1, 2026 with Playwright. The current public-production suite passes 13/13 tests covering all routes, landing links, key handoff/state/provenance defects, and a canonical TCO fixture through the real TCO-to-ROI link.\n\n### Still open or not independently proven live\n\n11. **Credentialed/external-side-effect live checks.** Magic-link email delivery, authenticated report/download event verification, Slack notification verification, and final report/PDF visual inspection remain a separate live-manual layer when those paths change.\n12. **Shared pricing data module/registry.** Current provenance dates are shared; price values remain duplicated.\n13. **Production NVIDIA NIM sync endpoint.** Manual workflow remains intentionally unscheduled.\n14. **Deployment verification for latest ROI/report and Readiness verbose-report changes.** Source may be correct without the latest deployed PDF path having been independently re-proven.\n15. **Supabase Database Webhooks platform/support resolution.** Direct Edge Function invocation remains the current workaround.\n16. **@cdw.com Resend deliverability.** External/CDW IT issue, not established as an app-code defect.\n17. **Domain/publication gating.** cdwaifactory.com is parked pending external approval; connecting it also requires Supabase Auth redirect changes.\n18. **Future product work:** Pod Sizing, journey-level lead signal, Vision/CV catalog/route, financing/lease support, and other roadmap additions as business priority dictates.\n19. **Dependency-security review.** The September 1 quality-gate environment reports six npm audit findings (3 moderate, 3 high). These require advisory-level review before deciding on upgrades; a force upgrade is not assumed safe.",
    "10. **Automated live Vercel regression.** Built September 1, 2026 with Playwright. The current public-production suite passes 13/13 tests covering all routes, landing links, key handoff/state/provenance defects, and a canonical TCO fixture through the real TCO-to-ROI link.\n11. **Shared pricing data module/registry.** Resolved September 2, 2026. Cloud GPU rates and NVIDIA/DGX loaded system economics are centralized in `src/pricingRegistry.js`; GPU Sizing derives its planning prices from the shared system records, and `scripts/validate_pricing_registry.mjs` guards against reintroducing local duplicate tables.\n\n### Still open or not independently proven live\n\n12. **Credentialed/external-side-effect live checks.** Magic-link email delivery, authenticated report/download event verification, Slack notification verification, and final report/PDF visual inspection remain a separate live-manual layer when those paths change.\n13. **Production NVIDIA NIM sync endpoint.** Manual workflow remains intentionally unscheduled.\n14. **Deployment verification for latest ROI/report and Readiness verbose-report changes.** Source may be correct without the latest deployed PDF path having been independently re-proven.\n15. **Supabase Database Webhooks platform/support resolution.** Direct Edge Function invocation remains the current workaround.\n16. **@cdw.com Resend deliverability.** External/CDW IT issue, not established as an app-code defect.\n17. **Domain/publication gating.** cdwaifactory.com is parked pending external approval; connecting it also requires Supabase Auth redirect changes.\n18. **Future product work:** Pod Sizing, journey-level lead signal, Vision/CV catalog/route, financing/lease support, and other roadmap additions as business priority dictates.\n19. **Dependency-security review.** The September 1 quality-gate environment reports six npm audit findings (3 moderate, 3 high). These require advisory-level review before deciding on upgrades; a force upgrade is not assumed safe.",
    "Project Brief section 16 pricing registry status",
)
s = replace_once(
    s,
    "8. **Roadmap priority:** the TCO parity suite and automated public-production regression were completed September 1, 2026. The next major technical-maintenance priority is the shared pricing registry, while credentialed auth/report/notification checks remain release-specific and business-facing future features are ordered separately.",
    "8. **Roadmap priority:** the TCO parity suite and automated public-production regression were completed September 1, 2026, and the shared pricing registry was completed September 2. Current technical-maintenance priorities are disciplined pricing/provenance refreshes, release-specific credentialed auth/report/notification checks, controlled dependency upgrades, NIM endpoint validation, and future provider expansion through the eligibility/configuration architecture.",
    "Project Brief section 17 roadmap priority",
)
s = replace_once(
    s,
    "The pre-brief source snapshot was `4106962aa657075ef313f34160e7c3b130a0b5af`; the consolidated brief itself was later committed as a documentation change. `package.json` identifies the package as `cdw-ai-factory-tools`, version 2.8.0, private npm package flag, using React/Vite/Supabase/PptxGenJS.",
    "The pre-brief source snapshot was `4106962aa657075ef313f34160e7c3b130a0b5af`; the consolidated brief itself was later committed as a documentation change. At that August 31 snapshot, `package.json` identified the package as `cdw-ai-factory-tools`, version 2.8.0. The validated 2026.09.1 release later transitioned current package metadata to `2026.9.1`; historical release/tag state remains immutable.",
    "Project Brief historical package metadata",
)
p.write_text(s)

# CHANGELOG.md
p = Path("CHANGELOG.md")
s = p.read_text()
s = replace_once(s, "#### Pre-release cross-tool state-precedence pass - PR 13", "#### Pre-release cross-tool state-precedence pass - PR #13", "CHANGELOG PR 13 heading")
s = replace_once(s, "- PR 13 merged as 2222fcd2a5ca6b437b7b46c63fda3ffa21a16020;", "- PR #13 merged as `2222fcd2a5ca6b437b7b46c63fda3ffa21a16020`;", "CHANGELOG PR 13 merge line")
p.write_text(s)
