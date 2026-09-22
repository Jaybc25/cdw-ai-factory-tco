# Model Modernization Current State

_Model-modernization baseline: 2026-09-07; current ownership and TCO trend notes refreshed 2026-09-22. See the newest `AiFactoryProjectBrief.md` addendum for the full later tranche._

This document is the durable current-state summary for the CDW AI Factory Tools model modernization program. It should be updated whenever model catalog policy, architecture-aware sizing methodology, capability evidence, or Model Advisor -> GPU Sizing -> TCO handoff semantics change materially.

## Current production catalog

The production catalog contains 21 named models:

- 13 current/recommended models shown by default.
- 8 existing-deployment models hidden by default behind `Include models for existing deployments`.
- `Custom` remains available as a separate user-defined sizing option and is not counted as a named production model.

### Current/recommended models

1. Meta Muse Glimmer 30B
2. Llama 4 Scout
3. Llama 4 Maverick
4. IBM Granite 4.2 30B
5. gpt-oss-20b
6. gpt-oss-120b
7. Gemma 4 26B-A4B IT
8. Mistral Small 4
9. Mistral Large 3
10. Qwen3.8 27B
11. DeepSeek V4 Flash 0731
12. DeepSeek V4 Pro 0813
13. NVIDIA Nemotron 3 Super 120B-A12B FP8

### Existing-deployment models

1. Llama 3.1 8B Instruct
2. Llama 3.1 70B Instruct
3. Llama 3.1 405B Instruct
4. Llama 3.3 70B Instruct
5. Mixtral 8x7B Instruct
6. DeepSeek V3
7. DeepSeek R1
8. Gemma 3 27B

Existing-deployment support is intentional. These models remain useful for sizing, migration, audit, and capacity-planning work in environments that already run them. They are not intended to clutter the default greenfield experience.

## Modernization sequence completed

The first modernization tranche was completed across PRs #27 through #32:

- PR #27: catalog governance and current-vs-existing-deployment policy.
- PR #28: architecture schema for dense, MoE, and hybrid model semantics.
- PR #29: source-qualified ten-model modernization tranche staged for review.
- PR #30: architecture-aware sizing methodology and activation of six modern models.
- PR #31: explicit hybrid sequence-state methodology for Qwen3.8, DeepSeek V4 Flash, DeepSeek V4 Pro, and Nemotron 3 Super.
- PR #32: activation of those final four models into the production catalog.

PR #32 merged to `main` as commit `4f74f97dd2bb06f762fb09e0b845f772a0435c63` after exact-head source, parity, browser, and Vercel validation.

## Architecture-aware sizing contract

GPU Sizing deliberately separates three concepts:

1. **Residency**: full/total model parameters drive resident model-state memory.
2. **Active compute**: source-qualified active parameters may influence sparse per-token compute, but smaller active parameter counts do not receive an unsupported throughput speedup.
3. **Inference sequence state**: KV, MLA, compressed-attention, DeltaNet recurrent state, and Mamba recurrent state are modeled according to the architecture contract rather than treated as one universal KV-cache formula.

Supported sequence-state types include:

- `standard-kv`
- `mla`
- `deltanet-attention-hybrid`
- `deepseek-v4-compressed-attention`
- `mamba-attention-hybrid`

Training retains full-model residency while source-qualified sparse active parameters are used for token-level compute where applicable.

## Four hybrid-model activation details

### Qwen3.8 27B

- 64 language layers.
- 48 Gated DeltaNet layers plus 16 full-attention layers.
- DeltaNet recurrent state remains fixed-size per sequence and does not shrink with the generic attention/KV precision control.
- Verified sizing context: 262,144 tokens.
- No exact Artificial Analysis capability mapping is currently used.

### DeepSeek V4 Flash 0731

- 304B total parameters, 13B active.
- 43 decoder layers using sliding shared K=V plus CSA/HCA compressed long-range state.
- Verified context: 1,048,576 tokens.
- No exact Artificial Analysis capability mapping is currently used.

### DeepSeek V4 Pro 0813

- 1,650B total parameters, 49B active.
- 61 decoder layers using CSA/HCA compressed attention.
- Verified context: 1,048,576 tokens.
- Full 1,650B parameter residency is preserved; 49B active parameters do not replace resident size.
- No exact Artificial Analysis capability mapping is currently used.

### NVIDIA Nemotron 3 Super 120B-A12B FP8

- 120B total parameters, 12B active.
- 88-layer source pattern: 40 Mamba, 40 MoE, 8 attention.
- 512 routed experts, 1 shared expert, 22 routed experts/token, 23 active experts/token.
- Verified runtime/config sizing context: 262,144 tokens.
- Separately retained advertised extended context: 1,000,000 tokens.
- The 1M figure must not silently replace the verified 262,144-token runtime/config contract in sizing.
- Current sourced Artificial Analysis mapping: 18.6 intelligence, 37.7 coding, 4.2 agentic.

## Capability-evidence policy

Do not fabricate or infer capability scores merely to make every model numerically complete.

Current intentionally scoreless exact variants include:

- Gemma 4 26B-A4B IT
- Qwen3.8 27B
- DeepSeek V4 Flash 0731
- DeepSeek V4 Pro 0813

They remain eligible current models based on their source-qualified product/technical status, but capability fields stay null until an exact, defensible mapping exists.

Model Advisor's accepted current calibration after the 13-model expansion remains:

- Muse Glimmer 30B as Best Performance and Balanced leader across the accepted workload/quality matrix.
- gpt-oss-20b as the economical infrastructure-efficiency choice where the user explicitly selects that tolerance.

Future benchmark evidence may legitimately change these outcomes. Such changes should be intentional, source-backed, and regression-tested rather than forced to preserve historical winners.

## Cross-tool ownership and handoff semantics

The intended technical/economic journey is:

**Model Advisor -> GPU Sizing -> TCO**

### Model Advisor -> GPU Sizing

Model Advisor owns model recommendation/selection context. The handoff carries canonical model identity and applicable model context into GPU Sizing. GPU Sizing should resolve the canonical model rather than use fuzzy or display-label matching.

Deep links and saved session state may still resolve an existing-deployment model even when the full existing-deployment catalog toggle is off. This preserves existing scenarios without exposing all legacy models by default.

### GPU Sizing

GPU Sizing owns the technical infrastructure requirement. It applies model architecture, precision, concurrency, context, workload type, throughput targets, and other sizing assumptions to produce the technical GPU recommendation.

For inference, model identity matters because architecture-aware residency, active-compute, and sequence-state semantics can differ materially among dense, MoE, MLA, DeltaNet, compressed-attention, and Mamba models.

### GPU Sizing -> TCO

TCO receives the technical sizing result rather than independently re-running Model Advisor or silently re-sizing the workload from model parameters.

The handoff preserves the upstream technical GPU class/count and relevant workload context. TCO owns economics and planning assumptions such as cloud provider/rate, financial horizon, on-prem economics, resilience assumptions such as N+1, and explicit cloud-comparison overrides.

A fresh GPU Sizing handoff should start the TCO comparison like-for-like with the incoming technical GPU class unless the user has explicitly overridden the TCO cloud-comparison class.

This ownership model prevents model-selection logic, technical sizing, and economic comparison from competing with one another.

## TCO growth and cloud unit-price assumptions

The post-model-modernization TCO workstream keeps three separate concepts explicit:

1. **Technical production design selection:** GPU Sizing owns the technical class/count. The node-rounded Recommended design remains the default; an existing Higher-growth alternative can be explicitly selected and is passed unchanged to TCO with `sizingBasis` provenance. TCO does not independently choose or re-size the technical design.
2. **Workload/consumption growth:** the existing TCO annual growth input represents increased workload consumption over time. It is not a cloud provider price-escalation assumption.
3. **Cloud GPU unit-price trend:** current production economics use a 0%/year unit-price trend, meaning the current cloud GPU $/GPU-hr rate is held constant across the selected analysis horizon while workload consumption may grow separately.

PR #36 made the constant-unit-price assumption explicit in the calculator, report, and audit trail without changing TCO formulas, rates, defaults, or provider behavior.

PR #37 was a preview-only sensitivity experiment. The subsequent September 8 activation made cloud GPU unit-price trend a persisted production TCO sensitivity, defaulting to 0%/year. It applies to modeled cloud GPU compute rates and appears in report/audit language; workload growth remains a separate consumption assumption and non-compute cloud costs retain their existing escalation treatment. The older preview isolation rule no longer describes current source. Capacity-ramp modeling remains a separate deferred concept.

The later Guided Inference Economics journey consumes a specified deployment and allocated private cost after GPU Sizing/TCO, or takes direct GPU Sizing context with cost entered or confirmed by the user. It evaluates demand-bound inference unit cost and capacity without re-sizing the technical design. See the September 22 addendum in `AiFactoryProjectBrief.md` for its evidence and handoff boundaries.

## Source-of-truth files

Key current source/data files include:

- `data/model_catalog_policy.json`: customer-facing current/existing-deployment policy.
- `data/model_catalog_tranche_1_qualification.json`: source-qualified first modernization tranche.
- `data/model_specs_activation.json`: activation-side model specs.
- `data/canonical_models.json`: canonical model identity and aliases.
- `data/model_capability_db.json`: sourced capability evidence.
- `src/modelRegistry.js`: production technical registry and resolved policy state.
- `src/stagedModelRegistry.js`: retained source-qualified hybrid technical/provenance records used by methodology fixtures and production promotion.
- `src/modelSizingMethodology.js`: architecture-aware sizing primitives.
- `src/modelAdvisorEngine.js`: Advisor catalog join, filtering, and recommendation logic.
- `src/GpuSizingCalculator.jsx`: technical sizing consumer of the shared model methodology.

The filename `stagedModelRegistry.js` is historical terminology from the methodology phase. Product activation status is governed by `data/model_catalog_policy.json`; after PR #32 the four hybrid records are current/recommended in production even though the retained technical-source file keeps its historical name.

## Validation baseline

PR #32 final exact head before merge: `e02c1b703838351a1408aa06b678ff990a188263`.

Quality-gate run #205 (`34170301803`) passed:

- production build;
- shared pricing/model registry checks;
- full ten-model tranche validation;
- architecture-aware sizing methodology;
- exact hybrid sequence-state fixtures;
- GPU sequence-state integration;
- Model Advisor semantic and shadow calibration;
- full tranche activation contract;
- GPU Sizing -> TCO handoff guards;
- TCO Excel-to-JavaScript parity;
- auth-bypassed full browser regression;
- live Vercel browser regression.

The post-merge Vercel deployment for merge commit `4f74f97dd2bb06f762fb09e0b845f772a0435c63` also completed successfully.

## Maintenance rule

For future model additions or material model changes:

1. Discover candidates automatically if useful, but admit them manually.
2. Verify exact upstream identity, license, total parameters, active parameters, context, modality, architecture, and lifecycle using primary sources.
3. Determine whether the architecture is already supported by the sizing methodology.
4. If not, add and validate methodology before customer-facing activation.
5. Preserve full residency separately from active compute.
6. Do not infer throughput uplift without benchmark evidence.
7. Add exact capability mappings only when the exact variant is defensibly matched.
8. Validate Model Advisor ranking behavior across the full current recommended population.
9. Validate model visibility with and without the existing-deployment toggle.
10. Validate Model Advisor -> GPU Sizing -> TCO handoff/ownership behavior.
11. Run the permanent source/parity and browser regression gate on the exact proposed head.
12. Update this document, `ModelCatalogTranche1.md`, `CHANGELOG.md`, `AiFactoryProjectBrief.md`, and `MaintenanceRunbook.md` when the change is durable.

## Next modernization focus

With the first model-catalog modernization tranche complete, the next broad review should inspect the rest of the technical stack with the same discipline:

- current GPU/hardware portfolio and candidate classes;
- benchmark/performance anchors and confidence;
- cloud/on-prem pricing and provenance freshness;
- Model Advisor evidence coverage for currently scoreless exact variants;
- overall cross-tool UX and customer-facing application cohesion.

The appropriate pattern remains: inspect current state, classify current/aging/missing assumptions, write the plan, then change code/data deliberately.

## GPU Sizing production-design selection

GPU Sizing keeps its node-rounded **Recommended** configuration as the default technical design. When the engine produces a qualifying **Higher-growth alternative**, the user may explicitly select that production design for downstream TCO analysis. The choice changes only which already-calculated technical class/count is carried forward; it does not change the sizing formulas.

TCO receives the exact selected class/count and a `sizingBasis` provenance value (`recommended` or `higher-growth`). TCO remains the economic/planning layer and must not independently choose between those technical designs or re-size them from model parameters. Dev/Test/POC workstation alternatives remain separate from this production-design choice.

## Model Advisor benchmark-evidence confidence

The Advisor now keeps technical-spec confidence separate from recommendation-evidence confidence. Technical-spec confidence continues to describe model facts such as parameters, context, architecture, modality, and license. Benchmark-evidence confidence describes how directly the checked-in capability evidence supports cross-model recommendation.

Current evidence labels are:
- **Exact benchmark evidence**: exact model/release with intelligence, coding, and agentic metrics.
- **Exact but limited evidence**: exact model/release mapping exists, but only some recommendation metrics are available.
- **Comparative evidence limited**: technical specifications are qualified, but no approved exact benchmark row is currently available.
- **Benchmark mapping requires verification**: an alias/source record exists but is not safe to treat as approved evidence.

This metadata is disclosure-only. It is not a ranking input and does not alter hard filters, quality margins, tie-breaking, recommendation slots, GPU Sizing ownership, or TCO economics.

## Model Advisor recommendation explanation UX

Recommendation cards now surface a more advisory explanation without changing the ranking engine: **Why it fits**, **Primary tradeoff**, and **Also consider**, alongside the separate benchmark-evidence confidence disclosure. The alternate is chosen only from the recommendation slots already computed by the engine (Best Performance, Most Efficient Qualifying Model, Balanced) or, when those collapse to the same model, from the existing eligible-model list. No second ranking pass or hidden weighted score is introduced.

## GPU Sizing higher-growth capacity semantics

The **Higher-Growth Alternative** now means a valid deployable configuration with materially more production capacity/headroom than the recommendation. It no longer requires a faster GPU class. When the selected class is already at the top of the applicable catalog, GPU Sizing can advance by one additional deployment quantum of the same class (for example, 8x B300 to 16x B300). Future supported classes such as GB300 or Vera Rubin can enter the same candidate framework without changing this semantic contract.
