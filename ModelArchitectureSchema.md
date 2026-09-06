# Model Architecture Schema

This document defines the shared technical model metadata contract used by the CDW AI Factory model registry. It exists so Model Advisor, GPU Sizing, TCO, future ingestion jobs, and regression tests all interpret modern dense, MoE, and hybrid architectures consistently.

## Purpose

Modern open-weight models cannot be represented safely by a single parameter-count field. Sparse models may need the full model resident in memory while executing only a subset of parameters for each token. The registry therefore separates memory-residency concepts from active-compute concepts and records routing metadata explicitly.

This schema is descriptive only in PR2. GPU Sizing continues to use the current formulas and `totalParamsB` until a later methodology PR deliberately introduces architecture-aware inference/training math.

## Schema version

Current version: `2`

The canonical implementation is `src/modelRegistry.js` and the permanent contract validator is `scripts/validate_model_registry.mjs`.

## Architecture types

- `dense`: the language backbone uses dense feed-forward layers. For these models, `activeParamsB` must equal `totalParamsB`.
- `moe`: the language backbone uses mixture-of-experts routing throughout the relevant feed-forward stack.
- `hybrid`: the language backbone mixes dense and MoE layers. This classification is about the language backbone, not the presence of a separate vision/perception encoder.

Multimodality is represented separately through `modalities`.

## Parameter semantics

### `totalParamsB`

Full model parameter count in billions. This is the residency/full-model concept and remains the backward-compatible value returned by `getModelParamsB()`.

Current GPU Sizing weight-memory and training formulas still consume this value. TCO handoffs also continue to preserve this value.

### `activeParamsB`

Approximate parameters active for one token, in billions, when that concept is published for a sparse architecture. For dense models this equals `totalParamsB`.

`activeParamsB` must never silently substitute for `totalParamsB`. The helper `getModelActiveParamsB()` exists so later methodology code must opt into active-compute semantics explicitly.

## Expert-routing semantics

For sparse architectures:

- `numExperts`: routed experts available per MoE layer.
- `numSharedExperts`: always-on shared experts per MoE layer.
- `routedExpertsPerToken`: routed top-k selected for one token.
- `activeExpertsPerToken`: total experts executing for one token in an MoE layer, including routed and shared experts.

When all component fields are known, the invariant is:

`activeExpertsPerToken = routedExpertsPerToken + numSharedExperts`

The registry validator enforces this relationship and also ensures routed top-k cannot exceed available routed experts.

## Attention semantics

- `attentionType: "standard"`: KV-cache sizing uses `kvHeads` and `headDim`.
- `attentionType: "MLA"`: Multi-head Latent Attention; KV-cache sizing uses `kvLoraRank` and `qkRopeHeadDim` in the current engine.

The validator requires the appropriate attention fields for each type.

## Context and modalities

- `contextLength`: maximum supported context length in tokens when a defensible value is known.
- `modalities`: accepted model input modalities such as `text` and `image`.

A vision tower or multimodal encoder does not by itself change `architectureType` to `hybrid`; architecture type is reserved for the language backbone's dense/MoE topology.

## Provenance

Each registered named model carries `architectureSource`, pointing to the strongest practical source used for the architecture record. Preferred source order is:

1. model developer documentation/model card
2. developer technical report or paper
3. official deployment documentation
4. reputable secondary source only when primary metadata is unavailable

The validator requires a source URL for each named model.

Current source families include Meta model documentation, Mistral model documentation, Google Gemma documentation, NVIDIA NIM documentation for Muse Glimmer, and DeepSeek's technical paper/repository.

## Current catalog interpretation

| Model | Architecture | Total params | Active params | Notes |
| --- | --- | ---: | ---: | --- |
| Llama 3.1 8B | dense | 8.03B | 8.03B | text |
| Llama 3.1 70B | dense | 70.6B | 70.6B | text |
| Llama 3.1 405B | dense | 405B | 405B | text |
| Llama 3.3 70B | dense | 70.6B | 70.6B | text |
| Mixtral 8x7B | moe | 46.7B | 12.9B | 8 routed experts, top-2 |
| Meta Muse Glimmer 30B | dense | 29.6B | 29.6B | text + image |
| Llama 4 Scout | moe | 109B | 17B | 16 routed experts plus shared expert; text + image |
| Llama 4 Maverick | hybrid | 400B | 17B | dense/MoE language backbone; text + image |
| Gemma 3 27B | dense | 27B | 27B | text + image |
| DeepSeek V3 | hybrid | 671B | 37B | dense + MoE layers, MLA |
| DeepSeek R1 | hybrid | 671B | 37B | V3-derived dense + MoE architecture, MLA |

## Non-goals of schema v2

Schema v2 does not define:

- model-adjusted inference throughput
- an inverse active-parameter performance shortcut
- sparse-training memory semantics
- expert-parallel communication overhead
- tensor/pipeline/expert parallel placement
- quantization-specific routing effects
- Advisor benchmark weighting or margin recalibration

Those belong to the later sizing-methodology/recalibration PR. The key guardrail is that adding the fields now must not imply they are already used in sizing math.

## Extension rules for new models

Before a new named model enters the Verified Model Catalog:

1. Assign a canonical ID and CDW catalog status.
2. Classify the language backbone as `dense`, `moe`, or `hybrid`.
3. Record `totalParamsB` and `activeParamsB` from defensible source metadata.
4. For sparse models, populate routed/shared expert metadata when published.
5. Populate the appropriate attention metadata.
6. Record context length and modalities where known.
7. Add an `architectureSource`.
8. Run `npm run validate:models` / `scripts/validate_model_registry.mjs` and the full quality gate.
9. Do not change GPU Sizing formulas merely because a new field exists; methodology changes require their own explicit validation tranche.
