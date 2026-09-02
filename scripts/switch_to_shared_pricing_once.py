from pathlib import Path


def edit(path, transform):
    p = Path(path)
    original = p.read_text(encoding="utf-8")
    updated = transform(original)
    if updated == original:
        raise SystemExit(f"{path}: no change applied")
    p.write_text(updated, encoding="utf-8")


def update_tco(text):
    import_line = 'import { CLOUD_GPU_RATES as RATES, ONPREM_SYSTEMS as SYSTEMS } from "./pricingRegistry.js";\n'
    anchor = 'import { CLOUD_RATES_VERIFIED_AT, ONPREM_PRICING_VERIFIED_AT, stalenessOf, fmtVerifiedDate } from "./pricingProvenance.js";\n'
    if import_line not in text:
        if text.count(anchor) != 1:
            raise SystemExit("TCO pricingProvenance import anchor not unique")
        text = text.replace(anchor, anchor + import_line, 1)
    start = text.index('/* ============ CLOUD RATES:')
    end_marker = 'const OWN_TARGETS = Object.keys(SYSTEMS);'
    end = text.index(end_marker, start)
    return text[:start] + text[end:]


def update_gpu(text):
    import_line = 'import { GPU_SIZING_PRICE_USD as GPU_PRICE_USD } from "./pricingRegistry.js";\n'
    anchor = 'import { ONPREM_PRICING_VERIFIED_AT, stalenessOf, fmtVerifiedDate } from "./pricingProvenance.js";\n'
    if import_line not in text:
        if text.count(anchor) != 1:
            raise SystemExit("GPU pricingProvenance import anchor not unique")
        text = text.replace(anchor, anchor + import_line, 1)
    start = text.index('const GPU_PRICE_USD = {')
    end_marker = 'const QUANT_BYTES ='
    end = text.index(end_marker, start)
    return text[:start] + text[end:]


edit("src/TcoCalculator.jsx", update_tco)
edit("src/GpuSizingCalculator.jsx", update_gpu)
print("Shared pricing imports applied without changing pricing values.")
