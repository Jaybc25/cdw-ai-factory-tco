from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"F4 patch target {label!r} expected once, found {count}")
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# Recommendation policy: deployed footprint first; within the same footprint,
# preserve production headroom before using acquisition cost as a tie-break.
# ---------------------------------------------------------------------------
policy_path = Path("src/gpuSizingRecommendation.js")
policy = policy_path.read_text()
policy = replace_once(
    policy,
    '''// Ranking order:\n// 1. Fewer node-rounded/deployable GPUs.\n// 2. Lower raw workload GPU requirement.\n// 3. Lower acquisition cost when both candidates have priced configurations.\n// 4. Stable catalog order as final deterministic tie-break.\n''',
    '''// Ranking order:\n// 1. Fewer node-rounded/deployable GPUs.\n// 2. Within the same deployed footprint, avoid >85% technical saturation when\n//    another candidate preserves production headroom.\n// 3. Lower acquisition cost when both candidates have priced configurations.\n// 4. Lower raw workload GPU requirement.\n// 5. Stable catalog order as final deterministic tie-break.\n//\n// The 85% boundary matches the calculator's existing high-utilization band.\n// Unknown utilization is treated conservatively and never outranks a known\n// candidate with adequate headroom.\n\nexport const PRODUCTION_HEADROOM_UTILIZATION_LIMIT = 0.85;\n\nfunction headroomRank(candidate) {\n  const utilization = Number(candidate?.technicalUtilization);\n  if (!Number.isFinite(utilization)) return 1;\n  return utilization > PRODUCTION_HEADROOM_UTILIZATION_LIMIT ? 1 : 0;\n}\n''',
    "ranking policy header",
)
policy = replace_once(
    policy,
    '''  ranked.sort((a, b) => {\n    if (a.deployedCount !== b.deployedCount) return a.deployedCount - b.deployedCount;\n    if (a.gpusWorkload !== b.gpusWorkload) return a.gpusWorkload - b.gpusWorkload;\n\n    const aCost = Number.isFinite(a.deployedCost) ? a.deployedCost : null;\n    const bCost = Number.isFinite(b.deployedCost) ? b.deployedCost : null;\n    if (aCost != null && bCost != null && aCost !== bCost) return aCost - bCost;\n\n    return a.__catalogIndex - b.__catalogIndex;\n  });\n''',
    '''  ranked.sort((a, b) => {\n    if (a.deployedCount !== b.deployedCount) return a.deployedCount - b.deployedCount;\n\n    const headroomDelta = headroomRank(a) - headroomRank(b);\n    if (headroomDelta !== 0) return headroomDelta;\n\n    const aCost = Number.isFinite(a.deployedCost) ? a.deployedCost : null;\n    const bCost = Number.isFinite(b.deployedCost) ? b.deployedCost : null;\n    if (aCost != null && bCost != null && aCost !== bCost) return aCost - bCost;\n\n    if (a.gpusWorkload !== b.gpusWorkload) return a.gpusWorkload - b.gpusWorkload;\n    return a.__catalogIndex - b.__catalogIndex;\n  });\n''',
    "ranking comparator",
)
policy_path.write_text(policy)

# ---------------------------------------------------------------------------
# Calculator integration: compute continuous technical demand, attach node-
# rounded cost + saturation before auto-recommendation, then rank priced options.
# ---------------------------------------------------------------------------
calc_path = Path("src/GpuSizingCalculator.jsx")
calc = calc_path.read_text()

calc = replace_once(
    calc,
    '''  const candidates = GPU_SPECS.map((gpu) => {\n    const effectiveAnchor = gpu.anchor * throughputScale.factor;\n    const gpusMem = ceilDiv(totalMemoryGB, gpu.vram);\n    const gpusPerf = ceilDiv(totalThroughputNeeded, effectiveAnchor);\n    return { ...gpu, effectiveAnchor, gpusMem, gpusPerf, gpusWorkload: Math.max(gpusMem, gpusPerf) };\n  });\n\n  const autoRecommended = selectDeployableRecommendation(candidates);\n  const selected = inputs.gpuClassOverride === "Auto-recommend"\n    ? autoRecommended\n    : candidates.find((c) => c.id === inputs.gpuClassOverride);\n\n  function budgetFor(gpuId, deployedCount) {\n    const price = GPU_PRICE_USD[gpuId];\n    if (!price) return null;\n    return { amount: deployedCount * price.amount, confidence: price.confidence, source: price.source };\n  }\n\n  const priced = candidates.map((c) => {\n    const count = Math.ceil(c.gpusWorkload / c.nodeSize) * c.nodeSize;\n    const b = budgetFor(c.id, count);\n    return { ...c, deployedCount: count, deployedCost: b ? b.amount : null };\n  });\n  const selectedPriced = priced.find((c) => c.id === selected.id);\n''',
    '''  const candidates = GPU_SPECS.map((gpu) => {\n    const effectiveAnchor = gpu.anchor * throughputScale.factor;\n    const gpusMemExact = totalMemoryGB / gpu.vram;\n    const gpusPerfExact = totalThroughputNeeded / effectiveAnchor;\n    const gpusMem = Math.ceil(gpusMemExact);\n    const gpusPerf = Math.ceil(gpusPerfExact);\n    return { ...gpu, effectiveAnchor, gpusMem, gpusPerf, gpusWorkloadExact: Math.max(gpusMemExact, gpusPerfExact), gpusWorkload: Math.max(gpusMem, gpusPerf) };\n  });\n\n  function budgetFor(gpuId, deployedCount) {\n    const price = GPU_PRICE_USD[gpuId];\n    if (!price) return null;\n    return { amount: deployedCount * price.amount, confidence: price.confidence, source: price.source };\n  }\n\n  const priced = candidates.map((c) => {\n    const count = Math.ceil(c.gpusWorkload / c.nodeSize) * c.nodeSize;\n    const b = budgetFor(c.id, count);\n    return { ...c, deployedCount: count, deployedCost: b ? b.amount : null, technicalUtilization: Math.min(c.gpusWorkloadExact / count, 1) };\n  });\n  const autoRecommended = selectDeployableRecommendation(priced);\n  const selected = inputs.gpuClassOverride === "Auto-recommend"\n    ? autoRecommended\n    : priced.find((c) => c.id === inputs.gpuClassOverride);\n  const selectedPriced = priced.find((c) => c.id === selected.id);\n''',
    "inference recommendation integration",
)

calc = replace_once(
    calc,
    '''  const candidates = TRAINING_GPU_SPECS.map((gpu) => {\n    const peakTFLOPS = inputs.precision === "FP8" ? (gpu.fp8 ?? gpu.bf16) : gpu.bf16;\n    const gpusFit = ceilDiv(trainingMemoryGB, gpu.vram);\n    const achievableFlopsPerSec = peakTFLOPS * 1e12 * inputs.mfu;\n    const gpusTime = ceilDiv(flopsRequired, achievableFlopsPerSec * secondsTarget);\n    return { ...gpu, peakTFLOPS, gpusFit, gpusTime, gpusWorkload: Math.max(gpusFit, gpusTime) };\n  });\n\n  const autoRecommended = selectDeployableRecommendation(candidates);\n  const selected = inputs.gpuClassOverride === "Auto-recommend"\n    ? autoRecommended\n    : candidates.find((c) => c.id === inputs.gpuClassOverride);\n\n  function budgetFor(gpuId, deployedCount) {\n    const price = GPU_PRICE_USD[gpuId];\n    if (!price) return null;\n    return { amount: deployedCount * price.amount, confidence: price.confidence, source: price.source };\n  }\n\n  const priced = candidates.map((c) => {\n    const count = Math.ceil(c.gpusWorkload / c.nodeSize) * c.nodeSize;\n    const b = budgetFor(c.id, count);\n    return { ...c, deployedCount: count, deployedCost: b ? b.amount : null };\n  });\n  const selectedPriced = priced.find((c) => c.id === selected.id);\n''',
    '''  const candidates = TRAINING_GPU_SPECS.map((gpu) => {\n    const peakTFLOPS = inputs.precision === "FP8" ? (gpu.fp8 ?? gpu.bf16) : gpu.bf16;\n    const gpusFitExact = trainingMemoryGB / gpu.vram;\n    const gpusFit = Math.ceil(gpusFitExact);\n    const achievableFlopsPerSec = peakTFLOPS * 1e12 * inputs.mfu;\n    const gpusTimeExact = flopsRequired / (achievableFlopsPerSec * secondsTarget);\n    const gpusTime = Math.ceil(gpusTimeExact);\n    return { ...gpu, peakTFLOPS, gpusFit, gpusTime, gpusWorkloadExact: Math.max(gpusFitExact, gpusTimeExact), gpusWorkload: Math.max(gpusFit, gpusTime) };\n  });\n\n  function budgetFor(gpuId, deployedCount) {\n    const price = GPU_PRICE_USD[gpuId];\n    if (!price) return null;\n    return { amount: deployedCount * price.amount, confidence: price.confidence, source: price.source };\n  }\n\n  const priced = candidates.map((c) => {\n    const count = Math.ceil(c.gpusWorkload / c.nodeSize) * c.nodeSize;\n    const b = budgetFor(c.id, count);\n    return { ...c, deployedCount: count, deployedCost: b ? b.amount : null, technicalUtilization: Math.min(c.gpusWorkloadExact / count, 1) };\n  });\n  const autoRecommended = selectDeployableRecommendation(priced);\n  const selected = inputs.gpuClassOverride === "Auto-recommend"\n    ? autoRecommended\n    : priced.find((c) => c.id === inputs.gpuClassOverride);\n  const selectedPriced = priced.find((c) => c.id === selected.id);\n''',
    "training recommendation integration",
)
calc_path.write_text(calc)

# ---------------------------------------------------------------------------
# Existing recommendation verifier: exercise the two F4 decision branches and
# confirm both inference and training feed priced candidates into the selector.
# ---------------------------------------------------------------------------
verify_path = Path("scripts/verifyGpuDeployableRanking.mjs")
verify = verify_path.read_text()
verify = replace_once(
    verify,
    '''// Equal technical footprint: acquisition cost may break a true tie when both priced.\nconst costTieBreak = selectDeployableRecommendation([\n  { id: "A", gpusWorkload: 8, nodeSize: 8, deployedCost: 900000 },\n  { id: "B", gpusWorkload: 8, nodeSize: 8, deployedCost: 800000 },\n]);\nassert(costTieBreak.id === "B", `Expected lower cost tie-break, got ${costTieBreak.id}`);\n\nconst source = fs.readFileSync("src/GpuSizingCalculator.jsx", "utf8");\n''',
    '''// Equal technical footprint: acquisition cost may break a true tie when both priced.\nconst costTieBreak = selectDeployableRecommendation([\n  { id: "A", gpusWorkload: 8, nodeSize: 8, deployedCost: 900000 },\n  { id: "B", gpusWorkload: 8, nodeSize: 8, deployedCost: 800000 },\n]);\nassert(costTieBreak.id === "B", `Expected lower cost tie-break, got ${costTieBreak.id}`);\n\n// F4: when both options deploy the same node count and both retain adequate\n// headroom, do not spend more just because one has a lower raw GPU requirement.\nconst safeCostWins = selectDeployableRecommendation([\n  { id: "EXPENSIVE", gpusWorkload: 4, nodeSize: 8, deployedCost: 900000, technicalUtilization: 0.50 },\n  { id: "CHEAPER", gpusWorkload: 6, nodeSize: 8, deployedCost: 750000, technicalUtilization: 0.75 },\n]);\nassert(safeCostWins.id === "CHEAPER", `Expected lower-cost safe-headroom option, got ${safeCostWins.id}`);\n\n// F4/F5 boundary: cost must not promote a materially saturated option over an\n// equally sized deployed alternative with reasonable production headroom.\nconst headroomWins = selectDeployableRecommendation([\n  { id: "CHEAP-SATURATED", gpusWorkload: 8, nodeSize: 8, deployedCost: 700000, technicalUtilization: 0.96 },\n  { id: "HEADROOM", gpusWorkload: 6, nodeSize: 8, deployedCost: 900000, technicalUtilization: 0.75 },\n]);\nassert(headroomWins.id === "HEADROOM", `Expected production-headroom option, got ${headroomWins.id}`);\n\nconst source = fs.readFileSync("src/GpuSizingCalculator.jsx", "utf8");\n''',
    "F4 verifier scenarios",
)
verify = replace_once(
    verify,
    '''assert(source.includes('selectDeployableRecommendation'), "GPU Sizing must use deployable recommendation selector");\n''',
    '''assert((source.match(/selectDeployableRecommendation\\(priced\\)/g) || []).length === 2, "Inference and training must rank priced, node-rounded candidates");\nassert((source.match(/technicalUtilization: Math\\.min\\(c\\.gpusWorkloadExact \\/ count, 1\\)/g) || []).length === 2, "Inference and training must supply continuous technical utilization before ranking");\n''',
    "source integration assertions",
)
verify = replace_once(
    verify,
    '''console.log("- node-rounded deployment beats raw GPU-count ranking");\n''',
    '''console.log("- node-rounded deployment beats raw GPU-count ranking");\nconsole.log("- same-footprint options preserve headroom first, then prefer lower deployed cost");\n''',
    "verifier output",
)
verify_path.write_text(verify)

# ---------------------------------------------------------------------------
# Quality gate: this verifier already existed but was not wired into CI. F4 makes
# that contract executable on every relevant PR/main change.
# ---------------------------------------------------------------------------
qg_path = Path(".github/workflows/quality-gate.yml")
qg = qg_path.read_text()
needle = '      - "scripts/validate_gpu_higher_growth_capacity.mjs"\n'
if qg.count(needle) != 2:
    raise SystemExit(f"Expected two quality-gate path entries for GPU higher-growth validator, found {qg.count(needle)}")
qg = qg.replace(needle, needle + '      - "scripts/verifyGpuDeployableRanking.mjs"\n')
qg = replace_once(
    qg,
    '''      - name: Validate GPU higher-growth capacity\n        run: node scripts/validate_gpu_higher_growth_capacity.mjs\n\n      - name: Validate GPU selected-budget and Phase 2 cleanup\n''',
    '''      - name: Validate GPU higher-growth capacity\n        run: node scripts/validate_gpu_higher_growth_capacity.mjs\n\n      - name: Validate GPU deployable recommendation ranking\n        run: node scripts/verifyGpuDeployableRanking.mjs\n\n      - name: Validate GPU selected-budget and Phase 2 cleanup\n''',
    "quality gate recommendation step",
)
qg_path.write_text(qg)

print("F4 deployable cost/headroom recommendation patch applied")
