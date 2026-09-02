from pathlib import Path

p = Path("scripts/run_tco_parity.mjs")
text = p.read_text(encoding="utf-8")

replacements = [
    (
        'import vm from "node:vm";\n',
        'import vm from "node:vm";\nimport { CLOUD_GPU_RATES, ONPREM_SYSTEMS } from "../src/pricingRegistry.js";\n',
    ),
    (
        ' *   2. The current production engine declarations inside src/TcoCalculator.jsx.\n',
        ' *   2. Shared production pricing data from src/pricingRegistry.js.\n *   3. The current production engine declarations inside src/TcoCalculator.jsx.\n',
    ),
    (
        '  "RATES", "SYSTEMS", "IDX", "SYS_CLASS", "QUANT", "MODELS",\n',
        '  "IDX", "SYS_CLASS", "QUANT", "MODELS",\n',
    ),
    (
        'const sandbox = { console, __fixture: fixture, __result: null };\n',
        'const sandbox = { console, RATES: CLOUD_GPU_RATES, SYSTEMS: ONPREM_SYSTEMS, __fixture: fixture, __result: null };\n',
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one parity-harness match, found {count}: {old[:80]!r}")
    text = text.replace(old, new, 1)

p.write_text(text, encoding="utf-8")
print("Updated TCO parity harness to consume the shared pricing registry.")
