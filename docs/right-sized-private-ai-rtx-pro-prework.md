# Right-Sized Private AI / RTX PRO 6000 Prework

Date: 2026-10-08
Status: PREWORK ONLY — no production economics changed by this document.
Scope: GPU Sizing and TCO first; Inference Economics handoff and downstream regression second. Use Case Explorer, Model Advisor, ROI, and Readiness change only where explicitly justified.

## 1. Objective

Close the current small-deployment coverage gap without biasing the tools toward on-prem. Add a production-grade path for NVIDIA RTX PRO 6000 Blackwell Server Edition in validated server configurations while preserving the ability for cloud GPU or managed API consumption to win economically.

The intended decision chain is:

Managed API / Cloud GPU -> Small Private AI (RTX PRO) -> Enterprise Private AI (DGX/HGX class) -> Rack-scale AI Factory.

## 2. Current-state findings from `main`

1. `src/GpuSizingCalculator.jsx` already contains an experimental `RTX_SPEC` path.
   - It is Dev/Test/POC-only.
   - It is capped at four workstation GPUs.
   - It uses an older workstation-oriented price assumption.
   - It uses an estimated throughput anchor derived from memory-bandwidth scaling rather than the newer Server Edition benchmark evidence.
   - Action: refactor/migrate this path; do not create a second competing RTX implementation.
2. `src/pricingRegistry.js` is already the shared on-prem/cloud pricing source for GPU Sizing and TCO.
   - Current production on-prem records are DGX/rack-scale oriented.
   - Action: extend the registry with platform metadata rather than hard-coding RTX economics in UI components.
3. `src/TcoCalculator.jsx` still carries common DGX-shaped assumptions in `BASE_RC`, including the shared $600,000 cluster allowance.
   - Action: move small-deployment economics behind platform/deployment-aware policies before allowing RTX recommendations to flow into TCO.
4. `src/tcoInfrastructureCoverage.js` explicitly avoids inventing universal storage/GPU ratios and already contains architecture-review guardrails.
   - Action: preserve this philosophy; extend it for standalone/small RTX deployments rather than bypassing it.
5. `src/pricingProvenance.js` already separates values from verification dates and has staleness logic.
   - Action: add RTX/public-OEM/cloud verification dates and provenance without weakening the existing audit model.

## 3. V1 scope decision

### In scope
- NVIDIA RTX PRO 6000 Blackwell Server Edition.
- Production server configurations: 2 GPU, 4 GPU, 8 GPU.
- Single-GPU-fit inference sizing using independent replicas.
- Server rounding to 2/4/8-GPU deployment quanta.
- Multi-GPU split-model RTX shown only as an engineering-validation candidate when evidence supports the candidate; never auto-recommended in v1.
- Platform-aware TCO assumptions for management/control plane, fabric/network, rack, power, software, support, services, and storage.
- Public cloud RTX comparator where a published rate is available.
- Full provenance/status labels and as-of dates.
- Regression tests pinning existing DGX large-cluster behavior.

### Explicitly out of scope for v1
- 1x RTX PRO production-server recommendation unless a supported OEM/CDW reference configuration is independently validated.
- Universal `RTX = B200 x 0.25` conversion factor.
- Unrestricted PCIe split-model performance prediction.
- H200 NVL / other intermediate GPU classes.
- Changing current 4-32 DGX or NVL72 economics as part of the RTX work except for provenance/disclosure corrections that do not change math.

## 4. Evidence model

Every RTX datum must carry two independent axes:

### Source provenance
- LISTED: published first-party/OEM/provider price/specification.
- CUSTOMER: user-entered/customer-provided value.
- EST: planning assumption or derived estimate.
- QUOTE: customer/project-specific quote required.

### Derivation
- DIRECT: value is directly stated by the source.
- CALCULATED: transparent arithmetic from direct values.
- BENCHMARK_PROXY: performance extrapolation from a nearby validated benchmark.
- PLANNING_ALLOWANCE: directional cost assumption.

No unresolved cost may silently become $0. A deliberate $0 assumption is allowed only when labeled and explained.

## 5. Data registry design

### 5.1 Hardware platform record

Add platform records with fields equivalent to:

- id
- displayName
- platformFamily (`RTX_PRO_SERVER`, `DGX`, `NVL_RACK`)
- gpuClass
- gpuCount
- gpuVramGB
- interconnect (`PCIe`, `NVLink`, rack-scale)
- rackUnits
- maxPowerKW
- hardwarePriceUSD
- hardwarePriceSource
- hardwarePriceAsOf
- supportTermYears
- supportCostUSD / supportStatus
- softwareCostPerGPUUSD / softwareTermYears / softwareStatus
- professionalServicesUSD / status
- fabricAllowanceUSD / status
- rackPlanningPolicy
- provenance

Do not infer 1-GPU server price by subtracting a card price from a 2-GPU configured server.

### 5.2 Performance benchmark record

Do not store one universal RTX/B200 multiplier. Create benchmark records keyed by:

- gpuClass
- model/modelFamily
- architectureType (dense/MoE where relevant)
- precision
- averageInput/context band
- output band if required by source
- gpuCount
- topology/mode (single-GPU replica, pipeline split, tensor parallel, etc.)
- throughput
- benchmark source
- benchmark version
- asOf
- confidence
- derivation

V1 autonomous RTX recommendation requires a single-GPU-fit path. Missing exact model anchors may use a documented proxy only when the existing sizing methodology can defend it and the output is labeled accordingly.

### 5.3 Deployment-policy record

TCO cost policy should depend on platform + server count + deployment mode, not GPU count alone.

Initial policy shape:

- Single RTX server: incremental dedicated management/control-plane hardware = $0 EST, assuming existing Ethernet/server-management infrastructure. This does not mean total management labor = $0.
- 2-4 RTX servers, independent inference: small deployment policy; EST/QUOTE where new infrastructure is required.
- 2-4 RTX servers, coordinated cluster: engineering/quote review.
- DGX 1-3: retain current math initially, but disclose that the existing $600K planning allowance may be sized for a multi-system cluster and requires validation.
- DGX 4-32: preserve current behavior during RTX v1.
- Above documented cluster envelope/rack-scale: architecture review/quote gate.

## 6. GPU Sizing changes

1. Replace the current experimental workstation RTX path with a production Server Edition candidate class.
2. Add 96 GB VRAM and current technical/product provenance.
3. Implement single-GPU model-fit gate using model weights + sequence/KV state + runtime headroom.
4. When the model fits:
   - calculate per-GPU replica capacity from a qualified benchmark/proxy;
   - calculate required independent replicas from demand;
   - round into 2/4/8-GPU server quanta;
   - compare deployable cost/capacity against existing candidates.
5. When the model does not fit one RTX GPU:
   - do not silently eliminate the architecture if a supported multi-GPU candidate exists;
   - show `Engineering validation required` candidate only;
   - do not auto-recommend it in v1.
6. Show long-context/RAG caveat when input length materially moves throughput away from the benchmark basis.
7. Preserve the current recommendation principle: choose among deployable, priceable configurations rather than minimum raw GPU count.
8. Update handoff payload so TCO receives the exact platform ID/server count, not just a generic GPU class/count.

## 7. TCO changes

### 7.1 Platform-aware economics

Move these assumptions away from universal DGX defaults and into platform/deployment policy:

- management/control-plane servers
- fabric/network allowance
- rack/new-rack cost
- power draw
- professional services
- support
- NVIDIA software
- admin/FTE treatment
- storage planning basis

### 7.2 Storage

Do not create a universal RTX storage dollar default. In workload mode:

- storage remains workload-specific;
- derive a suggested capacity only where the workload provides enough evidence;
- otherwise require/confirm explicit storage input before client-ready status;
- price the confirmed capacity through the existing storage-cost model.

### 7.3 Management allowance

Rename the visible line to `Management and control-plane servers`.

A $0 single-server value must display an explanation such as:
`Incremental dedicated control-plane hardware: $0 (EST). Assumes existing enterprise server management and Ethernet infrastructure.`

### 7.4 Cloud comparator

Add a directly published RTX PRO 6000 cloud rate where available, including required CPU/memory components when the provider exposes them separately. Do not compare on-prem total system cost against GPU-only cloud cost.

## 8. Existing RTX experimental-path cleanup

Before enabling production RTX:

- remove or retire the old workstation `RTX_SPEC` constants from `GpuSizingCalculator.jsx`;
- preserve any useful UI copy only if it remains accurate;
- prevent duplicate RTX labels/classes in reports, handoffs, saved state, and audit trails;
- add backward-compatibility handling if any stored snapshots contain the old RTX class string.

## 9. Data needed before autonomous production recommendation

### Required
- 2-GPU configured server: public/OEM record with current price and specs.
- 4-GPU configured server: public/OEM record with current price and specs.
- 8-GPU configured server: direct configured price preferred; if unavailable, mark the entire 8-GPU system EST/QUOTE rather than presenting a component-derived price as LISTED.
- software kit price/term per GPU or explicit unresolved/QUOTE status.
- max system power/rack units from OEM/reference specs.
- at least one defensible single-GPU inference performance anchor for the sizing path.
- public cloud RTX rate and full minimum instance resource requirements if used as comparator.

### Can remain EST/QUOTE without blocking v1
- project-specific support uplift if not bundled/explicit.
- professional services.
- multi-server small-cluster control-plane build.
- customer-specific CDW sell price.

## 10. Maintenance model

### Weekly automated/watchable
- configured public OEM prices and availability.
- cloud RTX rates and minimum resource requirements.
- source-page disappearance/redirect/sku change.

### Monthly or release-triggered watch
- TensorRT-LLM/MLPerf benchmark additions or changed benchmark versions.
- NVIDIA reference architecture/support guidance changes.

### Quarterly/manual validation
- NVIDIA/CDW price-book software/support values.
- reference build BOMs and professional services assumptions.
- management/control-plane reference architecture.

Automated jobs should flag deltas for review. They should not silently change client-facing economics when a source definition, SKU, benchmark basis, or configuration changes.

## 11. Regression / acceptance tests

### Must-pass existing behavior
- Existing DGX B200/B300 and NVL72 large-cluster outputs remain numerically identical unless a separately approved fix intentionally changes them.
- Existing URL handoffs, Back navigation, hard-refresh persistence, reports, and audit trails continue to work.
- No double counting of NVIDIA software for DGX.

### New RTX cases
1. Small model, low concurrency -> 2-GPU RTX server can be selected.
2. Same workload with extremely low utilization -> managed API/cloud may still win downstream.
3. Workload requiring >2 but <=4 independent replicas -> 4-GPU RTX server.
4. Workload requiring >4 but <=8 independent replicas -> 8-GPU RTX server.
5. Workload requiring >8 independent replicas -> additional RTX servers or DGX comparison according to cost/capacity policy.
6. Model does not fit a single 96 GB RTX GPU -> no autonomous RTX recommendation; engineering-validation candidate only where applicable.
7. Long-context RAG case -> context caveat and benchmark/proxy provenance visible.
8. Missing support/software/cloud price -> unresolved/QUOTE, never silently $0.
9. One RTX server -> no $600K DGX cluster allowance, no DGX fabric allowance, no forced new-rack cost when existing-rack assumption applies.
10. TCO standalone selection produces the same platform policy as GPU Sizing -> TCO handoff.
11. TCO report/audit trail shows source + derivation + as-of date for RTX values.
12. IE handoff receives exact RTX architecture/capacity basis and does not misclassify a single-server replica deployment as DGX scale-out.

## 12. Implementation sequence

### PR A — disclosure / guardrail only
- Add 1-3 DGX disclosure that the current $600K management/control-plane allowance is a multi-system planning allowance that may overstate smaller deployments and must be validated.
- No economics change.

### PR B — platform/deployment policy refactor
- Extract management/fabric/rack/services/storage decision policy from global DGX defaults.
- Preserve current DGX numeric outputs through compatibility policy.
- Add tests pinning existing DGX outputs.

### PR C — RTX product + pricing registry
- Add 2/4/8 RTX PRO Server Edition records with full provenance/status.
- Add cloud RTX comparator record.
- Add staleness/verification dates and watcher targets.
- Do not yet expose autonomous RTX recommendation until required fields pass evidence gates.

### PR D — GPU Sizing RTX production path
- Replace experimental workstation RTX path.
- Add fit gate, replica sizing, server rounding, benchmark registry/proxy labels, engineering-validation state.
- Add exact platform handoff to TCO.

### PR E — TCO + IE integration
- Apply platform-aware small-deployment costs.
- Validate standalone TCO and handoff parity.
- Validate IE architecture/capacity handoff.

### PR F — end-to-end adversarial regression
- Small SLED/higher-ed journeys.
- API/cloud wins where appropriate.
- RTX wins where justified.
- DGX behavior preserved.
- Reports/audit/persistence/mobile regression.

## 13. Stop conditions

Do not merge autonomous RTX recommendation if any of these remain unresolved:

- configured 2/4-GPU production server records cannot be verified;
- software/support is silently omitted;
- cloud comparator uses GPU-only cost while requiring paid CPU/memory not modeled;
- sizing still depends on a universal 0.25x B200 multiplier;
- old experimental RTX path remains independently active;
- RTX inherits the $600K cluster allowance, DGX fabric allowance, or $675K storage assumption by default;
- a >96 GB single-replica model is automatically recommended on RTX without an explicit engineering-validation state;
- current DGX regression tests move unexpectedly.

## 14. Definition of ready-to-code

Prework is complete when:

- source URLs/SKUs and as-of dates are captured for 2/4/8 RTX server records;
- cloud RTX comparator math is fully decomposed;
- benchmark registry has at least one qualifying direct single-GPU anchor plus explicit proxy policy;
- platform/deployment policy is agreed;
- current DGX outputs are pinned in tests;
- experimental RTX path migration/backward-compatibility plan is documented.

At that point implementation should proceed in the PR sequence above, with each PR independently testable and reversible.