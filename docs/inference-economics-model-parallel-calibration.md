# Inference Economics Model-Parallel Calibration Review

_Status: research / design only. No calculation-engine changes in this branch._

## Objective

Determine whether Inference Economics needs an additional production scaling model for cases where a single inference workload must span beyond one qualified benchmark-sized serving group.

The current production implementation already supports:

1. exact benchmark configurations; and
2. whole benchmark-sized replica groups when one group can host the selected model.

This review asks whether a third path — topology/model-parallel extrapolation — is needed for the current supported model catalog, and if so, what evidence standard would make it defensible for enterprise presales use.

## Key finding

For the current named model catalog, true cross-group model-parallel scaling appears to be an edge case rather than the normal path.

The largest currently supported named models are approximately 671–675B total parameters. An 8-GPU B200 benchmark group provides about 1.44 TB of aggregate HBM. At FP16, 675B parameters require about 1.35 TB for weights alone; at FP8 or FP4 the weight footprint is lower.

NVIDIA also publishes large-model inference examples on a single 8-GPU B200 system, including DeepSeek R1 671B and Llama 3.1 405B. NVIDIA has also demonstrated Llama 4 Maverick 400B on a single DGX B200.

Sources:
- https://developer.nvidia.com/deep-learning-performance-training-inference/ai-inference
- https://developer.nvidia.com/blog/llama-4-maverick-on-nvidia-blackwell/
- NVIDIA TensorRT-LLM / Triton documentation for multi-GPU and multi-node execution

## Implication for the current AI Factory catalog

A recommendation such as 16, 24, or 32 B200 GPUs does not automatically mean the selected model itself needs that many GPUs to reside.

For many current named-model scenarios, the larger GPU count is more likely driven by:

- concurrency,
- aggregate required output throughput,
- KV / sequence-state demand,
- production headroom,
- node rounding,
- or future-growth capacity.

Those cases are appropriately treated as multiple serving replicas when the model fits within one qualified benchmark-sized group. That is the path already implemented by the replica-scaling work.

## Why a universal model-parallel factor is not justified

NVIDIA TensorRT-LLM supports multiple distributed inference strategies, including:

- tensor parallelism (TP),
- pipeline parallelism (PP),
- expert parallelism (EP),
- data/context/attention parallel variants,
- multi-node execution.

Performance is sensitive to more than GPU count. It can vary materially with:

- dense versus MoE architecture,
- active versus resident parameter count,
- interconnect topology,
- TP/PP/EP degree,
- sequence length,
- batch/concurrency,
- prefill versus decode balance,
- precision,
- software/runtime version,
- latency target.

Therefore a single hidden factor such as 80%, 85%, or 90% scaling efficiency would create false precision.

## Proposed production rule

### 1. Exact benchmark

Use direct qualified benchmark evidence when the deployment matches the benchmark configuration.

Evidence basis: `EXACT_BENCHMARK`.

### 2. Replica-scaled

Use whole benchmark-sized serving groups when:

- the deployed GPU count is a whole multiple of the qualified benchmark group; and
- one benchmark group can host the selected model under the supported residency guardrail.

Evidence basis: `REPLICA_SCALED`.

This is the primary path for current named-model multi-node capacity recommendations.

### 3. Topology/model-parallel required

Do not automatically estimate a definitive cost-per-token result when one independent benchmark-sized group cannot host the workload.

Examples include:

- future/custom models too large to reside in one group;
- unusually large sequence-state or per-request memory requirements that force a serving instance across groups;
- architectures requiring a distributed topology not represented by current benchmark evidence.

Evidence basis: `TOPOLOGY_EVIDENCE_REQUIRED`.

For these cases, IE should suppress the definitive result and explain that a topology-specific benchmark or engineering assumption is required.

## Important distinction: weights fit vs full serving workload fits

Weight residency is only a necessary-condition check.

A model's weights fitting within one benchmark group does not prove that every serving workload fits there. KV cache, recurrent/sequence state, runtime workspace, batching, and concurrency can add substantial memory demand.

GPU Sizing is authoritative for full workload memory and performance sizing.

Therefore the most defensible future handoff is to preserve an explicit GPU Sizing field describing whether the minimum technical requirement is:

- performance/capacity driven while one serving replica fits within a benchmark group; or
- memory/topology driven such that a single serving replica requires more than one benchmark group.

Inference Economics should consume that classification rather than reconstructing the full sizing model from model weights alone.

## Recommended next engineering step

Before building a model-parallel throughput formula, strengthen the handoff contract.

GPU Sizing should expose enough context to IE to distinguish:

- `REPLICA_CAPACITY_SCALEOUT`
- `TOPOLOGY_SCALEOUT_REQUIRED`

Candidate fields:

- deployed GPU count;
- benchmark group size;
- minimum technical GPU count;
- node-rounded GPU count;
- memory-bound GPU requirement;
- performance-bound GPU requirement;
- whether one benchmark-sized group satisfies full modeled serving-memory requirement;
- model / precision / working-day context already carried today.

Then:

- replica-capacity scenarios continue through the current replica-scaled path;
- topology-required scenarios remain suppressed with an explicit explanation unless a future topology-specific evidence record exists.

## Confidence framework

| Evidence basis | Suggested confidence | Meaning |
|---|---|---|
| Exact benchmark | High / benchmark-qualified | Direct hardware deployment evidence; model/precision/scenario adjustments may still lower overall confidence |
| Replica-scaled | Moderate to high | Independent serving-group aggregation with disclosed model/precision/production assumptions |
| Topology-specific benchmark | Moderate | Model-parallel evidence exists for a sufficiently similar topology/workload |
| Generic topology extrapolation | Low / suppress | Too many interacting variables for a defensible presales number |

## Decision

Do **not** add a universal model-parallel efficiency coefficient at this time.

For the current supported model catalog, the replica-scaled implementation covers the economically important multi-node inference cases more defensibly.

The next improvement should be a narrow cross-tool classification handoff from GPU Sizing that tells IE whether the recommended deployment is replica-capacity scale-out or genuinely topology-required scale-out.

Only after that classification exists should we evaluate whether any current real-world cases remain that justify a topology-specific modeled throughput implementation.
