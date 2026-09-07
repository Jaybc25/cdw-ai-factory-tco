# PR30 Model Modernization Baseline

Status: merged to `main` on September 7, 2026.

Merge commit: `46ee9b21842bf3b2db48040edd109f4c9e9f2a72`

This record captures the production model-catalog state established by PR #30, "PR4: architecture-aware sizing and modern model activation." It is a durable handoff point for the follow-on methodology work supporting the four remaining blocked architectures.

## Production catalog after PR #30

The shared model policy now separates three product states:

- `recommended`: current greenfield choices shown by default.
- `existing-deployment`: supported for users sizing or evaluating an environment they already run, hidden behind the existing-deployment toggle by default.
- `staged`: source-qualified candidates intentionally withheld from customer-facing selection until methodology and activation gates are satisfied.

PR #30 activated six PR3-qualified modern models as `recommended`:

1. IBM Granite 4.2 30B
2. gpt-oss-20b
3. gpt-oss-120b
4. Gemma 4 26B-A4B IT
5. Mistral Small 4
6. Mistral Large 3

These six are production runtime entries and current GPU Sizing / TCO choices. Model Advisor joins the same activated set to its source-qualified metadata. Gemma 4 remains deliberately benchmark-scoreless because an exact Artificial Analysis variant mapping has not been verified; no capability score is fabricated.

## Architecture-aware sizing semantics

PR #30 made model sizing architecture-aware rather than treating parameter count as one undifferentiated quantity.

- Full / resident parameters determine model-state residency and memory requirements.
- Active parameters represent per-token compute for sparse models where a verified active count exists.
- Training keeps full sparse-model state resident while using active parameters for token FLOPs.
- Inference throughput applies only a conservative penalty when verified active parameters exceed the 70B reference anchor. Smaller active counts do not receive an inferred speedup without model-specific evidence.
- Current cache/state support is limited to source-qualified standard KV and MLA contracts.
- Sliding-attention models are conservatively treated with full-context cache accounting where the engine cannot exploit local windows, preferring over-sizing to under-sizing.

## Four methodology-blocked models

The following source-qualified models remain staged and absent from production runtime, GPU/TCO current choices, and Model Advisor recommendations:

1. Qwen3.8 27B
   - Sequence architecture: hybrid DeltaNet / attention.
   - Block: recurrent / linear-attention state is not represented by the current standard-KV or MLA cache formulas.

2. DeepSeek V4 Flash 0731
   - Sequence architecture: hybrid compressed / sparse attention.
   - Block: compressed-attention state is not faithfully represented by the current cache methodology.

3. DeepSeek V4 Pro 0813
   - Sequence architecture: hybrid compressed / sparse attention.
   - Block: same methodology class as Flash, with a materially larger resident model state.

4. NVIDIA Nemotron 3 Super 120B-A12B FP8
   - Sequence architecture: hybrid Mamba / Transformer.
   - Block: Mamba recurrent state is not represented by the current KV-cache formulas.

The durable tranche state is therefore `partially-activated-6-active-4-blocked`.

## Model Advisor calibration after activation

Artificial Analysis Intelligence Index v4.2 live margins are:

- Intelligence: frontier-like `1.0`, strong `10.0`, economical `16.0`
- Coding: frontier-like `2.0`, strong `18.0`, economical `30.0`
- Agentic: frontier-like `0.5`, strong `5.0`, economical `9.5`

Validated post-activation behavior:

- Muse Glimmer remains Best Performance across general/chat, coding, and agentic workloads.
- Muse remains the Balanced choice under the accepted calibration.
- gpt-oss-20b becomes the infrastructure-efficiency choice only under the broader `economical` tolerance.
- Missing benchmark data is treated as missing evidence, not as an inferred or fabricated score.

## Validation evidence

The activation was gated in stages:

- Run #147: pre-activation baseline passed all three quality-gate jobs.
- Run #148: initial six-model activated head passed all three jobs.
- Run #149: final governance-cleanup head passed all three jobs.
- A concurrent automated Artificial Analysis refresh on `main` created a narrow merge conflict after approval. The conflict was reviewed and resolved by preserving the validated 17-record activated capability set while incorporating `main` history.
- Run #150: conflict-resolved head `7dcfcfc5282e2d622718271a94ecb1316e9aa4af` passed all three jobs before merge.

The final merge commit is `46ee9b21842bf3b2db48040edd109f4c9e9f2a72`.

The permanent gate now checks the 6-active / 4-blocked contract, model policy/runtime joins, canonical identity and governance, architecture-aware residency/active-compute semantics, Advisor calibration, GPU Sizing/TCO visibility, legacy-toggle behavior, TCO Excel parity, auth-bypassed browser regression, and live Vercel browser regression.

## Scope guardrails preserved

PR #30 did not intentionally change:

- pricing values,
- provider commercial eligibility,
- TCO cloud/on-prem economics,
- authentication behavior,
- GPUaaS ranking semantics,
- external publication/branding approval.

## Follow-on workstream

The next model-methodology tranche should focus only on the four blocked sequence architectures. It should not activate any of them merely because metadata is available.

Recommended order:

1. Define explicit sequence-state schema and memory helpers independent from classic KV cache.
2. Implement DeltaNet / linear-attention state modeling for Qwen3.8.
3. Implement compressed-attention state modeling shared by DeepSeek V4 Flash and Pro.
4. Implement Mamba recurrent-state modeling for Nemotron 3 Super.
5. Add source validators and architecture-specific browser regressions.
6. Re-run activation-readiness gates for each model.
7. Activate only models whose full source, methodology, runtime, Advisor, and browser contracts pass.

Correctness remains the activation criterion. Unsupported architectures should stay staged rather than being forced through formulas designed for standard attention or MLA.
