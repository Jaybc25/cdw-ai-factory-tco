from pathlib import Path

brief = Path('AiFactoryProjectBrief.md')
text = brief.read_text(encoding='utf-8')
marker = '## September 5, 2026 Current-State Addendum'
if marker not in text:
    first_rule = text.find('\n---\n')
    if first_rule == -1:
        raise SystemExit('Could not locate project brief insertion point')
    addendum = r'''

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
'''
    text = text[:first_rule] + '\n---\n' + addendum + text[first_rule+5:]
    brief.write_text(text, encoding='utf-8')

changelog = Path('CHANGELOG.md')
c = changelog.read_text(encoding='utf-8')
old = '## Unreleased\n\n- No unreleased changes yet.'
new = r'''## Unreleased

### September 4-5, 2026 - Post-2026.09.1 integration, GPUaaS, authentication, and workspace hardening

#### Combined Summary / My Summary - PRs #15 and #16
- Replaced generic snapshot-key rendering with an explicit per-tool customer-facing presentation schema, curated labels/order/units, friendly model names, and clearer cloud/on-prem terminology.
- Added visible consistency warnings when the latest saved tool snapshots do not appear to describe one coherent scenario, including TCO/GPU fleet mismatch, Advisor/GPU model mismatch, stale downstream timestamps, and stale TCO-sourced ROI.
- Clarified that My Summary contains the latest saved result from each tool rather than implying historical scenario linkage that the current snapshot schema does not store.
- Suppressed duplicate TCO fleet output when it matches GPU Sizing and added print break protection.
- Corrected DGX/NVL consistency checking to compare GPU-equivalent capacity rather than system count directly to GPU count.
- PR #15 merged as `87776956dab793d70f1472f953a631737f7f45d2`; PR #16 merged as `255d85b57d037ca7c6349468e69e2b9b5fda5ded`.

#### Best-Value GPUaaS v1 - PR #17
- Added same-class Best-Value GPUaaS ranking to TCO Workload Requirement mode using the existing TCO engine for candidate economics.
- Ranking preserves GPU Sizing as the technical GPU-class authority, never invents cross-class substitution, and never silently changes the active provider.
- Added pricing-confidence disclosure (`LISTED`, `EST`, `NODE-NORM`, `QUOTE`, `CUSTOM`) and explicit `Use provider` selection.
- Deliberately excludes SLA, region, availability, enterprise discount, support, security, networking, procurement, and operational-fit recommendations from v1.
- PR #17 merged as `1c5153ddf15a32cdd25c5aac2e44ac43697c3f32`.

#### Global Reset - PR #18
- Added whole-workspace `Reset All Tools` for current scenario state while preserving authentication/account/profile and historical download events.
- Added reset write barrier, autosave coordination, two-pass snapshot deletion, server-side emptiness verification, cross-tab reset epoch, and stale-tab invalidation to prevent old scenario data from resurrecting after reset.
- Reset is fail-safe when server-side deletion cannot be verified.
- PR #18 merged as `0235f58cff1944aa935b8e5fc7382504db9e9e9f`.

#### Home account and My Summary access - PR #19
- Added the existing account/auth surface to the home page so signed-in users can see identity, open My Summary, and sign out without first entering a tool.
- Preserved Global Reset and signed-out browser-clear behavior and improved narrow-screen header stacking.
- PR #19 merged as `6a1217fc3a158b7ade9571e7dd84da21db0408be`.

#### Phase 1 authenticated front door - PR #20
- Added a CDW-styled authenticated front door before calculator interfaces for signed-out visitors.
- Preserved deep links through authentication, Supabase magic-link as primary login, temporary-password compatibility for provisioned users, and existing first-time account setup.
- This is an access-control/front-door tranche only; it does not claim all methodology/pricing logic is server-side.
- Email-domain restrictions remain deliberately deferred.
- PR #20 merged as `200c47427e60fee409e32d7dc2dbb2358657a6a2`.

#### GPU Sizing terminology - PR #21
- Clarified `Peak concurrent users` to mean simultaneous active request streams and explicitly include human users, AI agents, copilots, automations, and parallel sub-agents.
- No sizing math, default, label, or validation behavior changed.
- PR #21 merged as `ab7deb03c5e074a861f743a9f89c6ff7686e1d98`.

#### Auth-aware browser regression architecture - PR #22
- Split browser validation by authentication context after the front door changed intentional signed-out production behavior.
- Preview/production tests now assert route health plus signed-out front-door protection; protected tool-internal journeys run against the local auth-bypassed build.
- `E2E_AUTH_BYPASS` is test-only and absent from live production behavior.
- PR #22 merged as `9e975f65aaf8d61f0091308f075173226171857b`.

#### GPUaaS commercial eligibility - PR #23
- Added provider eligibility/display metadata so commercially unavailable providers can remain modeled internally without appearing in customer-facing selection or Best-Value recommendations.
- Current customer-facing provider set is AWS, Azure, Google Cloud, and Oracle Cloud.
- CoreWeave pricing/provenance/modeling remains preserved internally but is commercially disabled in the current CDW context because no reseller agreement is in place.
- No pricing values, TCO math, GPU-class logic, or on-prem economics changed.
- PR #23 merged as `fddf437a5b5ec1cb8514bee8f32f35ce39c59787`.

#### GPU Sizing print/PDF hierarchy - PR #24
- After real Windows PDF review, changed print-only styling so the Recommended configuration does not resemble a disabled/de-selected card in grayscale output.
- Recommended now prints with a white background, strong dark outline, fully opaque dark text, and no shadow; screen styling is unchanged.
- No sizing, pricing, provider, handoff, or calculation logic changed.
- PR #24 merged as `696c4c87122b7dfab25ac5eec59c2c0db8dcef78` and was manually confirmed working in production on Windows.
'''
if old in c:
    c = c.replace(old, new, 1)
elif '### September 4-5, 2026 - Post-2026.09.1' not in c:
    raise SystemExit('Unexpected CHANGELOG Unreleased section')
changelog.write_text(c, encoding='utf-8')

readme = Path('README.md')
r = readme.read_text(encoding='utf-8')
old_release = '**Current validated baseline:** AI Factory Suite 2026.09 (`v2026.09`), validated commit `31fdb2ff2a321f6101bfa72d3c45b4c31aa3a0eb`, released September 1, 2026.\n\n**Current unreleased code checkpoint before this documentation catch-up:** `main` at `cfb2ed79ec01320f7669d11b8d5416d09f580117` on September 4, 2026. This includes the five approved individual report-layout upgrades, the GPU working-day mobile input fix, shared model context across Model Advisor / GPU Sizing / TCO, the corrected GPU Sizing -> TCO ownership model, permanent legacy/Custom/model-navigation regression coverage, and SafeImageInput decoded-dimension protection. These changes remain `Unreleased` until a new validated tag is created.'
new_release = '**Current validated releases:** `v2026.09` remains the immutable September 1 baseline, followed by `AI Factory Suite 2026.09.1` released September 4, 2026. Existing release tags/releases are immutable.\n\n**Current unreleased code checkpoint before this documentation catch-up:** `main` at `696c4c87122b7dfab25ac5eec59c2c0db8dcef78` on September 5, 2026. Post-2026.09.1 work includes curated My Summary consistency handling, Best-Value GPUaaS, Global Reset, home account/My Summary access, the Phase 1 authenticated front door, auth-aware regression architecture, provider commercial-eligibility gating, and the GPU Sizing print/PDF hierarchy refinement. These changes remain `Unreleased` until a new validated tag is created.'
if old_release in r:
    r = r.replace(old_release, new_release, 1)
r = r.replace('- Authentication: Supabase magic-link login', '- Authentication: Phase 1 authenticated front door backed by Supabase Auth; magic-link primary, temporary-password compatibility for provisioned users')
r = r.replace('- Cloud GPU list-rate verification for AWS, Azure, GCP, OCI, and CoreWeave', '- Cloud GPU list-rate verification for AWS, Azure, Google Cloud, Oracle Cloud, and internally preserved provider records such as CoreWeave')
readme.write_text(r, encoding='utf-8')

runbook = Path('MaintenanceRunbook.md')
m = runbook.read_text(encoding='utf-8')
m = m.replace('Providers currently represented in TCO include AWS, Azure, GCP, OCI, and CoreWeave.', 'Provider records currently represented in the shared TCO pricing architecture include AWS, Azure, Google Cloud, Oracle Cloud, and CoreWeave. Customer-facing eligibility is separate from internal modeling: the current selectable/rankable provider set is AWS, Azure, Google Cloud, and Oracle Cloud. CoreWeave remains internally preserved but customer-facing disabled while commercially ineligible.')
eligibility = r'''

### 4.4 GPUaaS commercial eligibility maintenance

Provider pricing/model presence and customer-facing commercial eligibility are separate concerns.

1. `src/pricingRegistry.js` may preserve a provider's pricing/provenance/modeling data even when that provider is not customer-facing eligible.
2. Best-Value GPUaaS and provider selectors must honor the eligibility/display metadata rather than hard-coding provider names in ranking logic.
3. Current customer-facing providers are AWS, Azure, Google Cloud, and Oracle Cloud.
4. CoreWeave remains internally preserved but customer-facing disabled in the current CDW context because no reseller agreement is in place.
5. Re-enable a provider only after the commercial status is explicitly confirmed and the full quality gate passes.
6. Add future neoclouds such as Nebius through the provider configuration/registry architecture, with pricing-source review, confidence/provenance classification, commercial eligibility confirmation, and regression validation before customer exposure.
7. Customer-facing copy should use `Google Cloud` and `Oracle Cloud`; legacy GCP/OCI aliases may remain internally for backward compatibility.
'''
if '### 4.4 GPUaaS commercial eligibility maintenance' not in m:
    anchor = '\n## 5. Model-catalog refresh procedure'
    if anchor not in m:
        raise SystemExit('Could not locate MaintenanceRunbook section 5')
    m = m.replace(anchor, eligibility + anchor, 1)
auth_section = r'''

## 10. Authentication-aware browser regression

The Phase 1 authenticated front door creates two intentional browser-test contexts:

- **Preview/production:** signed-out users should receive the authenticated front door. Live tests verify route health and that protected tool navigation is not exposed before authentication.
- **Local auth-bypassed build:** tool-internal journeys, calculations, state handoffs, Back/Forward behavior, and other protected UI regressions run locally with the test-only `E2E_AUTH_BYPASS` signal.

Rules:

1. Never enable the auth bypass in production or expose it as a Vite client variable.
2. A production regression that expects protected tool internals while signed out is testing the wrong context.
3. After authentication/front-door changes, run both the live route/front-door checks and the local protected-tool regression suite.
4. Credentialed manual checks remain appropriate for real magic-link delivery, account setup, My Summary persistence, Global Reset server-side deletion, report/download events, and Slack side effects where automation does not hold real credentials.
'''
if '## 10. Authentication-aware browser regression' not in m:
    m = m.rstrip() + auth_section + '\n'
runbook.write_text(m, encoding='utf-8')
