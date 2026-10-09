# RTX PRO TCO convergence plan

Date: 2026-10-09
Scope: make RTX PRO TCO feel like the existing B200+ TCO while preserving architecture-specific economics and evidence controls.

## Product objective

A user switching from DGX/HGX-class infrastructure to RTX PRO should feel like they changed the selected infrastructure, not entered a different application.

The RTX path may remain simpler under the hood, but customer-facing structure, styling, provenance, editing behavior, report flow, and cloud-vs-on-prem framing should converge with the main TCO wherever the concepts are shared.

## Non-negotiable guardrails

1. Do not reuse DGX/HGX cluster, fabric, rack, or professional-services allowances simply to make RTX look complete.
2. Do not ask the customer to solve a modeling gap that the calculator can solve from source-backed defaults.
3. Planning defaults are allowed when they are labeled `EST`; customer edits become `CUSTOMER`; public source-backed values remain `LISTED`; unresolved quote-dependent values remain `QUOTE`.
4. A blank field should be reserved for genuinely unknowable or quote-required inputs, not for every non-listed cost.
5. Cloud comparisons must choose a provider shape that actually matches or composes to the selected RTX deployment. Do not compare a 2-GPU private server to an 8-GPU cloud node simply because that is the only easy rate.
6. No cloud rate becomes customer-facing until region, OS, purchase option, and billing basis are normalized to the main TCO methodology.
7. RTX does not gain NVLink/NVSwitch semantics through UX convergence. Architecture disclosures remain intact.

## Target UX

### Shared with main TCO

- same top-level TCO visual language and section hierarchy
- same 1/3/5-year horizon behavior
- same provider naming: AWS, Azure, Google Cloud, Oracle Cloud
- same provenance language and edited-value attribution
- same cloud-vs-on-prem results framing
- same report / methodology / audit-trail navigation pattern
- same progression to Inference Economics
- same principle: defaults first, customer overrides second

### RTX-specific simplifications

- single-server 2/4/8 GPU economics rather than DGX cluster-scale infrastructure math
- no universal dedicated AI fabric charge for independent-replica workloads
- no universal dedicated management plane charge when existing tooling is explicitly assumed
- no DGX cluster allowance
- 8-GPU configured hardware remains `QUOTE` until a defensible configured-system price is admitted
- multi-server RTX remains engineering-validation territory

## Defaulting strategy

The final calculator should open mostly populated rather than as a quote worksheet.

Candidate defaults to research/validate before activation:

- configured hardware: `LISTED` for admitted 2/4-GPU configured systems; `QUOTE` for 8 GPU
- server power: source-backed configured-server value by server SKU, not GPU TDP multiplied blindly
- NVIDIA software/support: planning basis or explicit not-included posture, clearly attributed
- OEM support: editable `EST` planning allowance tied to hardware/support evidence
- professional services: editable `EST` implementation allowance appropriate to one-server deployment
- storage: workload-derived `EST`, editable
- incremental operations labor: editable `EST`, including a valid $0 shared-staff assumption when disclosed
- facilities: deployment-type branch rather than one opaque `$ / kW-month` field

## Facility/power convergence

The current main-TCO fully loaded `$ / kW-month` field and the RTX blank burden field should converge toward a clearer deployment-type model:

- **Owned data center:** energy = server kW × hours × utility rate × PUE; facility burden modeled separately when needed.
- **Colocation:** use a quote/listed colo capacity basis rather than pretending a utility bill represents total facility cost.

Do not replace a fully loaded facility burden with raw utility cost alone.

## Cloud comparison evidence staged in Phase 1

### AWS
- EC2 G7e is GA with 1/2/4/8 RTX PRO 6000 GPU shapes.
- Exact EC2 On-Demand U.S. rate normalization remains pending.
- Do not substitute a SageMaker endpoint rate for EC2 TCO.

### Azure
- NC RTX PRO 6000 BSE v6 is GA.
- Publicly documented sizes include fractional, 1-GPU, and 2-GPU shapes.
- 4/8-GPU equivalence would require composition across multiple VMs unless a larger directly comparable family is admitted later.
- Exact Pay-As-You-Go rate normalization remains pending.

### Google Cloud
- G4 Standard publishes 1/2/4/8-GPU RTX PRO 6000 whole-VM rates.
- Exact public values are staged in `src/rtxProCloudRegistry.js` but remain non-customer-facing until region/methodology normalization is complete.

### Oracle Cloud
- BM.GPU.RTXPro.8 is an 8-GPU RTX PRO 6000 bare-metal shape.
- Oracle publishes a GPU-price-per-hour figure; billing-basis normalization is required before activation.
- No smaller direct RTX PRO shape is currently admitted in this plan.

## Delivery phases

### Phase 1 — evidence + contract
- stage provider/shape evidence in a dedicated RTX cloud registry
- keep all new rates non-customer-facing
- add a validator so no unverified provider/rate is accidentally activated
- document convergence rules

### Phase 2 — visual convergence
- reuse the main TCO page hierarchy and visual treatment
- reduce the current wall of blank fields
- move detailed evidence/architecture disclosures behind compact expandable help
- keep report/audit surfaces consistent with the main TCO
- no economic-default changes yet

### Phase 3 — planning defaults
- introduce source-backed or explicit `EST` defaults one category at a time
- preserve customer overrides and provenance
- resolve facility/power branch design
- keep quote-only items visibly unresolved

### Phase 4 — RTX cloud comparison
- normalize AWS/Azure/GCP/OCI exact commercial basis
- add shape-matching/composition logic
- integrate cloud-vs-on-prem comparison into RTX TCO using the same results pattern as main TCO

### Phase 5 — parity regression
- test 2/4/8-GPU handoff from GPU Sizing
- verify main-TCO and RTX-TCO navigation/selection consistency
- verify report/audit provenance
- verify IE handoff identity and TCO horizon
- mobile regression

## Success criteria

The user should be able to flip between B200+ and RTX PRO TCO and immediately understand:

1. what infrastructure is being compared,
2. what is source-backed vs estimated vs customer-edited vs quote-required,
3. what cloud alternative is comparable,
4. what assumptions differ because RTX is a different architecture,
5. and how to continue into Inference Economics without learning a second TCO application.
