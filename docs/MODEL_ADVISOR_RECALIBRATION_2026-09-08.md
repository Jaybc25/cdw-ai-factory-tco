# Model Advisor Recalibration — Artificial Analysis v4.3

Date: 2026-09-08

Scope: Issue #39 recalibration after the approved evidence-resolution aliases were applied and the Artificial Analysis capability snapshot was refreshed. This is an analysis artifact only. It does not change ranking margins, filtering rules, recommendation behavior, GPU Sizing, or TCO economics.

## Evidence baseline

Fresh capability snapshot:
- source: Artificial Analysis free API
- synced: 2026-09-08T12:02:59Z
- Intelligence Index version: 4.3
- record count: 19

Newly resolved current-model evidence:
- `qwen3.8-27b`: intelligence 41.4, coding 68.1, agentic 46.8
- `gemma-4-26b-a4b-it`: intelligence 13.9, coding unavailable, agentic unavailable

Still deliberately scoreless:
- `deepseek-v4-flash-0731`
- `deepseek-v4-pro-0813`

Reference incumbent scores relevant to the prior calibration:
- `muse-glimmer-30b`: intelligence 24.4, coding 49.0, agentic 10.5
- `nemotron-3-super-120b-a12b`: intelligence 18.6, coding 37.7, agentic 4.2
- `gpt-oss-20b`: intelligence 10.8, coding 20.7, agentic 1.4
- `gpt-oss-120b`: intelligence 15.6, coding 30.4, agentic 6.3

## Current ranking rules retained for this calibration

No methodology changes were applied.

Quality margins remain:

| Metric | Frontier-like | Strong | Economical |
| --- | ---: | ---: | ---: |
| Intelligence | 1.0 | 10.0 | 16.0 |
| Coding | 2.0 | 18.0 | 30.0 |
| Agentic | 0.5 | 5.0 | 9.5 |

The Best Performance slot uses the top workload-specific score. The Most Efficient Qualifying Model uses the smallest total parameter count within the full quality margin. The balanced slot uses the smallest total parameter count within half the quality margin.

Qwen3.8 27B is 27B parameters. Muse Glimmer 30B is 29.6B. Gemma 4 26B-A4B IT is 26B.

## Unconstrained 13-model recalibration

No restrictive governance, license, context, or modality filter is applied in this view.

### General / intelligence workload

Top score: Qwen3.8 27B = 41.4.

| Quality priority | Best Performance | Most Efficient Qualifying | Balanced |
| --- | --- | --- | --- |
| Frontier-like | Qwen3.8 27B | Qwen3.8 27B | Qwen3.8 27B |
| Strong | Qwen3.8 27B | Qwen3.8 27B | Qwen3.8 27B |
| Economical | Qwen3.8 27B | Qwen3.8 27B | Qwen3.8 27B |

Why: the Economical intelligence cutoff is 25.4. Muse at 24.4 falls just outside it, so no smaller alternative qualifies. Gemma at 13.9 is materially below the cutoff.

### Coding workload

Top score: Qwen3.8 27B = 68.1.

| Quality priority | Best Performance | Most Efficient Qualifying | Balanced |
| --- | --- | --- | --- |
| Frontier-like | Qwen3.8 27B | Qwen3.8 27B | Qwen3.8 27B |
| Strong | Qwen3.8 27B | Qwen3.8 27B | Qwen3.8 27B |
| Economical | Qwen3.8 27B | Qwen3.8 27B | Qwen3.8 27B |

Why: the Economical coding cutoff is 38.1. Muse at 49.0 qualifies, but Qwen is smaller at 27B versus Muse at 29.6B, so Qwen also wins the efficiency slot. Nemotron at 37.7 misses the cutoff by 0.4.

### Agentic workload

Top score: Qwen3.8 27B = 46.8.

| Quality priority | Best Performance | Most Efficient Qualifying | Balanced |
| --- | --- | --- | --- |
| Frontier-like | Qwen3.8 27B | Qwen3.8 27B | Qwen3.8 27B |
| Strong | Qwen3.8 27B | Qwen3.8 27B | Qwen3.8 27B |
| Economical | Qwen3.8 27B | Qwen3.8 27B | Qwen3.8 27B |

Why: the next-highest current agentic score is Muse at 10.5, far outside every existing quality margin from Qwen's 46.8.

## Governance sensitivity

Qwen's developer-organization country is recorded as China. Under the existing `us-only` governance hard filter it is excluded before ranking.

With the current U.S.-only recommended population, the prior pattern largely returns:
- Muse remains Best Performance across intelligence, coding, and agentic workloads.
- Muse remains the balanced choice across the tested quality tiers.
- GPT-OSS 20B reappears as the Most Efficient Qualifying Model at the Economical tier.

This is useful evidence that hard governance filters are functioning as meaningful decision boundaries rather than cosmetic metadata.

## Modality sensitivity

Qwen3.8 27B is multimodal. Therefore:
- multimodal-required scenarios strengthen Qwen's position because it remains eligible and is the current metric leader;
- text-only scenarios exclude Qwen before ranking and should be recalibrated separately if we decide to formalize expected winners for that slice.

No change to modality semantics is recommended from this pass.

## Main finding

The evidence refresh materially changed the Advisor's unconstrained recommendation landscape.

Before the v4.3 refresh, Muse Glimmer 30B dominated all three ranked metrics and GPT-OSS 20B appeared as the Economical efficiency option. After exact Qwen mapping, Qwen3.8 27B now wins all three unconstrained recommendation slots across all three quality tiers because it simultaneously has:
- the highest checked-in intelligence score;
- the highest checked-in coding score;
- the highest checked-in agentic score; and
- a smaller parameter count than Muse.

That behavior is internally consistent with the current engine. It is not, by itself, evidence that the ranking code is broken.

## Methodology concern revealed by recalibration

The new result does expose a calibration question: the current absolute margins were designed around a much tighter score distribution. Qwen's agentic score in particular is separated from the rest of the current open-weight catalog by a very large gap.

Changing margins merely to create more recommendation diversity would be methodologically wrong. The tool should not manufacture alternatives when the source evidence says one model is far ahead.

However, before converting the new Qwen dominance into a permanent regression expectation, we should answer two questions:

1. **Comparability:** confirm that the Qwen default-xhigh Artificial Analysis record is appropriate to compare directly against the existing generic/default records for Muse, GPT-OSS, Nemotron, Mistral, and Llama across all three composite indices.
2. **Product semantics:** decide whether the Advisor's generic model recommendation should compare vendor-default reasoning modes even when those defaults imply materially different inference effort, latency, and cost. Today reasoning intensity is informational and does not participate in ranking.

## Recommendation

Do not change the numerical margins yet.

Recommended next action:
1. update the stale evidence/calibration validators so they reflect the approved Gemma/Qwen mappings and v4.3 snapshot instead of asserting the former v4.2/Muse baseline;
2. keep those validators focused on evidence integrity and deterministic engine behavior rather than hard-coding Qwen as the forever winner where possible;
3. then add an explicit benchmark-evidence confidence/semantics layer before deciding whether reasoning-effort normalization belongs in the Advisor methodology;
4. only after that should we consider changing margins or ranking rules.

## Guardrails

- Do not lower Qwen's sourced scores simply to create a more varied recommendation set.
- Do not widen margins solely to force additional models into recommendation slots.
- Do not give DeepSeek V4 Flash/Pro max-effort scores to generic canonical entries.
- Preserve governance, modality, license, and context hard filters.
- Preserve the Model Advisor -> GPU Sizing -> TCO ownership boundary.
