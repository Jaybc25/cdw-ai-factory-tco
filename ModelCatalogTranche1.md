# Modern Model Catalog - Tranche 1

## Status

This document records the first source-qualified modern-model expansion tranche for the CDW AI Factory Tools.

**Current state: fully activated.** All ten tranche models have cleared the required source, architecture, sizing-methodology, Advisor, policy, and regression gates. They are now current/recommended production models where applicable to the shared catalog.

The final activation was completed by PR #32, merged to `main` as `4f74f97dd2bb06f762fb09e0b845f772a0435c63` on September 7, 2026.

For the complete current modernization baseline, including the full 21-model catalog and Model Advisor -> GPU Sizing -> TCO ownership semantics, see `docs/MODEL_MODERNIZATION_CURRENT_STATE.md`.

## Qualified and activated models

1. Qwen3.8 27B
2. DeepSeek V4 Flash 0731
3. DeepSeek V4 Pro 0813
4. Gemma 4 26B-A4B IT
5. Mistral Small 4
6. Mistral Large 3
7. gpt-oss-20b
8. gpt-oss-120b
9. NVIDIA Nemotron 3 Super 120B-A12B FP8
10. IBM Granite 4.2 30B

The source-qualified identity, technical, license, governance, context, modality, total-parameter, active-parameter, and architecture metadata lives in `data/model_catalog_tranche_1_qualification.json`.

## Activation history

The tranche moved through explicit stages rather than being exposed merely because metadata existed:

- PR #29 staged and source-qualified all ten models.
- PR #30 introduced architecture-aware dense/MoE sizing and activated six models: Granite 4.2 30B, gpt-oss-20b, gpt-oss-120b, Gemma 4 26B-A4B IT, Mistral Small 4, and Mistral Large 3.
- PR #31 added explicit sequence-state methodology for the four remaining hybrid-state models: Qwen3.8, DeepSeek V4 Flash, DeepSeek V4 Pro, and Nemotron 3 Super.
- PR #32 activated those final four models after the methodology, capability, policy, and customer-facing regression contracts passed.

The tranche manifest now records `fully-activated-10-active`.

## Product-policy contract

`data/model_catalog_policy.json` remains the authoritative product-policy layer.

- `models` is the exact active named runtime/catalog-policy set.
- `staged_models` is reserved for source-qualified future candidates that are deliberately excluded from customer-facing recommendation/selection pending an activation dependency.

After PR #32, no Tranche 1 model remains staged in product policy.

The broader production catalog contains:

- 13 current/recommended named models shown by default;
- 8 existing-deployment named models hidden by default behind `Include models for existing deployments`;
- `Custom` as a separate user-defined sizing option.

Existing-deployment support remains intentional for migrations, audits, sizing, and capacity planning of installed environments. It should not clutter the default greenfield experience.

## Architecture-aware sizing contract

The GPU Sizing methodology now preserves distinct concepts:

- **memory residency** is driven by full/total model parameters and other resident state;
- **active compute** is separate and may use source-qualified active parameters for sparse token-level work;
- active-parameter counts do not create an unsupported universal throughput speedup;
- **inference sequence state** is architecture-specific and may include standard KV, MLA, compressed attention, DeltaNet recurrent state, or Mamba recurrent state;
- training retains full-model residency even when sparse active-compute parameters are used for token-level FLOPs;
- unknown or weakly sourced performance assumptions remain explicit rather than fabricated.

Supported sequence-state types now include `standard-kv`, `mla`, `deltanet-attention-hybrid`, `deepseek-v4-compressed-attention`, and `mamba-attention-hybrid`.

## Hybrid-model specifics

### Qwen3.8 27B

The source-qualified architecture contains 64 language layers: 48 Gated DeltaNet layers and 16 full-attention layers. Recurrent DeltaNet state is modeled separately from token-growing full-attention state. Verified sizing context is 262,144 tokens.

### DeepSeek V4 Flash 0731

The source-qualified record uses 304B total parameters and 13B active parameters across 43 decoder layers with sliding shared K=V plus CSA/HCA compressed long-range state. Verified context is 1,048,576 tokens.

### DeepSeek V4 Pro 0813

The source-qualified record uses 1,650B total parameters and 49B active parameters across 61 decoder layers with CSA/HCA compressed attention. The 49B active figure does not replace the full 1,650B residency requirement. Verified context is 1,048,576 tokens.

### NVIDIA Nemotron 3 Super 120B-A12B FP8

The source-qualified 88-layer pattern contains 40 Mamba layers, 40 MoE layers, and 8 attention layers. It records 512 routed experts, 1 shared expert, 22 routed experts/token, and 23 active experts/token. The verified runtime/config sizing context is 262,144 tokens; the separately advertised 1M extended context is retained as disclosure and must not silently replace the verified sizing contract.

## Model Advisor capability policy

The modernization work deliberately does not invent Artificial Analysis scores or inferred quality rankings merely to fill missing values.

Current exact variants that remain intentionally scoreless are:

- Gemma 4 26B-A4B IT
- Qwen3.8 27B
- DeepSeek V4 Flash 0731
- DeepSeek V4 Pro 0813

Nemotron 3 Super retains its exact sourced Artificial Analysis mapping: 18.6 intelligence, 37.7 coding, and 4.2 agentic.

After expanding the current/recommended population to 13 models, the accepted Advisor calibration remains Muse Glimmer 30B as Best Performance and Balanced leader across the tested workload/quality matrix, with gpt-oss-20b as the economical infrastructure-efficiency choice when that tolerance is explicitly selected. Future source evidence may legitimately change these results; such changes must be intentional and regression-tested.

## Cross-tool ownership

The intended technical/economic flow is:

**Model Advisor -> GPU Sizing -> TCO**

- Model Advisor owns model recommendation/selection context and passes canonical model identity into GPU Sizing.
- GPU Sizing owns the technical infrastructure requirement and applies the model's architecture-aware sizing semantics.
- TCO consumes the upstream technical sizing result and owns economic/planning assumptions. It must not independently re-run Model Advisor or silently replace GPU Sizing's technical requirement by re-sizing from model parameters.
- A fresh GPU Sizing handoff starts TCO like-for-like with the incoming technical GPU class unless the user has explicitly overridden the TCO cloud-comparison class.

This separation prevents recommendation logic, technical sizing, and economics from competing with one another.

## Guardrails and validation

The permanent quality gate now validates:

- exact production model-registry and catalog-policy coverage;
- all ten Tranche 1 identities and source-qualified metadata;
- architecture-aware dense/MoE/hybrid parameter semantics;
- exact hybrid sequence-state fixtures;
- GPU Sizing integration and audit-label semantics;
- Model Advisor semantic and shadow calibration across the 13-model current population;
- full tranche activation and visibility behavior;
- existing-deployment toggle behavior;
- GPU Sizing -> TCO handoff ownership;
- TCO Excel-to-JavaScript parity;
- auth-bypassed browser regression and live Vercel regression.

PR #32's final exact head `e02c1b703838351a1408aa06b678ff990a188263` passed quality-gate run #205 (`34170301803`) before merge, and the post-merge Vercel deployment for `4f74f97dd2bb06f762fb09e0b845f772a0435c63` completed successfully.

## Future maintenance rule

A newly discovered model is not production-ready merely because it appears in Hugging Face or Artificial Analysis discovery data.

Before future activation:

1. Verify exact identity, license, parameters, context, modality, architecture, and lifecycle using primary sources.
2. Determine whether the architecture is already supported by the sizing methodology.
3. Add methodology first when the architecture introduces new residency, compute, or sequence-state semantics.
4. Preserve full residency separately from active compute.
5. Do not infer throughput uplift without benchmark evidence.
6. Add exact capability mappings only when the exact variant is defensibly matched.
7. Re-run Advisor calibration across the full current population.
8. Validate current-vs-existing-deployment visibility and deep-link/session compatibility.
9. Validate Model Advisor -> GPU Sizing -> TCO ownership and handoff behavior.
10. Update `docs/MODEL_MODERNIZATION_CURRENT_STATE.md`, this document, `CHANGELOG.md`, `AiFactoryProjectBrief.md`, and `MaintenanceRunbook.md` for durable changes.