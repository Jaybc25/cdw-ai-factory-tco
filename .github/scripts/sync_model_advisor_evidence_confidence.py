from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:120]!r}")
    text = text.replace(old, new, 1)
    p.write_text(text)


# --- Engine: derive benchmark evidence independently from technical-spec confidence. ---
replace_once(
    "src/modelAdvisorEngine.js",
    'import catalogPolicyData from "../data/model_catalog_policy.json" with { type: "json" };\n',
    'import catalogPolicyData from "../data/model_catalog_policy.json" with { type: "json" };\nimport canonicalModelsData from "../data/canonical_models.json" with { type: "json" };\n\nexport const BENCHMARK_EVIDENCE = Object.freeze({\n  EXACT: Object.freeze({ level: "exact", label: "Exact benchmark evidence", detail: "Exact model/release with source-returned intelligence, coding, and agentic metrics." }),\n  EXACT_LIMITED: Object.freeze({ level: "exact-limited", label: "Exact but limited evidence", detail: "Exact model/release is mapped, but only some recommendation metrics are available." }),\n  COMPARATIVE_LIMITED: Object.freeze({ level: "comparative-limited", label: "Comparative evidence limited", detail: "Technical specifications are qualified, but no approved exact benchmark row is currently available for comparison." }),\n  VERIFICATION_REQUIRED: Object.freeze({ level: "verification-required", label: "Benchmark mapping requires verification", detail: "A benchmark alias or source record exists but is not currently safe to treat as approved recommendation evidence." }),\n});\n\nfunction benchmarkEvidenceFor(cap, canonicalEntry) {\n  const metricCount = [cap.intelligence_index, cap.coding_index, cap.agentic_index].filter(Number.isFinite).length;\n  if (cap.needs_alias_mapping === true || (cap.confidence && cap.confidence !== "HIGH")) {\n    return { ...BENCHMARK_EVIDENCE.VERIFICATION_REQUIRED, metricCount };\n  }\n  if (metricCount === 3) return { ...BENCHMARK_EVIDENCE.EXACT, metricCount };\n  if (metricCount > 0) return { ...BENCHMARK_EVIDENCE.EXACT_LIMITED, metricCount };\n  if (canonicalEntry?.aliases?.artificial_analysis_slug) {\n    return { ...BENCHMARK_EVIDENCE.VERIFICATION_REQUIRED, metricCount };\n  }\n  return { ...BENCHMARK_EVIDENCE.COMPARATIVE_LIMITED, metricCount };\n}\n'
)
replace_once(
    "src/modelAdvisorEngine.js",
    '  const policy = catalogPolicyData.models;\n\n  const capByCanonical = Object.fromEntries(capability.map((c) => [c.canonical_model_id, c]));\n  const govByCanonical = Object.fromEntries(governance.map((g) => [g.canonical_model_id, g]));\n  const policyByCanonical = Object.fromEntries(policy.map((p) => [p.canonical_model_id, p]));\n',
    '  const policy = catalogPolicyData.models;\n  const canonical = canonicalModelsData.models;\n\n  const capByCanonical = Object.fromEntries(capability.map((c) => [c.canonical_model_id, c]));\n  const govByCanonical = Object.fromEntries(governance.map((g) => [g.canonical_model_id, g]));\n  const policyByCanonical = Object.fromEntries(policy.map((p) => [p.canonical_model_id, p]));\n  const canonicalById = Object.fromEntries(canonical.map((c) => [c.canonical_model_id, c]));\n'
)
replace_once(
    "src/modelAdvisorEngine.js",
    '    const catalogPolicy = policyByCanonical[spec.canonical_model_id] || {};\n    return {\n',
    '    const catalogPolicy = policyByCanonical[spec.canonical_model_id] || {};\n    const benchmarkEvidence = benchmarkEvidenceFor(cap, canonicalById[spec.canonical_model_id]);\n    return {\n'
)
replace_once(
    "src/modelAdvisorEngine.js",
    '      agentic_index: cap.agentic_index ?? null,\n      developer_country: gov.developer_country ?? null,\n',
    '      agentic_index: cap.agentic_index ?? null,\n      benchmark_evidence_level: benchmarkEvidence.level,\n      benchmark_evidence_label: benchmarkEvidence.label,\n      benchmark_evidence_detail: benchmarkEvidence.detail,\n      benchmark_evidence_metric_count: benchmarkEvidence.metricCount,\n      developer_country: gov.developer_country ?? null,\n'
)

# --- UI: show technical-spec confidence and benchmark evidence as distinct fields. ---
replace_once(
    "src/ModelAdvisor.jsx",
    'const CONFIDENCE_BADGE = {\n  HIGH: { label: "Verified spec", color: "#1a7a3c" },\n  MEDIUM: { label: "Size-class estimate", color: "#a66a00" },\n};\n',
    'const CONFIDENCE_BADGE = {\n  HIGH: { label: "Verified spec", color: "#1a7a3c" },\n  MEDIUM: { label: "Size-class estimate", color: "#a66a00" },\n};\n\nconst EVIDENCE_BADGE = {\n  exact: { color: "#1a7a3c" },\n  "exact-limited": { color: "#7a5a00" },\n  "comparative-limited": { color: "#6b7280" },\n  "verification-required": { color: "#a66a00" },\n};\n\nfunction EvidenceBadge({ model }) {\n  const style = EVIDENCE_BADGE[model.benchmark_evidence_level] || EVIDENCE_BADGE["verification-required"];\n  return (\n    <span\n      className="font-semibold"\n      style={{ color: style.color }}\n      title={model.benchmark_evidence_detail}\n      aria-label={`Recommendation evidence: ${model.benchmark_evidence_label}`}\n    >\n      Evidence: {model.benchmark_evidence_label}\n    </span>\n  );\n}\n'
)
replace_once(
    "src/ModelAdvisor.jsx",
    '        <span style={{ color: conf.color }} className="font-semibold">{conf.label}</span>\n        <span>{model.license || "License unverified"}</span>\n',
    '        <span style={{ color: conf.color }} className="font-semibold">Spec: {conf.label}</span>\n        <EvidenceBadge model={model} />\n        <span>{model.license || "License unverified"}</span>\n'
)
replace_once(
    "src/ModelAdvisor.jsx",
    '        <span style={{ color: conf.color }} className="font-semibold">{conf.label}</span>\n        <span>{model.license || "License unverified"}</span>\n',
    '        <span style={{ color: conf.color }} className="font-semibold">Spec: {conf.label}</span>\n        <EvidenceBadge model={model} />\n        <span>{model.license || "License unverified"}</span>\n'
)
replace_once(
    "src/ModelAdvisor.jsx",
    '          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Recommended model(s) &amp; ranking rationale</div>\n',
    '          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Recommended model(s) &amp; ranking rationale</div>\n          <div className="text-[11px] text-gray-500 mb-3">Recommendation evidence describes benchmark coverage separately from technical-spec confidence and does not independently change rank order.</div>\n'
)
replace_once(
    "src/ModelAdvisor.jsx",
    '                          <span style={{ color: conf.color }}>{conf.label}</span> &middot; {m.license || "license unverified"}\n',
    '                          <span style={{ color: conf.color }}>Spec: {conf.label}</span> &middot; {m.benchmark_evidence_label} &middot; {m.license || "license unverified"}\n'
)
replace_once(
    "src/ModelAdvisor.jsx",
    '                    <div className="text-gray-600">{explainVerificationCandidate(m)}</div>\n',
    '                    <div className="text-gray-600">{explainVerificationCandidate(m)}</div>\n                    <div className="text-xs mt-1"><EvidenceBadge model={m} /></div>\n'
)

# --- Validation: explicit evidence-confidence contract, with no ranking impact. ---
Path("scripts/validate_model_advisor_evidence_confidence.mjs").write_text('''import { getCatalog, rankModels } from "../src/modelAdvisorEngine.js";\n\nfunction assert(c, m) { if (!c) throw new Error(m); }\n\nconst catalog = getCatalog();\nconst byId = new Map(catalog.map((m) => [m.canonical_model_id, m]));\n\nconst exact = byId.get("qwen3.8-27b");\nassert(exact?.benchmark_evidence_level === "exact", "Qwen3.8 must expose exact benchmark evidence.");\nassert(exact.benchmark_evidence_metric_count === 3, "Qwen3.8 must expose all three recommendation metrics.");\n\nconst exactLimited = byId.get("gemma-4-26b-a4b-it");\nassert(exactLimited?.benchmark_evidence_level === "exact-limited", "Gemma 4 must expose exact-but-limited benchmark evidence.");\nassert(exactLimited.benchmark_evidence_metric_count === 1, "Gemma 4 should currently expose intelligence only.");\n\nfor (const id of ["deepseek-v4-flash-0731", "deepseek-v4-pro-0813"]) {\n  const model = byId.get(id);\n  assert(model?.benchmark_evidence_level === "comparative-limited", `${id} must disclose limited comparative evidence.`);\n  assert(model.benchmark_evidence_metric_count === 0, `${id} must remain scoreless.`);\n}\n\nconst recommended = catalog.filter((m) => m.catalog_status === "recommended");\nfor (const metric of ["intelligence_index", "coding_index", "agentic_index"]) {\n  const before = rankModels(recommended.map((m) => ({ ...m, benchmark_evidence_level: undefined, benchmark_evidence_label: undefined, benchmark_evidence_detail: undefined, benchmark_evidence_metric_count: undefined })), metric, "strong");\n  const after = rankModels(recommended, metric, "strong");\n  assert(before.bestPerformance?.canonical_model_id === after.bestPerformance?.canonical_model_id, `${metric}: evidence disclosure changed Best Performance.`);\n  assert(before.efficiency?.canonical_model_id === after.efficiency?.canonical_model_id, `${metric}: evidence disclosure changed efficiency ranking.`);\n  assert(before.balanced?.canonical_model_id === after.balanced?.canonical_model_id, `${metric}: evidence disclosure changed balanced ranking.`);\n}\n\nconsole.log("Model Advisor evidence confidence PASS: benchmark evidence is distinct from technical-spec confidence, exact/limited/unmapped states are disclosed, and evidence metadata does not affect ranking.");\n''')

# --- Quality gate: execute the new validator and watch it for relevant changes. ---
qg = Path(".github/workflows/quality-gate.yml")
qtext = qg.read_text()
qtext = qtext.replace('      - "scripts/validate_model_activation_contract.mjs"\n', '      - "scripts/validate_model_activation_contract.mjs"\n      - "scripts/validate_model_advisor_evidence_confidence.mjs"\n')
qtext = qtext.replace('      - name: Validate full tranche activation contract\n        run: node scripts/validate_model_activation_contract.mjs\n', '      - name: Validate full tranche activation contract\n        run: node scripts/validate_model_activation_contract.mjs\n\n      - name: Validate Model Advisor evidence confidence\n        run: node scripts/validate_model_advisor_evidence_confidence.mjs\n')
qg.write_text(qtext)

# --- Durable documentation. ---
changelog = Path("CHANGELOG.md")
ctext = changelog.read_text()
marker = "# Changelog\n"
entry = '''\n## September 8, 2026 - Model Advisor benchmark-evidence confidence disclosure\n\n- Added a benchmark-evidence confidence layer that is explicitly separate from technical-spec confidence.\n- Current evidence states distinguish exact benchmark coverage, exact-but-limited coverage, limited comparative evidence, and mappings requiring verification.\n- Model Advisor cards and reports now disclose both spec confidence and recommendation-evidence quality.\n- Evidence-confidence metadata is disclosure-only and does not change eligibility, ranking margins, recommendation slots, GPU Sizing, or TCO economics.\n\n'''
if entry.strip() not in ctext:
    ctext = ctext.replace(marker, marker + entry, 1)
changelog.write_text(ctext)

state = Path("docs/MODEL_MODERNIZATION_CURRENT_STATE.md")
stext = state.read_text()
section = '''\n## Model Advisor benchmark-evidence confidence\n\nThe Advisor now keeps technical-spec confidence separate from recommendation-evidence confidence. Technical-spec confidence continues to describe model facts such as parameters, context, architecture, modality, and license. Benchmark-evidence confidence describes how directly the checked-in capability evidence supports cross-model recommendation.\n\nCurrent evidence labels are:\n- **Exact benchmark evidence**: exact model/release with intelligence, coding, and agentic metrics.\n- **Exact but limited evidence**: exact model/release mapping exists, but only some recommendation metrics are available.\n- **Comparative evidence limited**: technical specifications are qualified, but no approved exact benchmark row is currently available.\n- **Benchmark mapping requires verification**: an alias/source record exists but is not safe to treat as approved evidence.\n\nThis metadata is disclosure-only. It is not a ranking input and does not alter hard filters, quality margins, tie-breaking, recommendation slots, GPU Sizing ownership, or TCO economics.\n'''
if "## Model Advisor benchmark-evidence confidence" not in stext:
    stext += section
state.write_text(stext)
