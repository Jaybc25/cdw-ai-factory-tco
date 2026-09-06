# Modern Model Catalog — Tranche 1

## Status

This document records the first source-qualified modern-model expansion tranche for the CDW AI Factory Tools. The tranche is **staged, not customer-facing**.

The ten models below are known to CDW governance/product policy and have a source-qualified staging manifest, but they are deliberately excluded from Model Advisor recommendations and GPU Sizing/TCO model selectors until the PR4 methodology and Advisor-recalibration dependency is cleared.

## Qualified models

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

The source-qualified technical, license, governance, context, modality, total-parameter, active-parameter, and architecture metadata lives in `data/model_catalog_tranche_1_qualification.json`.

## Product-policy contract

`data/model_catalog_policy.json` deliberately separates two collections:

- `models` — the exact active runtime/catalog-policy set. It must remain aligned with the active model registry.
- `staged_models` — source-qualified future candidates that remain unavailable to customer-facing recommendation and model-selection surfaces.

Every Tranche 1 staged entry declares:

`activation_dependency: pr4-methodology-and-advisor-recalibration`

Moving an entry from `staged_models` into the active catalog is therefore an explicit activation event, not a side effect of data ingestion.

## Why activation is deferred

The current GPU Sizing engine predates this broader architecture mix. It uses total/resident model parameters for current sizing formulas and does not yet model modern sparse-compute behavior, hybrid attention, Mamba/Transformer hybrids, or similar model-specific execution characteristics with enough fidelity to promote all ten models safely.

PR4 must preserve the distinction established by Model Architecture Schema v2:

- **memory residency** is driven by full/total model parameters and other resident state;
- **active compute** is a distinct concept and must not silently replace resident size;
- active-parameter counts alone are not a valid universal throughput multiplier;
- sparse training semantics are distinct from sparse inference semantics;
- unknown or weakly sourced architecture/performance assumptions must remain explicit rather than fabricated.

## Model Advisor activation dependency

PR3 intentionally does not invent Artificial Analysis scores or inferred quality rankings for the staged models. If a current capability source does not provide a defensible canonical match, capability fields remain unavailable until verified.

Before staged models can become greenfield Advisor choices, PR4 must review/recalibrate the current ranking margins against the expanded candidate set and add semantic regression coverage across quality priorities and workload types.

## Guardrails and validation

`scripts/validate_model_tranche_1.mjs` enforces the staging contract. It verifies:

- exact membership of the ten-model tranche;
- required identity, source, license, governance, context, modality, and architecture metadata;
- dense-vs-sparse total/active parameter semantics;
- matching governance records;
- matching `staged_models` policy entries and the PR4 activation dependency;
- absence of every staged ID from the active policy list and `MODEL_REGISTRY`;
- absence of every staged ID from the current Model Advisor catalog and recommendation surfaces;
- absence of every staged ID from GPU Sizing/TCO visible model options.

Playwright coverage in `tests/e2e/model-catalog-visibility.spec.js` independently checks the customer-facing side of the barrier.

## CI maintenance improvement

PR3 also closes a prior quality-gate blind spot: changes under `data/model_*.json` now trigger the permanent AI Factory quality gate, and the staged-tranche validator runs as part of the source/workbook job.

## Non-goals of PR3

PR3 does **not** change:

- GPU Sizing formulas or GPU-class recommendations;
- TCO pricing/economics or provider eligibility;
- Model Advisor ranking margins or scoring methodology;
- current customer-facing default model selection;
- existing-deployment compatibility behavior.

Those changes, where warranted, belong to PR4 and must pass the permanent regression suite before staged models are activated.
