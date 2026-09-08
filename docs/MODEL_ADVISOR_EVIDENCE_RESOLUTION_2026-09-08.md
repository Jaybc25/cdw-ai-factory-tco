# Model Advisor Evidence Resolution

Date: 2026-09-08

Scope: Issue #39 evidence-resolution step following the initial audit. This file defines which Artificial Analysis variant semantics are defensible for the four current recommended models that are still scoreless in the checked-in capability database. It does not change production capability scores or recommendation behavior.

## Governing rule

A canonical Model Advisor entry should map to the benchmark variant that best represents the vendor-defined default deployment behavior for that exact model release. Do not select a higher reasoning-effort score merely because it is available.

Where vendor defaults and Artificial Analysis variants cannot be matched cleanly, keep the production capability mapping empty rather than guessing.

## Resolution decisions

### Gemma 4 26B-A4B IT

Canonical ID: `gemma-4-26b-a4b-it`

Primary-source behavior:
- Google documents configurable thinking for Gemma 4.
- The official Hugging Face chat template treats `enable_thinking=false` as the default path; Google documentation says reasoning is enabled by explicitly setting `enable_thinking=True`.

Artificial Analysis variants:
- `gemma-4-26b-a4b` = reasoning variant.
- `gemma-4-26b-a4b-non-reasoning` = non-reasoning variant.

Resolution:
- **Preferred canonical AA mapping: `gemma-4-26b-a4b-non-reasoning`.**
- Rationale: non-reasoning best matches the documented default inference path for the exact instruction-tuned model; the reasoning result is an optional runtime mode, not the default canonical behavior.
- Production score should still be populated only through the authenticated AA API sync after that slug is confirmed in the API response.

### Qwen3.8 27B

Canonical ID: `qwen3.8-27b`

Primary-source behavior:
- Qwen documents `reasoning_effort` values `xhigh`, `medium`, and `low`.
- `xhigh` is documented as the default.
- Preserved thinking is enabled by default for best out-of-box behavior.

Artificial Analysis variants:
- `qwen3-8-27b` = xhigh/default reasoning variant.
- separate medium, low, and non-reasoning variants also exist.

Resolution:
- **Preferred canonical AA mapping: `qwen3-8-27b`.**
- Rationale: this matches Qwen's vendor-defined default reasoning effort rather than choosing an arbitrary effort mode.
- Do not map the non-reasoning or lower-effort variants to the generic canonical ID unless the product later adds an explicit runtime-mode selector.
- Production score should still enter through the AA API sync after the slug is confirmed in the authenticated response.

### DeepSeek V4 Flash 0731

Canonical ID: `deepseek-v4-flash-0731`

Primary-source behavior:
- The exact 0731 model supports both chat mode and thinking mode.
- Thinking mode supports `low`, `high`, and `max` reasoning effort; `low` is the default reasoning effort within thinking mode.
- Chat mode is explicitly non-reasoning.

Artificial Analysis public evidence:
- the exact 0731 public page currently represents **Reasoning, Max Effort**.
- no exact 0731 chat/non-reasoning or default-low reasoning page was verified during this resolution pass.

Resolution:
- **Keep the canonical Artificial Analysis mapping empty for now.**
- Do not map `deepseek-v4-flash` to the generic canonical model because the public score represents max-effort reasoning, not the vendor's generic/default deployment behavior.
- Do not map older V4 Flash releases into 0731.
- Revisit if the AA API exposes an exact 0731 default/low or chat-mode record, or if the Model Advisor later explicitly models reasoning mode.

### DeepSeek V4 Pro 0813

Canonical ID: `deepseek-v4-pro-0813`

Primary-source behavior:
- The exact 0813 release supports chat and thinking modes.
- Reasoning effort in thinking mode supports `low`, `high`, and `max`; `low` is the documented default reasoning effort.
- Reasoning effort has no effect in chat mode.

Artificial Analysis public evidence:
- the exact 0813 page currently represents **Reasoning, Max Effort**.

Resolution:
- **Keep the canonical Artificial Analysis mapping empty for now.**
- Do not map `deepseek-v4-pro` to the generic canonical model because the available AA score is max-effort reasoning and therefore overstates generic/default behavior.
- Revisit when an exact default/low or chat-mode AA record is available, or when Advisor runtime-mode semantics are explicitly expanded.

## Resulting evidence policy

| Canonical model | Resolution | Production action |
| --- | --- | --- |
| Gemma 4 26B-A4B IT | map to non-reasoning default | add exact AA alias after API confirmation; then sync |
| Qwen3.8 27B | map to vendor-default xhigh | add exact AA alias after API confirmation; then sync |
| DeepSeek V4 Flash 0731 | unresolved for generic/default semantics | remain scoreless |
| DeepSeek V4 Pro 0813 | unresolved for generic/default semantics | remain scoreless |

## Recalibration gate

Do not tune Model Advisor margins yet.

The next calibration should occur only after:
1. Gemma and Qwen aliases are added and confirmed against the authenticated Artificial Analysis API;
2. the capability snapshot is refreshed through `sync_capability_scores.py`;
3. the snapshot's Intelligence Index version is recorded;
4. recommendation scenarios are rerun against the refreshed 13-model current catalog.

DeepSeek Flash/Pro may remain scoreless during that recalibration. Missing evidence is preferable to a misleading max-effort proxy.

## Future architecture implication

If the Advisor later makes `reasoningIntensity` a functional input, a better long-term model may be to support capability records by `(canonical_model_id, runtime_mode/reasoning_effort)` rather than forcing every model into a single benchmark row. That is a separate methodology change and should not be introduced in this evidence-resolution tranche.
