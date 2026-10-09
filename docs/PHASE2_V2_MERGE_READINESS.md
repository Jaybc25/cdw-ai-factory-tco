# CDW AI Factory Phase 2 v2 — Merge Readiness Checkpoint

**Branch:** `feature/phase2-v2-preview`  
**PR:** #196  
**Status:** Draft / isolated preview  
**Purpose:** Final Phase 2 v2 acceptance checkpoint before any production merge decision.

## Executive state

Phase 2 v2 has reached the end of its planned construction sequence (Wave 0 through Wave 5C). The implementation now provides a shared Phase 2 contract plus four planning pillars — Storage, Network Fabric, Power, and Software — integrated into a durable Pod Brief and a Phase 1 → Phase 2 known-cost delta.

The governing boundary remains:

> **The tools size and cost. CDW engineers design.**

Phase 2 is intended to improve pre-architecture planning and engineering handoff. It is not an electrical design package, storage architecture, detailed network design, security design, or final OEM BOM.

## Planned build sequence completed

| Step | Scope | State |
| --- | --- | --- |
| 0A | Shared provenance, dependency fingerprint, stale/recompute/revert contract | Complete |
| 0B | Phase 2 TCO receiving contract | Complete |
| 1A | Power reference engine | Complete |
| 1B | Power UI + TCO handoff | Complete |
| 1C | Power evidence/spec hardening | Complete |
| 2A | Storage reference engine | Complete |
| 2B | Storage dependencies → Fabric/Power/TCO context | Complete |
| 3A | Software/licensing reference engine | Complete |
| 3B | Software → TCO contract | Complete |
| 4A | Network Fabric reference engine | Complete |
| 4B | Fabric → Power/TCO + fleet step schedule | Complete |
| 5A | Integrated Pod Brief | Complete |
| 5B | Durable Pod Brief + Phase 1 delta + printable presentation | Complete |
| 5C | End-to-end acceptance gate and hardening | In final review |

## Current dependency model

The intended dependency direction is:

**Storage → Fabric → Power → TCO**

with:

**Software → TCO**

and all four pillars feeding the **Pod Brief**.

Accepted upstream changes are fingerprinted. A downstream result that was calculated against an older accepted dependency must be treated as stale until the user explicitly recomputes/accepts it. Silent recomputation is not permitted.

## Provenance and state model

Phase 2 keeps source provenance separate from derivation:

- **Source:** `LISTED`, `CUSTOMER`, `EST`, `QUOTE`
- **Derivation:** `DIRECT`, `CALCULATED`, `NODE-NORM`
- **Lifecycle:** `CURRENT`, `STALE`, `RECOMPUTED`, `REVERTED`

Only current/recomputed accepted overrides are eligible for downstream economic use.

## Power Planner

Current evidence-hardened power anchors include:

- DGX B200: NVIDIA-listed ~14.3 kW maximum system power; used conservatively for design and default energy planning until a customer supplies a better average-load assumption.
- DGX H200: 10.2 kW standard configuration; Custom Thermal Solution noted separately.
- GB200 NVL72: ~120 kW full-load energy anchor and 125 kW design/PDU envelope.

Power separates:

- average IT load for energy economics,
- design/max IT load for facility feasibility,
- IT heat rejection from PUE,
- utility energy expense from separate facility/colocation burden,
- accepted Storage power/racks,
- accepted Fabric switch power.

Facility-fit output remains directional and routes engineering work rather than replacing it.

## Storage Sizer

Storage remains intentionally vendor-neutral. It produces planning requirements for:

- fast vs bulk usable/raw capacity,
- growth/reserve/usable-efficiency,
- throughput envelope,
- storage rack count,
- provisional storage power,
- downstream Fabric and Power dependencies.

**Known limitation:** Storage currently carries the most heuristic methodology in Phase 2. Workload tier fractions, checkpoint treatment, per-GPU throughput fallbacks, and provisional rack density/power require the strongest scrutiny before broad client use. OEM/BOM pricing remains unresolved and must not be represented as $0.

Future hardening should prefer explicit checkpoint/model-artifact, RAG corpus/index, log/trace retention, ingest, scan-window, restore-window, and checkpoint-window inputs over generic workload multipliers where practical.

## Software Stack / Licensing

Software economics are itemized by component and keep the following separate:

- commercial license,
- support,
- implementation,
- ongoing operations/admin effort,
- entitlement notes,
- source provenance,
- annual escalation and horizon.

Open-source software may have $0 license but should not implicitly be treated as $0 operational cost. Included/bundled software may still carry implementation and operating effort.

## Network Fabric Planner

Fabric currently provides a planning-level envelope for:

- technology selection (InfiniBand, Spectrum-X, generic Ethernet),
- endpoint/storage/management ports,
- leaf/spine switch count,
- links/transceivers,
- storage bandwidth fit,
- switch power,
- non-linear fleet-size step schedule,
- optional CAPEX envelope when explicit unit pricing is supplied.

Unresolved switch/cable/transceiver pricing creates **no zero-dollar TCO override**. Fabric requirements can be accepted while CAPEX remains unresolved.

Detailed routing, QoS, congestion control, optics/cabling implementation, VLAN/subnet design, and final BOM remain engineering scope.

## TCO integration policy

Phase 2 is currently treated as a controlled receiving/overlay contract rather than a rewrite of Phase 1 TCO math.

The Pod Brief may show a **known Phase 2 additions** view using accepted current Power, Fabric, and Software economics against the saved Phase 1 baseline. Storage OEM/BOM cost is excluded until validated pricing exists.

This delta must not be described as a final Phase 2 TCO until double-count relationships with Phase 1 are explicitly reconciled and all material unresolved costs are addressed.

## Pod Brief

The Pod Brief integrates:

- compute/rack footprint,
- facility/design power,
- cooling requirement,
- storage capacity/tiering/bandwidth,
- fabric topology/ports/switches/power,
- software stack and horizon economics,
- unresolved quote items,
- stale-state warnings,
- Phase 1 → Phase 2 known-cost delta,
- engineering validation handoff.

The accepted brief itself has a dependency fingerprint and becomes stale when its accepted Phase 2 dependencies or saved Phase 1 TCO snapshot change.

## 5C hardening findings already corrected

1. **Software source provenance:** selected component price source now survives calculation/writeback instead of being lost downstream.
2. **Unresolved Fabric CAPEX:** missing switch/cable/transceiver pricing no longer creates an eligible `$0` CAPEX override. The requirement remains accepted while economics remain unresolved.
3. **Acceptance-gate wiring:** Phase 2 verification workflow filenames were reconciled so the gate executes the actual repository verification scripts.

## Acceptance gate

The dedicated Phase 2 acceptance workflow is intended to run:

1. Production build
2. Shared Phase 2 contract verification
3. Power engine/writeback/evidence checks
4. Storage engine/dependency checks
5. Software engine/writeback checks
6. Fabric engine/writeback checks
7. Pod Brief 5A/5B checks
8. Full Wave 5C end-to-end journey

The final end-to-end fixture covers Storage → Fabric → Power → Software → Pod Brief → Phase 1/2 delta, dependency fingerprints, stale behavior, unresolved/resolved Fabric economics, software provenance, and exclusion of stale economics.

## Merge-decision criteria

PR #196 should remain draft until all of the following are true:

- Phase 2 acceptance gate is green on the current head.
- Existing AI Factory quality gate remains green.
- Vercel preview is green.
- Adversarial methodology review is received and material findings are triaged.
- No unresolved **material blocker before merge** remains.
- Known planning limitations are explicit rather than hidden behind false precision.
- No unresolved cost is represented as zero merely because pricing is unavailable.
- Cross-tool stale propagation remains explicit and user-controlled.
- The final merge decision confirms whether any Phase 2 values should remain preview-only/hidden at first production merge.

## Expected adversarial-review disposition

Review findings should be classified into four buckets:

1. **Material blocker before merge** — correctness, misleading economics, broken dependency/staleness behavior, or credibility risk requiring remediation.
2. **Should fix before broad client use** — acceptable for an internal/limited preview but not for unrestricted client use.
3. **Acceptable Phase 2 limitation / document only** — directional planning assumption that is transparent and unlikely to mislead.
4. **Future enhancement** — useful expansion that should not delay the current architecture.

## Current recommendation

Do not add a new Wave 6 simply to continue development. Treat remaining work as **Wave 5C remediation / merge readiness**. If the acceptance gates and adversarial review do not reveal a material blocker, the next milestone is a deliberate decision to take PR #196 out of draft and define its production exposure level.
