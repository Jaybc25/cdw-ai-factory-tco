from pathlib import Path
import re


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))

# Wire reusable capacity selector into GPU Sizing.
replace_once(
    "src/GpuSizingCalculator.jsx",
    'import { getInferenceSequenceStateMemory, getInferenceThroughputScale, getTrainingParameterSemantics } from "./modelSizingMethodology.js";\n',
    'import { getInferenceSequenceStateMemory, getInferenceThroughputScale, getTrainingParameterSemantics } from "./modelSizingMethodology.js";\nimport { selectHigherGrowthConfiguration } from "./gpuSizingAlternatives.js";\n'
)

old_inf = '''  const mostCapableOther = nonRecommended.length\n    ? nonRecommended.reduce((best, c) => (c.anchor > best.anchor ? c : best))\n    : null;\n  const higherGrowth = mostCapableOther && mostCapableOther.anchor > selected.anchor ? mostCapableOther : null;\n'''
new_inf = '''  const higherGrowth = selectHigherGrowthConfiguration(selectedPriced, priced, "effectiveAnchor");\n'''
replace_once("src/GpuSizingCalculator.jsx", old_inf, new_inf)

old_train = '''  const mostCapableOther = nonRecommended.length\n    ? nonRecommended.reduce((best, c) => (c.peakTFLOPS > best.peakTFLOPS ? c : best))\n    : null;\n  const higherGrowth = mostCapableOther && mostCapableOther.peakTFLOPS > selected.peakTFLOPS ? mostCapableOther : null;\n'''
new_train = '''  const higherGrowth = selectHigherGrowthConfiguration(selectedPriced, priced, "peakTFLOPS");\n'''
replace_once("src/GpuSizingCalculator.jsx", old_train, new_train)

# Add growth basis to both inference and training result payloads.
old_payload = '    higherGrowth: higherGrowth ? { class: higherGrowth.id, workload: higherGrowth.gpusWorkload, recommended: higherGrowthCount } : { class: null, workload: null, recommended: null },\n'
new_payload = '    higherGrowth: higherGrowth ? { class: higherGrowth.id, workload: higherGrowth.gpusWorkload, recommended: higherGrowthCount, growthBasis: higherGrowth.growthBasis } : { class: null, workload: null, recommended: null, growthBasis: null },\n'
p = Path("src/GpuSizingCalculator.jsx")
text = p.read_text()
if text.count(old_payload) != 2:
    raise SystemExit(f"Expected exactly 2 higherGrowth payloads, found {text.count(old_payload)}")
text = text.replace(old_payload, new_payload)

# Update utilization copy: same class is now a valid higher-growth path.
old_util = '''        Same estimated workload, different classes -- a lower utilization % at a higher-growth class isn't\n        waste, it's headroom bought on purpose. A right-sized class runs closer to full.\n'''
new_util = '''        Same estimated workload, different deployable configurations -- a lower utilization % in the higher-growth option isn't\n        waste, it's headroom bought on purpose. The higher-growth option may use a different class or the next deployment quantum of the same class.\n'''
if old_util not in text:
    raise SystemExit("Expected utilization explanation not found")
text = text.replace(old_util, new_util, 1)

# Add a descriptive subtitle to every higher-growth result card without depending
# on exact prop ordering/spacing from earlier UI changes.
pattern = re.compile(r'(<ResultCard\s+[^>]*title="Higher-growth alternative"[^>]*)(/>)')
matches = list(pattern.finditer(text))
if not matches:
    raise SystemExit("No Higher-growth alternative ResultCard found")

def enrich_card(match):
    tag = match.group(1)
    if 'subtitle=' not in tag:
        tag += ' subtitle={result.higherGrowth.growthBasis === "next-deployment-quantum" ? "Next deployment quantum for additional headroom" : "Higher deployable capacity for additional headroom"}'
    tag = tag.replace('emptyMessage="No qualifying higher-growth alternative in the current supported catalog."', 'emptyMessage="No qualifying higher-growth capacity step in the current supported catalog."')
    return tag + match.group(2)

text = pattern.sub(enrich_card, text)
p.write_text(text)

# Durable docs.
changelog = Path("CHANGELOG.md")
ctext = changelog.read_text()
marker = "# Changelog\n"
entry = '''\n## September 8, 2026 - GPU Sizing higher-growth capacity semantics\n\n- Redefined the Higher-Growth Alternative as the next valid deployable capacity/headroom step, rather than requiring a faster GPU class.\n- Top-of-catalog recommendations can now grow within the same class by one additional deployment quantum (for example, 8x B300 to 16x B300).\n- The selector remains hardware-agnostic so future GB300, Vera Rubin, and other supported production classes can participate without changing card semantics.\n- GPU Sizing -> TCO selection behavior is unchanged: users may explicitly select the higher-growth configuration and the exact class/count is handed downstream.\n\n'''
if entry.strip() not in ctext:
    changelog.write_text(ctext.replace(marker, marker + entry, 1))

state = Path("docs/MODEL_MODERNIZATION_CURRENT_STATE.md")
stext = state.read_text()
section = '''\n## GPU Sizing higher-growth capacity semantics\n\nThe **Higher-Growth Alternative** now means a valid deployable configuration with materially more production capacity/headroom than the recommendation. It no longer requires a faster GPU class. When the selected class is already at the top of the applicable catalog, GPU Sizing can advance by one additional deployment quantum of the same class (for example, 8x B300 to 16x B300). Future supported classes such as GB300 or Vera Rubin can enter the same candidate framework without changing this semantic contract.\n'''
if "## GPU Sizing higher-growth capacity semantics" not in stext:
    state.write_text(stext + section)
