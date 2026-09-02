from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:90]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")

# README current architecture and priorities.
replace_once(
    "README.md",
    '`src/pricingProvenance.js` is the current source of truth for pricing verification dates and staleness thresholds. It does not yet centralize the actual pricing tables.\n',
    '`src/pricingRegistry.js` is the shared source of truth for cloud GPU rates and NVIDIA/DGX loaded system pricing used by TCO and GPU Sizing. `src/pricingProvenance.js` separately owns pricing verification dates and staleness thresholds. GPU Sizing derives its loaded per-GPU planning prices directly from the shared on-prem system records rather than maintaining a second hard-coded price table.\n',
)
replace_once(
    "README.md",
    '''Cloud GPU rates and NVIDIA loaded system prices are still maintained in code rather than one shared pricing registry. TCO and GPU Sizing therefore require coordinated pricing updates when those values change.\n\nThe current pricing provenance dates are maintained in `src/pricingProvenance.js`. At the time this README was refreshed, the code defines:\n\n- review due after 45 days\n- stale after 90 days\n\nThe longer-term architecture already contemplated by the project is a shared `/data/pricing/` layer with per-record source, confidence, and verification metadata.\n''',
    '''Cloud GPU rates and NVIDIA loaded system prices are centralized in `src/pricingRegistry.js`. TCO imports the cloud-rate and on-prem-system registries directly. GPU Sizing derives its per-GPU planning prices from those same on-prem system records, eliminating the prior duplicate price table.\n\nThe current pricing provenance dates remain in `src/pricingProvenance.js`. The code defines:\n\n- review due after 45 days\n- stale after 90 days\n\n`scripts/validate_pricing_registry.mjs` is enforced by the permanent quality gate. It validates required provider/system data, preserves the exact AWS B200 reserved-rate anchor, confirms GPU Sizing's derived prices reconcile to the shared system costs, and fails if the calculating tools reintroduce local duplicate pricing tables.\n''',
)
replace_once(
    "README.md",
    '''1. Run credentialed/manual live checks when a release changes auth, report, download-event, Slack notification, or PDF behavior.\n2. Centralize cloud and on-prem pricing into one shared data source so TCO and GPU Sizing cannot drift.\n3. Keep NIM compatibility manual until the NVIDIA endpoint is production-validated.\n4. Review dependency-security findings at the advisory level before deciding on upgrades; do not use force upgrades without regression review.\n''',
    '''1. Run credentialed/manual live checks when a release changes auth, report, download-event, Slack notification, or PDF behavior.\n2. Maintain the shared pricing registry and continue provider-by-provider refreshes with explicit `LISTED`, `NODE-NORM`, `EST`, and `QUOTE` confidence.\n3. Keep NIM compatibility manual until the NVIDIA endpoint is production-validated.\n4. Execute controlled Vite/esbuild and React Router upgrades with regression testing; continue monitoring the PptxGenJS/image-size upstream path while retaining the client-logo mitigation.\n''',
)

# Changelog records the completed architectural work and removes it from open backlog.
anchor = '### Current maintenance state\n'
section = '''### Shared Pricing Registry - 2026-09-02\n\n- Centralized TCO cloud GPU rates and NVIDIA/DGX loaded system pricing in `src/pricingRegistry.js` without changing the current rate values.\n- TCO now imports cloud rates and on-prem system economics from the shared registry instead of owning local `RATES` and `SYSTEMS` tables.\n- GPU Sizing no longer owns a duplicate `GPU_PRICE_USD` table; its H200, B200, GB200 NVL72, and B300 planning prices are derived from the same shared system records used by TCO.\n- Updated the TCO Excel-to-JavaScript parity harness to inject the shared production pricing registry while continuing to extract the production calculation functions from TCO. Canonical parity remains 20/20 PASS.\n- Added `scripts/validate_pricing_registry.mjs` and made it part of the permanent quality gate. The guard fails if local duplicate pricing tables are reintroduced and preserves the exact validated AWS B200 reserved-rate value of `8.545` per GPU-hour.\n\n### Current maintenance state\n'''
replace_once("CHANGELOG.md", anchor, section)
replace_once(
    "CHANGELOG.md",
    '- Cloud GPU rates and NVIDIA loaded system prices remain code-maintained rather than centrally automated.\n',
    '- Cloud GPU rates and NVIDIA loaded system prices are code-maintained in the shared `src/pricingRegistry.js`; source verification remains manual even though both calculating tools now consume one registry.\n',
)
replace_once("CHANGELOG.md", '- Shared pricing registry for TCO and GPU Sizing.\n', '')

# Maintenance runbook now describes the implemented architecture.
replace_once(
    "MaintenanceRunbook.md",
    '6. Update `RATES` in `src/TcoCalculator.jsx` only after source review.\n',
    '6. Update `CLOUD_GPU_RATES` in `src/pricingRegistry.js` only after source review. Do not add provider price tables back into `TcoCalculator.jsx`.\n',
)
replace_once(
    "MaintenanceRunbook.md",
    '''### 4.3 Pricing architecture improvement\n\nThe long-term preferred design is a shared pricing registry under a dedicated data layer so TCO and GPU Sizing do not maintain duplicate pricing tables. Until that exists, every on-prem pricing refresh must explicitly reconcile both tools.\n''',
    '''### 4.3 Shared pricing registry architecture\n\n`src/pricingRegistry.js` is now the canonical value layer for cloud GPU rates and NVIDIA/DGX loaded on-prem system economics. TCO imports those registries directly. GPU Sizing derives its loaded per-GPU planning prices from the shared on-prem system records, so a system-cost refresh no longer requires a second hand-maintained GPU price table.\n\nRules:\n\n1. Update a pricing value in the shared registry only after reviewing the appropriate source and confidence classification.\n2. Update `src/pricingProvenance.js` only when the corresponding underlying rate card has actually been re-verified.\n3. Do not introduce local `RATES`, `SYSTEMS`, or `GPU_PRICE_USD` pricing tables inside the calculating tools.\n4. Run `node scripts/validate_pricing_registry.mjs` after pricing-architecture or value changes. The permanent quality gate runs this automatically for relevant changes.\n5. Run the TCO Excel-to-JavaScript parity gate after any TCO-relevant pricing change.\n6. Verify the deployed site after a material pricing refresh before calling the new data live-verified.\n''',
)
replace_once(
    "MaintenanceRunbook.md",
    '2. Centralize TCO and GPU Sizing pricing into a shared pricing registry.\n',
    '2. Maintain the shared TCO/GPU Sizing pricing registry and continue disciplined source/provenance refreshes; consider further automation only where provider APIs are dependable.\n',
)

# Project brief removes stale open items and records current pricing architecture.
replace_once(
    "AiFactoryProjectBrief.md",
    '- The Excel-to-JS automated parity suite remains the last unbuilt assurance item from the 9-round TCO model audit. The intended pattern is fixture scenarios, both engines, tolerance of `MAX($1, 0.01%)`, then CI.\n',
    '- **RESOLVED IN CURRENT SOURCE:** the permanent TCO Excel-to-JavaScript parity suite is built into GitHub Actions. The canonical `EngineRegression` fixture passes 20/20 checks and now consumes the shared production pricing registry while extracting production calculation functions from TCO.\n',
)
replace_once(
    "AiFactoryProjectBrief.md",
    '- Pricing values are still duplicated between GPU Sizing\'s `GPU_PRICE_USD` and TCO\'s `SYSTEMS` data rather than imported from one shared data module. `pricingProvenance.js` centralizes verification dates/staleness, not the actual price registry.\n',
    '- **RESOLVED IN CURRENT SOURCE:** TCO and GPU Sizing consume one shared pricing value layer in `src/pricingRegistry.js`. GPU Sizing derives its loaded per-GPU point estimates from the same on-prem system records TCO uses, and the permanent registry validator fails if duplicate local pricing tables are reintroduced.\n',
)
replace_once(
    "AiFactoryProjectBrief.md",
    '''Cloud list rates and NVIDIA/DGX loaded system pricing are currently code-maintained. TCO owns the primary rate/system tables and GPU Sizing maintains a derived duplicate per-GPU price table. `src/pricingProvenance.js` centralizes last-verified dates and staleness display but **not** the values themselves.\n\nCurrent verification dates in source are August 7, 2026 for both cloud and on-prem pricing. The code classifies pricing as "review" after 45 days and "stale" after 90 days. The fuller future architecture contemplated in source is a shared `/data/pricing/` registry with per-record provenance and automated cloud-rate checks.\n''',
    '''Cloud list rates and NVIDIA/DGX loaded system pricing remain code-maintained, but the values are now centralized in `src/pricingRegistry.js`. TCO imports the cloud-rate and on-prem-system registries directly. GPU Sizing derives its loaded per-GPU planning prices from those same system records rather than maintaining a duplicate hard-coded table. `src/pricingProvenance.js` remains the separate source of truth for verification dates and staleness display.\n\nCurrent verification dates in source are September 1, 2026 for cloud pricing and August 7, 2026 for on-prem pricing. The code classifies pricing as "review" after 45 days and "stale" after 90 days. `scripts/validate_pricing_registry.mjs` permanently guards the shared architecture and reconciliation in CI. Cloud and on-prem source verification is still a deliberate maintenance activity; centralization eliminates cross-tool value drift but does not make external prices self-updating.\n''',
)
replace_once(
    "AiFactoryProjectBrief.md",
    '- Cloud GPU pricing: manual review until a reliable shared/automated pricing layer is built.\n- DGX/on-prem pricing: manually compare against the current NVIDIA/CDW-supported source and update both TCO and GPU Sizing when needed.\n',
    '- Cloud GPU pricing: manually verify provider sources, then update the shared pricing registry and cloud verification date.\n- DGX/on-prem pricing: manually compare against the current NVIDIA/CDW-supported source, update the shared system record once, and let GPU Sizing derive its per-GPU planning price from that record.\n',
)

for path in ["README.md", "CHANGELOG.md", "MaintenanceRunbook.md", "AiFactoryProjectBrief.md"]:
    text = Path(path).read_text(encoding="utf-8")
    if "—" in text or "–" in text:
        raise SystemExit(f"{path}: prohibited dash character found")

print("Recorded shared pricing architecture in durable project documentation.")
