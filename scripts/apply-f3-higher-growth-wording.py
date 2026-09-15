from pathlib import Path

jsx_path = Path("src/GpuSizingCalculator.jsx")
jsx = jsx_path.read_text()

anchor = 'const RUBIN_TRAINING_TCO_NOTICE = "Technical sizing uses NVIDIA-published memory and training FLOPS. Phase 1 TCO is available using transparent EST/PROVISIONAL planning assumptions; detailed fabric, liquid-cooling, rack, and facility engineering remains a quote/Phase 2 activity.";\n'
helper = anchor + '''\nfunction getHigherGrowthSubtitle(higherGrowth) {\n  if (!higherGrowth?.class) return null;\n  return higherGrowth.growthBasis === "next-deployment-quantum"\n    ? "Same GPU class, next deployment quantum for additional headroom"\n    : "Different deployable configuration with more total capacity for additional headroom";\n}\n\nfunction getHigherGrowthAuditText(higherGrowth, mode) {\n  if (!higherGrowth?.class) return "none -- no valid node-rounded capacity step above the recommendation is available.";\n  const capacityMetric = mode === "Inference" ? "throughput" : "training compute";\n  return higherGrowth.growthBasis === "next-deployment-quantum"\n    ? `${higherGrowth.class}, the same GPU class expanded to the next deployment quantum, increasing total deployed ${capacityMetric} capacity and headroom.`\n    : `${higherGrowth.class}, a different deployable configuration whose node-rounded total ${capacityMetric} capacity exceeds the recommendation, providing additional headroom.`;\n}\n'''
if anchor not in jsx:
    raise SystemExit("F3 helper insertion anchor not found")
jsx = jsx.replace(anchor, helper, 1)

replacements = [
    (
        "The higher-growth option may use a different class or the next deployment quantum of the same class.",
        "Higher-growth means more node-rounded deployed capacity, not necessarily a newer or faster GPU class; it may be the next deployment quantum of the same class.",
    ),
    (
        'subtitle={result.higherGrowth.growthBasis === "next-deployment-quantum" ? "Next deployment quantum for additional headroom" : "Higher deployable capacity for additional headroom"}',
        'subtitle={getHigherGrowthSubtitle(result.higherGrowth)}',
    ),
    (
        '<ResultCard icon={TrendingUp} title="Higher-growth alternative" gpuClass={result.higherGrowth.class} gpus={result.higherGrowth.recommended} emptyMessage="No qualifying higher-growth alternative in the current supported catalog." selectable=',
        '<ResultCard icon={TrendingUp} title="Higher-growth alternative" gpuClass={result.higherGrowth.class} gpus={result.higherGrowth.recommended} emptyMessage="No qualifying higher-growth capacity step in the current supported catalog." subtitle={getHigherGrowthSubtitle(result.higherGrowth)} selectable=',
    ),
    (
        '<div className="text-xs text-gray-500 mb-4"><b>Higher-growth alternative:</b> {result.higherGrowth.class ? `${result.higherGrowth.class}, the other class with genuinely more real capability (${mode === "Inference" ? "throughput anchor" : "training FLOPS at your selected precision"}) than the recommendation.` : "none -- the recommendation is already the most capable class in the current catalog for this metric."}</div>',
        '<div className="text-xs text-gray-500 mb-4"><b>Higher-growth alternative:</b> {getHigherGrowthAuditText(result.higherGrowth, mode)}</div>',
    ),
]

for old, new in replacements:
    if old not in jsx:
        raise SystemExit(f"F3 expected JSX target not found: {old[:160]}")
    jsx = jsx.replace(old, new, 1)

jsx_path.write_text(jsx)

validation_path = Path("scripts/validate_gpu_higher_growth_capacity.mjs")
validation = validation_path.read_text()

old_import = 'import { selectHigherGrowthConfiguration } from "../src/gpuSizingAlternatives.js";\n'
new_import = 'import { readFileSync } from "node:fs";\n' + old_import
if old_import not in validation:
    raise SystemExit("F3 validation import anchor not found")
validation = validation.replace(old_import, new_import, 1)

multi_anchor = 'assert(multiNodeGrowth.deployedCapacity > multiNodeGrowth.baselineCapacity, "Higher-growth throughput capacity must be strictly higher than baseline even when a more capable class uses fewer GPUs.");\n'
multi_extra = multi_anchor + 'assert(multiNodeGrowth.id === "B200", "The fixture should exercise a different-class higher-growth option.");\nassert(multiNodeGrowth.growthBasis === "higher-capacity-class", "Different-class growth must identify the higher-capacity-class basis.");\n'
if multi_anchor not in validation:
    raise SystemExit("F3 multi-node validation anchor not found")
validation = validation.replace(multi_anchor, multi_extra, 1)

console_line = 'console.log("GPU higher-growth capacity PASS: growth means the next valid deployable capacity step, including same-class expansion at the top of the catalog.");\n'
source_checks = '''const uiSource = readFileSync(new URL("../src/GpuSizingCalculator.jsx", import.meta.url), "utf8");\nassert(uiSource.includes("Higher-growth means more node-rounded deployed capacity, not necessarily a newer or faster GPU class"), "Calculator utilization copy must define higher-growth as deployed capacity/headroom, not GPU-class superiority.");\nassert(uiSource.includes("Same GPU class, next deployment quantum for additional headroom"), "Same-class higher-growth wording must be explicit.");\nassert(uiSource.includes("Different deployable configuration with more total capacity for additional headroom"), "Different-class higher-growth wording must describe total deployed capacity.");\nassert((uiSource.match(/getHigherGrowthSubtitle\\(result\\.higherGrowth\\)/g) || []).length === 2, "Calculator and report should share the same higher-growth subtitle semantics.");\nassert(uiSource.includes("getHigherGrowthAuditText(result.higherGrowth, mode)"), "Audit trail must use capacity-aware higher-growth wording.");\nassert(!uiSource.includes("the other class with genuinely more real capability"), "Stale higher-growth wording must not imply a necessarily more capable GPU class.");\n\n''' + console_line
if console_line not in validation:
    raise SystemExit("F3 validation console anchor not found")
validation = validation.replace(console_line, source_checks, 1)
validation_path.write_text(validation)
