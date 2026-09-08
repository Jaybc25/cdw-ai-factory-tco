# Model Advisor Evidence and Calibration Audit

Date: 2026-09-08

Scope: Issue #39, PR A inspection artifact only. This document does not change Model Advisor ranking behavior, capability data, catalog policy, GPU Sizing, or TCO economics.

## Executive findings

1. The current Model Advisor engine is structurally explainable and should remain rule-based. It uses hard filters, workload-specific metric selection, explicit quality margins, named recommendation slots, and deterministic tie-breaking. There is no hidden weighted score.
2. The current 13-model recommended catalog has uneven capability evidence. Nine current models have at least an Artificial Analysis Intelligence Index value in the checked-in capability database; four current exact variants have no checked-in capability row: Gemma 4 26B A4B IT, Qwen3.8 27B, DeepSeek V4 Flash 0731, and DeepSeek V4 Pro 0813.
3. Fresh Artificial Analysis public pages now exist for all four of those previously scoreless model families/variants. This is new evidence worth qualifying, but it should not be copied into production blindly because the public pages expose reasoning-effort variants and dynamically updated index versions. Exact canonical-to-AA variant mapping must be decided first.
4. The checked-in capability database is still an Artificial Analysis free-API snapshot from 2026-09-06 using Intelligence Index v4.2. Current public Artificial Analysis pages show v4.3. The production engine therefore remains internally consistent with its checked-in snapshot, but the evidence layer is already behind the newest public benchmark surface.
5. The present margin calibration strongly favors Muse Glimmer 30B. Under an unconstrained current-catalog audit, Muse remains Best Performance and Best Overall Fit across general, coding, and agentic workloads at all three quality priorities. GPT-OSS 20B becomes the Most Efficient Qualifying Model only at the Economical quality tier. This is explainable under the current rules, but it means the expanded catalog does not yet produce much recommendation diversity.
6. Recommendation evidence confidence must be modeled separately from technical-spec confidence. The existing `confidence` field describes model-spec confidence and is surfaced as `Verified spec` or `Size-class estimate`; it is not a benchmark-evidence confidence field.
7. Reasoning intensity and fine-tuning preference remain intentionally informational inputs. They should not begin affecting ranking until there is a named, source-supported rule for doing so.

## Current recommended catalog evidence matrix

The table below reflects the checked-in `data/model_capability_db.json` snapshot, not fresh public-page values.

| Canonical model | Params used by Advisor | Intelligence | Coding | Agentic | Checked-in capability status |
| --- | ---: | ---: | ---: | ---: | --- |
| muse-glimmer-30b | 29.6B | 24.4 | 49.0 | 10.5 | Exact checked-in AA mapping |
| llama-4-scout | 109B | 4.6 | 8.2 | - | Exact checked-in AA mapping, agentic missing |
| llama-4-maverick | 402B | 8.5 | 16.3 | 0.6 | Exact checked-in AA mapping |
| granite-4.2-30b | 30B | 16.5 | 29.9 | - | Exact checked-in AA mapping, agentic missing |
| gpt-oss-20b | 21B | 9.1 | 20.7 | 1.4 | Exact checked-in AA mapping |
| gpt-oss-120b | 117B | 15.6 | 30.4 | 6.3 | Exact checked-in AA mapping |
| gemma-4-26b-a4b-it | 26B | - | - | - | No checked-in capability row |
| mistral-small-4 | 119B | 12.8 | 26.6 | - | Exact checked-in AA mapping, agentic missing |
| mistral-large-3 | 675B | 11.1 | 20.1 | 2.5 | Exact checked-in AA mapping |
| qwen3.8-27b | 27B | - | - | - | No checked-in capability row |
| deepseek-v4-flash-0731 | 304B | - | - | - | No checked-in capability row |
| deepseek-v4-pro-0813 | 1650B | - | - | - | No checked-in capability row |
| nemotron-3-super-120b-a12b | 120B | 18.6 | 37.7 | 4.2 | Exact checked-in AA mapping |

Notes:
- Blank capability cells are deliberate. They are not zeros.
- The Advisor ranks only models with the selected workload metric in Tier 1, with documented fallback behavior when no model has the selected metric.
- Parameter count is currently the size/efficiency proxy used by the Advisor. Active-parameter and infrastructure-footprint semantics remain downstream concerns unless a separate methodology decision changes that boundary.

## Fresh public evidence discovered on 2026-09-08

Artificial Analysis public model pages now expose current pages for the four exact model families that have no row in the checked-in capability database:

### Gemma 4 26B A4B

Public source:
- https://artificialanalysis.ai/models/releases/gemma-4-26b-a4b
- https://artificialanalysis.ai/models/gemma-4-26b-a4b

Observed state:
- Exact Gemma 4 26B A4B release/model pages now exist.
- Artificial Analysis distinguishes reasoning and non-reasoning variants.
- Public pages currently show Intelligence Index v4.3 and mark at least some Gemma values as estimates pending independent evaluation.
- Public-page values were not fully stable across the retrieved Artificial Analysis surfaces during this audit, so no score should be manually copied into the canonical production row from this inspection alone.

Decision needed before ingestion:
- Decide whether the canonical `gemma-4-26b-a4b-it` Advisor record represents reasoning, non-reasoning, a default runtime mode, or must remain capability-scoreless until the automated API exposes an unambiguous exact mapping.

### Qwen3.8 27B

Public source:
- https://artificialanalysis.ai/models/releases/qwen3-8-27b
- https://artificialanalysis.ai/models/qwen3-8-27b

Observed state:
- Exact Qwen3.8 27B pages now exist.
- Artificial Analysis exposes multiple effort variants, including xhigh, medium, low, and non-reasoning/default variants.
- The public release page showed materially different Intelligence Index results by effort mode, including a higher xhigh result than the non-reasoning/default variant.

Decision needed before ingestion:
- Do not choose the highest effort score merely because it is available. Define which effort/runtime semantics the Advisor canonical model represents, or keep the capability row empty until the source API provides the exact intended mapping.

### DeepSeek V4 Flash 0731

Public source:
- https://artificialanalysis.ai/models/releases/deepseek-v4-flash
- https://artificialanalysis.ai/models/deepseek-v4-flash

Observed state:
- Exact DeepSeek V4 Flash 0731 reasoning/max-effort pages now exist.
- The public page currently reports an Intelligence Index in the mid-30s and identifies the model as open weights with a 1M context window.
- Artificial Analysis also retains older DeepSeek V4 Flash 0420 pages, including non-reasoning variants, so canonical aliasing must distinguish 0731 from the older 0420 release.

Decision needed before ingestion:
- Require exact 0731 identity plus an explicit reasoning-mode mapping. Do not map the older 0420 score into the 0731 canonical row.

### DeepSeek V4 Pro 0813

Public source:
- https://artificialanalysis.ai/models/deepseek-v4-pro

Observed state:
- Exact DeepSeek V4 Pro 0813 public pages now exist.
- The retrieved page identifies a reasoning, max-effort variant and currently reports an Intelligence Index in the mid-30s.
- The current production canonical model is the exact 0813 release, but the Advisor has not yet defined whether its capability row should represent max-effort reasoning behavior.

Decision needed before ingestion:
- Establish exact effort-mode semantics first. Do not silently equate a max-effort benchmark result with every deployment of the canonical model.

## Evidence-version finding

Checked-in capability snapshot:
- source: Artificial Analysis free API
- synced: 2026-09-06
- Intelligence Index version: 4.2
- record count: 17

Fresh public pages reviewed on 2026-09-08:
- Intelligence Index version displayed: 4.3
- additional exact model pages now available for all four previously scoreless current variants

Implication:
The weekly sync architecture remains the right source-of-truth path, but the next sync should be inspected carefully for new records and metric-version changes. A capability refresh can change customer-facing recommendation order even without engine-code changes, so exact model/variant mapping and regression expectations are required before activation of newly surfaced rows.

## Current methodology audit

### Hard filters

Current hard filters are explicit and auditable:
- license requirement;
- governance/developer-country requirement;
- context-window requirement;
- modality requirement.

Unknown values become `REQUIRES_VERIFICATION` instead of being guessed. This behavior should remain.

### Workload metric mapping

Current mapping:
- coding -> `coding_index`
- agentic -> `agentic_index`
- all other current primary workload values -> `intelligence_index`

This means chat, RAG, summarization/content generation, reasoning, and classification/extraction currently share the overall Intelligence Index. That is transparent, but it is a major simplification worth revisiting only if a defensible dedicated metric exists.

### Quality margins

Current qualification margins from the top eligible score:

| Metric | Frontier-like | Strong | Economical |
| --- | ---: | ---: | ---: |
| Intelligence | 1.0 | 10.0 | 16.0 |
| Coding | 2.0 | 18.0 | 30.0 |
| Agentic | 0.5 | 5.0 | 9.5 |

The Balanced slot uses half of the selected full margin. The Most Efficient slot uses the full margin and then chooses the smallest parameter count among qualifying models.

### Tie-breaking

Current deterministic tie-breaking favors:
1. HIGH technical-spec confidence;
2. active lifecycle status;
3. canonical model ID alphabetically.

This is appropriate for deterministic behavior, but technical-spec confidence should not be mistaken for benchmark-evidence confidence.

## Unconstrained calibration snapshot

Calibration basis:
- current 13 recommended models only;
- no restrictive license/governance/context/modality filter;
- current checked-in capability database only;
- current engine margins and parameter-count efficiency rule;
- no production behavior changed.

### General / intelligence workload

| Quality priority | Best Performance | Most Efficient Qualifying | Best Overall Fit when Balanced |
| --- | --- | --- | --- |
| Frontier-like | Muse Glimmer 30B | Muse Glimmer 30B | Muse Glimmer 30B |
| Strong | Muse Glimmer 30B | Muse Glimmer 30B | Muse Glimmer 30B |
| Economical | Muse Glimmer 30B | GPT-OSS 20B | Muse Glimmer 30B |

### Coding workload

| Quality priority | Best Performance | Most Efficient Qualifying | Best Overall Fit when Balanced |
| --- | --- | --- | --- |
| Frontier-like | Muse Glimmer 30B | Muse Glimmer 30B | Muse Glimmer 30B |
| Strong | Muse Glimmer 30B | Muse Glimmer 30B | Muse Glimmer 30B |
| Economical | Muse Glimmer 30B | GPT-OSS 20B | Muse Glimmer 30B |

### Agentic workload

| Quality priority | Best Performance | Most Efficient Qualifying | Best Overall Fit when Balanced |
| --- | --- | --- | --- |
| Frontier-like | Muse Glimmer 30B | Muse Glimmer 30B | Muse Glimmer 30B |
| Strong | Muse Glimmer 30B | Muse Glimmer 30B | Muse Glimmer 30B |
| Economical | Muse Glimmer 30B | GPT-OSS 20B | Muse Glimmer 30B |

### Interpretation

This result is not automatically a defect. Muse currently combines the highest checked-in intelligence, coding, and agentic scores with a relatively small 29.6B parameter count, so the engine is following its documented rules.

However, the calibration reveals three modernization questions:

1. **Catalog diversity:** adding ten modern models did not materially diversify the unconstrained recommendation surface because four exact modern variants are scoreless and Muse dominates all three currently ranked metrics.
2. **Margin sensitivity:** Strong-tier margins remain wide enough to admit several alternatives, but Muse is still the smallest or nearly smallest qualifying high-performance model, so it wins the efficiency slot too.
3. **Evidence incompleteness:** newly available exact public evidence for Qwen, Gemma, and DeepSeek may materially change this calibration once exact variant mapping is approved. Threshold changes should therefore wait until the evidence refresh is resolved, or we risk tuning margins around incomplete data.

## Recommendation from this audit

Do not change ranking margins yet.

Recommended next sequence:

1. **Evidence mapping PR:** qualify the new Artificial Analysis v4.3 exact-model surfaces and define canonical reasoning/effort semantics for Gemma 4, Qwen3.8, DeepSeek V4 Flash 0731, and DeepSeek V4 Pro 0813. Prefer the automated API as the committed source when it exposes an exact record.
2. **Evidence-confidence schema PR:** add a benchmark-evidence concept separate from technical-spec confidence. This can be UI-visible without changing rank order.
3. **Re-run calibration after evidence activation:** only then decide whether the current quality margins or fallback rules need adjustment.
4. **Recommendation-explanation UX:** add clearer `why`, `tradeoff`, `also consider`, and evidence-quality language while keeping GPU sizing downstream.

## Guardrails reaffirmed

- Never fabricate missing benchmark scores.
- Never map a family or older release score into an exact canonical variant without explicit provenance.
- Never select the highest reasoning-effort benchmark merely because it makes the model look better.
- Keep benchmark-evidence confidence separate from technical-spec confidence.
- Keep GPU count, hardware recommendation, and infrastructure economics out of Model Advisor.
- Keep the engine explainable through named rules rather than a hidden weighted score.
- Do not change ranking behavior in this audit PR.
