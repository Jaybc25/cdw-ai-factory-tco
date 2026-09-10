# Rubin Evidence Foundation — 2026-09-10

## Purpose

This document is the source-backed implementation contract for adding NVIDIA DGX Rubin NVL8 and DGX Vera Rubin NVL72 to the CDW AI Factory Tools. It separates what is verified enough to activate now from what must remain explicitly gated.

No customer-facing Rubin sizing or TCO behavior should be activated merely because a hardware class exists in this document. Each activation must satisfy the relevant gates below.

## Evidence policy

Use the strongest available source in this order:

1. Current first-party NVIDIA technical documentation or product page.
2. Current NVIDIA NPN Public Price List / product-specific terms.
3. MLCommons audited benchmark results.
4. First-party partner/OEM measured results when NVIDIA does not publish the needed quantity.
5. Secondary analysis only as clearly labeled corroboration or estimation; never promote it to LISTED/VERIFIED.

Do not derive an inference throughput anchor from peak FLOPS, tokens/MW, marketing ratios, chart pixel estimates, or an assumed power value.

## DGX Rubin NVL8

### Verified technical facts

- 8 Rubin GPUs.
- 288 GB HBM4 per GPU; 2.3 TB total GPU memory.
- 22 TB/s HBM bandwidth per GPU.
- Current preferred system HBM bandwidth basis: 176 TB/s aggregate (8 x 22 TB/s). Regional NVIDIA pages have shown 160/176 TB/s disagreement; retain this discrepancy in provenance until NVIDIA fully converges.
- NVFP4 inference peak: 50 PFLOPS/GPU; 400 PFLOPS/system.
- NVFP4 training dense: 35 PFLOPS/GPU; 280 PFLOPS/system.
- FP8/FP6 training dense: 17.5 PFLOPS/GPU; 140 PFLOPS/system.
- FP16/BF16 dense: 4 PFLOPS/GPU.
- NVLink bandwidth: 3.6 TB/s/GPU; 28.8 TB/s aggregate NVLink switch bandwidth.
- System power usage: approximately 24 kW.
- Liquid-cooled, DC-busbar/MGX design.
- NVIDIA DGX SuperPOD Rubin NVL8 reference architecture supports 8 systems per rack and approximately 225 kW rack-level power consumption. This rack-level number is a facility/reference-design quantity and must not replace the approximately 24 kW per-system TCO power input.
- Node/deployment quantum for GPU Sizing: 8 GPUs.

### Verified commercial facts

Source: NVIDIA NPN Public Price List 202609, as of 2026-09-08.

- Commercial 3-year initial hardware kit SKU: `DGXR-G2304+P1CMI36`.
- Description: DGX Rubin NVL8 8X 288GB with Standard Support, 3 Years.
- Commercial list price: $995,000.
- Standard hardware support term: 3 years included in the platform/hardware kit.
- Mandatory partner installation ordering line exists (`718-DG70J8+P1CMI00`) at $1; treat $1 as an ordering/configuration placeholder, not a meaningful installation-cost estimate.
- NVIDIA AI Enterprise and NVIDIA Mission Control are optional commercial software components under Rubin product terms; do not assume their license cost is included in the standalone hardware-kit price unless an actual BOM/quote proves otherwise.

### Safe GPU Sizing activation

Training/memory inputs may be activated using:

- `vram = 288`
- `bf16 = 4000` TFLOPS
- `fp8 = 17500` TFLOPS
- `nodeSize = 8`

Training remains subject to the existing MFU assumption; the current 40% default is not Rubin-specific measured efficiency and should remain disclosed as a workload assumption.

### Inference gate — BLOCKED

No current result provides an absolute, defensible per-GPU token-throughput anchor comparable to the existing GPU Sizing anchor methodology.

Rubin inference must remain `UNAVAILABLE` until a result is available that is:

- absolute tokens/second,
- reducible to per-GPU using a reported accelerator count,
- measured on production or near-production silicon,
- tied to a named model, precision, and scenario,
- and audited/closed-division or independently reproducible enough for enterprise presales use.

Early Rubin results expressed as tokens/MW, cost/token, marketing ratios, or Groq LPX-assisted system throughput do not satisfy this gate.

### TCO activation gate — PARTIAL

Known:

- Hardware list price: $995,000.
- IT power basis: ~24 kW.
- Current reference rack topology: up to 8 systems/rack.
- Three-year Business Standard hardware support is included.

Not yet fully known:

- Rubin-specific compute/storage/management fabric cost basis.
- Rubin-specific CDU/DC infrastructure cost basis.
- Defensible professional-services/install planning amount.
- Correct rack/busbar/power-shelf economic treatment in the current TCO model.

Do not clone B300 non-hardware adders or its 2-systems/rack convention into Rubin NVL8.

## DGX Vera Rubin NVL72

### Verified technical facts

- 72 Rubin GPUs and 36 Vera CPUs.
- 288 GB HBM4 per GPU; 20.7 TB total HBM4.
- Current DGX datasheet value: up to approximately 1,580 TB/s HBM bandwidth.
- NVFP4 inference peak: 3,600 PFLOPS/rack.
- NVFP4 training dense: 2,520 PFLOPS/rack.
- FP8/FP6 training dense: 1,260 PFLOPS/rack.
- 9 L1 NVLink switch systems.
- Approximately 260 TB/s NVLink aggregate according to the DGX-specific datasheet.
- Node/deployment quantum for GPU Sizing: 72 GPUs.
- 48RU rack-scale system.

Broader NVIDIA pages have carried lower HBM/NVLink figures than the DGX-specific datasheet. For this specific DGX system, prefer the latest DGX-specific datasheet and retain the discrepancy in provenance.

### Verified commercial facts

Source: NVIDIA NPN Public Price List 202609, as of 2026-09-08.

Floor-feed commercial 3-year initial SKU:

- `DGXV-0072F+P1CMI36`
- List unit price: $10,500,000.
- MOQ: 2.
- Product term includes `Quoting Only`.

Top-feed commercial 3-year initial SKU:

- `DGXV-0072T+P1CMI36`
- List unit price: $10,500,000.
- MOQ: 2.
- Product term includes `Quoting Only`.

Commercial status must therefore not be represented as ordinary unqualified `LISTED` purchase pricing. Preserve visible `QUOTE_ONLY`/equivalent semantics and MOQ 2 disclosure.

Do not silently convert MOQ 2 into a mandatory $21M minimum TCO basis without a deliberate methodology decision. Unit planning basis and procurement minimum are separate concepts and must be disclosed separately if both are shown.

### Safe GPU Sizing activation

Training/memory inputs may be activated using:

- `vram = 288`
- `bf16 = 4000` TFLOPS per GPU
- `fp8 = 17500` TFLOPS per GPU
- `nodeSize = 72`

### Inference gate — BLOCKED

Same gate as Rubin NVL8. No qualifying absolute per-GPU Rubin token-throughput anchor is currently available.

### Power gate — PROVISIONAL / UNRESOLVED

Do not promote any currently circulating Vera Rubin NVL72 power value to a canonical `LISTED`/`VERIFIED` TCO input yet.

Known first-party quantities describe different concepts, including:

- an NVIDIA representative inference test with 136 kW static provisioned rack power and 101 kW with MaxLPS,
- facility/cabinet design-envelope quantities substantially above normal operating draw.

These are not proven to be the same semantic quantity as the TCO registry's intended rated/design IT-power basis.

Do not use a secondary-source midpoint such as 210 kW as if it were NVIDIA-listed power.

### TCO activation gate — PARTIAL

Known:

- $10.5M unit price-book amount.
- Quote-only status and MOQ 2.
- 72-GPU rack-scale topology.
- Standard support term included with the hardware kit.

Not yet fully known:

- canonical apples-to-apples TCO power value,
- Rubin-specific fabric/CDU/DC infrastructure economics,
- defensible professional-services/install amount,
- final treatment of optional NVIDIA AI Enterprise / Mission Control licensing in the enterprise planning configuration.

## Loaded-system cost contract

The current TCO methodology uses `perSys` as a loaded system planning basis rather than bare hardware price alone. Existing lineage models hardware acquisition plus software suite, fabric, professional services and, for rack-scale systems, DC/CDU infrastructure; cluster-management and rack/storage/facility costs may be modeled separately.

For Rubin:

1. Never add hardware support again when it is already included in the NVIDIA platform/hardware kit.
2. Do not assume optional software is included in the hardware kit without BOM evidence.
3. Preserve `sw` and `prof` fields even when components are commercially bundled, because the TCO residual-value calculation excludes software and professional services from resale value.
4. Do not copy Blackwell-family adders into Rubin without source-backed equivalence.
5. Record support duration and disclose any horizon/support-term mismatch rather than silently granting free support beyond the covered term.

## Existing-system maintenance findings discovered during Rubin research

These are not Rubin activation requirements and should be handled in separate narrow maintenance work where practical:

- DGX GB300 NVL72 currently carries 120 kW in the registry. Current first-party NVIDIA guidance supports approximately 135 kW designed rack power; this should be corrected separately rather than hidden inside a Rubin change.
- DGX B300 inference and GB200/GB300 inference anchors are weaker than B200's evidence quality and should remain transparently labeled as derived/provisional where applicable.
- Existing loaded-adders lineage should continue to distinguish current September 2026 hardware prices from historical NVIDIA TCO-tool component captures.

## Re-check triggers

Revisit the blocked Rubin inference gate when any of the following becomes available:

- MLPerf Inference v6.1 Rubin closed-division results.
- NVIDIA per-accelerator Rubin MLPerf table.
- NVIDIA/SemiAnalysis InferenceX/InferenceMAX Rubin submission with qualifying absolute throughput.
- A production-silicon partner result that provides absolute throughput, accelerator count, workload/model/precision/scenario and sufficient reproducibility.

Revisit Vera Rubin power when NVIDIA publishes a DGX-specific rated/designed rack-power specification that is directly comparable to the existing TCO kW basis.

## Activation principle

The application should prefer an explicit `UNAVAILABLE`, `PROVISIONAL`, `QUOTE_ONLY`, or source-quality disclosure over a fabricated point estimate. Missing evidence is a transparent product state, not a reason to manufacture precision.
