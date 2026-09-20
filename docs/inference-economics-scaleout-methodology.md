# Inference Economics Scale-Out Methodology — Evidence Review

_Status: research / design only. No calculation-engine changes in this branch._

## Objective

Inference Economics should evaluate the same model, hardware class, and deployed GPU count that GPU Sizing recommends and TCO prices. Exact benchmark configurations remain the highest-confidence case, but they should not be the only case that can produce a presales-grade directional estimate.

The goal is defensible, directionally accurate economics rather than false precision.

## Current inconsistency

GPU Sizing already converts qualified inference anchors to an effective per-GPU throughput and sizes the full deployment from required throughput. Inference Economics currently blocks any deployment count that differs from the exact source benchmark count.

Example:

- GPU Sizing recommends 16 x B200.
- TCO prices 16 x B200.
- IE currently prices the full fleet but credits only the 8-GPU B200 benchmark configuration.

That is conservative, but it is not apples-to-apples.

## Current benchmark anchors in the suite

| Hardware | Current IE anchor | GPU count | Scenario |
|---|---:|---:|---|
| H200 | 34,984 tok/s | 8 | MLPerf Offline |
| B200 | 104,572 tok/s | 8 | NVIDIA MLPerf Inference v6.0 Offline |
| B300 | 112,954 tok/s | 8 | NVIDIA MLPerf Inference v6.0 Offline |
| GB200 NVL72 | 888,054 tok/s | 72 | NVIDIA MLPerf Inference v6.0 Offline |
| GB300 NVL72 | 1,126,850 tok/s | 72 | NVIDIA MLPerf Inference v6.0 Offline |

Primary NVIDIA source:
https://developer.nvidia.com/deep-learning-performance-training-inference/ai-inference

## Evidence from NVIDIA's current published results

NVIDIA's current MLPerf inference page provides later-round Llama 2 70B results that can be used as holdout sanity checks for the suite's existing anchors and scaling assumptions. These comparisons are not treated as formal scaling coefficients because software versions, benchmark rounds, and system details differ.

Observed directionally:

- the same-count B200/GB200/GB300 results remain close to the suite's existing anchors;
- a later 16-GPU B300 Offline result is close to 2x the suite's 8-GPU B300 Offline anchor;
- Server-mode scaling is materially less linear than Offline-mode aggregation, supporting the existing separation between benchmark capacity and the user-set production-serving factor.

## Two scale-out cases must be treated differently

### A. Replica / data-parallel serving

NVIDIA TensorRT-LLM + Triton support running multiple instances of the same model on separate GPU groups and load balancing requests across them. This is the correct abstraction when a model instance fits within the qualified benchmark-sized group and the larger deployment exists to serve more concurrent demand.

NVIDIA documentation:
- https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/tensorrtllm_backend/docs/llama_multi_instance.html
- https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/tensorrtllm_backend/README.html

For this case, aggregate benchmark capacity can be modeled as:

```
effective benchmark throughput
= source benchmark throughput
  x number of independent benchmark-sized replica groups
  x model adjustment
  x precision adjustment
```

The existing user-supplied production-serving factor remains the control for real-world serving efficiency. We should avoid adding a second arbitrary scale-efficiency penalty to replica aggregation unless evidence shows one is needed, because that risks double-counting serving overhead.

Example: 16 x B200 where the workload can be served as two independent 8-GPU groups:

```
replica groups = 16 / 8 = 2
benchmark-basis throughput = 104,572 x 2
```

Then apply the existing model and precision adjustments and the existing production-serving factor.

### B. Model-parallel / topology-dependent scale-out

If a single model instance cannot reside within the benchmark-sized group and must span more GPUs/nodes, capacity is not safely treated as simple replica aggregation.

TensorRT-LLM supports tensor, pipeline, expert, and multi-node parallelism, but the performance effect is topology-, model-, sequence-length-, batching-, and software-dependent.

NVIDIA documentation:
https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/tensorrtllm_backend/README.html

For this case, IE should use a topology/parallelism-specific evidence model when available. If an evidence-backed bound cannot be established, suppress the definitive cost-per-token result rather than silently assume linear scaling.

## Proposed evidence hierarchy

1. **EXACT BENCHMARK**
   - Same hardware class and deployment count.
   - Highest confidence.

2. **REPLICA-SCALED**
   - Deployed count is an integer multiple of the qualified benchmark group.
   - Selected model can reside within one benchmark group.
   - Capacity is aggregated across independent serving groups.
   - Existing production-serving factor still applies.
   - Presales confidence: moderate-to-high, subject to model/precision adjustments.

3. **TOPOLOGY-MODELED**
   - Single serving instance must span beyond the benchmark group.
   - Requires topology/parallelism-specific evidence or calibrated efficiency band.
   - Presales confidence: moderate or low depending on evidence distance.

4. **INSUFFICIENT EVIDENCE**
   - Residency/topology unsupported, or extrapolation exceeds a defensible bound.
   - Suppress rather than fabricate.

## Required implementation inputs

To classify replica scaling versus model-parallel scaling reliably, the GPU Sizing -> TCO -> IE journey should preserve enough technical context to answer:

- actual deployed GPU count
- benchmark group GPU count
- selected model and precision
- model weight residency requirement
- hardware memory per GPU
- whether one benchmark-sized group can host the model
- optionally: GPU Sizing memory-bound versus performance-bound basis / minimum technical count

Do not infer this from the final rounded GPU count alone.

## Proposed first implementation scope

The safest first production step is:

1. Keep exact benchmark behavior unchanged.
2. Add replica-scaled support when the model fits within one benchmark-sized group and deployed count is a whole multiple of that group.
3. Remove the current hard block that rejects those valid replica-scaled deployments.
4. Label the evidence basis explicitly as EXACT BENCHMARK or REPLICA-SCALED.
5. Preserve the existing production-serving factor and capacity suppression.
6. Continue suppressing true model-parallel scale-out until a separate topology-calibration pass is complete.

This directly fixes common 16/24/32 x B200/B300 cases without pretending that arbitrary distributed-model scaling is known.

## Validation gates before engine change

- Backtest B300 8 -> 16 Offline extrapolation against a later published 16-GPU result.
- Verify no double application of model, precision, deployment, or production-serving factors.
- Confirm TCO full-fleet cost numerator matches the same full-fleet throughput denominator.
- Verify replica-scaled result remains capacity-bound and demand-bound as designed.
- Add exact-vs-replica evidence status to audit trail and report.
- Retest negative/zero/growth edge cases.
- Re-run the cross-tool journey GPU Sizing -> TCO -> IE -> ROI.

## Separate follow-on research

A second evidence pass should calibrate model-parallel scale-out by architecture/topology rather than using one global efficiency constant. Candidate evidence includes NVIDIA TensorRT-LLM per-GPU throughput tables, MLPerf multi-system results, and reproducible NVIDIA benchmarking recipes.
