# Best-Value GPUaaS v1 Integration Notes

## Scope

Best-Value GPUaaS v1 is intentionally constrained to **Workload Requirement mode** where GPU Sizing has already established the technical requirement.

TCO may rank GPUaaS providers only for the **exact rented GPU class** currently supplied/selected. TCO does not infer that another GPU generation is a technically equivalent substitute.

## Why workload mode only in v1

The spend-derived TCO path starts from an observed cloud bill and reconstructs GPU-hours using the selected provider's rate. Re-ranking providers in that mode without first establishing a provider-neutral workload would change the inferred workload while pretending to hold it constant.

Workload Requirement mode already has the provider-neutral technical anchor needed for a defensible comparison: GPU count/class plus duty-cycle context from GPU Sizing.

Therefore v1 behavior is:

`GPU Sizing technical requirement -> exact cloud GPU class -> run existing TCO engine once per eligible provider -> rank by modeled cloud cost`

## Ranking

- Sort ascending by modeled cloud total for the selected horizon.
- Preserve pricing confidence (`LISTED`, `NODE-NORM`, `EST`, `QUOTE`) with every row.
- Do not silently prefer a higher-confidence row over a lower-cost row; instead disclose confidence next to the price.
- If the winning row is not `LISTED`, frame it as the **lowest modeled GPUaaS estimate**, not a verified market winner.
- Show up to the top three options.

## Apply behavior

Ranking is advisory. The calculator should not silently change the active provider when the user clicks **Find Best-Value GPUaaS**.

Each ranked row offers **Use provider**. Selecting it updates the normal provider control and lets the existing TCO state/rate-profile machinery recalculate normally.

## Non-price caveat

The feature does not recommend a provider on SLA, support, region, availability, enterprise discounts, security, procurement, networking, or operational fit. The UI must say this explicitly.

## Existing-engine requirement

Do not reproduce TCO math in the ranking helper. The integration callback should construct the provider-specific rate card using the same `defaultsFor(...)`, override-profile rules, and existing `run(inputsObj, rc)` engine already used by the active TCO comparison.

## Rate overrides

When evaluating a provider, use that provider + GPU class's saved rate override profile if one exists. A user-entered AWS H200 override must not be applied to Azure H200, and vice versa.

## Future v2

Cross-GPU-class optimization is deferred. It may be added only if GPU Sizing explicitly returns multiple technically valid alternatives that TCO can consume and price. TCO should never invent those equivalencies itself.
